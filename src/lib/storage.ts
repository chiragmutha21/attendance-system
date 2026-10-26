import { isCloudinaryConfigured, uploadBase64ToCloudinary } from "@/lib/cloudinary";

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
 * Normalizes arguments for uploadFaceImage to handle both calling signatures:
 * (companyId, employeeId, base64Image) OR (base64Image, companyId, employeeId)
 */
function resolveFaceImageArgs(arg1: string, arg2: string, arg3: string): { companyId: string; employeeId: string; base64Image: string } {
  if (arg1 && (arg1.startsWith("data:") || arg1.length > 500)) {
    return { base64Image: arg1, companyId: arg2, employeeId: arg3 };
  }
  if (arg3 && (arg3.startsWith("data:") || arg3.length > 500)) {
    return { companyId: arg1, employeeId: arg2, base64Image: arg3 };
  }
  return { companyId: arg1, employeeId: arg2, base64Image: arg3 };
}

/**
 * Uploads an employee profile face image company-wise (Admin upload).
 * Primary storage: Cloudinary (folder: attendance/<company>/admin_employee)
 * Fallback: Supabase Storage (ADMIN_EMPLOYEE bucket) or Mock local filesystem
 */
export async function uploadFaceImage(
  param1: string,
  param2: string,
  param3: string
): Promise<string> {
  const { companyId, employeeId, base64Image } = resolveFaceImageArgs(param1, param2, param3);
  const folderName = await getCompanyFolderName(companyId);
  const fileName = `${employeeId}_${Date.now()}`;

  // 1. Cloudinary upload (Primary)
  if (isCloudinaryConfigured()) {
    try {
      const cloudinaryFolder = `attendance/${folderName}/admin_employee`;
      const publicUrl = await uploadBase64ToCloudinary(base64Image, cloudinaryFolder, fileName);
      console.log(`[CLOUDINARY] Uploaded employee face image: ${publicUrl}`);
      return publicUrl;
    } catch (cldErr: any) {
      console.error("[CLOUDINARY] Upload error for face image:", cldErr);
      // Fall through to secondary storage if Cloudinary upload fails
    }
  }

  const isMock = process.env.MOCK_MODE === "true";

  if (isMock) {
    // Local development storage simulation under uploads/ADMIN_EMPLOYEE/<folderName>/
    const { writeFile, mkdir } = await import("fs/promises");
    const { join } = await import("path");
    const { existsSync } = await import("fs");

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const localFileName = `${employeeId}_${Date.now()}.jpg`;

    const companyDir = join(process.cwd(), "public", "uploads", "ADMIN_EMPLOYEE", folderName);
    if (!existsSync(companyDir)) {
      await mkdir(companyDir, { recursive: true });
    }

    const filePath = join(companyDir, localFileName);
    await writeFile(filePath, buffer);

    const localUrl = `/uploads/ADMIN_EMPLOYEE/${folderName}/${localFileName}`;
    console.log(`[MOCK MODE] Saved registered face image locally: ${localUrl}`);
    return localUrl;
  } else {
    // Supabase fallback
    const { createClient } = await import("@supabase/supabase-js");
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const supaFileName = `${employeeId}_${Date.now()}.jpg`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("No storage provider credentials configured (Cloudinary or Supabase).");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const bucketName = "ADMIN_EMPLOYEE";
    const filePath = `${folderName}/${supaFileName}`;

    const { error } = await supabase.storage
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
    console.log(`[SUPABASE] Face image uploaded to ADMIN_EMPLOYEE bucket: ${publicUrl}`);
    return publicUrl;
  }
}

/**
 * Uploads an employee attendance punch selfie company-wise.
 * Primary storage: Cloudinary (folder: attendance/<company>/employee_selfie)
 * Fallback: Supabase Storage (EMPLOYEE_SELFIE bucket) or Mock local filesystem
 */
