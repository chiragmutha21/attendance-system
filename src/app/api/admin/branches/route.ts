import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCompanyIdFromRequest } from "@/lib/tenant";
import {
  getLocalBranches,
  saveLocalBranches,
  upsertLocalBranch,
  deleteLocalBranch,
  getLocalCompanies,
  saveLocalCompanies,
} from "@/lib/planRequests";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (val: any): boolean => typeof val === "string" && UUID_REGEX.test(val.trim());

async function resolveTargetCompany(request: Request, bodyCompanyId?: string) {
  const headerCompanyId = request.headers.get("x-company-id")?.trim();
  const rawId = (bodyCompanyId || headerCompanyId || "").trim();
  let companyId = rawId;

  if (!companyId) {
    try {
      companyId = await getCompanyIdFromRequest(request);
    } catch {
      companyId = "00000000-0000-0000-0000-000000000000";
    }
  }

  const localCompanies = getLocalCompanies();
  const localComp = localCompanies.find(
    (c: any) => c.id === companyId || (rawId && c.id === rawId)
  );

  let validDbCompanyId: string | null = null;
  if (isUuid(companyId)) {
    validDbCompanyId = companyId;
  } else if (localComp && isUuid(localComp.id)) {
    validDbCompanyId = localComp.id;
  }

  let dbCompanyExists = false;
  let dbCompany: any = null;
  if (validDbCompanyId) {
    try {
      dbCompany = await db.company.findUnique({
        where: { id: validDbCompanyId },
        select: {
          id: true,
          name: true,
          address: true,
          officeLatitude: true,
          officeLongitude: true,
          officeRadiusMeters: true,
        },
      });
      if (dbCompany) {
        dbCompanyExists = true;
      }
    } catch (err) {
      console.warn("DB company check warning:", err);
    }
  }

  return { companyId, validDbCompanyId, dbCompanyExists, dbCompany, localComp };
}

// GET: Fetch all branches for a company
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryCompanyId = searchParams.get("companyId");
    const { companyId, validDbCompanyId, dbCompanyExists, dbCompany, localComp } = await resolveTargetCompany(
      request,
      queryCompanyId || undefined
    );

    // 1. Get branches from local storage
    const localBranches = getLocalBranches();
    const matchingLocal = localBranches.filter(
      (b: any) => b.companyId === companyId || (validDbCompanyId && b.companyId === validDbCompanyId)
    );

    // 2. Get branches from DB if available
    let dbBranches: any[] = [];
    if (validDbCompanyId && dbCompanyExists) {
      try {
        dbBranches = await db.branch.findMany({
          where: { companyId: validDbCompanyId },
          orderBy: [{ isMainOffice: "desc" }, { name: "asc" }],
        });
      } catch (dbErr) {
        console.warn("Could not fetch branches from DB:", dbErr);
      }
    }

    // Merge: prefer DB branches or local ones with modern updates
    const branchMap = new Map<string, any>();
    for (const b of dbBranches) {
      branchMap.set(b.id, b);
    }
    for (const b of matchingLocal) {
      branchMap.set(b.id, { ...(branchMap.get(b.id) || {}), ...b });
    }

    let branches = Array.from(branchMap.values());

    // 3. Ensure at least one Main Office exists
    if (branches.length === 0) {
      const officeLat = localComp?.officeLatitude ?? dbCompany?.officeLatitude ?? 28.6139;
      const officeLng = localComp?.officeLongitude ?? dbCompany?.officeLongitude ?? 77.2090;
      const officeRadius = localComp?.officeRadiusMeters ?? dbCompany?.officeRadiusMeters ?? 200;
      const officeName = localComp?.name ? `${localComp.name} Office` : "Head Office";
      const officeAddr = localComp?.address || dbCompany?.address || "Main Office Address";

      const defaultBranchId = crypto.randomUUID();
      const defaultBranch = {
        id: defaultBranchId,
        companyId: companyId,
        name: officeName,
        address: officeAddr,
        latitude: Number(officeLat),
        longitude: Number(officeLng),
        radiusMeters: Number(officeRadius),
        isMainOffice: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      upsertLocalBranch(defaultBranch);
      branches = [defaultBranch];

      // Try creating in DB if valid DB company exists
      if (validDbCompanyId && dbCompanyExists) {
        try {
          await db.branch.create({
            data: {
              id: defaultBranchId,
              companyId: validDbCompanyId,
              name: defaultBranch.name,
              address: defaultBranch.address,
              latitude: defaultBranch.latitude,
              longitude: defaultBranch.longitude,
              radiusMeters: defaultBranch.radiusMeters,
              isMainOffice: true,
            },
          });
        } catch (seedErr) {
          console.warn("Could not seed default branch to DB:", seedErr);
        }
      }
    }

    // Sort: main office first, then name
    branches.sort((a, b) => {
      if (a.isMainOffice && !b.isMainOffice) return -1;
      if (!a.isMainOffice && b.isMainOffice) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });

    return NextResponse.json({ success: true, branches });
  } catch (error: any) {
    console.error("Fetch branches error:", error);
    try {
      const fallbackLocal = getLocalBranches();
      return NextResponse.json({ success: true, branches: fallbackLocal });
    } catch {
      return NextResponse.json({ success: true, branches: [] });
    }
  }
}

