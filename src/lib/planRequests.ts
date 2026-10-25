import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { ensureAuthUser } from "@/lib/tenant";
import { PRICING_PLANS, PlanConfig, PlanRequestItem } from "./plans";

export { PRICING_PLANS };
export type { PlanConfig, PlanRequestItem };

const STORAGE_FILE = path.join(process.cwd(), "scratch", "plan-requests.json");
const COMPANIES_CACHE_FILE = path.join(process.cwd(), "scratch", "local-companies.json");

function ensureStorageDir() {
  const dir = path.dirname(STORAGE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STORAGE_FILE)) {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify([]), "utf-8");
  }
  if (!fs.existsSync(COMPANIES_CACHE_FILE)) {
    fs.writeFileSync(COMPANIES_CACHE_FILE, JSON.stringify([]), "utf-8");
  }
}

export function getAllPlanRequests(): PlanRequestItem[] {
  try {
    ensureStorageDir();
    const data = fs.readFileSync(STORAGE_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading plan requests:", err);
    return [];
  }
}

export function savePlanRequests(requests: PlanRequestItem[]) {
  try {
    ensureStorageDir();
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(requests, null, 2), "utf-8");
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
    const data = fs.readFileSync(COMPANIES_CACHE_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveLocalCompanies(companies: any[]) {
  try {
    ensureStorageDir();
    fs.writeFileSync(COMPANIES_CACHE_FILE, JSON.stringify(companies, null, 2), "utf-8");
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

  // Enforce attendance mode based on plan:
  // Plan A is Without Photo only (Mobile + GPS)
  // Plan B and C allow With Photo
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
  requests.unshift(newItem);
  savePlanRequests(requests);

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
  req.rejectionReason = reason || "Request rejected by Super Admin";
  req.updatedAt = new Date().toISOString();

  requests[index] = req;
  savePlanRequests(requests);

  return { success: true, item: req };
}
