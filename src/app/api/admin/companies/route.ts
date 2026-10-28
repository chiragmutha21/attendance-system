import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companySchema, formatZodError } from "@/lib/validation";
import { DEFAULT_COMPANY_ID, companySettingKey, ensureDefaultCompany, ensureAuthUser, defaultOfficeConfig } from "@/lib/tenant";
import { getLocalCompanies, findPlanRequestByEmail } from "@/lib/planRequests";
import { cookies } from "next/headers";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

async function isSuperAdminRequest() {
  const token = (await cookies()).get("super_admin_session")?.value || "";
  if (!token) return false;
  try {
    const secret = process.env.JWT_SECRET || "local-super-admin-secret";
    const payload = jwt.verify(token, secret) as JwtPayload;
    return payload.role === "SUPER_ADMIN";
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    await ensureDefaultCompany();

    const isSuperAdmin = await isSuperAdminRequest();
    const local = getLocalCompanies();

    const enrichCompany = (c: any) => {
      const localComp = local.find((l) => l.id === c.id || (c.adminEmail && l.adminEmail && l.adminEmail.toLowerCase() === c.adminEmail.toLowerCase()));
      const planReq = findPlanRequestByEmail(c.adminEmail || "");
      const mode =
        localComp?.attendanceMode ||
        planReq?.attendanceMode ||
        c.attendanceMode ||
        ((c.subscription || "").toLowerCase().includes("without") ||
        (c.subscription || "").toLowerCase().includes("plan a") ||
        (c.subscription || "").toLowerCase().includes("plan-a")
          ? "without_photo"
          : "with_photo");

      const lat = localComp?.officeLatitude ?? c.officeLatitude;
      const lng = localComp?.officeLongitude ?? c.officeLongitude;
      const rad = localComp?.officeRadiusMeters ?? c.officeRadiusMeters ?? 200;
      const isSaved = localComp?.locationSaved === true || (lat !== null && lat !== undefined && !(lat === 28.6139 && (lng === 77.209 || lng === 77.2090)));

      return {
        ...c,
        officeLatitude: lat,
        officeLongitude: lng,
        officeRadiusMeters: rad,
        locationSaved: isSaved,
        attendanceMode: mode,
      };
    };

    if (isSuperAdmin) {
      const companies = await db.company.findMany({
        include: {
          _count: {
            select: { employees: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json({ success: true, companies: companies.map(enrichCompany) });
    }

    // Determine calling admin user's identity
    const cookieStore = await cookies();
    const adminEmailCookie = cookieStore.get("admin_email")?.value;
    const adminCompanyIdCookie = cookieStore.get("admin_company_id")?.value;
    const headerAdminEmail = request.headers.get("x-admin-email");
    const headerCompanyId = request.headers.get("x-company-id");

    let effectiveEmail = (headerAdminEmail || adminEmailCookie || "").toLowerCase().trim();
    let effectiveCompanyId = headerCompanyId || adminCompanyIdCookie || "";

    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (token && token !== "local-admin-token") {
      try {
        const supabase = getSupabaseServerClient();
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data.user?.email) {
          effectiveEmail = data.user.email.toLowerCase().trim();
        }
      } catch (authErr) {
        // Fallback
      }
    }

    const demoCompany = {
      id: DEFAULT_COMPANY_ID,
      name: "Demo Company",
      companyCode: "01",
      adminName: "Admin",
      adminEmail: "admin@example.com",
      adminPhone: "+919999999999",
      countryCode: "+91",
      employeeLimit: 25,
      status: "active",
      officeLatitude: defaultOfficeConfig.latitude,
      officeLongitude: defaultOfficeConfig.longitude,
      officeRadiusMeters: defaultOfficeConfig.radius,
      _count: { employees: 2 },
    };

    // If demo admin requested or no email specified, return only Demo Company
    if (effectiveEmail === "admin@example.com") {
      return NextResponse.json({ success: true, companies: [demoCompany] });
    }

    // Retrieve matching companies from local store and database
    let matchingCompanies: any[] = [];

    if (effectiveEmail || effectiveCompanyId) {
      // 1. Check local companies store
      const localMatches = local.filter((c) => {
        if (effectiveEmail && c.adminEmail && c.adminEmail.toLowerCase() === effectiveEmail) return true;
        if (effectiveCompanyId && c.id === effectiveCompanyId) return true;
        return false;
      });
      matchingCompanies.push(...localMatches);

      // 2. Check Database companies
      try {
        const dbMatches = await db.company.findMany({
          where: {
            OR: [
              ...(effectiveEmail ? [{ adminEmail: effectiveEmail }] : []),
              ...(effectiveCompanyId ? [{ id: effectiveCompanyId }] : []),
            ],
          },
          include: {
            _count: {
              select: { employees: true },
            },
          },
          orderBy: { createdAt: "asc" },
        });

        for (const dbComp of dbMatches) {
          const existingIdx = matchingCompanies.findIndex((c) => c.id === dbComp.id);
          if (existingIdx >= 0) {
            matchingCompanies[existingIdx] = { ...matchingCompanies[existingIdx], ...dbComp };
          } else {
            matchingCompanies.push(dbComp);
          }
        }
      } catch (dbErr) {
        // Prisma error fallback
      }
    }

    // If still no company found but we have a plan request for this email, provide the company representation
    if (matchingCompanies.length === 0 && effectiveEmail) {
      const planReq = findPlanRequestByEmail(effectiveEmail);
      if (planReq) {
        matchingCompanies.push({
          id: planReq.companyId || `comp_${planReq.id}`,
          name: planReq.companyName,
          companyCode: "01",
          adminName: planReq.adminName,
          adminEmail: planReq.adminEmail,
          adminPhone: planReq.adminPhone,
          countryCode: "+91",
          employeeLimit: planReq.employeeLimit,
          status: "active",
          officeLatitude: 28.6139,
          officeLongitude: 77.2090,
          officeRadiusMeters: 200,
          _count: { employees: 0 },
        });
      }
    }

    // Strict Isolation: If an admin email was provided, return ONLY their matching company
    if (matchingCompanies.length > 0) {
      return NextResponse.json({ success: true, companies: matchingCompanies.map(enrichCompany) });
    }

    // Default fallback if completely unauthenticated
    return NextResponse.json({ success: true, companies: [demoCompany] });
  } catch (error: any) {
    console.warn("Database connection unavailable, using fallback company list:", error.message);
    return NextResponse.json({
      success: true,
      companies: [
        {
          id: DEFAULT_COMPANY_ID,
          name: "Demo Company",
          companyCode: "01",
          adminName: "Admin",
          adminEmail: "admin@example.com",
          adminPhone: "+919999999999",
          countryCode: "+91",
          employeeLimit: 25,
          status: "active",
          officeLatitude: defaultOfficeConfig.latitude,
          officeLongitude: defaultOfficeConfig.longitude,
          officeRadiusMeters: defaultOfficeConfig.radius,
          _count: { employees: 2 }
        }
      ]
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = companySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }

    const {
      name,
      adminName,
      adminEmail,
      adminPhone,
      countryCode,
      employeeLimit,
      subscription,
      status,
      latitude,
      longitude,
      radius,
      address,
    } = parsed.data;

    // Ensure the admin exists in auth.users
    const authUserId = await ensureAuthUser(adminEmail);

    const company = await db.$transaction(async (tx) => {
      const count = await tx.company.count();
      const nextNum = count + 1;
      const companyCode = String(nextNum).padStart(2, "0");

      const createdCompany = await tx.company.create({
        data: {
          name,
          companyCode,
          adminName,
          adminEmail: adminEmail.toLowerCase(),
          adminPhone,
          countryCode,
          employeeLimit,
          subscription,
          status,
          officeLatitude: latitude,
          officeLongitude: longitude,
          officeRadiusMeters: radius,
          address,
        },
      });

      await tx.adminUser.upsert({
        where: { email: adminEmail.toLowerCase() },
        update: {
          authUserId: authUserId,
          name: adminName,
          role: "COMPANY_ADMIN",
          status: "active",
        },
        create: {
          authUserId: authUserId,
          name: adminName,
          email: adminEmail.toLowerCase(),
          role: "COMPANY_ADMIN",
          status: "active",
        },
      });

      // Associate the company with the AdminUser
      const admin = await tx.adminUser.findUnique({
        where: { email: adminEmail.toLowerCase() },
      });

      if (admin) {
        await tx.company.update({
          where: { id: createdCompany.id },
          data: { adminAuthId: admin.id },
        });
      }

      return createdCompany;
    });

    return NextResponse.json({ success: true, company });
  } catch (error: any) {
    console.error("Create company error:", error);
    return NextResponse.json({ error: "Failed to create company", details: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, employeeLimit, subscription, status } = body;

    if (!id) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    const limit = Number(employeeLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 10000) {
      return NextResponse.json({ error: "Employee limit must be between 1 and 10000" }, { status: 400 });
    }

    if (!["trial", "active", "paused", "cancelled"].includes(subscription)) {
      return NextResponse.json({ error: "Invalid subscription status" }, { status: 400 });
    }

    if (!["active", "inactive"].includes(status)) {
      return NextResponse.json({ error: "Invalid company status" }, { status: 400 });
    }

    const company = await db.company.update({
      where: { id },
      data: {
        employeeLimit: limit,
        subscription,
        status,
      },
    });

    return NextResponse.json({ success: true, company });
  } catch (error: any) {
    console.error("Update company error:", error);
    return NextResponse.json({ error: "Failed to update company", details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    if (id === DEFAULT_COMPANY_ID) {
      return NextResponse.json({ error: "Default demo company cannot be deleted" }, { status: 400 });
    }

    await db.company.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Company deleted successfully" });
  } catch (error: any) {
    console.error("Delete company error:", error);
    return NextResponse.json({ error: "Failed to delete company", details: error.message }, { status: 500 });
  }
}
