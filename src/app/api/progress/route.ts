import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStudentProgress } from "@/lib/db/queries/mastery";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getStudentProgress(session.user.id));
}
