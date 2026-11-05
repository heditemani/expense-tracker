import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, getUserIdFromToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getUserIdFromToken((await cookies()).get(AUTH_COOKIE)?.value);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    select: { amount: true, type: true, category: true, date: true },
    orderBy: { date: "asc" },
  });
  const income = transactions
    .filter((transaction) => transaction.type === "INCOME")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenses = transactions
    .filter((transaction) => transaction.type === "EXPENSE")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const monthly = new Map<string, { month: string; income: number; expenses: number }>();
  const categories = new Map<string, number>();
  for (const transaction of transactions) {
    const month = `${transaction.date.getUTCFullYear()}-${String(transaction.date.getUTCMonth() + 1).padStart(2, "0")}`;
    const entry = monthly.get(month) ?? { month, income: 0, expenses: 0 };
    if (transaction.type === "INCOME") entry.income += transaction.amount;
    else {
      entry.expenses += transaction.amount;
      categories.set(transaction.category, (categories.get(transaction.category) ?? 0) + transaction.amount);
    }
    monthly.set(month, entry);
  }

  return NextResponse.json({
    income,
    expenses,
    balance: income - expenses,
    monthly: [...monthly.values()].slice(-6),
    categories: [...categories].map(([category, amount]) => ({ category, amount })),
  });
}
