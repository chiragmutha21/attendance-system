import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCompanyIdFromRequest } from "@/lib/tenant";

// GET: Fetch attendance logs with optional filtering and automatic check-in/check-out pairing
export async function GET(request: Request) {
  try {
    const companyId = await getCompanyIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const employeeId = searchParams.get("employeeId") || "";
    const type = searchParams.get("type") || "";
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

    // 5. Date range filter
    if (startDateStr || endDateStr) {
      where.checkInTime = {};
      if (startDateStr) {
        where.checkInTime.gte = new Date(`${startDateStr}T00:00:00.000Z`);
      }
      if (endDateStr) {
        where.checkInTime.lte = new Date(`${endDateStr}T23:59:59.999Z`);
      }
    }

    // Fetch records (order by checkInTime asc for chronological pairing)
    const records = await db.attendanceRecord.findMany({
      where,
      orderBy: { checkInTime: "asc" },
    });

    const checkIns = records.filter(r => r.type === "check-in");
    const checkOuts = records.filter(r => r.type === "check-out");

    // Pair check-ins with their corresponding check-outs on the same day
    const pairedRecords = checkIns.map((ci: any) => {
      const ciDateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: ci.timezone || "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(ci.checkInTime));

      const matchingCO = checkOuts.find((co: any) => {
        if (co.employeeId !== ci.employeeId) return false;
        
        const coDateStr = new Intl.DateTimeFormat("en-CA", {
          timeZone: co.timezone || "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(co.checkInTime));

        return coDateStr === ciDateStr && new Date(co.checkInTime) > new Date(ci.checkInTime);
      });

      let checkoutTime = null;
      let workHours = null;

      if (matchingCO) {
        checkoutTime = matchingCO.checkInTime;
        const diffMs = new Date(matchingCO.checkInTime).getTime() - new Date(ci.checkInTime).getTime();
        if (diffMs > 0) {
          const diffMins = Math.floor(diffMs / 60000);
          const hours = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          workHours = `${hours}h ${mins}m`;
        } else {
          workHours = "0h 0m";
        }
      }

      return {
        ...ci,
        checkInBranchName: ci.branchName || null,
        checkOutBranchName: matchingCO?.branchName || null,
        checkoutTime,
        workHours,
      };
    });

    // Handle check-out mapping for type=check-out queries
    const checkOutsMapped = checkOuts.map((co: any) => {
      const coDateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: co.timezone || "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(co.checkInTime));

      const matchingCI = checkIns.find((ci: any) => {
        if (co.employeeId !== ci.employeeId) return false;
        const ciDateStr = new Intl.DateTimeFormat("en-CA", {
          timeZone: ci.timezone || "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(ci.checkInTime));
        return ciDateStr === coDateStr && new Date(co.checkInTime) > new Date(ci.checkInTime);
      });

      let checkinTimeVal = null;
      let workHours = null;

      if (matchingCI) {
        checkinTimeVal = matchingCI.checkInTime;
        const diffMs = new Date(co.checkInTime).getTime() - new Date(matchingCI.checkInTime).getTime();
        if (diffMs > 0) {
          const diffMins = Math.floor(diffMs / 60000);
          const hours = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          workHours = `${hours}h ${mins}m`;
        } else {
          workHours = "0h 0m";
        }
      }

      return {
        ...co,
        checkInBranchName: matchingCI?.branchName || null,
        checkOutBranchName: co.branchName || null,
        originalCheckInTime: checkinTimeVal,
        workHours,
      };
    });

    // Unpaired check-outs (in case they checked out but didn't check in)
    const unpairedCheckOuts = checkOuts.filter((co: any) => {
      const isMatched = checkIns.some((ci: any) => {
        if (co.employeeId !== ci.employeeId) return false;
        const ciDateStr = new Intl.DateTimeFormat("en-CA", {
          timeZone: ci.timezone || "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(ci.checkInTime));
        const coDateStr = new Intl.DateTimeFormat("en-CA", {
          timeZone: co.timezone || "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(co.checkInTime));
        return coDateStr === ciDateStr && new Date(co.checkInTime) > new Date(ci.checkInTime);
      });
      return !isMatched;
    }).map((co: any) => ({
      ...co,
      checkInBranchName: null,
      checkOutBranchName: co.branchName || null,
      checkoutTime: co.checkInTime,
      checkInTime: null,
      workHours: null,
    }));

    // Filter by type requested
    let resultRecords = [];
    if (type === "check-in") {
      resultRecords = pairedRecords;
    } else if (type === "check-out") {
      resultRecords = checkOutsMapped;
    } else {
      // Default / Check Attendance: Show paired check-ins + unpaired check-outs
      resultRecords = [...pairedRecords, ...unpairedCheckOuts];
    }

    // Sort by primary timestamp descending (newest first)
    resultRecords.sort((a: any, b: any) => {
      const timeA = new Date(a.checkInTime || a.checkoutTime).getTime();
      const timeB = new Date(b.checkInTime || b.checkoutTime).getTime();
      return timeB - timeA;
    });

    // Fetch company festivals to check for holiday check-ins
    const companyFestivals = await db.festival.findMany({
      where: { companyId },
    });

    const festivalMap = new Map(companyFestivals.map(f => [f.date, f.name]));

    const recordsWithFestival = resultRecords.map((record: any) => {
      const targetTime = record.checkInTime || record.checkoutTime;
      const localDateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: record.timezone || "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(targetTime));

      return {
        ...record,
        festival: festivalMap.get(localDateStr) || null,
      };
    });

    return NextResponse.json({ success: true, records: recordsWithFestival });
  } catch (error: any) {
    console.error("Fetch attendance records error:", error);
    return NextResponse.json({ error: "Failed to fetch attendance logs" }, { status: 500 });
  }
}
