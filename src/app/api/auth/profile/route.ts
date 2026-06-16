import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user?.email) {
      console.error("Supabase token verification failed in /api/auth/profile:", error);
      return NextResponse.json({ 
        error: "Invalid auth token", 
        details: error?.message || "No user email found" 
      }, { status: 401 });
    }

    const email = data.user.email.toLowerCase();
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || "").toLowerCase();

    if (email === superAdminEmail) {
      const admin = await db.adminUser.upsert({
        where: { email },
        update: { role: "SUPER_ADMIN", status: "active" },
        create: {
          authUserId: data.user.id,
          name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || "Super Admin",
          email,
          role: "SUPER_ADMIN",
          status: "active",
        },
      });

      return NextResponse.json({
        success: true,
        user: { email, name: admin.name },
        role: "SUPER_ADMIN",
        companyId: null,
        needsOnboarding: false,
      });
    }

    const admin = await db.adminUser.findUnique({
      where: { email },
      include: { companies: true },
    });

    const company = admin?.companies[0];

    if (!admin || !company) {
      return NextResponse.json({
        success: true,
        user: {
          email,
          name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || "",
        },
        role: null,
        companyId: null,
        needsOnboarding: true,
      });
    }

    return NextResponse.json({
      success: true,
      user: { email, name: admin.name },
      role: admin.role,
      companyId: company.id,
      company: company,
      needsOnboarding: false,
    });
  } catch (error: any) {
    console.error("Auth profile error:", error);
    return NextResponse.json({ error: "Failed to resolve auth profile" }, { status: 500 });
  }
}
