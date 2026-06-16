import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "Company code is required" }, { status: 400 });
    }

    const company = await db.company.findUnique({
      where: {
        companyCode: code,
      },
      select: {
        id: true,
        name: true,
        officeLatitude: true,
        officeLongitude: true,
        officeRadiusMeters: true,
        status: true,
      }
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (company.status !== "active") {
      return NextResponse.json({ error: "Company is inactive" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        latitude: company.officeLatitude,
        longitude: company.officeLongitude,
        radius: company.officeRadiusMeters,
      }
    });
  } catch (error: any) {
    console.error("Resolve company error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
