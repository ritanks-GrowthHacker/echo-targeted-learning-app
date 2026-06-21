const fs = require("fs");
const pdf = require("pdf-parse/lib/pdf-parse.js");

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("PDF path is required");
  const { parseLocalMCQs, inferLocalAnswer, inferLocalDifficulty } = await import("../src/lib/ai/local-mcq-parser.ts");
  const data = await pdf(fs.readFileSync(file));
  const questions = parseLocalMCQs(data.text);
  console.log(
    JSON.stringify(
      {
        count: questions.length,
        first: questions[0],
        firstAnswer: questions[0] ? inferLocalAnswer(questions[0]) : null,
        firstDifficulty: questions[0] ? inferLocalDifficulty(questions[0]) : null,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
