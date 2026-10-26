import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { getAllPlanRequestsAsync } from "@/lib/planRequests";
import { sendPlanApprovalEmail } from "@/lib/email";
import { db } from "@/lib/db";
import { PlanRequestItem } from "@/lib/plans";

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

    const requests = await getAllPlanRequestsAsync();
    let item: PlanRequestItem | undefined = requests.find(
      (r) =>
        r.id === requestId ||
        r.companyId === requestId ||
        `req_${r.companyId}` === requestId ||
        `req_${r.id}` === requestId
    );

    // Fallback: Query direct from DB if not found in cache
    if (!item) {
      try {
        const cleanId = requestId.replace(/^req_/, "");
        const comp = await db.company.findFirst({
          where: {
            OR: [
              { id: cleanId },
              { id: requestId },
              { adminEmail: requestId },
            ],
          },
        });

        if (comp && comp.adminEmail) {
          const isPlanA = (comp.subscription || "").toLowerCase().includes("plan a");
          const isPlanC = (comp.subscription || "").toLowerCase().includes("plan c");
          const planId = isPlanA ? "plan-a" : isPlanC ? "plan-c" : "plan-b";

          item = {
            id: requestId,
            companyId: comp.id,
            companyName: comp.name,
            planId,
            planName: comp.subscription || "Plan B (Up to 50 Employees)",
            employeeLimit: comp.employeeLimit || 50,
            basePrice: 11999,
            gstAmount: 2159.82,
            totalAmount: 14158.82,
            adminName: comp.adminName || "Admin",
            adminEmail: comp.adminEmail,
            adminPhone: comp.adminPhone || "N/A",
            address: comp.address || "",
            attendanceMode: isPlanA ? "without_photo" : "with_photo",
            status: "approved",
            generatedPassword: "Smart@123456",
            createdAt: comp.createdAt ? comp.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: comp.updatedAt ? comp.updatedAt.toISOString() : new Date().toISOString(),
            approvedAt: comp.createdAt ? comp.createdAt.toISOString() : new Date().toISOString(),
          };
        }
      } catch (dbErr) {
        console.warn("Direct DB fallback lookup failed:", dbErr);
      }
    }

    if (!item) {
      return NextResponse.json({ error: "Plan request or company not found" }, { status: 404 });
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
