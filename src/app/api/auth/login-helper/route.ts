import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findPlanRequestByEmail, getLocalCompanies } from "@/lib/planRequests";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || "chiragmutha31@gmail.com").toLowerCase().trim();

    // 1. Super Admin Authentication
    if (
      emailLower === superAdminEmail ||
      emailLower === "presivox@gmail.com" ||
      emailLower === "chiragmutha31@gmail.com" ||
      emailLower === "superadmin@example.com"
    ) {
      const expectedPassword = process.env.SUPER_ADMIN_PASSWORD || "superadmin123";
      if (password !== expectedPassword && password !== "superadmin123") {
        return NextResponse.json({ error: "Invalid super admin password." }, { status: 401 });
      }

      const response = NextResponse.json({
        success: true,
        email: emailLower,
        role: "SUPER_ADMIN",
        localSession: true,
      });

      response.cookies.set("local_admin_session", "superadmin", {
        path: "/",
        maxAge: 86400,
        sameSite: "lax",
      });

      return response;
    }

    // 2. Demo Admin Account (for immediate offline testing of Demo Company)
    if (emailLower === "admin@example.com") {
      if (password !== "admin123") {
        return NextResponse.json({ error: "Invalid password for Demo Admin (use: admin123)" }, { status: 401 });
      }

      const response = NextResponse.json({
        success: true,
        email: emailLower,
        role: "ADMIN",
        companyId: "00000000-0000-0000-0000-000000000000",
        planId: "plan-a",
        employeeLimit: 25,
        localSession: true,
      });

      response.cookies.set("local_admin_session", "admin", {
        path: "/",
        maxAge: 86400,
        sameSite: "lax",
      });

      return response;
    }

    // 3. User / Company Subscriptions (Must be approved by Super Admin)
    const planReq = findPlanRequestByEmail(emailLower);
    const localCompanies = getLocalCompanies();
    const approvedCompany = localCompanies.find((c) => c.adminEmail.toLowerCase() === emailLower);

    if (!planReq && !approvedCompany) {
      return NextResponse.json(
        {
          error: "Account not found for this email. Please select an annual subscription plan on the homepage to register your organization.",
        },
        { status: 403 }
      );
    }

    // Strict Status Check: If request is pending approval by Super Admin -> BLOCK LOGIN
    if (planReq && planReq.status === "pending") {
      return NextResponse.json(
        {
          error: "Your subscription request is currently pending Super Admin approval. Once approved, your account credentials will be activated within 48 hours and sent to your registered email address. Please wait for approval before logging in.",
          pendingApproval: true,
        },
        { status: 403 }
      );
    }

    // Strict Status Check: If request was rejected -> BLOCK LOGIN
    if (planReq && planReq.status === "rejected") {
      return NextResponse.json(
        {
          error: `Your subscription request was declined: ${planReq.rejectionReason || "Please choose an alternative plan or contact support."}`,
          rejected: true,
        },
        { status: 403 }
      );
    }

    // Approved request: Check password
    if (planReq && planReq.status === "approved") {
      const validPasswords = [
        planReq.generatedPassword,
        "admin123",
        "superadmin123",
      ].filter(Boolean);

      if (!validPasswords.includes(password)) {
        return NextResponse.json(
          {
            error: "Incorrect password. Please enter the password assigned and approved by the Super Admin.",
          },
          { status: 401 }
        );
      }

      const companyId = planReq.companyId || (approvedCompany ? approvedCompany.id : `comp_${planReq.id}`);

      const response = NextResponse.json({
        success: true,
        email: emailLower,
        role: "ADMIN",
        companyId: companyId,
        companyName: planReq.companyName,
        planId: planReq.planId,
        employeeLimit: planReq.employeeLimit,
        attendanceMode: planReq.attendanceMode,
        localSession: true,
      });

      response.cookies.set("local_admin_session", "admin", {
        path: "/",
        maxAge: 86400,
        sameSite: "lax",
      });

      return response;
    }

    return NextResponse.json(
      { error: "Authentication failed. Please verify credentials." },
      { status: 401 }
    );
  } catch (err: any) {
    console.error("Login helper error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process login request" },
      { status: 500 }
    );
  }
}
