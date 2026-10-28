import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLocalCompanies, findPlanRequestByCompanyId } from "@/lib/planRequests";
import { findLocalEmployeeByPhone } from "@/lib/localEmployees";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const rawCompanyId = searchParams.get("companyId");

    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: "Mobile number is required" }, { status: 400 });
    }

    // Safely validate companyId if provided
    let resolvedCompanyId: string | undefined = undefined;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (rawCompanyId && rawCompanyId.trim()) {
      const trimmed = rawCompanyId.trim();
      if (isUuid.test(trimmed)) {
        resolvedCompanyId = trimmed;
      } else {
        try {
          const comp = await db.company.findFirst({
            where: { companyCode: trimmed },
            select: { id: true },
          });
          if (comp) {
            resolvedCompanyId = comp.id;
          }
        } catch {
          // ignore lookup error
        }
      }
    }

    // Normalize phone number variants
    const digitsOnly = phone.replace(/\D/g, "");
    const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
    const cleanPhoneWith91 = "+91" + last10;

    // Lookup active employee by mobile number across multiple common phone formats
    let employee: any = null;
    try {
      employee = await db.employee.findFirst({
        where: {
          status: "active",
          ...(resolvedCompanyId ? { companyId: resolvedCompanyId } : {}),
          OR: [
            { mobileNumber: cleanPhoneWith91 },
            { mobileNumber: last10 },
            { mobileNumber: `0${last10}` },
            { mobileNumber: phone.trim() },
            { mobileNumber: `+${digitsOnly}` },
          ],
        },
      });
    } catch (dbErr: any) {
      console.warn("Database lookup encountered an issue:", dbErr?.message);
    }

    // Fallback to local storage if not found in DB
    if (!employee) {
      const localEmp = findLocalEmployeeByPhone(phone, resolvedCompanyId);
      if (localEmp && localEmp.status === "active") {
        employee = localEmp;
      }
    }

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
      
      let dbCompany: any = null;
      if (isUuid.test(employee.companyId)) {
        dbCompany = await db.company.findUnique({ where: { id: employee.companyId } });
      }

      const mode = localComp?.attendanceMode || planReq?.attendanceMode || (dbCompany as any)?.attendanceMode;
      const sub = (dbCompany?.subscription || "").toLowerCase();

      if (
        mode === "without_photo" ||
        sub.includes("plan a") ||
        sub.includes("plan-a") ||
        sub.includes("without")
      ) {
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
