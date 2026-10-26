import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { ensureAuthUser } from "@/lib/tenant";
import { PRICING_PLANS, PlanConfig, PlanRequestItem } from "./plans";

export { PRICING_PLANS };
export type { PlanConfig, PlanRequestItem };

const PRIMARY_DATA_DIR = path.join(process.cwd(), "data");
const STORAGE_FILE = path.join(PRIMARY_DATA_DIR, "plan-requests.json");
const COMPANIES_CACHE_FILE = path.join(PRIMARY_DATA_DIR, "local-companies.json");

// Backup paths
const SCRATCH_STORAGE_FILE = path.join(process.cwd(), "scratch", "plan-requests.json");
const SCRATCH_COMPANIES_FILE = path.join(process.cwd(), "scratch", "local-companies.json");

function ensureStorageDir() {
  if (!fs.existsSync(PRIMARY_DATA_DIR)) {
    fs.mkdirSync(PRIMARY_DATA_DIR, { recursive: true });
  }
  const scratchDir = path.dirname(SCRATCH_STORAGE_FILE);
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  if (!fs.existsSync(STORAGE_FILE)) {
    // If scratch exists, copy from scratch
    if (fs.existsSync(SCRATCH_STORAGE_FILE)) {
      try {
        fs.copyFileSync(SCRATCH_STORAGE_FILE, STORAGE_FILE);
      } catch {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify([]), "utf-8");
      }
    } else {
      fs.writeFileSync(STORAGE_FILE, JSON.stringify([]), "utf-8");
    }
  }

  if (!fs.existsSync(COMPANIES_CACHE_FILE)) {
    if (fs.existsSync(SCRATCH_COMPANIES_FILE)) {
      try {
        fs.copyFileSync(SCRATCH_COMPANIES_FILE, COMPANIES_CACHE_FILE);
      } catch {
        fs.writeFileSync(COMPANIES_CACHE_FILE, JSON.stringify([]), "utf-8");
      }
    } else {
      fs.writeFileSync(COMPANIES_CACHE_FILE, JSON.stringify([]), "utf-8");
    }
  }
}

