const fs = require("fs");
const pdf = require("pdf-parse/lib/pdf-parse.js");

const file = process.argv[2];

if (!file) {
  console.error("Usage: node scripts/extract-pdf-text.cjs <pdf>");
  process.exit(1);
}

pdf(fs.readFileSync(file))
  .then((data) => {
    console.log(data.text.slice(0, 12000));
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
