import { v2 as cloudinary } from "cloudinary";

// Initialize Cloudinary config with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Uploads a base64 string or data URI directly to Cloudinary.
 *
 * @param base64Image The image string (data URI or raw base64)
 * @param folder The folder path in Cloudinary (e.g. `attendance/<companySlug>/employee_selfie`)
 * @param publicId Optional unique ID for the asset
 * @returns The secure HTTPS URL of the uploaded asset
 */
export async function uploadBase64ToCloudinary(
  base64Image: string,
  folder: string,
  publicId?: string
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary credentials are not configured in environment variables.");
  }

  // Ensure standard Data URI prefix
  const dataUri = base64Image.startsWith("data:")
    ? base64Image
    : `data:image/jpeg;base64,${base64Image}`;

  const uploadOptions: Record<string, any> = {
    folder,
    resource_type: "image",
    overwrite: true,
  };

  if (publicId) {
    uploadOptions.public_id = publicId.replace(/\.[^/.]+$/, ""); // strip extension if present
  }

  const result = await cloudinary.uploader.upload(dataUri, uploadOptions);
  return result.secure_url;
}

export { cloudinary };
