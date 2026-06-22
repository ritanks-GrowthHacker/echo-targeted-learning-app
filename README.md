# Echo Targeted Learning App

Echo is an adaptive learning MVP for JEE/NEET Physics Kinematics. Admins upload chapter-wise question banks and study material. Students practice topic-wise 10-question sets, get a report, revise only the weak concept material, and then retest.

## Tech Stack

- Next.js 14 App Router
- TypeScript
- PostgreSQL / Supabase
- Drizzle ORM
- NextAuth v5 credentials auth
- Google Gemini 1.5 Flash
- Tailwind CSS
- KaTeX math rendering
- PDF, DOCX, and image upload parsing

## Main Features

- Email/password login for admin and students
- Admin question-bank upload by topic
- Gemini/local parsing for MCQs, answer key, and easy/medium/hard difficulty
- Admin study-material upload by topic
- Study material is indexed so students see targeted excerpts, not full notes
- Student topic selection and 10-question practice flow
- Keyboard answers: `A/B/C/D` or `1/2/3/4`
- Report after each set with score, correct/wrong count, weak areas, and notes
- Retest loop with mixed easy/medium/hard questions
- Personalized dashboard with mastery and activity tracking
- Admin dashboard with student-level progress and attempts

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env` or `.env.local`:

```env
DATABASE_URL=postgresql://postgres:root@localhost:5433/echo
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace_with_a_real_secret
AUTH_SECRET=replace_with_the_same_secret
GOOGLE_GEMINI_API_KEY=your_gemini_key
```

Run the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Database Setup

For local PostgreSQL or Supabase, run this file in SQL editor first:

```text
src/lib/db/schema.sql
```

Then seed concepts, misconceptions, demo users, and starter questions.

PowerShell:

```powershell
$env:DATABASE_URL="your_postgres_or_supabase_connection_string"
npm run db:seed
```

Seed notices like `already exists, skipping` are fine. They mean the repair/schema logic found existing tables or columns.

## Demo Accounts

Admin:

```text
Email: admin@echo.local
Password: admin123
```

Student:

```text
Email: student@echo.local
Password: student123
```

Students can also register from `/register`.

## Admin Flow

Go to:

```text
/admin/upload
```

Question bank upload:

1. Select a topic.
2. Upload PDF, image, or DOCX.
3. The system extracts MCQs.
4. Gemini/local parser detects answer keys and difficulty.
5. Questions are saved to the database.
6. The screen shows parsed, new added, duplicate skipped, and invalid skipped counts.

Study material upload:

1. Select a topic.
2. Upload complete chapter notes as PDF, image, or DOCX.
3. The system extracts/indexes text.
4. Students later receive only the relevant excerpts for weak concepts.

## Student Flow

Go to:

```text
/practice
```

1. Select a topic.
2. Start a 10-question practice set.
3. Answer by clicking options or pressing `A/B/C/D` or `1/2/3/4`.
4. After 10 questions, Echo shows the report.
5. If weak areas exist, the student gets targeted notes from uploaded study material.
6. After revision, the student retests with another mixed 10-question set.
7. Dashboard updates personalized mastery and progress.

## Vercel + Supabase Deployment

Set these environment variables in Vercel:

```env
DATABASE_URL=your_supabase_pooler_connection_string
NEXTAUTH_URL=https://your-vercel-domain.vercel.app
NEXTAUTH_SECRET=your_real_secret
AUTH_SECRET=your_real_secret
GOOGLE_GEMINI_API_KEY=your_gemini_key
```

Use the Supabase pooler connection string for Vercel. If logs show `ENOTFOUND db.xxxxx.supabase.co`, switch from the direct database hostname to the Supabase pooler URL.

Run `src/lib/db/schema.sql` in Supabase SQL Editor, then seed from local PowerShell using the same Supabase `DATABASE_URL`.

## Upload Storage Note

Vercel serverless functions have a read-only filesystem. In production, uploaded files are parsed in memory and indexed into the database. Local development can save files under:

```text
public/uploads
```

This prevents the Vercel error:

```text
EROFS: read-only file system
```

## Useful Scripts

```bash
npm run dev
npm run build
npm run db:seed
npx next lint
```

Type-check:

```bash
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false
```

## Troubleshooting

`0 new added` after upload:

The questions may already exist. The upload screen now separates `Parsed`, `New added`, `Duplicates`, and `Invalid`, so duplicate uploads are clear.

`column topic_id does not exist`:

Run the latest `src/lib/db/schema.sql` in the SQL editor. The schema no longer depends on `topic_id`.

`MissingSecret`:

Set both `NEXTAUTH_SECRET` and `AUTH_SECRET`, then restart the dev server or redeploy.

`Gemini could not parse valid MCQ JSON`:

The local parser handles structured MCQ PDFs first. For unusual formats, improve the PDF text quality or upload DOCX text.

`ENOTFOUND` on Vercel:

Use the Supabase pooler connection string in `DATABASE_URL`.
