import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Use E.164 format, for example +919876543210");

export const employeeSchema = z.object({
  employeeId: z
    .string()
    .trim()
    .min(2, "Employee ID is required")
    .max(24, "Employee ID is too long")
    .regex(/^[A-Z0-9_-]+$/i, "Use only letters, numbers, hyphen, or underscore"),
  fullName: z
    .string()
    .trim()
    .min(2, "Full name is required")
    .max(80, "Full name is too long")
    .regex(/^[A-Za-z][A-Za-z .'-]*$/, "Enter a valid full name"),
  mobileNumber: phoneSchema,
  department: z.string().trim().min(2, "Department is required").max(60, "Department is too long"),
  role: z.string().trim().min(2, "Designation is required").max(60, "Designation is too long"),
  status: z.enum(["active", "inactive"]),
  registeredFaceImage: z.string().optional().nullable(),
  assignedBranchIds: z.array(z.string()).optional(),
});

export const companySchema = z.object({
  name: z.string().trim().min(2, "Company name is required").max(100, "Company name is too long"),
  adminName: z.string().trim().min(2, "Admin name is required").max(80, "Admin name is too long"),
  adminEmail: z.string().trim().email("Enter a valid admin email"),
  adminPhone: phoneSchema,
  countryCode: z.string().trim().regex(/^\+[1-9]\d{0,3}$/, "Use format like +91"),
  employeeLimit: z.coerce.number().int().min(1, "Minimum 1 employee").max(10000, "Limit is too high"),
  subscription: z.enum(["trial", "active", "paused", "cancelled"]).default("trial"),
  status: z.enum(["active", "inactive"]).default("active"),
  latitude: z.coerce.number().min(-90, "Invalid latitude").max(90, "Invalid latitude"),
  longitude: z.coerce.number().min(-180, "Invalid longitude").max(180, "Invalid longitude"),
  radius: z.coerce.number().int().min(25, "Radius must be at least 25m").max(10000, "Radius is too large"),
  logo: z.string().optional().nullable(),
});

export function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join(". ");
}

export function normalizeEmployeeInput(input: z.infer<typeof employeeSchema>) {
  return {
    employeeId: input.employeeId.trim().toUpperCase(),
    fullName: input.fullName.trim().replace(/\s+/g, " "),
    mobileNumber: input.mobileNumber.trim(),
    department: input.department.trim().replace(/\s+/g, " "),
    role: input.role.trim().replace(/\s+/g, " "),
    status: input.status,
    registeredFaceImage: input.registeredFaceImage || null,
  };
}
