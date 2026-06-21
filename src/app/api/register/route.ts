import { NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function POST(req: Request) {
  const { name, email, password } = await req.json();
  if (!name || !email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const normalizedEmail = String(email).toLowerCase();
  const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (existing.length) return NextResponse.json({ error: "Email already exists" }, { status: 409 });

  await db.insert(users).values({
    name,
    email: normalizedEmail,
    passwordHash: hashSync(password, 10),
    role: "student",
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
