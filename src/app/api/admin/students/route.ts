import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStudents } from "@/lib/db/queries/admin";

export async function GET() {
  const session = await auth();
  if (session?.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await getStudents());
}
