import { notFound } from "next/navigation";
import { ConceptStatusBadge } from "@/components/concept-status-badge";
import { MathRenderer } from "@/components/math-renderer";
import { getStudentAnalysis } from "@/lib/db/queries/admin";
import { percent, toNumber } from "@/lib/utils";

export default async function StudentAnalysisPage({ params }: { params: { userId: string } }) {
  const { student, mastery, attempts } = await getStudentAnalysis(params.userId);
  if (!student) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-semibold">{student.name}</h1>
      <p className="mt-1 text-[#6B7280]">{student.email}</p>
      <section className="mt-6 overflow-hidden rounded-xl border border-[#1E1E30]">
        <table className="w-full bg-[#141420] text-sm">
          <thead className="bg-[#0D0D14] text-left text-[#6B7280]">
            <tr><th className="p-4">Concept</th><th>Status</th><th>Mastery</th><th>Attempts</th><th>Correct</th></tr>
          </thead>
          <tbody>
            {mastery.map(({ concept, mastery: row }) => (
              <tr key={concept.id} className="border-t border-[#1E1E30]">
                <td className="p-4">{concept.title}</td>
                <td><ConceptStatusBadge status={row?.status} /></td>
                <td>{percent(row?.masteryScore)}%</td>
                <td>{row?.totalAttempts ?? 0}</td>
                <td>{row?.totalAttempts ? Math.round((toNumber(row.correctCount) / toNumber(row.totalAttempts)) * 100) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Recent attempts</h2>
        <div className="space-y-3">
          {attempts.map(({ attempt, question }) => (
            <details key={attempt.id} className="rounded-xl border border-[#1E1E30] bg-[#141420] p-4">
              <summary className="cursor-pointer text-sm">
                <span className="mr-3 text-[#6B7280]">{attempt.phase}</span>
                <MathRenderer text={question.stem.slice(0, 110)} />
              </summary>
              <div className="mt-3 text-sm text-[#B8BBC7]">
                Chosen {attempt.selectedKey}. {attempt.isCorrect ? "Correct" : "Incorrect"}.
                {attempt.aiDiagnosis && <p className="mt-2">{attempt.aiDiagnosis}</p>}
              </div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
