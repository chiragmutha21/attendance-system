import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCompanyIdFromRequest } from "@/lib/tenant";

// Helper to ensure at least one Main Office exists
async function ensureMainOffice(companyId: string) {
  const mainOffice = await db.branch.findFirst({
    where: { companyId, isMainOffice: true },
  });

  if (!mainOffice) {
    const company = await db.company.findUnique({
      where: { id: companyId },
    });
    if (company) {
      return await db.branch.create({
        data: {
          companyId,
          name: "Head Office",
          address: "Main Office Address",
          latitude: company.officeLatitude ?? 28.6139,
          longitude: company.officeLongitude ?? 77.2090,
          radiusMeters: company.officeRadiusMeters ?? 200,
          isMainOffice: true,
        },
      });
    }
  }
  return mainOffice;
}

// GET: Fetch all branches for a company
export async function GET(request: Request) {
  try {
    const companyId = await getCompanyIdFromRequest(request);
    await ensureMainOffice(companyId);

    const branches = await db.branch.findMany({
      where: { companyId },
      orderBy: [
        { isMainOffice: "desc" },
        { name: "asc" }
      ],
    });

    return NextResponse.json({ success: true, branches });
  } catch (error: any) {
    console.error("Fetch branches error:", error);
    return NextResponse.json({ error: "Failed to fetch branches" }, { status: 500 });
  }
}

// POST: Create a new branch
export async function POST(request: Request) {
  try {
    const companyId = await getCompanyIdFromRequest(request);
    const body = await request.json();
    const { name, address, latitude, longitude, radiusMeters, isMainOffice } = body;

    if (!name || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "Name, Latitude, and Longitude are required" }, { status: 400 });
    }

    const branch = await db.branch.create({
      data: {
        companyId,
        name: name.trim(),
        address: address?.trim() || "",
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radiusMeters: parseInt(radiusMeters) || 200,
        isMainOffice: !!isMainOffice,
      },
    });

    // Sync Company table if this is marked as Main Office
    if (isMainOffice) {
      // Unmark any other main offices first
      await db.branch.updateMany({
        where: { companyId, id: { not: branch.id }, isMainOffice: true },
        data: { isMainOffice: false },
      });

      await db.company.update({
        where: { id: companyId },
        data: {
          officeLatitude: branch.latitude,
          officeLongitude: branch.longitude,
          officeRadiusMeters: branch.radiusMeters,
        },
      });
    }

    return NextResponse.json({ success: true, branch });
  } catch (error: any) {
    console.error("Create branch error:", error);
    return NextResponse.json({ error: "Failed to create branch", details: error.message }, { status: 500 });
  }
}

// PUT: Update an existing branch
export async function PUT(request: Request) {
  try {
    const companyId = await getCompanyIdFromRequest(request);
    const body = await request.json();
    const { id, name, address, latitude, longitude, radiusMeters, isMainOffice } = body;

    if (!id || !name || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "ID, Name, Latitude, and Longitude are required" }, { status: 400 });
    }

    const branch = await db.branch.update({
      where: { id },
      data: {
        name: name.trim(),
        address: address?.trim() || "",
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radiusMeters: parseInt(radiusMeters) || 200,
        isMainOffice: !!isMainOffice,
      },
    });

    // If this branch is main office, sync to company details
    if (isMainOffice) {
      // Unmark other main offices
      await db.branch.updateMany({
        where: { companyId, id: { not: branch.id }, isMainOffice: true },
        data: { isMainOffice: false },
      });

      await db.company.update({
        where: { id: companyId },
        data: {
          officeLatitude: branch.latitude,
          officeLongitude: branch.longitude,
          officeRadiusMeters: branch.radiusMeters,
        },
      });
    }

    return NextResponse.json({ success: true, branch });
  } catch (error: any) {
    console.error("Update branch error:", error);
    return NextResponse.json({ error: "Failed to update branch", details: error.message }, { status: 500 });
  }
}

// DELETE: Delete a branch
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 });
    }

    // Check if the branch to delete is the Main Office
    const branch = await db.branch.findUnique({ where: { id } });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    if (branch.isMainOffice) {
      return NextResponse.json({ error: "Cannot delete the Main Office branch. Designate another branch as Main Office first." }, { status: 400 });
    }

    await db.branch.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete branch error:", error);
    return NextResponse.json({ error: "Failed to delete branch", details: error.message }, { status: 500 });
  }
}
