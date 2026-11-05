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

  const today = new Date();
  const endDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const firstDay = endDay - 29 * 24 * 60 * 60 * 1000;
  const daily = new Map<string, { date: string; income: number; expenses: number }>();
  for (let day = firstDay; day <= endDay; day += 24 * 60 * 60 * 1000) {
    const date = new Date(day).toISOString().slice(0, 10);
    daily.set(date, { date, income: 0, expenses: 0 });
  }

  const categories = new Map<string, number>();
  for (const transaction of transactions) {
    const date = transaction.date.toISOString().slice(0, 10);
    const entry = daily.get(date);
    if (transaction.type === "INCOME") {
      if (entry) entry.income += transaction.amount;
    } else {
      categories.set(transaction.category, (categories.get(transaction.category) ?? 0) + transaction.amount);
      if (entry) entry.expenses += transaction.amount;
    }
  }

  return NextResponse.json({
    income,
    expenses,
    balance: income - expenses,
    daily: [...daily.values()],
    categories: [...categories].map(([category, amount]) => ({ category, amount })),
  });
}
