import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { IMPORT_COLUMNS } from "@/lib/import";

export const dynamic = "force-dynamic";

/** A ready-to-fill CSV template, pre-seeded with two example rows. */
export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const first = await db.category.findFirst({ orderBy: { displayOrder: "asc" } });
  const categoryName = first?.name ?? "Artificial Flowers & Greenery";

  const header = IMPORT_COLUMNS.map((c) => c.label).join(",");
  const rows = [
    `"Marigold Lardi (Genda Phool)","${categoryName}","8 feet, pack of 12 pcs, orange / yellow",540,2004,"Popular for mandap entries.",in_stock,,yes`,
    `"Premium Silk Peony Bunch","${categoryName}","Pack of 5 stems | imported silk",,2011,"Quote on request.",limited,,yes`,
  ];

  return new NextResponse([header, ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="floralforu-import-template.csv"',
    },
  });
}
