import { NextResponse } from "next/server";
import { createPlanRequest, getAllPlanRequests } from "@/lib/planRequests";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ success: false, error: "Email query param required" }, { status: 400 });
    }

    const allRequests = getAllPlanRequests();
    const matched = allRequests
      .filter((r) => r.adminEmail.toLowerCase().trim() === email)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!matched) {
      return NextResponse.json({ success: false, error: "No plan request found for this email" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      planRequest: {
        id: matched.id,
        companyName: matched.companyName,
        adminName: matched.adminName,
        adminEmail: matched.adminEmail,
        adminPhone: matched.adminPhone,
        address: matched.address,
        attendanceMode: matched.attendanceMode || "with_photo",
        employeeLimit: matched.employeeLimit,
        planId: matched.planId,
        planName: matched.planName,
        status: matched.status,
      },
    });
  } catch (err: any) {
    console.error("Fetch plan request error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { planId, adminName, adminEmail, adminPhone, companyName, address, attendanceMode } = body;

    if (!adminName || !adminEmail || !adminPhone || !companyName) {
      return NextResponse.json(
        { error: "Please fill in all required fields (Name, Email, Phone, Company Name)." },
        { status: 400 }
      );
    }

    const item = await createPlanRequest({
      planId: planId || "plan-a",
      adminName,
      adminEmail,
      adminPhone,
      companyName,
      address: address || "",
      attendanceMode: attendanceMode || "with_photo",
    });

    return NextResponse.json({
      success: true,
      message: "You get confirmation on your registered mail in 48 hours with id and pass",
      item,
    });
  } catch (err: any) {
    console.error("Plan request error:", err);
    return NextResponse.json(
      { error: "Failed to submit plan request", details: err.message },
      { status: 500 }
    );
  }
}
