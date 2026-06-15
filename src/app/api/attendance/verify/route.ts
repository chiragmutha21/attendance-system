import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token parameter is missing" }, { status: 400 });
    }

    // Lookup token in DB
    const link = await db.attendanceLink.findUnique({
      where: { token: token },
    });

    if (!link) {
      return NextResponse.json({ error: "Invalid check-in link. Access Denied." }, { status: 404 });
    }

    // Check if token has already been used
    if (link.used) {
      return NextResponse.json({ error: "This check-in link has already been used." }, { status: 410 });
    }

    // Check if token has expired
    const now = new Date();
    if (new Date(link.expiresAt) < now) {
      return NextResponse.json({ error: "This check-in link has expired (5-minute limit exceeded)." }, { status: 410 });
    }

    // Retrieve employee info
    const employee = await db.employee.findUnique({
      where: { companyId_employeeId: { companyId: link.companyId, employeeId: link.employeeId } },
    });

    if (!employee || employee.status !== "active") {
      return NextResponse.json({ error: "Employee is inactive or not found." }, { status: 403 });
    }

    return NextResponse.json({
      valid: true,
      isMock: process.env.MOCK_MODE === "true",
      expiresAt: link.expiresAt,
      employee: {
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        department: employee.department,
        role: employee.role,
        registeredFaceImage: employee.registeredFaceImage,
      },
    });

  } catch (error: any) {
    console.error("Token verification error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
