const postgres = require("postgres");

const db = postgres(process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5433/echo");

async function main() {
  const rows = await db.unsafe(`
    select table_name, column_name, is_nullable, data_type, column_default
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'users',
        'concepts',
        'misconceptions',
        'questions',
        'uploads',
        'practice_sessions',
        'session_attempts',
        'student_mastery',
        'concept_analysis'
      )
    order by table_name, ordinal_position
  `);

  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.end());
