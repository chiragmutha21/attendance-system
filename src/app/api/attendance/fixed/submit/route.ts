import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateDistance } from "@/lib/utils";
import { getOfficeConfig } from "@/lib/tenant";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { getCompanyFolderName } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, companyId, selfie, latitude, longitude, accuracy, timezone, deviceInfo, type } = body;

    // 1. Basic validation
    if (!employeeId || !companyId || !selfie || latitude === undefined || longitude === undefined || !type) {
      return NextResponse.json({ error: "Missing required fields (employeeId, companyId, selfie, GPS coordinates, or type)" }, { status: 400 });
    }

    if (type !== "check-in" && type !== "check-out") {
      return NextResponse.json({ error: "Invalid type. Must be 'check-in' or 'check-out'" }, { status: 400 });
    }

    // 2. Get Employee details
    const employee = await db.employee.findUnique({
      where: { companyId_employeeId: { companyId, employeeId } },
    });

    if (!employee || employee.status !== "active") {
      return NextResponse.json({ error: "Employee is inactive or not found." }, { status: 403 });
    }

    // 3. Fetch assigned branches and calculate nearest branch distance
    const assignedBranchIds = employee.assignedBranchIds || [];
    let targetBranches = await db.branch.findMany({
      where: {
        id: { in: assignedBranchIds },
        companyId: companyId,
      },
    });

    // Fallback if no branches are assigned
    if (targetBranches.length === 0) {
      targetBranches = await db.branch.findMany({
        where: { companyId: companyId },
      });
      if (targetBranches.length === 0) {
        const company = await db.company.findUnique({ where: { id: companyId } });
        if (company) {
          const mainOffice = await db.branch.create({
            data: {
              companyId: companyId,
              name: "Head Office",
              address: "Main Office Address",
              latitude: company.officeLatitude ?? 28.6139,
              longitude: company.officeLongitude ?? 77.2090,
              radiusMeters: company.officeRadiusMeters ?? 200,
              isMainOffice: true,
            },
          });
          targetBranches = [mainOffice];
        }
      }
    }

    let nearestBranch = null;
    let minDistance = Infinity;

    for (const b of targetBranches) {
      const dist = calculateDistance(latitude, longitude, b.latitude, b.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearestBranch = b;
      }
    }

    if (!nearestBranch) {
      return NextResponse.json({ error: "No configured branch found for your company." }, { status: 400 });
    }
    const isWithinRadius = minDistance <= nearestBranch.radiusMeters;

    // 5. Save Selfie Image
    let selfieUrl = "";
    const isMock = process.env.MOCK_MODE === "true";
    const folderName = await getCompanyFolderName(companyId);

    if (isMock) {
      // Process Base64 image upload and save to public/uploads/EMPLOYEE_SELFIE/<folderName>/
      const base64Data = selfie.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      
      const fileName = `${employee.employeeId}_${Date.now()}.jpg`;
      
      // Ensure directory exists
      const uploadDir = join(process.cwd(), "public", "uploads", "EMPLOYEE_SELFIE", folderName);
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      const filePath = join(uploadDir, fileName);
      await writeFile(filePath, buffer);
      
      selfieUrl = `/uploads/EMPLOYEE_SELFIE/${folderName}/${fileName}`;
      console.log(`[MOCK MODE] Saved selfie locally: ${selfieUrl}`);
    } else {
      // Production Mode: Upload to Supabase Storage
      const base64Data = selfie.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `${employee.employeeId}_${Date.now()}.jpg`;

      // Lazy import Supabase
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase production environment credentials are not configured.");
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const bucketName = "EMPLOYEE_SELFIE";
      const filePath = `${folderName}/${fileName}`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: "image/jpeg",
          upsert: true
        });

      if (error) {
        console.error("Supabase Storage upload error:", error);
        throw new Error(`Failed to upload selfie to cloud storage: ${error.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
        
      selfieUrl = publicUrlData.publicUrl;
      console.log(`[PRODUCTION MODE] Saved selfie to Supabase: ${selfieUrl}`);
    }

    // 5.5 Validate session constraints (prevent double check-in, checkout without check-in, etc.)
    const lastRecord = await db.attendanceRecord.findFirst({
      where: {
        employeeId: employee.employeeId,
        companyId: companyId,
      },
      orderBy: {
        checkInTime: "desc",
      },
    });

    const tz = timezone || "Asia/Kolkata";
    const now = new Date();

    if (type === "check-in") {
      if (lastRecord && lastRecord.type === "check-in") {
        return NextResponse.json(
          { error: "You are already checked in. Please check out before checking in again." },
          { status: 400 }
        );
      }
    } else if (type === "check-out") {
      if (lastRecord && lastRecord.type === "check-out") {
        return NextResponse.json(
          { error: "You have already checked out for this attendance session." },
          { status: 400 }
        );
      }
      if (!lastRecord || lastRecord.type !== "check-in") {
        return NextResponse.json(
          { error: "No active check-in found" },
          { status: 400 }
        );
      }
    }

    // 6. Log Attendance Record
    const record = await db.attendanceRecord.create({
      data: {
        employeeId: employee.employeeId,
        companyId: companyId,
        employeeName: employee.fullName,
        selfieUrl: selfieUrl,
        latitude: latitude,
        longitude: longitude,
        accuracy: accuracy || 0,
        distanceFromOffice: minDistance,
        status: isWithinRadius ? "present" : "outside",
        type: type,
        timezone: timezone || "Asia/Kolkata",
        deviceInfo: deviceInfo || "Unknown Device",
        branchId: nearestBranch.id,
        branchName: nearestBranch.name,
        distanceFromBranch: minDistance,
      },
    });

    console.log(`Attendance (${type}) successfully logged for ${employee.fullName}. Record ID: ${record.id}`);

    const markedTime = new Date(record.checkInTime).toLocaleString("en-IN", {
      timeZone: timezone || "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    
    const label = type === "check-in" ? "Check-In" : "Check-Out";
    const isPresent = record.status === "present";
    const locationStatus = isPresent ? `In Office (${record.branchName || "Main Office"})` : `Outside Boundary (${record.branchName || "Main Office"})`;
    const locationLabel = isPresent ? "In Office" : "Outside Office Boundary";
    const confirmationMessage = `Your ${label} marked successfully.\n\nBranch: ${record.branchName || "Main Office"}\nLocation: ${locationLabel}\nTime: ${markedTime}`;
    await sendWhatsAppMessage(employee.mobileNumber, confirmationMessage);

    return NextResponse.json({
      success: true,
      message: `${label} marked successfully!`,
      record: {
        id: record.id,
        employeeName: record.employeeName,
        checkInTime: record.checkInTime,
        status: record.status,
        type: record.type,
        locationStatus,
      }
    });

  } catch (error: any) {
    console.error("Attendance submission error:", error);
    return NextResponse.json({ error: "Failed to process attendance. Please try again.", details: error.message }, { status: 500 });
  }
}

async function sendWhatsAppMessage(toPhone: string, text: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const cleanPhone = toPhone.replace(/\D/g, "");

  if (process.env.MOCK_MODE === "true" || !token || !phoneId) {
    console.log(`[MOCK MODE] Attendance confirmation WhatsApp to ${toPhone}: ${text}`);
    return;
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: { body: text },
      }),
    });

    const resJson = await response.json();
    if (!response.ok) {
      console.error("Meta WhatsApp confirmation error response:", resJson);
    }
  } catch (err) {
    console.error("Error sending attendance confirmation:", err);
  }
}
