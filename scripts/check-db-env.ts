/**
 * Checks the database environment before the build runs migrations.
 *
 * This exists because of a real production failure that cost a day of
 * deploys. The symptom was useless: CI green, preview green, production red,
 * and the only clue a Vercel deployment id. The cause was that
 * `prisma migrate deploy` had no DIRECT_URL to use and fell back to
 * DATABASE_URL, which on Neon is the POOLED connection. PgBouncer in
 * transaction mode cannot hold the session-level advisory lock Prisma takes
 * before applying a migration, so migrate fails.
 *
 * It hid for weeks because a build with no pending migration barely touches
 * the database and survives the pooler happily. The first deploy carrying a
 * migration is the one that breaks — by which point the change that exposed
 * it looks like the culprit:
 *
 *   d75084f  0 pending migrations  production deploy succeeded
 *   91787e3  1 pending migration   production deploy failed
 *
 * The point of this script is that the next occurrence says what is wrong and
 * where to fix it, instead of a Prisma error code pointing at the database.
 *
 * It only fails on configurations that cannot work. A setup with no pooler --
 * local Postgres, CI, a non-Neon host -- passes whether or not DIRECT_URL is
 * set, because falling back to an unpooled DATABASE_URL is fine.
 */

// Reads .env the way the rest of the build does. `prisma migrate deploy` and
// `next build` both load it themselves; a bare tsx script does not, so without
// this the guard fails every local build while passing on Vercel, where the
// values come from the real environment. dotenv does not override variables
// already set, so Vercel's own settings still win.
import "dotenv/config";

const POOLED = /-pooler\.|pgbouncer=true|[?&]pgbouncer/i;

/** Hides credentials; a build log is not a private place. */
function redact(url: string): string {
  return url.replace(/\/\/[^@]*@/, "//***:***@");
}

function fail(lines: string[]): never {
  console.error("\n  Database environment is not usable for migrations.\n");
  for (const line of lines) console.error("  " + line);
  console.error("");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL?.trim();
const directUrl = process.env.DIRECT_URL?.trim();

if (!databaseUrl) {
  fail([
    "DATABASE_URL is not set.",
    "",
    "On Vercel: Settings -> Environment Variables, and make sure it is ticked",
    "for the Production environment specifically, not just Preview.",
  ]);
}

const databaseIsPooled = POOLED.test(databaseUrl);

if (!directUrl && databaseIsPooled) {
  fail([
    "DIRECT_URL is not set, and DATABASE_URL is a pooled connection:",
    `  ${redact(databaseUrl)}`,
    "",
    "`prisma migrate deploy` would fall back to that pooled URL. Neon's pooler",
    "cannot hold the advisory lock Prisma takes before applying a migration, so",
    "the first deploy carrying a migration fails -- and only that one, which is",
    "what makes this so confusing to diagnose.",
    "",
    "Set DIRECT_URL to the same connection string WITHOUT `-pooler` in the",
    "hostname, for the Production environment.",
  ]);
}

if (directUrl && POOLED.test(directUrl)) {
  fail([
    "DIRECT_URL is set, but it is the POOLED connection:",
    `  ${redact(directUrl)}`,
    "",
    "It has to be the direct one -- the same string with `-pooler` removed from",
    "the hostname. DATABASE_URL is the pooled one and should stay as it is.",
  ]);
}

console.log(
  directUrl
    ? "Database environment OK: migrations will use DIRECT_URL (unpooled)."
    : "Database environment OK: DATABASE_URL is unpooled, so migrations can use it.",
);
