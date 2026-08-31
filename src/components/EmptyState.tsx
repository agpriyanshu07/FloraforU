import Link from "next/link";
import { ReactNode } from "react";

/**
 * Shared empty state. Every list on the site uses this so a zero-result view
 * never collapses into a blank strip — it always explains what happened and
 * offers the next move.
 */
export default function EmptyState({
  title,
  body,
  actionLabel,
  actionHref,
  icon,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon && <span className="text-rose-600">{icon}</span>}
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="max-w-md text-ink-600">{body}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-ghost mt-2">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
