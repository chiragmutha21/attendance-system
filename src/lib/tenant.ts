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
  const existing = await db.users.findFirst({
    where: { email: emailLower },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
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

  const created = await db.users.findFirst({
    where: { email: emailLower },
    select: { id: true },
  });

  if (!created) {
    throw new Error(`Failed to find newly created auth user for: ${emailLower}`);
  }

  return created.id;
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
    const company = await db.company.findUnique({
      where: { id: headerCompanyId },
      select: { id: true, name: true },
    });

    if (company) {
      console.log(`[getCompanyIdFromRequest] Resolved via header to: ${company.name} (${company.id})`);
      return company.id;
    } else {
      console.log(`[getCompanyIdFromRequest] Header company ID not found in database.`);
    }
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
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { officeLatitude: true, officeLongitude: true, officeRadiusMeters: true },
  });

  if (!company || company.officeLatitude === null || company.officeLongitude === null) {
    return defaultOfficeConfig;
  }

  return {
    latitude: company.officeLatitude,
    longitude: company.officeLongitude,
    radius: company.officeRadiusMeters,
  };
}
