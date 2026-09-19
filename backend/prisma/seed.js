import { prisma } from "../src/config/prisma.js";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding database...");

  // 1. Units
  const units = [
    { name: "guzz", symbol: "g", allowDecimal: true },
    { name: "metre", symbol: "m", allowDecimal: true },
    { name: "kg", symbol: "kg", allowDecimal: true },
    { name: "grams", symbol: "gr", allowDecimal: true },
    { name: "pieces", symbol: "pcs", allowDecimal: false },
    { name: "suits", symbol: "st", allowDecimal: false },
  ];

  for (const unit of units) {
    await prisma.unit.upsert({
      where: { name: unit.name },
      update: { allowDecimal: unit.allowDecimal },
      create: unit,
    });
  }
  console.log("Units seeded.");

  // 2. Expense Categories
  const expenseCategories = [
    "Rent",
    "Salary",
    "Utilities",
    "Transport",
    "Supplies",
    "Maintenance",
    "Marketing",
    "Other",
  ];

  for (const catName of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { name: catName },
      update: {},
      create: { name: catName },
    });
  }
  console.log("Expense categories seeded.");

  // 3. Categories
  const categories = ["Lawn", "Cotton", "Silk", "Chiffon", "Linen", "Velvet"];
  for (const catName of categories) {
    await prisma.category.upsert({
      where: { name: catName },
      update: {},
      create: { name: catName },
    });
  }
  console.log("Categories seeded.");

  // 4. Brands
  const brands = [
    { name: "Gul Ahmed", country: "Pakistan" },
    { name: "Al-Karam", country: "Pakistan" },
    { name: "Bonanza Satrangi", country: "Pakistan" },
    { name: "Sapphire", country: "Pakistan" },
    { name: "Khaadi", country: "Pakistan" },
    { name: "J.", country: "Pakistan" },
  ];

  for (const b of brands) {
    await prisma.brand.upsert({
      where: { name: b.name },
      update: {},
      create: b,
    });
  }
  console.log("Brands seeded.");

  // 5. Users (Admin)
  const adminPassword = await bcrypt.hash("GMFabrics0987#", 10);

  await prisma.user.upsert({
    where: { email: "umarhassan@gmfabrics.store" },
    update: {},
    create: {
      name: "Umar Hassan",
      email: "umarhassan@gmfabrics.store",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  console.log("Admin user seeded successfully.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
