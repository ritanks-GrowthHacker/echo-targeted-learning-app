"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { percent } from "@/lib/utils";

type Student = { id: string; name: string; email: string; lastActive: string | null; overallMastery: string | null };

export default function AdminDashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/students").then((res) => res.json()).then(setStudents);
  }, []);

  const filtered = useMemo(
    () => students.filter((student) => `${student.name} ${student.email}`.toLowerCase().includes(query.toLowerCase())),
    [students, query],
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold">Students</h1>
          <p className="mt-2 text-[#6B7280]">Per-student adaptive learning analysis.</p>
        </div>
        <input className="rounded-lg border border-[#1E1E30] bg-[#141420] px-4 py-3" placeholder="Search name or email" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="overflow-hidden rounded-xl border border-[#1E1E30]">
        <table className="w-full border-collapse bg-[#141420] text-sm">
          <thead className="bg-[#0D0D14] text-left text-[#6B7280]">
            <tr><th className="p-4">Name</th><th>Email</th><th>Last Active</th><th>Overall Mastery</th></tr>
          </thead>
          <tbody>
            {filtered.map((student) => (
              <tr key={student.id} className="border-t border-[#1E1E30] hover:bg-[#1A1A28]">
                <td className="p-4"><Link className="font-semibold text-[#F1F1F5]" href={`/admin/students/${student.id}`}>{student.name}</Link></td>
                <td>{student.email}</td>
                <td>{student.lastActive ? new Date(student.lastActive).toLocaleString() : "No attempts"}</td>
                <td>{percent(student.overallMastery)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
