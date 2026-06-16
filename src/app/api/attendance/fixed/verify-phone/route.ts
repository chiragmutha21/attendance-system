import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

    return NextResponse.json({
      success: true,
      employee: {
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        department: employee.department,
        role: employee.role,
        registeredFaceImage: employee.registeredFaceImage,
        companyId: employee.companyId,
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
