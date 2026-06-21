import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { completeSession } from "@/lib/db/queries/sessions";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await completeSession(params.id);
  return NextResponse.json({ success: true });
}
