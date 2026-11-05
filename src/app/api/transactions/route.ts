import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, getUserIdFromToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionSchema } from "@/lib/validation";

async function authenticatedUserId() {
  return getUserIdFromToken((await cookies()).get(AUTH_COOKIE)?.value);
}

export async function GET(request: Request) {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const from = params.get("from");
  const to = params.get("to");
  const type = params.get("type");
  const category = params.get("category");

  const validDate = (value: string | null) =>
    value === null || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)));
  if (!validDate(from) || !validDate(to) || (from && to && from > to)) {
    return NextResponse.json({ error: "Date filters must be valid and in chronological order." }, { status: 400 });
  }

  const date = from || to
    ? {
        ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
        ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
      }
    : undefined;

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      ...(date ? { date } : {}),
      ...(type === "INCOME" || type === "EXPENSE" ? { type } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ transactions });
}

export async function POST(request: Request) {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = transactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Transaction details are invalid." }, { status: 400 });
  }
  const transaction = await prisma.transaction.create({
    data: { ...parsed.data, date: new Date(parsed.data.date), userId },
  });
  return NextResponse.json({ transaction }, { status: 201 });
}
