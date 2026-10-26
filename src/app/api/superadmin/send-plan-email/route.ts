import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { getAllPlanRequests } from "@/lib/planRequests";
import { sendPlanApprovalEmail } from "@/lib/email";

async function isSuperAdminRequest() {
  const cookieStore = await cookies();
  const token = cookieStore.get("super_admin_session")?.value || "";
  if (!token) return false;
  try {
    const secret = process.env.JWT_SECRET || "local-super-admin-secret";
    const payload = jwt.verify(token, secret) as JwtPayload;
    return payload.role === "SUPER_ADMIN";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const isSuper = await isSuperAdminRequest();
  if (!isSuper) {
    return NextResponse.json({ error: "Unauthorized Super Admin" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
    }

    const requests = getAllPlanRequests();
    const item = requests.find((r) => r.id === requestId);

    if (!item) {
      return NextResponse.json({ error: "Plan request not found" }, { status: 404 });
    }

    const origin = request.headers.get("origin") || "https://presivox.com";
    const result = await sendPlanApprovalEmail({ item, origin });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Official login credentials successfully emailed to ${item.adminEmail}`,
    });
  } catch (err: any) {
    console.error("Send plan email API error:", err);
    return NextResponse.json({ error: "Failed to send email", details: err.message }, { status: 500 });
  }
}
