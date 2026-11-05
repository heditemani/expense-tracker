import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, getUserIdFromToken } from "@/lib/auth";
import { currencyCodes } from "@/lib/currencies";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const currencySchema = z.object({
  currencyCode: z.enum(currencyCodes),
});

export async function GET() {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const userId = await getUserIdFromToken(token);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, currencyCode: true },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const userId = await getUserIdFromToken(token);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = currencySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a supported currency." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { currencyCode: parsed.data.currencyCode },
    select: { id: true, name: true, email: true, currencyCode: true },
  });
  return NextResponse.json({ user });
}
