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

    // 3. Fetch company-specific office config settings
    const officeConfig = await getOfficeConfig(companyId);

    // 4. Calculate Distance using Haversine
    const distance = calculateDistance(
      latitude,
      longitude,
      officeConfig.latitude,
      officeConfig.longitude
    );

    // Reject if GPS coordinate is outside the allowed office radius
    if (distance > officeConfig.radius) {
      return NextResponse.json({
        error: `GPS Verification Failed: You are outside the allowed office boundary. Your distance is ${Math.round(distance)} meters, but you must be within ${officeConfig.radius} meters of the office.`,
        distance: Math.round(distance),
        allowedRadius: officeConfig.radius
      }, { status: 400 });
    }

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
        distanceFromOffice: distance,
        status: "present", // Present since within radius
        type: type,
        timezone: timezone || "Asia/Kolkata",
        deviceInfo: deviceInfo || "Unknown Device",
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
    const confirmationMessage = `Your ${label} marked successfully.\n\nLocation: In Office\nTime: ${markedTime}`;
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
        locationStatus: "In Office",
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
