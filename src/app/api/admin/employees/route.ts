import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employeeSchema, formatZodError, normalizeEmployeeInput } from "@/lib/validation";
import { getCompanyIdFromRequest } from "@/lib/tenant";
import { uploadFaceImage } from "@/lib/storage";

// GET: List all employees
export async function GET(request: Request) {
  try {
    const companyId = await getCompanyIdFromRequest(request);
    const employees = await db.employee.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, employees });
  } catch (error: any) {
    console.error("List employees error:", error);
    return NextResponse.json({ error: "Failed to fetch employees list" }, { status: 500 });
  }
}

// POST: Create a new employee
export async function POST(request: Request) {
  try {
    const companyId = await getCompanyIdFromRequest(request);
    const body = await request.json();
    const parsed = employeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }

    const { employeeId, fullName, mobileNumber, department, role, status, registeredFaceImage } = normalizeEmployeeInput(parsed.data);

    if (!registeredFaceImage) {
      return NextResponse.json({ error: "Profile photo is required for face verification" }, { status: 400 });
    }

    // Check if employeeId already exists
    const existingEmpId = await db.employee.findUnique({
      where: { companyId_employeeId: { companyId, employeeId } },
    });
    if (existingEmpId) {
      return NextResponse.json({ error: "An employee with this Employee ID already exists" }, { status: 400 });
    }

    // Check if mobile number already exists
    const existingMobile = await db.employee.findUnique({
      where: { companyId_mobileNumber: { companyId, mobileNumber } },
    });
    if (existingMobile) {
      return NextResponse.json({ error: "An employee with this mobile number already exists" }, { status: 400 });
    }

    // Upload image
    const uploadedImageUrl = await uploadFaceImage(companyId, employeeId, registeredFaceImage);

    let branchIds = parsed.data.assignedBranchIds || [];
    if (branchIds.length === 0) {
      const firstBranch = await db.branch.findFirst({ where: { companyId } });
      if (firstBranch) {
        branchIds = [firstBranch.id];
      }
    }

    const employee = await db.employee.create({
      data: {
        companyId,
        employeeId,
        fullName,
        mobileNumber,
        department,
        role,
        status,
        registeredFaceImage: uploadedImageUrl,
        assignedBranchIds: branchIds,
      },
    });

    return NextResponse.json({ success: true, employee });
  } catch (error: any) {
    console.error("Create employee error:", error);
    return NextResponse.json({ error: "Failed to create employee record", details: error.message }, { status: 500 });
  }
}

// PUT: Update an existing employee
export async function PUT(request: Request) {
  try {
    const companyId = await getCompanyIdFromRequest(request);
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Employee database primary key ID is required" }, { status: 400 });
    }

    const parsed = employeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }

    const { employeeId, fullName, mobileNumber, department, role, status, registeredFaceImage } = normalizeEmployeeInput(parsed.data);

    // Verify employee exists
    const existing = await db.employee.findUnique({
      where: { id },
    });
    if (!existing || existing.companyId !== companyId) {
      return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
    }

    // Verify unique constraints are not violated by changes
    if (employeeId && employeeId !== existing.employeeId) {
      const conflict = await db.employee.findUnique({ where: { companyId_employeeId: { companyId, employeeId } } });
      if (conflict) {
        return NextResponse.json({ error: "Employee ID is already in use by another record" }, { status: 400 });
      }
    }

    if (mobileNumber && mobileNumber !== existing.mobileNumber) {
      const conflict = await db.employee.findUnique({ where: { companyId_mobileNumber: { companyId, mobileNumber } } });
      if (conflict) {
        return NextResponse.json({ error: "Mobile number is already in use by another record" }, { status: 400 });
      }
    }

    let uploadedImageUrl: string | undefined = undefined;
    if (registeredFaceImage) {
      uploadedImageUrl = await uploadFaceImage(companyId, employeeId || existing.employeeId, registeredFaceImage);
    }

    const branchIds = parsed.data.assignedBranchIds;

    const updated = await db.employee.update({
      where: { id },
      data: {
        employeeId: employeeId || undefined,
        fullName: fullName || undefined,
        mobileNumber: mobileNumber || undefined,
        department: department || undefined,
        role: role || undefined,
        status: status || undefined,
        registeredFaceImage: uploadedImageUrl || undefined,
        assignedBranchIds: branchIds !== undefined ? branchIds : undefined,
      },
    });

    return NextResponse.json({ success: true, employee: updated });
  } catch (error: any) {
    console.error("Update employee error:", error);
    return NextResponse.json({ error: "Failed to update employee details", details: error.message }, { status: 500 });
  }
}

// DELETE: Delete an employee
export async function DELETE(request: Request) {
  try {
    const companyId = await getCompanyIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    const employee = await db.employee.findUnique({
      where: { id },
    });

    if (!employee || employee.companyId !== companyId) {
      return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
    }

    await db.employee.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Employee record deleted successfully" });
  } catch (error: any) {
    console.error("Delete employee error:", error);
    return NextResponse.json({ error: "Failed to delete employee record" }, { status: 500 });
  }
}
