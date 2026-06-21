import { hashSync } from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

async function main() {
  await db
    .insert(users)
    .values({
      name: "Demo Student",
      email: "student@echo.local",
      passwordHash: hashSync("student123", 10),
      role: "student",
    })
    .onConflictDoNothing();

  console.log("student ready: student@echo.local / student123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .then(() => process.exit(0));
