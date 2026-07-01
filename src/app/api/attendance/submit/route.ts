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
    const { token, selfie, latitude, longitude, accuracy, timezone, deviceInfo } = body;

    // 1. Basic validation
    if (!token || !selfie || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "Missing required fields (token, selfie, or GPS coordinates)" }, { status: 400 });
    }

    // 2. Validate token in DB
    const link = await db.attendanceLink.findUnique({
      where: { token: token },
    });

    if (!link) {
      return NextResponse.json({ error: "Invalid check-in link. Request denied." }, { status: 404 });
    }

    if (link.used) {
      return NextResponse.json({ error: "This check-in link has already been used." }, { status: 410 });
    }

    const now = new Date();
    if (new Date(link.expiresAt) < now) {
      return NextResponse.json({ error: "This check-in link has expired." }, { status: 410 });
    }

    // 3. Get Employee details
    const employee = await db.employee.findUnique({
      where: { companyId_employeeId: { companyId: link.companyId, employeeId: link.employeeId } },
    });

    if (!employee || employee.status !== "active") {
      return NextResponse.json({ error: "Employee is inactive or not found." }, { status: 403 });
    }

    // 3.5 Face matching verification (Validated client-side, fallback check here)
    if (!employee.registeredFaceImage) {
      return NextResponse.json({
        error: "Face Verification Not Configured: No registered profile photo found. Please ask your administrator to upload a photo."
      }, { status: 400 });
    }

    // 4. Fetch assigned branches and calculate nearest branch distance
    const assignedBranchIds = employee.assignedBranchIds || [];
    let targetBranches = await db.branch.findMany({
      where: {
        id: { in: assignedBranchIds },
        companyId: link.companyId,
      },
    });

    // Fallback if no branches are assigned
    if (targetBranches.length === 0) {
      targetBranches = await db.branch.findMany({
        where: { companyId: link.companyId },
      });
      if (targetBranches.length === 0) {
        const company = await db.company.findUnique({ where: { id: link.companyId } });
        if (company) {
          const mainOffice = await db.branch.create({
            data: {
              companyId: link.companyId,
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

    // 6. Save Selfie Image
    let selfieUrl = "";
    
    // Check for mock mode
    const isMock = process.env.MOCK_MODE === "true";
    const folderName = await getCompanyFolderName(link.companyId);

    if (isMock) {
      // Process Base64 image upload and save to public/uploads/EMPLOYEE_SELFIE/<folderName>/
      const base64Data = selfie.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      
      const fileName = `${employee.employeeId}_${Date.now()}.jpg`;
      
      // Ensure public/uploads/EMPLOYEE_SELFIE/<folderName> directory exists
      const uploadDir = join(process.cwd(), "public", "uploads", "EMPLOYEE_SELFIE", folderName);
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      const filePath = join(uploadDir, fileName);
      await writeFile(filePath, buffer);
      
      // Publicly accessible URL in Next.js public directory
      selfieUrl = `/uploads/EMPLOYEE_SELFIE/${folderName}/${fileName}`;
      console.log(`[MOCK MODE] Saved selfie locally: ${selfieUrl}`);
    } else {
      // Production Mode: Upload to EMPLOYEE_SELFIE bucket under <folderName>/ folder
      const base64Data = selfie.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `${employee.employeeId}_${Date.now()}.jpg`;

      // Lazy import Supabase to avoid exceptions if keys aren't set
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
      console.log(`[PRODUCTION MODE] Saved selfie to EMPLOYEE_SELFIE bucket: ${selfieUrl}`);
    }

    // 6.5 Validate session constraints (prevent double check-in and handle overnight open sessions)
    const lastRecord = await db.attendanceRecord.findFirst({
      where: {
        employeeId: employee.employeeId,
        companyId: link.companyId,
      },
      orderBy: {
        checkInTime: "desc",
      },
    });

    if (lastRecord && lastRecord.type === "check-in") {
      return NextResponse.json(
        { error: "You are already checked in. Please check out before checking in again." },
        { status: 400 }
      );
    }

    // 7. Perform DB Transaction: Create Attendance Record and flag link as used
    const result = await db.$transaction(
      async (tx) => {
        // Mark link as used
        await tx.attendanceLink.update({
          where: { token: token },
          data: { used: true },
        });

        // Log Attendance Record
        const record = await tx.attendanceRecord.create({
          data: {
            employeeId: employee.employeeId,
            companyId: link.companyId,
            employeeName: employee.fullName,
            selfieUrl: selfieUrl,
            latitude: latitude,
            longitude: longitude,
            accuracy: accuracy || 0,
            distanceFromOffice: minDistance,
            status: isWithinRadius ? "present" : "outside",
            timezone: timezone || "Asia/Kolkata",
            deviceInfo: deviceInfo || "Unknown Device",
            branchId: nearestBranch.id,
            branchName: nearestBranch.name,
            distanceFromBranch: minDistance,
          },
        });

        return record;
      },
      {
        timeout: 30000,
      }
    );

    console.log(`Attendance successfully logged for ${employee.fullName} (ID: ${employee.employeeId}). Record ID: ${result.id}`);

    const markedTime = new Date(result.checkInTime).toLocaleString("en-IN", {
      timeZone: timezone || "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const isPresent = result.status === "present";
    const locationStatus = isPresent ? `In Office (${result.branchName || "Main Office"})` : `Outside Boundary (${result.branchName || "Main Office"})`;
    const locationLabel = isPresent ? "In Office" : "Outside Office Boundary";
    const confirmationMessage = `Your attendance marked successfully.\n\nBranch: ${result.branchName || "Main Office"}\nLocation: ${locationLabel}\nTime: ${markedTime}`;
    await sendWhatsAppMessage(employee.mobileNumber, confirmationMessage);

    return NextResponse.json({
      success: true,
      message: "Attendance marked successfully!",
      record: {
        id: result.id,
        employeeName: result.employeeName,
        checkInTime: result.checkInTime,
        status: result.status,
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
