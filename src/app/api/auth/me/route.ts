import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, getUserIdFromToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  const userId = await getUserIdFromToken(token);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user });
}