// POST: Create a new branch
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, address, latitude, longitude, radiusMeters, isMainOffice, companyId: bodyCompanyId } = body;

    if (!name || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "Name, Latitude, and Longitude are required" }, { status: 400 });
    }

    const { companyId, validDbCompanyId, dbCompanyExists } = await resolveTargetCompany(request, bodyCompanyId);

    const branchId = body.id && isUuid(body.id) ? body.id : crypto.randomUUID();
    const parsedLat = parseFloat(latitude) || 0;
    const parsedLng = parseFloat(longitude) || 0;
    const parsedRadius = parseInt(radiusMeters) || 200;
    const isMain = Boolean(isMainOffice);

    const branchRecord = {
      id: branchId,
      companyId: companyId,
      name: name.trim(),
      address: address?.trim() || "",
      latitude: parsedLat,
      longitude: parsedLng,
      radiusMeters: parsedRadius,
      isMainOffice: isMain,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. If marked as Main Office, unmark other local branches
    if (isMain) {
      const allLocal = getLocalBranches();
      for (const b of allLocal) {
        if (b.companyId === companyId || (validDbCompanyId && b.companyId === validDbCompanyId)) {
          b.isMainOffice = false;
        }
      }
      saveLocalBranches(allLocal);

      // Sync local companies coordinates
      const localCompanies = getLocalCompanies();
      const compIdx = localCompanies.findIndex(
        (c: any) => c.id === companyId || (validDbCompanyId && c.id === validDbCompanyId)
      );
      if (compIdx >= 0) {
        localCompanies[compIdx].officeLatitude = parsedLat;
        localCompanies[compIdx].officeLongitude = parsedLng;
        localCompanies[compIdx].officeRadiusMeters = parsedRadius;
        localCompanies[compIdx].locationSaved = true;
        saveLocalCompanies(localCompanies);
      }
    }

    // 2. Save branch locally
    upsertLocalBranch(branchRecord);

    // 3. Persist to DB if valid DB company exists
    if (validDbCompanyId && dbCompanyExists) {
      try {
        if (isMain) {
          await db.branch.updateMany({
            where: { companyId: validDbCompanyId, isMainOffice: true },
            data: { isMainOffice: false },
          });

          await db.company.update({
            where: { id: validDbCompanyId },
            data: {
              officeLatitude: parsedLat,
              officeLongitude: parsedLng,
              officeRadiusMeters: parsedRadius,
            },
          });
        }

        const dbBranch = await db.branch.create({
          data: {
            id: branchId,
            companyId: validDbCompanyId,
            name: branchRecord.name,
            address: branchRecord.address,
            latitude: parsedLat,
            longitude: parsedLng,
            radiusMeters: parsedRadius,
            isMainOffice: isMain,
          },
        });
        return NextResponse.json({ success: true, branch: dbBranch });
      } catch (dbErr: any) {
        console.warn("DB create branch warning (saved locally):", dbErr.message);
      }
    }

    return NextResponse.json({ success: true, branch: branchRecord });
  } catch (error: any) {
    console.error("Create branch error:", error);
    return NextResponse.json({ error: "Failed to create branch", details: error.message }, { status: 500 });
  }
}

