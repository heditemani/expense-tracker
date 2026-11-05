import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, getUserIdFromToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

async function authenticatedUserId() {
  return getUserIdFromToken((await cookies()).get(AUTH_COOKIE)?.value);
}

export async function PUT(request: Request, { params }: RouteContext) {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = transactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Transaction details are invalid." }, { status: 400 });
  }

  const result = await prisma.transaction.updateMany({
    where: { id, userId },
    data: { ...parsed.data, date: new Date(parsed.data.date) },
  });
  if (!result.count) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  const transaction = await prisma.transaction.findFirst({ where: { id, userId } });
  return NextResponse.json({ transaction });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const userId = await authenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await prisma.transaction.deleteMany({ where: { id, userId } });
  if (!result.count) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
