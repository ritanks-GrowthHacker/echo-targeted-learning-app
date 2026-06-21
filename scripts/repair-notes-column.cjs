const postgres = require("postgres");

const db = postgres(process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5433/echo");

async function main() {
  await db.unsafe("alter table if exists uploads add column if not exists extracted_text text");
  console.log("uploads.extracted_text is ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.end());
