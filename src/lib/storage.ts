import { createClient } from "@supabase/supabase-js";

/**
 * Gets a clean, URL-friendly company folder name based on the company's name.
 * If the company is not found or has an error, falls back to `company-<companyId>`.
 */
export async function getCompanyFolderName(companyId: string): Promise<string> {
  try {
    const { db } = await import("@/lib/db");
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });
    if (company?.name) {
      const slug = company.name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "")
        .replace(/\-\-+/g, "-");
      return `${slug}-${companyId}`;
    }
  } catch (err) {
    console.error("Error getting company folder name:", err);
  }
  return `company-${companyId}`;
}

/**
 * Uploads a base64 employee profile face image company-wise.
 *
 * @param companyId The ID of the company
 * @param employeeId The ID of the employee (used for filename)
 * @param base64Image The image as base64 string
 * @returns The public URL of the uploaded image
 */
export async function uploadFaceImage(
  companyId: string,
  employeeId: string,
  base64Image: string
): Promise<string> {
  const isMock = process.env.MOCK_MODE === "true";
  const folderName = await getCompanyFolderName(companyId);

  if (isMock) {
    // Local development storage simulation under uploads/ADMIN_EMPLOYEE/<folderName>/
    const { writeFile, mkdir } = await import("fs/promises");
    const { join } = await import("path");
    const { existsSync } = await import("fs");

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const fileName = `${employeeId}_${Date.now()}.jpg`;

    const companyDir = join(process.cwd(), "public", "uploads", "ADMIN_EMPLOYEE", folderName);
    if (!existsSync(companyDir)) {
      await mkdir(companyDir, { recursive: true });
    }

    const filePath = join(companyDir, fileName);
    await writeFile(filePath, buffer);

    // Return relative URL that maps to Next.js public/ directory
    const localUrl = `/uploads/ADMIN_EMPLOYEE/${folderName}/${fileName}`;
    console.log(`[MOCK MODE] Saved registered face image locally: ${localUrl}`);
    return localUrl;
  } else {
    // Production Storage: Upload to ADMIN_EMPLOYEE bucket under <folderName>/ folder
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const fileName = `${employeeId}_${Date.now()}.jpg`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials are not configured in the environment.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const bucketName = "ADMIN_EMPLOYEE";
    const filePath = `${folderName}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.error("Supabase Storage upload error details:", error);
      throw new Error(`Failed to upload face image: ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;
    console.log(`[PRODUCTION MODE] Face image uploaded to ADMIN_EMPLOYEE bucket: ${publicUrl}`);
    return publicUrl;
  }
}

/**
 * Uploads a base64 or buffer company logo to the company-logos bucket.
 * 
 * @param companyId The ID of the company
 * @param base64Image The image as a base64 string
 * @returns The public URL of the uploaded logo
 */
export async function uploadCompanyLogo(
  companyId: string,
  base64Image: string
): Promise<string> {
  const isMock = process.env.MOCK_MODE === "true";
  const folderName = await getCompanyFolderName(companyId);

  if (isMock) {
    // Local development storage simulation under uploads/company-logos/<folderName>/
    const { writeFile, mkdir } = await import("fs/promises");
    const { join } = await import("path");
    const { existsSync } = await import("fs");

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const fileName = `logo_${Date.now()}.png`;

    const companyDir = join(process.cwd(), "public", "uploads", "company-logos", folderName);
    if (!existsSync(companyDir)) {
      await mkdir(companyDir, { recursive: true });
    }

    const filePath = join(companyDir, fileName);
    await writeFile(filePath, buffer);

    const localUrl = `/uploads/company-logos/${folderName}/${fileName}`;
    console.log(`[MOCK MODE] Saved company logo locally: ${localUrl}`);
    return localUrl;
  } else {
    // Production Storage: Upload to company-logos bucket
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const fileName = `logo_${Date.now()}.png`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials are not configured in the environment.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const bucketName = "company-logos";
    const filePath = `${folderName}/${fileName}`;

    // Programmatically ensure the bucket exists!
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const exists = buckets?.some(b => b.name === bucketName);
      if (!exists) {
        await supabase.storage.createBucket(bucketName, { public: true });
      }
    } catch (e) {
      console.error("Error checking/creating bucket:", e);
    }

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (error) {
      console.error("Supabase Storage upload error details:", error);
      throw new Error(`Failed to upload company logo: ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;
    console.log(`[PRODUCTION MODE] Company logo uploaded to company-logos bucket: ${publicUrl}`);
    return publicUrl;
  }
}

