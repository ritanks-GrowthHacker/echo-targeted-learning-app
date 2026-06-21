"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setError("");
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
    if (result?.error) setError("Invalid email or password");
    else router.push("/");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form action={submit} className="w-full max-w-md rounded-xl border border-[#1E1E30] bg-[#141420] p-6">
        <h1 className="text-2xl font-semibold">Echo</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Sign in to continue your Kinematics path.</p>
        <input className="mt-6 w-full rounded-lg border border-[#1E1E30] bg-[#0D0D14] px-4 py-3" name="email" type="email" placeholder="Email" required />
        <input className="mt-3 w-full rounded-lg border border-[#1E1E30] bg-[#0D0D14] px-4 py-3" name="password" type="password" placeholder="Password" required />
        {error && <p className="mt-3 text-sm text-[#EF4444]">{error}</p>}
        <button className="mt-5 w-full rounded-lg bg-[#7C6FFF] px-4 py-3 font-semibold text-white">Sign in</button>
        <p className="mt-4 text-center text-sm text-[#6B7280]">
          New here? <Link className="text-[#7C6FFF]" href="/register">Create account</Link>
        </p>
      </form>
    </main>
  );
}