export function getAllPlanRequests(): PlanRequestItem[] {
  try {
    ensureStorageDir();
    let data = "[]";
    if (fs.existsSync(STORAGE_FILE)) {
      data = fs.readFileSync(STORAGE_FILE, "utf-8");
    } else if (fs.existsSync(SCRATCH_STORAGE_FILE)) {
      data = fs.readFileSync(SCRATCH_STORAGE_FILE, "utf-8");
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error reading plan requests:", err);
    return [];
  }
}

/**
 * Async version that also syncs with PostgreSQL Database (Company table)
 * so that approved companies in the database are NEVER lost on refresh.
 */
export async function getAllPlanRequestsAsync(): Promise<PlanRequestItem[]> {
  const fileRequests = getAllPlanRequests();
  const existingEmails = new Set(fileRequests.map((r) => r.adminEmail.toLowerCase().trim()));

  try {
    // Query database companies
    const dbCompanies = await db.company.findMany({
      orderBy: { createdAt: "desc" },
    });

    let hasNewFromDb = false;
    for (const comp of dbCompanies) {
      const emailLower = (comp.adminEmail || "").toLowerCase().trim();
      if (emailLower && !existingEmails.has(emailLower)) {
        // Construct a plan request item from the approved database company
        const planName = comp.subscription || "Plan B (Up to 50 Employees)";
        const isPlanA = planName.toLowerCase().includes("plan a");
        const isPlanC = planName.toLowerCase().includes("plan c");
        const planId = isPlanA ? "plan-a" : isPlanC ? "plan-c" : "plan-b";
        const planDef = PRICING_PLANS[planId];

        const restoredItem: PlanRequestItem = {
          id: `req_${comp.id}`,
          companyId: comp.id,
          companyName: comp.name,
          planId,
          planName: planDef ? planDef.name : planName,
          employeeLimit: comp.employeeLimit || 50,
          basePrice: planDef ? planDef.basePrice : 11999,
          gstAmount: planDef ? planDef.gstAmount : 2159.82,
          totalAmount: planDef ? planDef.totalAmount : 14158.82,
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

        fileRequests.push(restoredItem);
        existingEmails.add(emailLower);
        hasNewFromDb = true;
      }
    }

    if (hasNewFromDb) {
      savePlanRequests(fileRequests);
    }
  } catch (err: any) {
    console.warn("Prisma DB sync in getAllPlanRequestsAsync (using file requests):", err.message);
  }

  return fileRequests;
}

export function savePlanRequests(requests: PlanRequestItem[]) {
  try {
    ensureStorageDir();
    const jsonStr = JSON.stringify(requests, null, 2);
    fs.writeFileSync(STORAGE_FILE, jsonStr, "utf-8");
    // Also backup to scratch
    try {
      fs.writeFileSync(SCRATCH_STORAGE_FILE, jsonStr, "utf-8");
    } catch {}
  } catch (err) {
    console.error("Error saving plan requests:", err);
  }
}

export function findPlanRequestByEmail(email: string): PlanRequestItem | undefined {
  const cleanEmail = email.toLowerCase().trim();
  const requests = getAllPlanRequests();
  return requests.find((r) => r.adminEmail.toLowerCase().trim() === cleanEmail);
}

export function findPlanRequestByCompanyId(companyId: string): PlanRequestItem | undefined {
  const requests = getAllPlanRequests();
  return requests.find((r) => r.companyId === companyId);
}

// Local companies store for offline / localhost resilience
export function getLocalCompanies(): any[] {
  try {
    ensureStorageDir();
    let data = "[]";
    if (fs.existsSync(COMPANIES_CACHE_FILE)) {
      data = fs.readFileSync(COMPANIES_CACHE_FILE, "utf-8");
    } else if (fs.existsSync(SCRATCH_COMPANIES_FILE)) {
      data = fs.readFileSync(SCRATCH_COMPANIES_FILE, "utf-8");
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalCompanies(companies: any[]) {
  try {
    ensureStorageDir();
    const jsonStr = JSON.stringify(companies, null, 2);
    fs.writeFileSync(COMPANIES_CACHE_FILE, jsonStr, "utf-8");
    try {
      fs.writeFileSync(SCRATCH_COMPANIES_FILE, jsonStr, "utf-8");
    } catch {}
  } catch (err) {
    console.error("Error saving local companies:", err);
  }
}

export async function createPlanRequest(params: {
  planId: "plan-a" | "plan-b" | "plan-c";
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  companyName: string;
  address: string;
  attendanceMode?: "with_photo" | "without_photo";
}): Promise<PlanRequestItem> {
  const plan = PRICING_PLANS[params.planId] || PRICING_PLANS["plan-a"];
  const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  let attendanceMode = params.attendanceMode || "with_photo";
  if (plan.id === "plan-a") {
    attendanceMode = "without_photo";
  }

  const newItem: PlanRequestItem = {
    id,
    planId: plan.id,
    planName: plan.name,
    employeeLimit: plan.employeeLimit,
    basePrice: plan.basePrice,
    gstAmount: plan.gstAmount,
    totalAmount: plan.totalAmount,
    adminName: params.adminName.trim(),
    adminEmail: params.adminEmail.toLowerCase().trim(),
    adminPhone: params.adminPhone.trim(),
    companyName: params.companyName.trim(),
    address: params.address.trim(),
    attendanceMode,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const requests = getAllPlanRequests();
  // Filter out any older duplicate with same email if pending
  const filtered = requests.filter((r) => !(r.adminEmail.toLowerCase() === newItem.adminEmail && r.status === "pending"));
  filtered.unshift(newItem);
  savePlanRequests(filtered);

  return newItem;
}

export async function approvePlanRequest(requestId: string): Promise<{ success: boolean; item?: PlanRequestItem; error?: string }> {
  const requests = getAllPlanRequests();
  const index = requests.findIndex((r) => r.id === requestId);
  if (index === -1) {
    return { success: false, error: "Plan request not found" };
  }

  const req = requests[index];
  if (req.status === "approved" && req.companyId) {
    return { success: true, item: req };
  }

  // Generate a secure temporary password
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const generatedPassword = `Smart@${randomSuffix}`;
  const generatedCompanyId = req.companyId || `comp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const companyCode = req.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 10) + `-${Math.floor(100 + Math.random() * 900)}`;

  let finalCompanyId = generatedCompanyId;

  // Try DB provisioning
  try {
    const authUserId = await ensureAuthUser(req.adminEmail);

    const admin = await db.adminUser.upsert({
      where: { email: req.adminEmail },
      update: {
        name: req.adminName,
        status: "active",
      },
      create: {
        authUserId,
        name: req.adminName,
        email: req.adminEmail,
        role: "company_admin",
        status: "active",
      },
    });

    const createdCompany = await db.company.create({
      data: {
        name: req.companyName,
        companyCode,
        adminAuthId: admin.id,
        adminName: req.adminName,
        adminEmail: req.adminEmail,
        adminPhone: req.adminPhone,
        address: req.address,
        countryCode: "+91",
        employeeLimit: req.employeeLimit,
        subscription: `${req.planName} (₹${req.basePrice}/yr + 18% GST)`,
        status: "active",
        officeLatitude: 28.6139,
        officeLongitude: 77.2090,
        officeRadiusMeters: 200,
      },
    });

    finalCompanyId = createdCompany.id;
  } catch (err: any) {
    console.warn("Prisma DB unavailable during company approval, saving to local store:", err.message);
  }

  // Update in local companies store
  const localCompanies = getLocalCompanies();
  const existingCompIndex = localCompanies.findIndex((c) => c.adminEmail === req.adminEmail);
  const companyRecord = {
    id: finalCompanyId,
    name: req.companyName,
    companyCode,
    adminName: req.adminName,
    adminEmail: req.adminEmail,
    adminPhone: req.adminPhone,
    address: req.address,
    countryCode: "+91",
    employeeLimit: req.employeeLimit,
    subscription: `${req.planName} (₹${req.basePrice}/yr + 18% GST)`,
    planId: req.planId,
    attendanceMode: req.attendanceMode,
    status: "active",
    officeLatitude: 28.6139,
    officeLongitude: 77.2090,
    officeRadiusMeters: 200,
    _count: { employees: 0 },
    createdAt: new Date().toISOString(),
  };

  if (existingCompIndex >= 0) {
    localCompanies[existingCompIndex] = companyRecord;
  } else {
    localCompanies.push(companyRecord);
  }
  saveLocalCompanies(localCompanies);

  // Update request item
  req.status = "approved";
  req.generatedPassword = generatedPassword;
  req.companyId = finalCompanyId;
  req.approvedAt = new Date().toISOString();
  req.updatedAt = new Date().toISOString();

  requests[index] = req;
  savePlanRequests(requests);

  return { success: true, item: req };
}

export function rejectPlanRequest(requestId: string, reason?: string): { success: boolean; item?: PlanRequestItem; error?: string } {
  const requests = getAllPlanRequests();
  const index = requests.findIndex((r) => r.id === requestId);
  if (index === -1) {
    return { success: false, error: "Plan request not found" };
  }

  const req = requests[index];
  req.status = "rejected";
  req.rejectionReason = reason || "Declined by Super Admin";
  req.updatedAt = new Date().toISOString();

  requests[index] = req;
  savePlanRequests(requests);

  return { success: true, item: req };
}
