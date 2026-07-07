// ────────────────────────────────
// MotorImage Repository
// ARCHITECTURE.md Section 5 — only layer allowed to call Prisma directly
// ────────────────────────────────

import { prisma } from "@/lib/prisma";

export interface MotorImageListOptions {
  motorcycleId?: string;
  skip?: number;
  take?: number;
  orderBy?: Record<string, "asc" | "desc">;
}

export class MotorImageRepository {
  /**
   * Find all images for a motorcycle
   */
  async findAll(options: MotorImageListOptions = {}) {
    const {
      motorcycleId,
      skip = 0,
      take = 50,
      orderBy = { sortOrder: "asc", createdAt: "asc" },
    } = options;

    const where: Record<string, unknown> = {};

    if (motorcycleId) {
      where.motorcycleId = motorcycleId;
    }

    const [images, total] = await Promise.all([
      prisma.motorImage.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      prisma.motorImage.count({ where }),
    ]);

    return { images, total };
  }

  /**
   * Find image by ID
   */
  async findById(id: string) {
    return prisma.motorImage.findUnique({
      where: { id },
    });
  }

  /**
   * Find image by path
   */
  async findByPath(path: string) {
    return prisma.motorImage.findFirst({
      where: { path },
    });
  }

  /**
   * Find main image for a motorcycle
   */
  async findMainImage(motorcycleId: string) {
    return prisma.motorImage.findFirst({
      where: {
        motorcycleId,
        isMain: true,
      },
    });
  }

  /**
   * Create a new image record
   */
  async create(data: Record<string, unknown>) {
    return prisma.motorImage.create({
      data: data as Parameters<typeof prisma.motorImage.create>[0]["data"],
    });
  }

  /**
   * Update an image
   */
  async update(id: string, data: Record<string, unknown>) {
    return prisma.motorImage.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete an image
   */
  async delete(id: string) {
    return prisma.motorImage.delete({
      where: { id },
    });
  }

  /**
   * Delete all images for a motorcycle
   */
  async deleteByMotorcycleId(motorcycleId: string) {
    return prisma.motorImage.deleteMany({
      where: { motorcycleId },
    });
  }

  /**
   * Count images for a motorcycle
   */
  async countByMotorcycleId(motorcycleId: string): Promise<number> {
    return prisma.motorImage.count({
      where: { motorcycleId },
    });
  }

  /**
   * Set an image as main (and unset others)
   */
  async setAsMain(imageId: string, motorcycleId: string) {
    // Use a transaction to ensure atomicity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return prisma.$transaction(async (tx: any) => {
      // Unset all main images for this motorcycle
      await tx.motorImage.updateMany({
        where: { motorcycleId },
        data: { isMain: false },
      });

      // Set the specified image as main
      await tx.motorImage.update({
        where: { id: imageId },
        data: { isMain: true },
      });

      return tx.motorImage.findUnique({
        where: { id: imageId },
      });
    });
  }

  /**
   * Update sort order for multiple images
   */
  async updateSortOrder(updates: Array<{ id: string; sortOrder: number }>) {
    return prisma.$transaction(
      updates.map((update) =>
        prisma.motorImage.update({
          where: { id: update.id },
          data: { sortOrder: update.sortOrder },
        }),
      ),
    );
  }
}
