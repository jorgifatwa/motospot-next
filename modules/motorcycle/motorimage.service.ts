// ────────────────────────────────
// MotorImage Service
// ARCHITECTURE.md Section 5 — business logic layer
// BUSINESS_RULE.md Section 5.1 — image upload rules
// SECURITY.md Section 9 — file upload security
// ────────────────────────────────

import { auth } from "@/lib/auth";
import { can, isCashier } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { MotorImageRepository } from "./motorimage.repository";
import { CreateMotorImageInput, UpdateMotorImageInput } from "./motorimage.schema";

const motorImageRepository = new MotorImageRepository();

export class MotorImageService {
  /**
   * Get all images for a motorcycle
   */
  async getByMotorcycleId(motorcycleId: string) {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const { images } = await motorImageRepository.findAll({
      motorcycleId,
      orderBy: { sortOrder: "asc" },
    });

    return images;
  }

  /**
   * Get image by ID
   */
  async getById(id: string) {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const image = await motorImageRepository.findById(id);

    if (!image) {
      throw new Error("Image not found");
    }

    return image;
  }

  /**
   * Upload a new image for a motorcycle
   */
  async upload(motorcycleId: string, filePath: string, isMain = false) {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Only ADMIN can upload images
    if (!can(session, "create", "motorcycle")) {
      throw new Error("Forbidden: insufficient permissions");
    }

    // If this is set as main, unset all other main images
    if (isMain) {
      await motorImageRepository.setAsMain("", motorcycleId); // This will unset all
    }

    // Create image record
    const image = await motorImageRepository.create({
      motorcycleId,
      path: filePath,
      isMain,
      sortOrder: 0,
    });

    // Write audit log
    await logAudit(session.user.id, "MOTORCYCLE_UPDATED", "Motorcycle", motorcycleId, {
      after: {
        imageUploaded: true,
        imagePath: filePath,
        isMain,
      },
    });

    return image;
  }

  /**
   * Update image metadata (isMain, sortOrder)
   */
  async update(id: string, data: UpdateMotorImageInput) {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Only ADMIN can update images
    if (!can(session, "update", "motorcycle")) {
      throw new Error("Forbidden: insufficient permissions");
    }

    const existingImage = await motorImageRepository.findById(id);
    if (!existingImage) {
      throw new Error("Image not found");
    }

    // If setting as main, unset all other main images for this motorcycle
    if (data.isMain && !existingImage.isMain) {
      await motorImageRepository.setAsMain(id, existingImage.motorcycleId);
    }

    // Update image
    const updatedImage = await motorImageRepository.update(id, data);

    // Write audit log
    await logAudit(
      session.user.id,
      "MOTORCYCLE_UPDATED",
      "Motorcycle",
      existingImage.motorcycleId,
      {
        before: {
          isMain: existingImage.isMain,
          sortOrder: existingImage.sortOrder,
        },
        after: {
          isMain: updatedImage.isMain,
          sortOrder: updatedImage.sortOrder,
        },
      },
    );

    return updatedImage;
  }

  /**
   * Delete an image
   */
  async delete(id: string) {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Only ADMIN can delete images
    if (!can(session, "delete", "motorcycle")) {
      throw new Error("Forbidden: insufficient permissions");
    }

    const image = await motorImageRepository.findById(id);
    if (!image) {
      throw new Error("Image not found");
    }

    // Delete image record
    await motorImageRepository.delete(id);

    // Write audit log
    await logAudit(session.user.id, "MOTORCYCLE_UPDATED", "Motorcycle", image.motorcycleId, {
      before: {
        imagePath: image.path,
        isMain: image.isMain,
      },
      after: {
        imageDeleted: true,
      },
    });

    return { success: true };
  }

  /**
   * Delete all images for a motorcycle
   */
  async deleteByMotorcycleId(motorcycleId: string) {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Only ADMIN can delete images
    if (!can(session, "delete", "motorcycle")) {
      throw new Error("Forbidden: insufficient permissions");
    }

    await motorImageRepository.deleteByMotorcycleId(motorcycleId);

    // Write audit log
    await logAudit(session.user.id, "MOTORCYCLE_DELETED", "Motorcycle", motorcycleId, {
      after: {
        allImagesDeleted: true,
      },
    });

    return { success: true };
  }

  /**
   * Set an image as the main image
   */
  async setAsMain(imageId: string, motorcycleId: string) {
    const session = await auth();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Only ADMIN can update images
    if (!can(session, "update", "motorcycle")) {
      throw new Error("Forbidden: insufficient permissions");
    }

    const image = await motorImageRepository.setAsMain(imageId, motorcycleId);

    // Write audit log
    await logAudit(session.user.id, "MOTORCYCLE_UPDATED", "Motorcycle", motorcycleId, {
      after: {
        mainImageSet: true,
        imageId,
      },
    });

    return image;
  }
}

export const motorImageService = new MotorImageService();
