import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCompanyIdFromRequest } from "@/lib/tenant";

// GET: Fetch all observed festivals for the active company
export async function GET(request: Request) {
  try {
    const companyId = await getCompanyIdFromRequest(request);

    const festivals = await db.festival.findMany({
      where: { companyId },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ success: true, festivals });
  } catch (error: any) {
    console.error("Fetch festivals error:", error);
    return NextResponse.json({ error: "Failed to fetch festivals" }, { status: 500 });
  }
}

// POST: Save/update the list of observed festivals for the active company
export async function POST(request: Request) {
  try {
    const companyId = await getCompanyIdFromRequest(request);
    const body = await request.json();
    const { festivals } = body;

    if (!Array.isArray(festivals)) {
      return NextResponse.json({ error: "Invalid festivals data format" }, { status: 400 });
    }

    // Validate entries
    const validatedFestivals: { companyId: string; name: string; date: string }[] = [];
    for (const f of festivals) {
      const name = (f.name || "").trim();
      const date = (f.date || "").trim();

      if (!name || !date) {
        return NextResponse.json({ error: "Festival name and date are required" }, { status: 400 });
      }

      // Check YYYY-MM-DD format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: `Invalid date format for ${name}: must be YYYY-MM-DD` }, { status: 400 });
      }

      validatedFestivals.push({
        companyId,
        name,
        date,
      });
    }

    // Run transaction: delete all existing and insert new ones
    await db.$transaction(async (tx) => {
      // Remove old records for this company
      await tx.festival.deleteMany({
        where: { companyId },
      });

      // Insert new records if any
      if (validatedFestivals.length > 0) {
        // Use createMany or loop through inserts (using createMany is safe for Postgres)
        await tx.festival.createMany({
          data: validatedFestivals,
        });
      }
    });

    return NextResponse.json({ success: true, message: "Festivals saved successfully" });
  } catch (error: any) {
    console.error("Save festivals error:", error);
    return NextResponse.json({ error: "Failed to save festivals", details: error.message }, { status: 500 });
  }
}
