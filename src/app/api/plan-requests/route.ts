import { NextResponse } from "next/server";
import { createPlanRequest, getAllPlanRequests } from "@/lib/planRequests";

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
