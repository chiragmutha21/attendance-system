import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCompanyIdFromRequest } from "@/lib/tenant";

// GET: Fetch attendance logs with optional filtering
export async function GET(request: Request) {
  try {
    const companyId = await getCompanyIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const employeeId = searchParams.get("employeeId") || "";
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    // Construct Prisma where filter
    const where: any = { companyId };

    // 1. Search filter: Match employeeName or employeeId
    if (search) {
      where.OR = [
        { employeeName: { contains: search } },
        { employeeId: { contains: search } },
      ];
    }

    // 2. Status filter
    if (status && status !== "all") {
      where.status = status;
    }

    // 3. Employee filter
    if (employeeId && employeeId !== "all") {
      where.employeeId = employeeId;
    }

    // 4. Date range filter
    if (startDateStr || endDateStr) {
      where.checkInTime = {};
      if (startDateStr) {
        where.checkInTime.gte = new Date(`${startDateStr}T00:00:00.000Z`);
      }
      if (endDateStr) {
        where.checkInTime.lte = new Date(`${endDateStr}T23:59:59.999Z`);
      }
    }

    // Fetch records
    const records = await db.attendanceRecord.findMany({
      where,
      orderBy: { checkInTime: "desc" },
    });

    return NextResponse.json({ success: true, records });
  } catch (error: any) {
    console.error("Fetch attendance records error:", error);
    return NextResponse.json({ error: "Failed to fetch attendance logs" }, { status: 500 });
  }
}
