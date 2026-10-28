import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCompanyIdFromRequest } from "@/lib/tenant";

// GET: Fetch all observed festivals for the active company
export async function GET(request: Request) {
  try {
    let companyId = await getCompanyIdFromRequest(request);

    // Verify company exists
    const compExists = await db.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!compExists) {
      const fallbackComp = await db.company.findFirst({
        where: { status: "active" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (fallbackComp) {
        companyId = fallbackComp.id;
      }
    }

    const festivals = await db.festival.findMany({
      where: { companyId },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ success: true, festivals });
  } catch (error: any) {
    console.error("Fetch festivals error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch festivals", festivals: [] }, { status: 500 });
  }
}

// POST: Save/update the list of observed festivals for the active company
export async function POST(request: Request) {
  try {
    let companyId = await getCompanyIdFromRequest(request);

    // Verify company exists in company_details table to satisfy foreign key constraint
    const compExists = await db.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!compExists) {
      const fallbackComp = await db.company.findFirst({
        where: { status: "active" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (fallbackComp) {
        companyId = fallbackComp.id;
      } else {
        return NextResponse.json({ error: "No active company found to associate holidays with." }, { status: 400 });
      }
    }

    const body = await request.json();
    const { festivals } = body;

    if (!Array.isArray(festivals)) {
      return NextResponse.json({ error: "Invalid festivals data format" }, { status: 400 });
    }

    // Validate entries and deduplicate by date to avoid unique constraint violations
    const dateMap = new Map<string, { companyId: string; name: string; date: string }>();

    for (const f of festivals) {
      const name = (f.name || "").trim();
      const date = (f.date || "").trim();

      if (!name || !date) {
        return NextResponse.json({ error: "Holiday name and date are required" }, { status: 400 });
      }

      // Check YYYY-MM-DD format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: `Invalid date format for ${name}: must be YYYY-MM-DD` }, { status: 400 });
      }

      dateMap.set(date, {
        companyId,
        name,
        date,
      });
    }

    const finalFestivals = Array.from(dateMap.values());

    // Pooler-safe sequential execution: delete old holidays and insert updated ones
    await db.festival.deleteMany({
      where: { companyId },
    });

    if (finalFestivals.length > 0) {
      await db.festival.createMany({
        data: finalFestivals,
      });
    }

    return NextResponse.json({ success: true, message: "Holidays saved successfully", count: finalFestivals.length });
  } catch (error: any) {
    console.error("Save festivals error:", error);
    return NextResponse.json({ error: "Failed to save holidays", details: error.message }, { status: 500 });
  }
}
