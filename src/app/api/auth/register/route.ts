import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, AUTH_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  const parsed = registrationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a name, valid email, and password (at least 8 characters)." }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hash(password, 12) },
    select: { id: true, name: true, email: true },
  });
  const response = NextResponse.json({ user }, { status: 201 });
  response.cookies.set(AUTH_COOKIE, await createSessionToken(user.id), sessionCookieOptions);
  return response;
}
