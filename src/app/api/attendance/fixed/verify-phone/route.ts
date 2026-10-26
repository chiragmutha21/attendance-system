import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLocalCompanies, findPlanRequestByCompanyId } from "@/lib/planRequests";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const companyId = searchParams.get("companyId");

    if (!phone) {
      return NextResponse.json({ error: "Mobile number is required" }, { status: 400 });
    }

    // Normalize phone number: remove non-digits (keep + if present)
    let cleanPhone = phone.replace(/[^\d+]/g, "");
    if (cleanPhone.startsWith("+")) {
      const digitsOnly = cleanPhone.slice(1).replace(/\D/g, "");
      cleanPhone = "+" + digitsOnly;
    } else {
      const digitsOnly = cleanPhone.replace(/\D/g, "");
      if (digitsOnly.length === 10) {
        cleanPhone = "+91" + digitsOnly;
      } else {
        cleanPhone = "+" + digitsOnly;
      }
    }

    // Lookup active employee by mobile number
    const employee = await db.employee.findFirst({
      where: {
        mobileNumber: cleanPhone,
        status: "active",
        ...(companyId ? { companyId } : {}),
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee mobile number not registered or inactive." },
        { status: 404 }
      );
    }

    // Determine company's configured attendance mode (with_photo vs without_photo)
    let attendanceMode: "with_photo" | "without_photo" = "with_photo";
    try {
      const local = getLocalCompanies();
      const localComp = local.find((c) => c.id === employee.companyId);
      const planReq = findPlanRequestByCompanyId(employee.companyId);
      const dbCompany = await db.company.findUnique({ where: { id: employee.companyId } });

      const mode = localComp?.attendanceMode || planReq?.attendanceMode;
      const sub = (dbCompany?.subscription || "").toLowerCase();

      if (mode === "without_photo" || sub.includes("plan a") || sub.includes("plan-a") || sub.includes("without")) {
        attendanceMode = "without_photo";
      }
    } catch (e) {
      // Fallback
    }

    return NextResponse.json({
      success: true,
      attendanceMode,
      employee: {
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        department: employee.department,
        role: employee.role,
        registeredFaceImage: employee.registeredFaceImage,
        companyId: employee.companyId,
        attendanceMode,
      },
    });
  } catch (error: any) {
    console.error("Fixed verify-phone error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
