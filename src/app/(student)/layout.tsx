import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-[#1E1E30] bg-[#141420]/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="text-lg font-semibold">Echo</Link>
          <nav className="flex items-center gap-4 text-sm text-[#B8BBC7]">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/practice">Practice</Link>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <button>Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
