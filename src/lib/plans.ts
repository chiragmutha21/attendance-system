export interface PlanConfig {
  id: "plan-a" | "plan-b" | "plan-c";
  name: string;
  badge: string;
  basePrice: number; // in INR
  gstPercent: number; // 18%
  gstAmount: number;
  totalAmount: number;
  employeeLimit: number; // 10, 50, 999999
  billingCycle: "per_year";
  features: string[];
}

export const PRICING_PLANS: Record<string, PlanConfig> = {
  "plan-a": {
    id: "plan-a",
    name: "Plan A",
    badge: "STARTER",
    basePrice: 2599,
    gstPercent: 18,
    gstAmount: 467.82,
    totalAmount: 3066.82,
    employeeLimit: 10,
    billingCycle: "per_year",
    features: [
      "Up to 10 Employees",
      "Direct QR Check-In & Check-Out",
      "Auto-White Background AI Face Matching",
      "GPS Geofencing Verification",
      "Daily, Weekly & Monthly Timesheets",
      "Standard Email Support",
    ],
  },
  "plan-b": {
    id: "plan-b",
    name: "Plan B",
    badge: "MOST POPULAR",
    basePrice: 11999,
    gstPercent: 18,
    gstAmount: 2159.82,
    totalAmount: 14158.82,
    employeeLimit: 50,
    billingCycle: "per_year",
    features: [
      "Up to 50 Employees",
      "Direct QR Check-In & Check-Out",
      "Auto-White Background AI Face Matching",
      "Multi-Branch Geofence Management",
      "Daily, Weekly & Monthly Timesheets + CSV Export",
      "Automated Email & Shift Alerts",
      "Priority 24/7 Support",
    ],
  },
  "plan-c": {
    id: "plan-c",
    name: "Plan C",
    badge: "ENTERPRISE",
    basePrice: 21999,
    gstPercent: 18,
    gstAmount: 3959.82,
    totalAmount: 25958.82,
    employeeLimit: 999999, // Unlimited
    billingCycle: "per_year",
    features: [
      "Unlimited Employees",
      "Direct QR Check-In & Check-Out",
      "Auto-White Background AI Face Matching",
      "Unlimited Branches & Office Locations",
      "Custom Shift Rules & Overtime Tracking",
      "Advanced Audit Logs & Biometric Sync",
      "Dedicated Account Manager & 99.9% SLA",
    ],
  },
};

export interface PlanRequestItem {
  id: string;
  planId: "plan-a" | "plan-b" | "plan-c";
  planName: string;
  employeeLimit: number;
  basePrice: number;
  gstAmount: number;
  totalAmount: number;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  companyName: string;
  address: string;
  attendanceMode: "with_photo" | "without_photo";
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  generatedPassword?: string;
  companyId?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
