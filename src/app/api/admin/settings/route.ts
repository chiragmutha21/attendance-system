import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companySettingKey, defaultOfficeConfig, getCompanyIdFromRequest, getOfficeConfig } from "@/lib/tenant";

// GET: Fetch office config
export async function GET(request: Request) {
  try {
    const companyId = await getCompanyIdFromRequest(request);
    const officeConfig = await getOfficeConfig(companyId);

    return NextResponse.json({ success: true, officeConfig });
  } catch (error: any) {
    console.error("Fetch setting error:", error);
    return NextResponse.json({ error: "Failed to fetch configurations" }, { status: 500 });
  }
}

// POST/PUT: Update office config
export async function POST(request: Request) {
  try {
    const companyId = await getCompanyIdFromRequest(request);
    const body = await request.json();
    const { latitude, longitude, radius } = body;

    if (latitude === undefined || longitude === undefined || radius === undefined) {
      return NextResponse.json({ error: "Latitude, longitude, and radius are required" }, { status: 400 });
    }

    const latNum = Number.isFinite(parseFloat(latitude)) ? parseFloat(latitude) : defaultOfficeConfig.latitude;
    const lngNum = Number.isFinite(parseFloat(longitude)) ? parseFloat(longitude) : defaultOfficeConfig.longitude;
    const radNum = Number.isFinite(parseInt(radius)) ? parseInt(radius) : defaultOfficeConfig.radius;

    const company = await db.company.update({
      where: { id: companyId },
      data: {
        officeLatitude: latNum,
        officeLongitude: lngNum,
        officeRadiusMeters: radNum,
      },
    });

    return NextResponse.json({
      success: true,
      config: {
        latitude: company.officeLatitude,
        longitude: company.officeLongitude,
        radius: company.officeRadiusMeters,
      }
    });
  } catch (error: any) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "Failed to save office configurations", details: error.message }, { status: 500 });
  }
}
