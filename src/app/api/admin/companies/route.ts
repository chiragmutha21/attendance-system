import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companySchema, formatZodError } from "@/lib/validation";
import { DEFAULT_COMPANY_ID, companySettingKey, ensureDefaultCompany, ensureAuthUser } from "@/lib/tenant";
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

    if (isSuperAdmin) {
      const companies = await db.company.findMany({
        include: {
          _count: {
            select: { employees: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json({ success: true, companies });
    }

    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json({ success: true, companies: [] });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user?.email) {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
    }

    const email = data.user.email.toLowerCase();

    const companies = await db.company.findMany({
      where: {
        adminEmail: email,
      },
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, companies });
  } catch (error: any) {
    console.error("List companies error:", error);
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
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