// PUT: Update an existing branch
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, address, latitude, longitude, radiusMeters, isMainOffice, companyId: bodyCompanyId } = body;

    if (!id || !name || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "ID, Name, Latitude, and Longitude are required" }, { status: 400 });
    }

    const { companyId, validDbCompanyId, dbCompanyExists } = await resolveTargetCompany(request, bodyCompanyId);
    const parsedLat = parseFloat(latitude) || 0;
    const parsedLng = parseFloat(longitude) || 0;
    const parsedRadius = parseInt(radiusMeters) || 200;
    const isMain = Boolean(isMainOffice);

    const allLocal = getLocalBranches();
    const existing = allLocal.find((b: any) => b.id === id);

    const updatedRecord = {
      ...(existing || {}),
      id,
      companyId: existing?.companyId || companyId,
      name: name.trim(),
      address: address?.trim() || "",
      latitude: parsedLat,
      longitude: parsedLng,
      radiusMeters: parsedRadius,
      isMainOffice: isMain,
      updatedAt: new Date().toISOString(),
    };

    if (isMain) {
      for (const b of allLocal) {
        if ((b.companyId === companyId || (validDbCompanyId && b.companyId === validDbCompanyId)) && b.id !== id) {
          b.isMainOffice = false;
        }
      }
      saveLocalBranches(allLocal);

      // Sync local companies coordinates
      const localCompanies = getLocalCompanies();
      const compIdx = localCompanies.findIndex(
        (c: any) => c.id === companyId || (validDbCompanyId && c.id === validDbCompanyId)
      );
      if (compIdx >= 0) {
        localCompanies[compIdx].officeLatitude = parsedLat;
        localCompanies[compIdx].officeLongitude = parsedLng;
        localCompanies[compIdx].officeRadiusMeters = parsedRadius;
        localCompanies[compIdx].locationSaved = true;
        saveLocalCompanies(localCompanies);
      }
    }

    upsertLocalBranch(updatedRecord);

    if (validDbCompanyId && dbCompanyExists && isUuid(id)) {
      try {
        if (isMain) {
          await db.branch.updateMany({
            where: { companyId: validDbCompanyId, id: { not: id }, isMainOffice: true },
            data: { isMainOffice: false },
          });

          await db.company.update({
            where: { id: validDbCompanyId },
            data: {
              officeLatitude: parsedLat,
              officeLongitude: parsedLng,
              officeRadiusMeters: parsedRadius,
            },
          });
        }

        const dbBranch = await db.branch.update({
          where: { id },
          data: {
            name: updatedRecord.name,
            address: updatedRecord.address,
            latitude: parsedLat,
            longitude: parsedLng,
            radiusMeters: parsedRadius,
            isMainOffice: isMain,
          },
        });
        return NextResponse.json({ success: true, branch: dbBranch });
      } catch (dbErr: any) {
        console.warn("DB update branch warning (saved locally):", dbErr.message);
      }
    }

    return NextResponse.json({ success: true, branch: updatedRecord });
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

    const localBranches = getLocalBranches();
    const existing = localBranches.find((b: any) => b.id === id);

    let isMainOffice = existing?.isMainOffice;

    if (isUuid(id)) {
      try {
        const dbBranch = await db.branch.findUnique({ where: { id } });
        if (dbBranch?.isMainOffice) {
          isMainOffice = true;
        }
      } catch {}
    }

    if (isMainOffice) {
      return NextResponse.json(
        { error: "Cannot delete the Main Office branch. Designate another branch as Main Office first." },
        { status: 400 }
      );
    }

    deleteLocalBranch(id);

    if (isUuid(id)) {
      try {
        await db.branch.delete({ where: { id } });
      } catch (dbErr: any) {
        console.warn("DB delete branch warning (deleted locally):", dbErr.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete branch error:", error);
    return NextResponse.json({ error: "Failed to delete branch", details: error.message }, { status: 500 });
  }
}
