import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export default async function globalSetup() {
  // Prior E2E runs place real orders which decrement branch inventory; top it
  // back up so checkout-stock checks stay deterministic.
  await db.inventory.updateMany({ data: { qty: 10 } });
  await db.$disconnect();
}
