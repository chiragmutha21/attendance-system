import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employeeSchema, formatZodError, normalizeEmployeeInput } from "@/lib/validation";
import { getCompanyIdFromRequest } from "@/lib/tenant";
import { uploadFaceImage } from "@/lib/storage";
import { getLocalEmployees, addLocalEmployee, saveLocalEmployees } from "@/lib/localEmployees";
import { findPlanRequestByCompanyId, getLocalCompanies } from "@/lib/planRequests";

// GET: List all employees
export async function GET(request: Request) {
  let companyId = "";
  try {
    companyId = await getCompanyIdFromRequest(request);
  } catch {
    const { searchParams } = new URL(request.url);
    companyId = searchParams.get("companyId") || request.headers.get("x-company-id") || "00000000-0000-0000-0000-000000000000";
  }

  try {
    const employees = await db.employee.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });

    const localEmps = getLocalEmployees(companyId);
    if (employees.length === 0 && localEmps.length > 0) {
      return NextResponse.json({ success: true, employees: localEmps });
    }

    return NextResponse.json({ success: true, employees });
  } catch (error: any) {
    console.warn("Database connection unavailable, returning local employees list:", error.message);
    const localEmps = getLocalEmployees(companyId);
    return NextResponse.json({ success: true, employees: localEmps });
  }
}

// POST: Create a new employee
export async function POST(request: Request) {
  let companyId = "";
  try {
    companyId = await getCompanyIdFromRequest(request);
  } catch {
    const { searchParams } = new URL(request.url);
    companyId = searchParams.get("companyId") || request.headers.get("x-company-id") || "00000000-0000-0000-0000-000000000000";
  }

  try {
    const body = await request.json();
    const parsed = employeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }

    const { employeeId, fullName, mobileNumber, department, role, status, registeredFaceImage } = normalizeEmployeeInput(parsed.data);

    // Resolve company and plan employee limit
    let employeeLimit = 999999;
    let attendanceMode = "with_photo";

    // 1. Check local companies / plan requests
    const localCompanies = getLocalCompanies();
    const matchedComp = localCompanies.find((c) => c.id === companyId);
    const planReq = findPlanRequestByCompanyId(companyId);

    if (matchedComp) {
      employeeLimit = matchedComp.employeeLimit || 25;
      attendanceMode = matchedComp.attendanceMode || "with_photo";
    } else if (planReq) {
      employeeLimit = planReq.employeeLimit || 25;
      attendanceMode = planReq.attendanceMode || "with_photo";
    }

    // 2. Check DB company (if available)
    try {
      const company = await db.company.findUnique({
        where: { id: companyId },
        include: {
          _count: {
            select: { employees: true },
          },
        },
      });
      if (company && company.employeeLimit) {
        employeeLimit = company.employeeLimit;
        if ((company as any).attendanceMode) {
          attendanceMode = (company as any).attendanceMode;
        }
      }
    } catch {
      // Use resolved local limit
    }

    // Count existing employees (DB or local)
    const localList = getLocalEmployees(companyId);
    const currentCount = localList.length;

    // Strict Plan Limit Enforcement: e.g. Plan A cannot have > 10 employees
    if (employeeLimit && employeeLimit < 999990 && currentCount >= employeeLimit) {
      return NextResponse.json(
        {
          error: `Employee limit reached! Your current plan allows a maximum of ${employeeLimit} employees (${currentCount}/${employeeLimit} registered). Please upgrade your plan to add more staff.`,
        },
        { status: 400 }
      );
    }

    // Only require photo if company uses "with_photo" mode
    if (attendanceMode !== "without_photo" && !registeredFaceImage) {
      return NextResponse.json({ error: "Profile photo is required for face verification in With-Photo mode." }, { status: 400 });
    }

    // Upload / store photo
    let uploadedImageUrl = registeredFaceImage;
    if (registeredFaceImage && registeredFaceImage.startsWith("data:image")) {
      try {
        uploadedImageUrl = await uploadFaceImage(companyId, employeeId, registeredFaceImage);
      } catch (uploadError) {
        console.warn("Storage upload fallback:", uploadError);
        uploadedImageUrl = registeredFaceImage;
      }
    }

    let branchIds = parsed.data.assignedBranchIds || [];

    // Try DB creation
    let dbEmployee = null;
    try {
      dbEmployee = await db.employee.create({
        data: {
          companyId,
          employeeId,
          fullName,
          mobileNumber,
          department,
          role,
          status,
          registeredFaceImage: uploadedImageUrl || "",
          assignedBranchIds: branchIds,
        },
      });
    } catch (dbErr: any) {
      console.warn("Prisma DB create employee fallback to local:", dbErr.message);
    }

    // Always store in local employees store for instant verification
    const createdLocal = addLocalEmployee({
      companyId,
      employeeId,
      fullName,
      mobileNumber,
      department,
      role,
      status,
      registeredFaceImage: uploadedImageUrl || "",
    });

    return NextResponse.json({ success: true, employee: dbEmployee || createdLocal });
  } catch (error: any) {
    console.error("Create employee error:", error);
    return NextResponse.json({ error: "Failed to create employee record", details: error.message }, { status: 500 });
  }
}
