/**
 * Fails if the TypeScript classifier and the SQL that classified the existing
 * catalogue have drifted apart.
 *
 * They are the same rules written twice: src/lib/subcategories.ts files
 * anything the shop adds from now on, and the migration filed the 590 products
 * that were already there. Two copies is a deliberate trade — a migration has
 * to be frozen SQL, and the app cannot run SQL at form-validation time — but
 * two copies silently disagreeing is how a shop ends up with a chip the
 * importer never fills.
 *
 * The one difference this allows for is the word boundary: \b in JavaScript,
 * \y in Postgres. Everything else must match character for character, and that
 * difference is exactly the bug this guard exists for: the first draft of the
 * migration used \b, which Postgres reads as a backspace, so Gift Boxes, Light
 * Panels and Bulbs & Holders matched nothing and their stock fell through into
 * the catch-all buckets.
 *
 *   npm run check:subcategories
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { SUBCATEGORY_RULES, subcategorySlug } from "../src/lib/subcategories";

// The migration is generated from the same rules by
// scripts/generate-classify-migration.ts, so this check is a guard against
// someone editing one and not regenerating the other — not a substitute for
// regenerating.

const MIGRATIONS = join(process.cwd(), "prisma", "migrations");

/**
 * Every migration's SQL, concatenated.
 *
 * Deliberately not just the first classify_catalogue migration. Once that one
 * had shipped it became frozen, so a later rule change has to arrive as a
 * delta migration of its own -- and a check that only read the original would
 * have reported every delta as drift, which trains people to ignore it.
 * Reading all of them asks the question that actually matters: is each rule in
 * the classifier backed by SQL that ran somewhere?
 */
function appliedSql(): string {
  return readdirSync(MIGRATIONS)
    .filter((d) => !d.endsWith(".toml"))
    .sort()
    .map((d) => {
      try {
        return readFileSync(join(MIGRATIONS, d, "migration.sql"), "utf8");
      } catch {
        return "";
      }
    })
    .join("\n");
}

/** The JS pattern as Postgres would have to spell it. */
function asPostgres(pattern: RegExp): string {
  return pattern.source.replace(/\\b/g, "\\y");
}

function main() {
  const sql = appliedSql();
  const problems: string[] = [];

  for (const [category, rules] of Object.entries(SUBCATEGORY_RULES)) {
    const catLiteral = `'${category.replace(/'/g, "''")}'`;

    if (!sql.includes(catLiteral)) {
      problems.push(`${category}: the migration never mentions this category.`);
      continue;
    }

    for (const rule of rules) {
      const slug = subcategorySlug(rule.name);
      if (!sql.includes(`'${slug}'`)) {
        problems.push(`${category} / ${rule.name}: no "${slug}" in the migration.`);
        continue;
      }
      // A catch-all has no pattern, and a hand-filed subcategory has no
      // UPDATE at all — there is nothing to compare for either.
      if (!rule.pattern) continue;

      const expected = asPostgres(rule.pattern).replace(/'/g, "''");
      if (!sql.includes(`'${expected}'`)) {
        problems.push(
          `${category} / ${rule.name}: pattern differs.\n` +
            `    classifier: /${rule.pattern.source}/\n` +
            `    migration should contain: '${expected}'`,
        );
      }
    }
  }

  if (problems.length > 0) {
    console.error(
      `\nThe subcategory classifier and the classify_catalogue migration disagree ` +
        `in ${problems.length} place${problems.length === 1 ? "" : "s"}:\n`,
    );
    for (const p of problems) console.error("  • " + p);
    console.error(
      "\nIf you changed the rules on purpose, the migration is already applied " +
        "and must not be edited — add a new migration that moves the affected " +
        "products, and update this check's expectations with it.\n",
    );
    process.exit(1);
  }

  const ruleCount = Object.values(SUBCATEGORY_RULES).reduce((n, r) => n + r.length, 0);
  console.log(
    `Subcategory rules agree with the migration: ` +
      `${Object.keys(SUBCATEGORY_RULES).length} categories, ${ruleCount} subcategories.`,
  );
}

main();