export async function uploadSelfieImage(
  companyId: string,
  employeeId: string,
  base64Image: string
): Promise<string> {
  const folderName = await getCompanyFolderName(companyId);
  const fileName = `${employeeId}_${Date.now()}`;

  // 1. Cloudinary upload (Primary)
  if (isCloudinaryConfigured()) {
    try {
      const cloudinaryFolder = `attendance/${folderName}/employee_selfie`;
      const publicUrl = await uploadBase64ToCloudinary(base64Image, cloudinaryFolder, fileName);
      console.log(`[CLOUDINARY] Uploaded attendance selfie: ${publicUrl}`);
      return publicUrl;
    } catch (cldErr: any) {
      console.error("[CLOUDINARY] Upload error for selfie:", cldErr);
      // Fall through to secondary storage if Cloudinary upload fails
    }
  }

  const isMock = process.env.MOCK_MODE === "true";

  if (isMock) {
    const { writeFile, mkdir } = await import("fs/promises");
    const { join } = await import("path");
    const { existsSync } = await import("fs");

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const localFileName = `${employeeId}_${Date.now()}.jpg`;

    const uploadDir = join(process.cwd(), "public", "uploads", "EMPLOYEE_SELFIE", folderName);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, localFileName);
    await writeFile(filePath, buffer);

    const localUrl = `/uploads/EMPLOYEE_SELFIE/${folderName}/${localFileName}`;
    console.log(`[MOCK MODE] Saved selfie locally: ${localUrl}`);
    return localUrl;
  } else {
    const { createClient } = await import("@supabase/supabase-js");
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const supaFileName = `${employeeId}_${Date.now()}.jpg`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("No storage provider credentials configured (Cloudinary or Supabase).");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const bucketName = "EMPLOYEE_SELFIE";
    const filePath = `${folderName}/${supaFileName}`;

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.error("Supabase Storage upload error:", error);
      throw new Error(`Failed to upload selfie to cloud storage: ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;
    console.log(`[SUPABASE] Saved selfie to EMPLOYEE_SELFIE bucket: ${publicUrl}`);
    return publicUrl;
  }
}

/**
 * Uploads a company logo.
 * Primary storage: Cloudinary (folder: attendance/<company>/company_logos)
 * Fallback: Supabase Storage (company-logos bucket) or Mock local filesystem
 */
export async function uploadCompanyLogo(
  companyId: string,
  base64Image: string
): Promise<string> {
  const folderName = await getCompanyFolderName(companyId);
  const fileName = `logo_${Date.now()}`;

  // 1. Cloudinary upload (Primary)
  if (isCloudinaryConfigured()) {
    try {
      const cloudinaryFolder = `attendance/${folderName}/company_logos`;
      const publicUrl = await uploadBase64ToCloudinary(base64Image, cloudinaryFolder, fileName);
      console.log(`[CLOUDINARY] Uploaded company logo: ${publicUrl}`);
      return publicUrl;
    } catch (cldErr: any) {
      console.error("[CLOUDINARY] Upload error for company logo:", cldErr);
    }
  }

  const isMock = process.env.MOCK_MODE === "true";

  if (isMock) {
    const { writeFile, mkdir } = await import("fs/promises");
    const { join } = await import("path");
    const { existsSync } = await import("fs");

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const localFileName = `logo_${Date.now()}.png`;

    const companyDir = join(process.cwd(), "public", "uploads", "company-logos", folderName);
    if (!existsSync(companyDir)) {
      await mkdir(companyDir, { recursive: true });
    }

    const filePath = join(companyDir, localFileName);
    await writeFile(filePath, buffer);

    const localUrl = `/uploads/company-logos/${folderName}/${localFileName}`;
    console.log(`[MOCK MODE] Saved company logo locally: ${localUrl}`);
    return localUrl;
  } else {
    const { createClient } = await import("@supabase/supabase-js");
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const supaFileName = `logo_${Date.now()}.png`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("No storage provider credentials configured (Cloudinary or Supabase).");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const bucketName = "company-logos";
    const filePath = `${folderName}/${supaFileName}`;

    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const exists = buckets?.some((b) => b.name === bucketName);
      if (!exists) {
        await supabase.storage.createBucket(bucketName, { public: true });
      }
    } catch (e) {
      console.error("Error checking/creating bucket:", e);
    }

    const { error } = await supabase.storage
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
    console.log(`[SUPABASE] Company logo uploaded to company-logos bucket: ${publicUrl}`);
    return publicUrl;
  }
}
