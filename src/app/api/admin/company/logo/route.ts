import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCompanyIdFromRequest } from "@/lib/tenant";
import { uploadCompanyLogo } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const companyId = await getCompanyIdFromRequest(request);
    
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized or missing company context" }, { status: 401 });
    }

    const body = await request.json();
    const { logo } = body;

    if (!logo) {
      return NextResponse.json({ error: "Missing logo data" }, { status: 400 });
    }

    // Upload to Supabase / Local storage
    const logoUrl = await uploadCompanyLogo(companyId, logo);

    // Save url to Company record
    const company = await db.company.update({
      where: { id: companyId },
      data: { logoUrl },
    });

    return NextResponse.json({
      success: true,
      logoUrl: company.logoUrl,
    });
  } catch (error: any) {
    console.error("Upload company logo API error:", error);
    return NextResponse.json({ error: "Failed to upload company logo", details: error.message }, { status: 500 });
  }
}
