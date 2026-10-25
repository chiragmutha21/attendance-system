import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLocalCompanies, findPlanRequestByCompanyId } from "@/lib/planRequests";
import { DEFAULT_COMPANY_ID, defaultOfficeConfig } from "@/lib/tenant";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const companyId = searchParams.get("companyId") || searchParams.get("id");

    if (!code && !companyId) {
      return NextResponse.json({ error: "Company code or companyId is required" }, { status: 400 });
    }

    // 1. Try finding in local companies cache
    const localCompanies = getLocalCompanies();
    const localMatch = localCompanies.find(
      (c) => (companyId && c.id === companyId) || (code && c.companyCode === code)
    );

    if (localMatch) {
      return NextResponse.json({
        success: true,
        company: {
          id: localMatch.id,
          name: localMatch.name,
          address: localMatch.address || "Main Office",
          attendanceMode: localMatch.attendanceMode || "with_photo",
          planId: localMatch.planId || "plan-a",
          employeeLimit: localMatch.employeeLimit || 25,
          latitude: localMatch.officeLatitude ?? 28.6139,
          longitude: localMatch.officeLongitude ?? 77.2090,
          radius: localMatch.officeRadiusMeters ?? 200,
        },
      });
    }

    // 2. Check if it's the default demo company
    if (companyId === DEFAULT_COMPANY_ID || code === "01" || code === "default") {
      return NextResponse.json({
        success: true,
        company: {
          id: DEFAULT_COMPANY_ID,
          name: "Demo Company",
          address: "Main Office",
          attendanceMode: "with_photo",
          planId: "plan-a",
          employeeLimit: 25,
          latitude: defaultOfficeConfig.latitude,
          longitude: defaultOfficeConfig.longitude,
          radius: defaultOfficeConfig.radius,
        },
      });
    }

    // 3. Check plan requests store directly
    if (companyId) {
      const planReq = findPlanRequestByCompanyId(companyId);
      if (planReq && planReq.status === "approved") {
        return NextResponse.json({
          success: true,
          company: {
            id: planReq.companyId,
            name: planReq.companyName,
            address: planReq.address || "Main Office",
            attendanceMode: planReq.attendanceMode,
            planId: planReq.planId,
            employeeLimit: planReq.employeeLimit,
            latitude: 28.6139,
            longitude: 77.2090,
            radius: 200,
          },
        });
      }
    }

    // 4. Try querying Prisma database (if online)
    try {
      const company = await db.company.findFirst({
        where: {
          OR: [
            ...(companyId ? [{ id: companyId }] : []),
            ...(code ? [{ companyCode: code }] : []),
          ],
        },
      });

      if (company && company.status === "active") {
        return NextResponse.json({
          success: true,
          company: {
            id: company.id,
            name: company.name,
            address: company.address || "Main Office",
            attendanceMode: (company as any).attendanceMode || "with_photo",
            planId: (company as any).planId || "plan-a",
            employeeLimit: company.employeeLimit || 25,
            latitude: company.officeLatitude ?? 28.6139,
            longitude: company.officeLongitude ?? 77.2090,
            radius: company.officeRadiusMeters ?? 200,
          },
        });
      }
    } catch (dbErr) {
      console.warn("DB lookup failed in resolve company, returning fallback:", dbErr);
    }

    return NextResponse.json({ error: "Company not found or inactive" }, { status: 404 });
  } catch (error: any) {
    console.error("Resolve company error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
