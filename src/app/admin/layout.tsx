import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <header className="border-b border-[#1E1E30] bg-[#141420]/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/admin/dashboard" className="text-lg font-semibold">Echo Admin</Link>
          <nav className="flex items-center gap-4 text-sm text-[#B8BBC7]">
            <Link href="/admin/dashboard">Students</Link>
            <Link href="/admin/upload">Upload</Link>
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
