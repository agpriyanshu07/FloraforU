import Link from "next/link";
import { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-600">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function StatTile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <dt className="text-sm text-ink-600">{label}</dt>
      <dd className="mt-1 font-display text-3xl text-rose-600">{value}</dd>
      {hint && <p className="mt-1 text-[13px] text-ink-600">{hint}</p>}
    </>
  );

  return href ? (
    <Link href={href} className="card block p-5 transition-colors duration-200 hover:bg-rose-50">
      <dl>{inner}</dl>
    </Link>
  ) : (
    <dl className="card p-5">{inner}</dl>
  );
}

export function Banner({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "error";
  children: ReactNode;
}) {
  const tones = {
    info: "bg-rose-50 text-ink-900",
    success: "bg-sage-50 text-sage-700",
    error: "bg-red-50 text-red-700",
  };
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`mb-5 rounded-lg p-3 text-sm font-medium ${tones[tone]}`}>
      {children}
    </p>
  );
}

export function TableShell({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    // min-w-0 so overflow-x-auto can actually do its job. Every admin table
    // sits in a grid, and a grid item will not shrink below its content's
    // width by default -- so the 720px table widened the whole column and
    // pushed the page 48px past the edge of a phone instead of scrolling
    // inside its own card. Same cause as the category order list.
    <div className="card min-w-0 overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-line bg-rose-50/60 text-[12px] uppercase tracking-wider text-ink-600">
          {head}
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-ink-600">
        {children}
      </td>
    </tr>
  );
}

/**
 * Keeps a form's buttons in reach on a long page.
 *
 * Settings runs to 3487px on a phone and the homepage editor to 7168px, and
 * both had their only Save button at the very bottom: change one field near
 * the top and you scroll eight screens to commit it, or lose the edit by
 * navigating away. `sticky bottom-0` pins the bar to the foot of the viewport
 * while the form is taller than it, and lets it settle in place at the end,
 * so short forms look no different.
 *
 * The negative margins let the bar span the full width of a card it sits
 * inside, rather than leaving a strip of card either side of it.
 */
export function StickyActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex flex-wrap items-center gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      {children}
    </div>
  );
}
