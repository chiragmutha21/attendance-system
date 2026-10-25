import fs from "fs";
import path from "path";

export interface LocalEmployee {
  id: string;
  employeeId: string;
  fullName: string;
  mobileNumber: string;
  department: string;
  role: string;
  status: string;
  registeredFaceImage?: string;
  companyId: string;
  createdAt: string;
}

const STORAGE_FILE = path.join(process.cwd(), "scratch", "local-employees.json");

function ensureFile() {
  const dir = path.dirname(STORAGE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(STORAGE_FILE)) {
    const defaultEmployees: LocalEmployee[] = [
      {
        id: "emp-demo-1",
        employeeId: "EMP-101",
        fullName: "Rahul Sharma",
        mobileNumber: "+919876543210",
        department: "Engineering",
        role: "Software Developer",
        status: "active",
        registeredFaceImage: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='white'/></svg>",
        companyId: "00000000-0000-0000-0000-000000000000",
        createdAt: new Date().toISOString(),
      },
      {
        id: "emp-demo-2",
        employeeId: "EMP-104",
        fullName: "Priya Verma",
        mobileNumber: "+919876543211",
        department: "Operations",
        role: "Operations Lead",
        status: "active",
        registeredFaceImage: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='white'/></svg>",
        companyId: "00000000-0000-0000-0000-000000000000",
        createdAt: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(defaultEmployees, null, 2), "utf-8");
  }
}

export function getLocalEmployees(companyId?: string): LocalEmployee[] {
  try {
    ensureFile();
    const data = fs.readFileSync(STORAGE_FILE, "utf-8");
    const employees: LocalEmployee[] = JSON.parse(data);
    if (companyId) {
      return employees.filter((e) => e.companyId === companyId);
    }
    return employees;
  } catch {
    return [];
  }
}

export function saveLocalEmployees(employees: LocalEmployee[]) {
  try {
    ensureFile();
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(employees, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving local employees:", err);
  }
}

export function addLocalEmployee(emp: Omit<LocalEmployee, "id" | "createdAt">): LocalEmployee {
  ensureFile();
  const employees = getLocalEmployees();
  const newEmp: LocalEmployee = {
    ...emp,
    id: `emp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  employees.unshift(newEmp);
  saveLocalEmployees(employees);
  return newEmp;
}

export function findLocalEmployeeByPhone(phone: string, companyId?: string): LocalEmployee | undefined {
  const employees = getLocalEmployees(companyId);
  // Match with or without +91 prefix
  const cleanPhone = phone.replace(/[^\d+]/g, "");
  const digits10 = cleanPhone.replace(/\D/g, "").slice(-10);

  return employees.find((e) => {
    const eDigits = e.mobileNumber.replace(/\D/g, "").slice(-10);
    return eDigits === digits10;
  });
}
