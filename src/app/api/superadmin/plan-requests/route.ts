import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { getAllPlanRequests, getAllPlanRequestsAsync, approvePlanRequest, rejectPlanRequest } from "@/lib/planRequests";

async function isSuperAdminRequest() {
  const cookieStore = await cookies();
  const local = cookieStore.get("local_admin_session")?.value;
  if (local === "superadmin") return true;

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

export async function GET() {
  const isSuper = await isSuperAdminRequest();
  if (!isSuper) {
    return NextResponse.json({ error: "Unauthorized Super Admin" }, { status: 401 });
  }

  const requests = await getAllPlanRequestsAsync();
  return NextResponse.json({ success: true, requests });
}

export async function POST(request: Request) {
  const isSuper = await isSuperAdminRequest();
  if (!isSuper) {
    return NextResponse.json({ error: "Unauthorized Super Admin" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, requestId, reason } = body;

    if (!requestId || !action) {
      return NextResponse.json({ error: "Missing requestId or action" }, { status: 400 });
    }

    if (action === "approve") {
      const result = await approvePlanRequest(requestId);
      if (!result.success) {
        return NextResponse.json({ error: result.error || "Approval failed" }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: "Plan request accepted. Credentials generated and dispatched to company email.",
        item: result.item,
      });
    } else if (action === "reject") {
      const result = rejectPlanRequest(requestId, reason);
      if (!result.success) {
        return NextResponse.json({ error: result.error || "Rejection failed" }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: "Plan request has been rejected.",
        item: result.item,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("SuperAdmin action error:", err);
    return NextResponse.json({ error: "Failed to process request", details: err.message }, { status: 500 });
  }
}
