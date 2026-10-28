import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { defaultOfficeConfig, getCompanyIdFromRequest, getOfficeConfig } from "@/lib/tenant";
import { getLocalCompanies, saveLocalCompanies } from "@/lib/planRequests";

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

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId);

    // 1. Update Database Company if UUID
    let dbUpdated = false;
    if (isUuid) {
      try {
        await db.company.update({
          where: { id: companyId },
          data: {
            officeLatitude: latNum,
            officeLongitude: lngNum,
            officeRadiusMeters: radNum,
          },
        });
        dbUpdated = true;

        // Sync main office branch in DB
        const mainBranch = await db.branch.findFirst({
          where: { companyId, isMainOffice: true },
        });

        if (mainBranch) {
          await db.branch.update({
            where: { id: mainBranch.id },
            data: {
              latitude: latNum,
              longitude: lngNum,
              radiusMeters: radNum,
            },
          });
        } else {
          await db.branch.create({
            data: {
              companyId,
              name: "Head Office",
              address: "Main Office Location",
              latitude: latNum,
              longitude: lngNum,
              radiusMeters: radNum,
              isMainOffice: true,
            },
          });
        }
      } catch (dbErr: any) {
        console.warn("Database company update warning:", dbErr.message);
      }
    }

    // 2. Update local-companies store to persist across refreshes
    try {
      const local = getLocalCompanies();
      const compIdx = local.findIndex((c: any) => c.id === companyId);
      if (compIdx >= 0) {
        local[compIdx].officeLatitude = latNum;
        local[compIdx].officeLongitude = lngNum;
        local[compIdx].officeRadiusMeters = radNum;
        local[compIdx].locationSaved = true;
        saveLocalCompanies(local);
      } else {
        local.push({
          id: companyId,
          officeLatitude: latNum,
          officeLongitude: lngNum,
          officeRadiusMeters: radNum,
          locationSaved: true,
        });
        saveLocalCompanies(local);
      }
    } catch (localErr: any) {
      console.warn("Local companies update warning:", localErr.message);
    }

    return NextResponse.json({
      success: true,
      locationSaved: true,
      config: {
        latitude: latNum,
        longitude: lngNum,
        radius: radNum,
        locationSaved: true,
      },
    });
  } catch (error: any) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "Failed to save office configurations", details: error.message }, { status: 500 });
  }
}
