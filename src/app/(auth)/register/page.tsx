"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setError("");
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    if (response.ok) router.push("/login");
    else setError(response.status === 409 ? "Email already exists" : "Could not create account");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form action={submit} className="w-full max-w-md rounded-xl border border-[#1E1E30] bg-[#141420] p-6">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <input className="mt-6 w-full rounded-lg border border-[#1E1E30] bg-[#0D0D14] px-4 py-3" name="name" placeholder="Name" required />
        <input className="mt-3 w-full rounded-lg border border-[#1E1E30] bg-[#0D0D14] px-4 py-3" name="email" type="email" placeholder="Email" required />
        <input className="mt-3 w-full rounded-lg border border-[#1E1E30] bg-[#0D0D14] px-4 py-3" name="password" type="password" placeholder="Password" required />
        {error && <p className="mt-3 text-sm text-[#EF4444]">{error}</p>}
        <button className="mt-5 w-full rounded-lg bg-[#7C6FFF] px-4 py-3 font-semibold text-white">Create account</button>
        <p className="mt-4 text-center text-sm text-[#6B7280]">
          Already registered? <Link className="text-[#7C6FFF]" href="/login">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
