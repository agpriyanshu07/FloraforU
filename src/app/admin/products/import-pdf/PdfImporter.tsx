"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { readCataloguePage, type PageProduct } from "@/lib/pdf-import/read-page";
import { createUploadTicket } from "@/lib/upload-actions";
import { publishPdfRowsAction, type PdfPublishState } from "../import/actions";
import type { ExtractedPage } from "@/lib/pdf-import/extract";

type Category = { slug: string; name: string; subcategories: string[] };
type Photo = { blob: Blob; url: string };
type Draft = Omit<PageProduct, "photos" | "price"> & {
  id: string;
  page: number;
  include: boolean;
  price: string;
  photos: Photo[];
};
type Failure = { page: number; error: string };
type Phase = "idle" | "working" | "review" | "publishing" | "done";

const CONCURRENCY = 3;

export default function PdfImporter({
  categories,
  existingByCode,
  ready,
}: {
  categories: Category[];
  existingByCode: Record<string, string>;
  ready: { reader: boolean; photos: boolean };
}) {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [fatal, setFatal] = useState<string | null>(null);
  const [result, setResult] = useState<PdfPublishState | null>(null);
  const pagesRef = useRef(new Map<number, ExtractedPage>());

  // Object URLs hold the photos in memory until the page goes away.
  useEffect(() => () => drafts.forEach((d) => d.photos.forEach((p) => URL.revokeObjectURL(p.url))), []); // eslint-disable-line react-hooks/exhaustive-deps

  const categoryBySlug = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);

  async function readPage(ex: ExtractedPage): Promise<void> {
    const form = new FormData();
    form.set("text", ex.text);
    form.set("preview", ex.preview, `page-${ex.page}.jpg`);
    for (const photo of ex.photos) form.append("photo", await thumbnail(photo), "photo.jpg");
    const res = await readCataloguePage(form);
    if (!res.ok) {
      if (res.setup) throw new SetupError(res.error);
      pagesRef.current.set(ex.page, ex);
      setFailures((f) => [...f.filter((x) => x.page !== ex.page), { page: ex.page, error: res.error }]);
      return;
    }
    pagesRef.current.delete(ex.page);
    setFailures((f) => f.filter((x) => x.page !== ex.page));
    const made: Draft[] = res.products.map((p, i) => {
      const picks = p.photos.length > 0 ? p.photos : res.products.length === 1 ? ex.photos.map((_, j) => j + 1) : [];
      return {
        ...p,
        id: `${ex.page}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        page: ex.page,
        include: true,
        price: p.price === null ? "" : String(p.price),
        photos: picks.map((n) => ({ blob: ex.photos[n - 1], url: URL.createObjectURL(ex.photos[n - 1]) })),
      };
    });
    setDrafts((d) => [...d, ...made].sort((a, b) => a.page - b.page));
  }

  async function start() {
    if (!file) return;
    setPhase("working");
    setFatal(null);
    setFailures([]);
    setDrafts([]);
    try {
      const { openPdf, findSharedImages, extractPage } = await import("@/lib/pdf-import/extract");
      setStatus("Opening the PDF…");
      const doc = await openPdf(file);
      const total = doc.numPages;
      setStatus("Looking through the pages…");
      setProgress({ done: 0, total });
      const shared = await findSharedImages(doc, (n) => setProgress({ done: n, total }));

      setStatus("Reading products…");
      setProgress({ done: 0, total });
      let next = 1;
      let done = 0;
      const worker = async () => {
        while (next <= total) {
          const n = next++;
          const ex = await extractPage(doc, n, shared);
          await readPage(ex);
          setProgress({ done: ++done, total });
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, worker));
      setPhase("review");
    } catch (e) {
      setFatal(e instanceof SetupError ? e.message : "This PDF could not be opened. Check it opens on your computer and try again.");
      setPhase("idle");
    }
  }

  async function retry(page: number) {
    const ex = pagesRef.current.get(page);
    if (!ex) return;
    setFailures((f) => f.map((x) => (x.page === page ? { ...x, error: "Reading again…" } : x)));
    try {
      await readPage(ex);
    } catch (e) {
      setFatal(e instanceof Error ? e.message : String(e));
    }
  }

  function update(id: string, patch: Partial<Draft>) {
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  const included = drafts.filter((d) => d.include);
  const invalid = included.filter(
    (d) => !d.name.trim() || !d.category || (d.price.trim() !== "" && !/^\d+(\.\d+)?$/.test(d.price.trim())),
  );
  const codeCount = new Map<string, number>();
  for (const d of included) if (d.code) codeCount.set(d.code, (codeCount.get(d.code) ?? 0) + 1);

  async function publish() {
    if (invalid.length > 0) return;
    setPhase("publishing");
    setResult(null);
    try {
      const ticket = await createUploadTicket();
      if (!ticket.ok) throw new SetupError(ticket.error);
      const rows = [];
      let n = 0;
      const totalPhotos = included.reduce((s, d) => s + d.photos.length, 0);
      for (const d of included) {
        const urls: string[] = [];
        for (const photo of d.photos) {
          setStatus(`Uploading photos… ${++n} of ${totalPhotos}`);
          urls.push(await upload(photo.blob, ticket));
        }
        rows.push({
          name: d.name,
          category: d.category,
          subcategory: d.subcategory ?? "",
          spec: d.spec,
          price: d.price.trim(),
          code: d.code ?? "",
          description: d.description,
          availability: d.availability,
          image: urls.join("|"),
          published: "yes" as const,
        });
      }
      setStatus("Adding products to the site…");
      const res = await publishPdfRowsAction(rows);
      setResult(res);
      setPhase(res.error ? "review" : "done");
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Upload failed. Check your connection and try again." });
      setPhase("review");
    }
  }

  // ------------------------------------------------------------------ view ---

  if (!ready.reader || !ready.photos) {
    return (
      <div className="card space-y-3 p-5" role="alert">
        <h2 className="font-display text-xl">One-time setup needed</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {!ready.reader && (
            <li>
              <strong>ANTHROPIC_API_KEY</strong> is not set. It lets the site read your PDF pages. Create a key at
              console.anthropic.com, add it in Vercel → Settings → Environment Variables, then redeploy.
            </li>
          )}
          {!ready.photos && (
            <li>
              <strong>Cloudinary</strong> is not set up, so product photos have nowhere to go. Add the three
              CLOUDINARY_ variables in Vercel, then redeploy.
            </li>
          )}
        </ul>
      </div>
    );
  }

  if (phase === "done" && result?.result) {
    const r = result.result;
    return (
      <div className="card space-y-4 p-6" role="status">
        <h2 className="font-display text-2xl">Done</h2>
        <p>
          <strong>{r.imported}</strong> new products added and <strong>{r.updated}</strong> updated.
          {r.errors.length > 0 && <> {r.errors.length} could not be added (listed below).</>}
        </p>
        {r.errors.length > 0 && (
          <ul className="list-disc pl-5 text-sm text-red-700">
            {r.errors.map((e, i) => (
              <li key={i}>Product {e.row - 1}: {e.message}</li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/products" className="btn-primary">See products</Link>
          <button type="button" className="btn-ghost" onClick={() => location.reload()}>Import another PDF</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {fatal && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{fatal}</p>}

      {phase === "idle" && (
        <div className="card space-y-4 p-5">
          <label htmlFor="pdf-file" className="field-label">Your catalogue PDF</label>
          <input
            id="pdf-file"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="field"
          />
          <p className="text-[13px] text-ink-600">
            Any size. The PDF is read on this device and never uploaded as a whole — only each
            product&apos;s photo is uploaded, and only after you approve it.
          </p>
          <button type="button" className="btn-primary" disabled={!file} onClick={start}>
            Read this PDF
          </button>
        </div>
      )}

      {(phase === "working" || phase === "publishing") && (
        <div className="card space-y-3 p-5" aria-live="polite">
          <p className="font-medium">{status}</p>
          {phase === "working" && progress.total > 0 && (
            <>
              <div className="h-2 overflow-hidden rounded-full bg-rose-50">
                <div
                  className="h-full bg-rose-600 transition-[width] duration-300"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-sm text-ink-600">
                Page {progress.done} of {progress.total} · {drafts.length} products found so far
              </p>
            </>
          )}
        </div>
      )}

      {failures.length > 0 && (
        <div className="card space-y-2 p-5">
          <h2 className="font-display text-lg">Pages that need another try</h2>
          <ul className="space-y-2 text-sm">
            {failures.map((f) => (
              <li key={f.page} className="flex flex-wrap items-center gap-3">
                <span>Page {f.page}: {f.error}</span>
                {phase !== "working" && (
                  <button type="button" className="btn-ghost btn-sm" onClick={() => retry(f.page)}>
                    Try again
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {drafts.length > 0 && (
        <section aria-labelledby="review-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="review-heading" className="font-display text-2xl">Check before adding</h2>
              <p className="text-sm text-ink-600">
                {included.length} of {drafts.length} products selected. Fix anything that looks wrong; untick
                anything you don&apos;t want on the site.
              </p>
            </div>
          </div>

          <ul className="space-y-4">
            {drafts.map((d) => (
              <DraftCard
                key={d.id}
                draft={d}
                categories={categories}
                subcategories={categoryBySlug.get(d.category)?.subcategories ?? []}
                existing={d.code ? existingByCode[d.code] : undefined}
                duplicate={!!d.code && (codeCount.get(d.code) ?? 0) > 1}
                onChange={(patch) => update(d.id, patch)}
              />
            ))}
          </ul>

          {phase === "review" && (
            <div className="sticky bottom-20 z-10 card flex xl:bottom-3 flex-wrap items-center justify-between gap-3 p-4 shadow-lg">
              <p className="text-sm">
                {invalid.length > 0
                  ? `${invalid.length} selected product${invalid.length === 1 ? " needs" : "s need"} a name, a category or a valid price.`
                  : `Ready to add ${included.length} product${included.length === 1 ? "" : "s"}.`}
              </p>
              <button
                type="button"
                className="btn-primary"
                disabled={included.length === 0 || invalid.length > 0}
                onClick={publish}
              >
                Add {included.length} to the site
              </button>
            </div>
          )}
          {result?.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{result.error}</p>}
        </section>
      )}
    </div>
  );
}

function DraftCard({
  draft: d,
  categories,
  subcategories,
  existing,
  duplicate,
  onChange,
}: {
  draft: Draft;
  categories: Category[];
  subcategories: string[];
  existing?: string;
  duplicate: boolean;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const id = (f: string) => `${d.id}-${f}`;
  const badPrice = d.price.trim() !== "" && !/^\d+(\.\d+)?$/.test(d.price.trim());
  return (
    <li className={`card p-4 ${d.include ? "" : "opacity-60"}`} data-testid="pdf-draft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={d.include} onChange={(e) => onChange({ include: e.target.checked })} />
          Add this product
        </label>
        <span className="text-[12px] text-ink-600">Page {d.page}</span>
      </div>

      {(d.check || existing || duplicate) && (
        <ul className="mt-3 space-y-1 rounded-lg bg-marigold-100/60 p-3 text-[13px] text-ink-900">
          {d.check && <li><strong>Check:</strong> {d.check}</li>}
          {existing && <li>Code {d.code} is already on the site as “{existing}”. Adding this will update it.</li>}
          {duplicate && <li>Code {d.code} appears more than once in this PDF.</li>}
        </ul>
      )}

      {/* Photo beside the fields that matter most -- name, code, price -- so
          a product is about one phone screen tall rather than two. With a
          hundred-page catalogue that is the difference between checking it
          and giving up. */}
      <div className="mt-4 grid grid-cols-[96px_minmax(0,1fr)] gap-3 md:grid-cols-[180px_minmax(0,1fr)] md:gap-4">
        <div className="space-y-1.5">
          {d.photos.length > 0 ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.photos[0].url} alt="" className="aspect-square w-full rounded-lg border border-line bg-white object-contain p-1" />
              {d.photos.length > 1 && (
                <div className="flex flex-wrap gap-1">
                  {d.photos.slice(1).map((p, i) => (
                    <button
                      key={p.url}
                      type="button"
                      title="Make this the main photo"
                      aria-label={`Make photo ${i + 2} the main photo`}
                      onClick={() => {
                        const photos = [...d.photos];
                        const [picked] = photos.splice(i + 1, 1);
                        onChange({ photos: [picked, ...photos] });
                      }}
                      className="h-9 w-9 overflow-hidden rounded border border-line bg-white md:h-12 md:w-12"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="text-[12px] text-red-700 underline"
                onClick={() => onChange({ photos: d.photos.slice(1) })}
              >
                Remove photo
              </button>
            </>
          ) : (
            <p className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-line p-2 text-center text-[11px] text-ink-600">
              No photo
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor={id("name")} className="field-label">Name</label>
            <input id={id("name")} className="field" value={d.name} onChange={(e) => onChange({ name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={id("code")} className="field-label">Code</label>
              <input id={id("code")} className="field" value={d.code ?? ""} onChange={(e) => onChange({ code: e.target.value || null })} />
            </div>
            <div>
              <label htmlFor={id("price")} className="field-label">Price (₹)</label>
              <input
                id={id("price")}
                className="field"
                inputMode="decimal"
                placeholder="On enquiry"
                value={d.price}
                aria-invalid={badPrice}
                onChange={(e) => onChange({ price: e.target.value })}
              />
            </div>
          </div>
          {badPrice && <span className="field-error">Numbers only, e.g. 450</span>}
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={id("category")} className="field-label">Category</label>
          <select
            id={id("category")}
            className="field"
            value={d.category}
            onChange={(e) => onChange({ category: e.target.value, subcategory: null })}
          >
            {!d.category && <option value="">Choose a category…</option>}
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={id("sub")} className="field-label">Subcategory</label>
          <select
            id={id("sub")}
            className="field"
            value={d.subcategory ?? ""}
            onChange={(e) => onChange({ subcategory: e.target.value || null })}
          >
            <option value="">File automatically</option>
            {subcategories.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={id("spec")} className="field-label">Size / pack</label>
          <input id={id("spec")} className="field" value={d.spec} onChange={(e) => onChange({ spec: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={id("desc")} className="field-label">Description</label>
          <textarea id={id("desc")} rows={2} className="field" value={d.description} onChange={(e) => onChange({ description: e.target.value })} />
        </div>
      </div>
    </li>
  );
}

class SetupError extends Error {}

async function thumbnail(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const s = Math.min(1, 384 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * s));
  canvas.height = Math.max(1, Math.round(bitmap.height * s));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("thumbnail"))), "image/jpeg", 0.8),
  );
}

async function upload(
  blob: Blob,
  ticket: Extract<Awaited<ReturnType<typeof createUploadTicket>>, { ok: true }>,
): Promise<string> {
  const form = new FormData();
  form.set("file", blob, "photo.webp");
  form.set("api_key", ticket.apiKey);
  form.set("timestamp", String(ticket.timestamp));
  form.set("folder", ticket.folder);
  form.set("signature", ticket.signature);
  const res = await fetch(ticket.url, { method: "POST", body: form });
  if (!res.ok) throw new Error("A photo upload was refused. Check the Cloudinary settings and try again.");
  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url) throw new Error("A photo upload did not return an address.");
  return json.secure_url;
}
