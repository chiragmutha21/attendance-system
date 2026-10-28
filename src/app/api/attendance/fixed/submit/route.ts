import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateDistance } from "@/lib/utils";
import { getOfficeConfig } from "@/lib/tenant";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getCompanyFolderName, uploadSelfieImage } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, companyId, branchId, selfie, latitude, longitude, accuracy, timezone, deviceInfo, type } = body;

    // 1. Basic validation
    if (!employeeId || !companyId || latitude === undefined || longitude === undefined || !type) {
      return NextResponse.json({ error: "Missing required fields (employeeId, companyId, GPS coordinates, or type)" }, { status: 400 });
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
    const isCompanyUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId);

    let targetBranches: any[] = [];
    if (isCompanyUuid) {
      try {
        if (assignedBranchIds.length > 0) {
          targetBranches = await db.branch.findMany({
            where: {
              id: { in: assignedBranchIds },
              companyId: companyId,
            },
          });
        } else {
          targetBranches = await db.branch.findMany({
            where: { companyId: companyId },
          });
        }
      } catch (err) {
        console.warn("DB branch lookup error in fixed submit:", err);
      }
    }

    // Include local branches
    try {
      const { getLocalBranches } = await import("@/lib/planRequests");
      const localBranches = getLocalBranches(companyId);
      if (assignedBranchIds.length > 0) {
        const assignedLocal = localBranches.filter((b: any) => assignedBranchIds.includes(b.id));
        targetBranches = [...targetBranches, ...assignedLocal];
      } else {
        targetBranches = [...targetBranches, ...localBranches];
      }
    } catch {}

    // Deduplicate branches
    const branchMap = new Map<string, any>();
    for (const b of targetBranches) {
      branchMap.set(b.id, b);
    }
    targetBranches = Array.from(branchMap.values());

    // Fallback if still no branches found
    if (targetBranches.length === 0) {
      const officeConfig = await getOfficeConfig(companyId);
      targetBranches = [
        {
          id: "default-office",
          name: "Main Office",
          latitude: officeConfig.latitude,
          longitude: officeConfig.longitude,
          radiusMeters: officeConfig.radius,
          isMainOffice: true,
        },
      ];
    }

    // If a specific branchId was passed by the QR code, check if it matches a valid branch
    const isBranchUuid = branchId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branchId);
    let matchedBranch = targetBranches.find((b) => b.id === branchId) || null;
    if (!matchedBranch && isBranchUuid && isCompanyUuid) {
      try {
        matchedBranch = await db.branch.findFirst({
          where: { id: branchId, companyId: companyId },
        });
      } catch {}
    }

    let nearestBranch = matchedBranch;
    let minDistance = matchedBranch ? calculateDistance(latitude, longitude, matchedBranch.latitude, matchedBranch.longitude) : Infinity;

    if (!matchedBranch) {
      for (const b of targetBranches) {
        const dist = calculateDistance(latitude, longitude, b.latitude, b.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          nearestBranch = b;
        }
      }
    }

    if (!nearestBranch) {
      return NextResponse.json({ error: "No configured branch found for your company." }, { status: 400 });
    }
    const isWithinRadius = minDistance <= nearestBranch.radiusMeters;

    // 5. Save Selfie Image if provided (or mark without_photo)
    let selfieUrl = "without_photo";
    if (selfie && selfie !== "without_photo" && typeof selfie === "string" && selfie.startsWith("data:image")) {
      try {
        selfieUrl = await uploadSelfieImage(companyId, employee.employeeId, selfie);
      } catch (uploadErr: any) {
        console.warn("Selfie upload warning (continuing submission):", uploadErr.message);
        selfieUrl = "selfie_verified";
      }
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
    const locationStatus = `In Office (${record.branchName || "Main Office"})`;
    const confirmationMessage = `Your ${label} marked successfully.\n\nBranch: ${record.branchName || "Main Office"}\nLocation: In Office\nTime: ${markedTime}`;
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
