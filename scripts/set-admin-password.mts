/**
 * Changes an admin's password (and creates the admin if they don't exist yet).
 *
 *   npm run admin:password
 *
 * Prompts interactively so the password never lands in shell history. For
 * scripted use, set ADMIN_EMAIL and ADMIN_PASSWORD instead and it won't prompt.
 */
import "dotenv/config";
import readline from "node:readline";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma";

const db = new PrismaClient();

function ask(question: string, mask = false): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  if (mask) {
    // Swallow the echoed characters so a shoulder-surfer sees nothing.
    const out = rl as unknown as { output: NodeJS.WriteStream; _writeToOutput: (s: string) => void };
    out._writeToOutput = (str: string) => {
      out.output.write(str.includes(question) ? question : "");
    };
  }

  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      if (mask) process.stdout.write("\n");
      rl.close();
      resolve(answer.trim());
    }),
  );
}

async function main() {
  const existing = await db.adminUser.findMany({ select: { email: true } });
  if (existing.length > 0) {
    console.log(`Existing admin${existing.length === 1 ? "" : "s"}: ${existing.map((a) => a.email).join(", ")}\n`);
  }

  const email = (process.env.ADMIN_EMAIL ?? (await ask("Admin email: "))).trim().toLowerCase();
  if (!email.includes("@")) {
    console.error("\nThat doesn't look like an email address. Nothing changed.");
    process.exit(1);
  }

  const password = process.env.ADMIN_PASSWORD ?? (await ask("New password (hidden): ", true));
  if (password.length < 10) {
    console.error("\nPassword must be at least 10 characters. Nothing changed.");
    process.exit(1);
  }

  if (!process.env.ADMIN_PASSWORD) {
    const again = await ask("Type it again: ", true);
    if (again !== password) {
      console.error("\nThe two passwords don't match. Nothing changed.");
      process.exit(1);
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.adminUser.findUnique({ where: { email } });

  if (user) {
    await db.adminUser.update({ where: { email }, data: { passwordHash } });
    console.log(`\nPassword updated for ${email}.`);
  } else {
    await db.adminUser.create({
      data: { email, name: "FloralforU Admin", role: "owner", passwordHash },
    });
    console.log(`\nCreated a new admin: ${email}.`);
  }

  console.log("Sign in at /admin with the new password. Restart the site if it is running.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
