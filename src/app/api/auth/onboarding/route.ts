import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { uploadCompanyLogo } from "@/lib/storage";
import { 
  getLocalCompanies, 
  saveLocalCompanies, 
  getAllPlanRequests, 
  savePlanRequests,
  findPlanRequestByEmail
} from "@/lib/planRequests";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    const cookieStore = await cookies();
    const cookieAdminEmail = cookieStore.get("admin_email")?.value;
    const cookieCompanyId = cookieStore.get("admin_company_id")?.value;
    const headerAdminEmail = request.headers.get("x-admin-email");
    const headerCompanyId = request.headers.get("x-company-id");

    const body = await request.json();

    let email = (
      headerAdminEmail ||
      cookieAdminEmail ||
      body.adminEmail ||
      ""
    ).toLowerCase().trim();

    let targetCompanyId = headerCompanyId || cookieCompanyId || body.companyId || "";
    let authUserId = "";

    // If Supabase token provided, attempt verification
    if (token && token !== "local-admin-token") {
      try {
        const supabase = getSupabaseServerClient();
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data.user?.email) {
          email = data.user.email.toLowerCase().trim();
          authUserId = data.user.id;
        }
      } catch (authErr) {
        console.warn("Supabase token verification fallback in onboarding:", authErr);
      }
    }

    if (!email) {
      return NextResponse.json({ error: "Admin email is required to complete onboarding" }, { status: 400 });
    }

    const {
      name,
      adminName,
      adminPhone,
      latitude,
      longitude,
      radius,
      logo,
      address,
      attendanceMode,
      geofenceMode,
      shiftStandard,
    } = body;

    const latNum = parseFloat(latitude) || 28.6139;
    const lngNum = parseFloat(longitude) || 77.2090;
    const radiusNum = parseInt(radius) || 200;

    let logoUrl: string | null = null;
    if (logo && targetCompanyId) {
      try {
        logoUrl = await uploadCompanyLogo(targetCompanyId, logo);
      } catch (err) {
        console.warn("Failed to upload company logo:", err);
      }
    }

    // 1. Update in Database if available
    try {
      let dbCompany = null;
      if (targetCompanyId) {
        dbCompany = await db.company.findUnique({ where: { id: targetCompanyId } });
      }
      if (!dbCompany) {
        dbCompany = await db.company.findFirst({ where: { adminEmail: email } });
      }

      if (dbCompany) {
        targetCompanyId = dbCompany.id;
        if (logo && !logoUrl) {
          try {
            logoUrl = await uploadCompanyLogo(targetCompanyId, logo);
          } catch (e) {}
        }

        await db.company.update({
          where: { id: targetCompanyId },
          data: {
            name: name || dbCompany.name,
            adminName: adminName || dbCompany.adminName,
            adminPhone: adminPhone || dbCompany.adminPhone,
            officeLatitude: latNum,
            officeLongitude: lngNum,
            officeRadiusMeters: radiusNum,
            address: address || dbCompany.address,
            ...(logoUrl ? { logoUrl } : {}),
          },
        });
      } else {
        // Create new company in DB
        const count = await db.company.count();
        const nextNum = count + 1;
        const companyCode = String(nextNum).padStart(2, "0");

        const created = await db.company.create({
          data: {
            name: name || "My Company",
            companyCode,
            adminName: adminName || "Admin",
            adminEmail: email,
            adminPhone: adminPhone || "+919999999999",
            countryCode: "+91",
            employeeLimit: 50,
            subscription: "Standard",
            status: "active",
            officeLatitude: latNum,
            officeLongitude: lngNum,
            officeRadiusMeters: radiusNum,
            address: address || "",
            ...(logoUrl ? { logoUrl } : {}),
          },
        });
        targetCompanyId = created.id;
      }
    } catch (dbErr: any) {
      console.warn("Database unavailable during onboarding save (using local sync):", dbErr.message);
    }

    if (!targetCompanyId) {
      targetCompanyId = `comp_${Date.now()}`;
    }

    // 2. Update local companies store
    const localCompanies = getLocalCompanies();
    const existingIdx = localCompanies.findIndex(
      (c) => (targetCompanyId && c.id === targetCompanyId) || (c.adminEmail && c.adminEmail.toLowerCase() === email)
    );

    if (existingIdx !== -1) {
      localCompanies[existingIdx] = {
        ...localCompanies[existingIdx],
        name: name || localCompanies[existingIdx].name,
        adminName: adminName || localCompanies[existingIdx].adminName,
        adminPhone: adminPhone || localCompanies[existingIdx].adminPhone,
        officeLatitude: latNum,
        officeLongitude: lngNum,
        officeRadiusMeters: radiusNum,
        address: address || localCompanies[existingIdx].address,
        attendanceMode: attendanceMode || localCompanies[existingIdx].attendanceMode,
        geofenceMode: geofenceMode || "strict",
        shiftStandard: shiftStandard || "8_hours",
        ...(logoUrl ? { logoUrl } : {}),
        onboarded: true,
        updatedAt: new Date().toISOString(),
      };
    } else {
      localCompanies.push({
        id: targetCompanyId,
        name: name || "My Company",
        companyCode: "01",
        adminName: adminName || "Admin",
        adminEmail: email,
        adminPhone: adminPhone || "+919999999999",
        countryCode: "+91",
        employeeLimit: 50,
        status: "active",
        officeLatitude: latNum,
        officeLongitude: lngNum,
        officeRadiusMeters: radiusNum,
        address: address || "",
        attendanceMode: attendanceMode || "with_photo",
        geofenceMode: geofenceMode || "strict",
        shiftStandard: shiftStandard || "8_hours",
        ...(logoUrl ? { logoUrl } : {}),
        onboarded: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    saveLocalCompanies(localCompanies);

    // 3. Mark plan request as onboarded
    const planRequests = getAllPlanRequests();
    const planIdx = planRequests.findIndex((r) => r.adminEmail.toLowerCase() === email);
    if (planIdx !== -1) {
      planRequests[planIdx] = {
        ...planRequests[planIdx],
        companyId: targetCompanyId,
        companyName: name || planRequests[planIdx].companyName,
        adminName: adminName || planRequests[planIdx].adminName,
        adminPhone: adminPhone || planRequests[planIdx].adminPhone,
        address: address || planRequests[planIdx].address,
        attendanceMode: attendanceMode || planRequests[planIdx].attendanceMode,
        onboarded: true,
        updatedAt: new Date().toISOString(),
      };
      savePlanRequests(planRequests);
    }

    const response = NextResponse.json({
      success: true,
      companyId: targetCompanyId,
      onboarded: true,
    });

    response.cookies.set("admin_onboarded", "true", {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });

    response.cookies.set("admin_company_id", targetCompanyId, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "Failed to complete onboarding", details: error.message }, { status: 500 });
  }
}
