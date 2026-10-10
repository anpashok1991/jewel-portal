"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateDueDates } from "@/lib/scheme";
import { resolveRate } from "@/lib/pricing";
import { moneyToGoldMg } from "@/lib/scheme";

export type SchemeState = { ok?: boolean; error?: string };

async function requireCustomer() {
  const s = await getSession();
  if (!s || s.role === "CUSTOMER") return s;
  if (s.role === "OWNER" || s.role === "STAFF") return null;
  return null;
}

export async function enrollScheme(_prev: SchemeState, formData: FormData): Promise<SchemeState> {
  const s = await requireCustomer();
  if (!s) redirect("/account/login");

  const planId = String(formData.get("planId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const plan = await db.savingsPlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active || plan.shopId !== s.shopId) return { error: "Plan unavailable." };

  const existing = await db.schemeAccount.findFirst({
    where: { planId, userId: s.uid, status: { in: ["ACTIVE", "MATURED"] } },
  });
  if (existing) return { error: "You are already enrolled in this plan." };

  const start = new Date();
  const dues = generateDueDates({
    frequency: plan.frequency,
    customDays: plan.customDays,
    amountPaise: plan.amountPaise,
    tenureCount: plan.tenureCount,
    mode: plan.mode as "ROI" | "GOLD",
    roiPercentBp: plan.roiPercentBp,
    goldBonusBp: plan.goldBonusBp,
  }, start);
  const maturesAt = dues[dues.length - 1] ?? new Date(Date.now() + 365 * 86400000);

  const count = await db.schemeAccount.count({ where: { shopId: plan.shopId } });
  const account = await db.schemeAccount.create({
    data: {
      shopId: plan.shopId,
      planId: plan.id,
      userId: s.uid,
      accountNo: `SCH-${Date.now().toString().slice(-7)}-${count + 1}`,
      startedAt: start,
      maturesAt,
    },
  });
  await Promise.all(
    dues.map((d, i) =>
      db.deposit.create({
        data: { accountId: account.id, seq: i + 1, dueDate: d, amountPaise: plan.amountPaise, status: "DUE" },
      }),
    ),
  );
  revalidatePath(`/${slug}/schemes`);
  revalidatePath("/account/schemes");
  return { ok: true };
}

export async function payDeposit(_prev: SchemeState, formData: FormData): Promise<SchemeState> {
  const s = await requireCustomer();
  if (!s) redirect("/account/login");

  const depositId = String(formData.get("depositId") ?? "");
  const deposit = await db.deposit.findUnique({ where: { id: depositId }, include: { account: { include: { plan: true } } } });
  if (!deposit || deposit.account.userId !== s.uid) return { error: "Deposit not found." };
  if (deposit.status === "PAID") return { error: "Already paid." };

  const wallet = await db.wallet.findUnique({ where: { userId_shopId: { userId: s.uid, shopId: deposit.account.shopId } } });
  const amount = deposit.amountPaise;
  if (!wallet || wallet.balancePaise < amount) {
    return { error: "Insufficient wallet balance. Top up your wallet or pay at the store counter." };
  }

  const goldRate = await resolveRate(deposit.account.shopId, "GOLD", "916");
  const goldMg = goldRate > 0 ? moneyToGoldMg(amount, goldRate) : 0;

  await db.$transaction([
    db.wallet.update({ where: { id: wallet.id }, data: { balancePaise: { decrement: amount } } }),
    db.walletTxn.create({
      data: { walletId: wallet.id, type: "DEBIT", amountPaise: amount, reason: `Scheme installment #${deposit.seq} (${deposit.account.accountNo})` },
    }),
    db.deposit.update({
      where: { id: deposit.id },
      data: { status: "PAID", paidAt: new Date(), method: "WALLET", goldMgAtPay: goldMg, rateUsedPaise: goldRate },
    }),
    db.schemeAccount.update({
      where: { id: deposit.accountId },
      data: {
        totalPaidPaise: { increment: amount },
        ...(deposit.account.plan.mode === "GOLD" ? { goldMgAccrued: { increment: goldMg } } : {}),
      },
    }),
  ]);

  revalidatePath("/account/schemes");
  return { ok: true };
}

export async function topUpWallet(_prev: SchemeState, formData: FormData): Promise<SchemeState> {
  const s = await requireCustomer();
  if (!s) redirect("/account/login");
  const rupees = Number(formData.get("amount") ?? 0);
  if (!rupees || rupees < 100) return { error: "Minimum top-up ₹100." };
  const shopId = String(formData.get("shopId") ?? s.shopId);

  let wallet = await db.wallet.findUnique({ where: { userId_shopId: { userId: s.uid, shopId } } });
  if (!wallet) wallet = await db.wallet.create({ data: { userId: s.uid, shopId } });

  await db.$transaction([
    db.wallet.update({ where: { id: wallet.id }, data: { balancePaise: { increment: rupees * 100 } } }),
    db.walletTxn.create({
      data: { walletId: wallet.id, type: "CREDIT", amountPaise: rupees * 100, reason: "Wallet top-up (UPI/online)" },
    }),
  ]);
  revalidatePath("/account/wallet");
  return { ok: true };
}
