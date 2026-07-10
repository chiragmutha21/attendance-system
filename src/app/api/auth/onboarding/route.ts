import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { companySettingKey } from "@/lib/tenant";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { companySchema, formatZodError } from "@/lib/validation";
import { uploadCompanyLogo } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user?.email) {
      console.error("Supabase token verification failed in /api/auth/onboarding:", error);
      return NextResponse.json({ 
        error: "Invalid auth token", 
        details: error?.message || "No user email found" 
      }, { status: 401 });
    }

    const email = data.user.email.toLowerCase();
    const existing = await db.adminUser.findUnique({
      where: { email },
      include: { companies: true },
    });
    if (existing?.companies && existing.companies.length > 0) {
      return NextResponse.json({ success: true, companyId: existing.companies[0].id, alreadyOnboarded: true });
    }

    const body = await request.json();
    const parsed = companySchema.safeParse({
      ...body,
      adminEmail: email,
      adminName: body.adminName || data.user.user_metadata?.full_name || data.user.user_metadata?.name || email,
    });

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
      logo,
    } = parsed.data;

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
        },
      });

      if (logo) {
        try {
          const logoUrl = await uploadCompanyLogo(createdCompany.id, logo);
          await tx.company.update({
            where: { id: createdCompany.id },
            data: { logoUrl },
          });
        } catch (uploadErr) {
          console.error("Failed to upload company logo in onboarding:", uploadErr);
        }
      }

      await tx.adminUser.upsert({
        where: { email: adminEmail.toLowerCase() },
        update: {
          authUserId: data.user.id,
          name: adminName,
          role: "COMPANY_ADMIN",
          status: "active",
        },
        create: {
          authUserId: data.user.id,
          name: adminName,
          email: adminEmail.toLowerCase(),
          role: "COMPANY_ADMIN",
          status: "active",
        },
      });

      // Update the newly created company to associate it with the admin user
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

    return NextResponse.json({ success: true, companyId: company.id });
  } catch (error: any) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "Failed to complete onboarding", details: error.message }, { status: 500 });
  }
}
