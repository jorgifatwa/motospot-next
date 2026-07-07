// ────────────────────────────────
// Database Seed Script
// DATABASE.md Section 4.7 — bootstrap Admin user + Employee record
// BUSINESS_RULE.md Section 11 — mandatory User-Employee link
// SECURITY.md Section 5 — password policy (bcrypt 12 rounds, min 10 chars)
// ────────────────────────────────

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ────────────────────────────────
  // Configuration
  // ────────────────────────────────

  const ADMIN_EMAIL = "admin@rnjmotospot.com";
  const ADMIN_PASSWORD = "Admin@123456"; // Must be at least 10 chars
  const ADMIN_NAME = "System Administrator";
  const EMPLOYEE_NAME = "System Administrator";
  const BRANCH_NAME = "Main Branch";

  // ────────────────────────────────
  // Validate password policy
  // ────────────────────────────────

  if (ADMIN_PASSWORD.length < 10) {
    throw new Error("Password must be at least 10 characters");
  }

  if (ADMIN_PASSWORD.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    throw new Error("Password must not equal email");
  }

  if (ADMIN_PASSWORD.toLowerCase().includes(ADMIN_NAME.toLowerCase())) {
    throw new Error("Password must not contain user's name");
  }

  // ────────────────────────────────
  // Create default branch
  // ────────────────────────────────

  console.log("Creating default branch...");
  let branch = await prisma.branch.findFirst({
    where: { name: BRANCH_NAME },
  });

  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: BRANCH_NAME,
        address: "Main Office",
      },
    });
  }
  console.log(`✓ Branch ready: ${branch.name} (${branch.id})`);

  // ────────────────────────────────
  // Check if admin already exists
  // ────────────────────────────────

  const existingUser = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    include: { employee: true },
  });

  if (existingUser) {
    console.log(`✓ Admin user already exists: ${ADMIN_EMAIL}`);
    console.log(`  User ID: ${existingUser.id}`);
    console.log(`  Employee ID: ${existingUser.employeeId}`);
    return;
  }

  // ────────────────────────────────
  // Create Employee record first
  // ────────────────────────────────
  // Per DATABASE.md Section 4.7 and BUSINESS_RULE.md Section 11:
  // Every User must originate from an Employee record

  console.log("Creating employee record...");
  const employee = await prisma.employee.create({
    data: {
      name: EMPLOYEE_NAME,
      email: ADMIN_EMAIL,
      phone: null,
      address: null,
      branchId: branch.id,
    },
  });
  console.log(`✓ Employee created: ${employee.name} (${employee.id})`);

  // ────────────────────────────────
  // Hash password (bcrypt 12 rounds per SECURITY.md Section 5)
  // ────────────────────────────────

  console.log("Hashing password...");
  const passwordHash = await hash(ADMIN_PASSWORD, 12);
  console.log("✓ Password hashed with 12 rounds");

  // ────────────────────────────────
  // Create User account linked to Employee
  // ────────────────────────────────

  console.log("Creating admin user account...");
  const user = await prisma.user.create({
    data: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
      branchId: branch.id, // ADMIN can have branchId for consistency
      employeeId: employee.id, // Mandatory 1-to-1 link
    },
  });
  console.log(`✓ Admin user created: ${user.email} (${user.id})`);
  console.log(`  Role: ${user.role}`);
  console.log(`  Branch: ${branch.name}`);

  // ────────────────────────────────
  // Summary
  // ────────────────────────────────

  console.log("\n✅ Seed completed successfully!");
  console.log("─────────────────────────────────────────");
  console.log("Default Admin Credentials:");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log("─────────────────────────────────────────");
  console.log("⚠️  Please change the password after first login!");
  console.log("─────────────────────────────────────────\n");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
