import { db } from "@/lib/db";

export const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000000";

export const defaultOfficeConfig = {
  latitude: 28.6139,
  longitude: 77.2090,
  radius: 200,
};

export function companySettingKey(companyId: string, key: string) {
  return companyId === DEFAULT_COMPANY_ID ? key : `${companyId}:${key}`;
}

export async function ensureAuthUser(email: string): Promise<string> {
  const emailLower = email.toLowerCase();
  const existingRows = await db.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM auth.users WHERE email = $1 LIMIT 1`,
    emailLower
  );

  if (existingRows && existingRows.length > 0) {
    return existingRows[0].id;
  }

  // Insert raw auth user
  await db.$executeRawUnsafe(`
    INSERT INTO auth.users (id, email, aud, role, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      $1,
      'authenticated',
      'authenticated',
      '',
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    );
  `, emailLower);

  const createdRows = await db.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM auth.users WHERE email = $1 LIMIT 1`,
    emailLower
  );

  if (!createdRows || createdRows.length === 0) {
    throw new Error(`Failed to find newly created auth user for: ${emailLower}`);
  }

  return createdRows[0].id;
}

let defaultCompanyEnsured = false;

export async function ensureDefaultCompany() {
  if (defaultCompanyEnsured) return;
  defaultCompanyEnsured = true; // Mark as resolved/attempted immediately to avoid retrying on every request
  try {
    const authUserId = await ensureAuthUser("admin@example.com");

    const admin = await db.adminUser.upsert({
      where: { email: "admin@example.com" },
      update: {},
      create: {
        authUserId: authUserId,
        name: "Admin",
        email: "admin@example.com",
        role: "SUPER_ADMIN",
        status: "active",
      },
    });

    await db.company.upsert({
      where: { id: DEFAULT_COMPANY_ID },
      update: { adminAuthId: admin.id },
      create: {
        id: DEFAULT_COMPANY_ID,
        name: "Demo Company",
        adminAuthId: admin.id,
        adminName: "Admin",
        adminEmail: "admin@example.com",
        adminPhone: "+919999999999",
        countryCode: "+91",
        employeeLimit: 25,
        subscription: "trial",
        status: "active",
        officeLatitude: defaultOfficeConfig.latitude,
        officeLongitude: defaultOfficeConfig.longitude,
        officeRadiusMeters: defaultOfficeConfig.radius,
      },
    });
  } catch (err) {
    console.warn("Skipping default admin user seed due to database constraints or network:", err);
  }
}

export async function getCompanyIdFromRequest(request: Request) {
  await ensureDefaultCompany();

  const headerCompanyId = request.headers.get("x-company-id")?.trim();
  console.log(`[getCompanyIdFromRequest] header x-company-id: "${headerCompanyId}"`);
  if (headerCompanyId) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(headerCompanyId);
    let company: { id: string; name: string } | null = null;

    if (isUuid) {
      company = await db.company.findUnique({
        where: { id: headerCompanyId },
        select: { id: true, name: true },
      });
    } else {
      company = await db.company.findFirst({
        where: { companyCode: headerCompanyId },
        select: { id: true, name: true },
      });
    }

    if (company) {
      console.log(`[getCompanyIdFromRequest] Resolved via header to: ${company.name} (${company.id})`);
      return company.id;
    } else {
      // Check local companies store
      try {
        const { getLocalCompanies } = await import("./planRequests");
        const local = getLocalCompanies();
        const localComp = local.find((c: any) => c.id === headerCompanyId);
        if (localComp) {
          return localComp.id;
        }
      } catch {}

      if (headerCompanyId !== "undefined" && headerCompanyId !== "null" && headerCompanyId.length > 0) {
        return headerCompanyId;
      }
    }
  }

  // Check admin email header
  const headerAdminEmail = request.headers.get("x-admin-email")?.trim().toLowerCase();
  if (headerAdminEmail && headerAdminEmail !== "admin@example.com") {
    try {
      const comp = await db.company.findFirst({
        where: { adminEmail: headerAdminEmail },
        select: { id: true, name: true },
      });
      if (comp) return comp.id;

      const { getLocalCompanies } = await import("./planRequests");
      const local = getLocalCompanies();
      const localComp = local.find((c: any) => c.adminEmail && c.adminEmail.toLowerCase() === headerAdminEmail);
      if (localComp) return localComp.id;
    } catch {}
  }

  const firstCompany = await db.company.findFirst({
    where: { status: "active" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  const resolved = firstCompany?.id || DEFAULT_COMPANY_ID;
  console.log(`[getCompanyIdFromRequest] Fallback to: ${firstCompany?.name || "DEFAULT"} (${resolved})`);
  return resolved;
}

export async function getOfficeConfig(companyId: string) {
  let company: any = null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId);

  if (isUuid) {
    try {
      company = await db.company.findUnique({
        where: { id: companyId },
        select: { officeLatitude: true, officeLongitude: true, officeRadiusMeters: true },
      });
    } catch (err) {
      console.warn("DB getOfficeConfig warning:", err);
    }
  }

  // Also check local companies store
  let localComp: any = null;
  try {
    const { getLocalCompanies } = await import("./planRequests");
    const local = getLocalCompanies();
    localComp = local.find((c: any) => c.id === companyId);
  } catch {}

  const lat = company?.officeLatitude ?? localComp?.officeLatitude;
  const lng = company?.officeLongitude ?? localComp?.officeLongitude;
  const radius = company?.officeRadiusMeters ?? localComp?.officeRadiusMeters ?? 200;

  const isDefaultDelhi = (lat === 28.6139 && (lng === 77.209 || lng === 77.2090));
  const isSaved = localComp?.locationSaved === true || (lat !== null && lat !== undefined && !isDefaultDelhi);

  if (lat === null || lat === undefined) {
    return {
      ...defaultOfficeConfig,
      locationSaved: false,
    };
  }

  return {
    latitude: lat,
    longitude: lng,
    radius: radius,
    locationSaved: Boolean(isSaved),
  };
}
