// ────────────────────────────────
// MotorImage Server Actions
// ARCHITECTURE.md Section 5 — thin layer that validates session/role, parses input, calls service
// ────────────────────────────────

"use server";

import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { motorImageService } from "./motorimage.service";

/**
 * Get all images for a motorcycle
 */
export async function getMotorcycleImages(motorcycleId: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return motorImageService.getByMotorcycleId(motorcycleId);
}

/**
 * Get image by ID
 */
export async function getMotorImageById(id: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return motorImageService.getById(id);
}

/**
 * Upload a new image for a motorcycle
 */
export async function uploadMotorImage(motorcycleId: string, filePath: string, isMain = false) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!can(session, "create", "motorcycle")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  return motorImageService.upload(motorcycleId, filePath, isMain);
}

/**
 * Update image metadata
 */
export async function updateMotorImage(id: string, data: { isMain?: boolean; sortOrder?: number }) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!can(session, "update", "motorcycle")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  return motorImageService.update(id, data);
}

/**
 * Delete an image
 */
export async function deleteMotorImage(id: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!can(session, "delete", "motorcycle")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  return motorImageService.delete(id);
}

/**
 * Delete all images for a motorcycle
 */
export async function deleteMotorcycleImages(motorcycleId: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!can(session, "delete", "motorcycle")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  return motorImageService.deleteByMotorcycleId(motorcycleId);
}

/**
 * Set an image as the main image
 */
export async function setMainMotorImage(imageId: string, motorcycleId: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!can(session, "update", "motorcycle")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  return motorImageService.setAsMain(imageId, motorcycleId);
}

/**
 * Upload image file (server-side)
 *
 * SECURITY.md Section 9 — the final stored filename is generated HERE on the
 * server using Node's crypto.randomBytes. The client never decides the stored
 * path; we only use the client-supplied name to derive a safe extension after
 * strict validation. This prevents path traversal and malicious filename
 * injection.
 */
export async function uploadMotorcycleImage(motorcycleId: string, file: File, isMain = false) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!can(session, "create", "motorcycle")) {
    throw new Error("Forbidden: insufficient permissions");
  }

  // Client-side validation is also done in the browser, but we re-validate
  // server-side because client checks are not trustworthy.
  const { validateImageFile } = await import("@/lib/image-upload");
  validateImageFile(file);

  // Derive a safe extension from the client filename (validated, not trusted as path)
  const originalName = file.name || "";
  const extension = originalName.split(".").pop()?.toLowerCase() || "jpg";
  const validExtensions = ["jpg", "jpeg", "png", "webp"];
  if (!validExtensions.includes(extension)) {
    throw new Error(`Invalid file extension: .${extension}`);
  }

  // Generate the stored filename SERVER-SIDE using Node's crypto.randomBytes.
  // The server — not the client — decides the final filename on disk.
  const { randomBytes } = await import("crypto");
  const randomName = randomBytes(32).toString("hex");
  const filename = `${randomName}.${extension}`;

  // Create directory and save file
  const { mkdir, writeFile } = await import("fs/promises");
  const { join } = await import("path");
  const baseDir = join(process.cwd(), "storage", "motorcycles");
  const directory = join(baseDir, motorcycleId);

  await mkdir(directory, { recursive: true });

  const fullPath = join(directory, filename);
  const relativePath = `storage/motorcycles/${motorcycleId}/${filename}`;

  // Convert and save file
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(fullPath, buffer);

  // Create database record
  return motorImageService.upload(motorcycleId, relativePath, isMain);
}
