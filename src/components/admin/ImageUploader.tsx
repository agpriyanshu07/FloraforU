"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { createUploadTicket } from "@/lib/upload-actions";

const MAX_IMAGES = 6;
const MAX_BYTES = 15 * 1024 * 1024; // Cloudinary's free-tier per-file ceiling.
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Product photos. Files go straight from the browser to Cloudinary using a
 * signed ticket from the server, then their URLs are kept in a hidden textarea
 * so the existing server action keeps reading `imageUrls` exactly as before.
 *
 * The textarea stays visible and editable: pasting a URL still works, which is
 * the fallback when Cloudinary isn't configured, and it's how the placeholder
 * artwork under /img is referenced.
 */
export default function ImageUploader({
  name,
  defaultValue,
  uploadsEnabled,
}: {
  name: string;
  defaultValue: string;
  uploadsEnabled: boolean;
}) {
  const [urls, setUrls] = useState<string[]>(() =>
    defaultValue.split("\n").map((u) => u.trim()).filter(Boolean),
  );
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadOne(file: File): Promise<string> {
    const ticket = await createUploadTicket();
    if (!ticket.ok) throw new Error(ticket.error);

    const body = new FormData();
    body.append("file", file);
    body.append("api_key", ticket.apiKey);
    body.append("timestamp", String(ticket.timestamp));
    body.append("folder", ticket.folder);
    body.append("signature", ticket.signature);

    const res = await fetch(ticket.url, { method: "POST", body });
    if (!res.ok) {
      const detail = await res.json().catch(() => null);
      throw new Error(detail?.error?.message ?? `Cloudinary rejected the upload (${res.status}).`);
    }

    const json = (await res.json()) as { secure_url?: string };
    if (!json.secure_url) throw new Error("Cloudinary returned no URL for that file.");
    return json.secure_url;
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const room = MAX_IMAGES - urls.length;
    if (room <= 0) {
      setError(`That's already ${MAX_IMAGES} photos — remove one first.`);
      return;
    }

    const files = Array.from(fileList).slice(0, room);
    const rejected = files.find(
      (f) => !ACCEPTED.includes(f.type) || f.size > MAX_BYTES,
    );
    if (rejected) {
      setError(
        !ACCEPTED.includes(rejected.type)
          ? `"${rejected.name}" isn't a JPEG, PNG, WebP or AVIF.`
          : `"${rejected.name}" is over 15 MB. Please shrink it first.`,
      );
      return;
    }

    setBusy(true);
    setProgress({ done: 0, total: files.length });
    const uploaded: string[] = [];

    try {
      // Sequential rather than parallel: a shop's upload is usually on mobile
      // data, where several large files at once is slower and more likely to
      // fail than one at a time.
      for (const file of files) {
        uploaded.push(await uploadOne(file));
        setProgress({ done: uploaded.length, total: files.length });
      }
      setUrls((current) => [...current, ...uploaded]);
    } catch (e) {
      // Anything already uploaded is kept — re-uploading it would waste the
      // owner's time and their Cloudinary quota.
      if (uploaded.length > 0) setUrls((current) => [...current, ...uploaded]);
      setError(e instanceof Error ? e.message : "That upload failed. Please try again.");
    } finally {
      setBusy(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= urls.length) return;
    setUrls((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  return (
    <div>
      <span className="field-label">Product photos</span>

      {uploadsEnabled && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!busy) void handleFiles(e.dataTransfer.files);
          }}
          className={`mt-1 rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
            dragging ? "border-rose-500 bg-rose-50" : "border-line bg-cream"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            multiple
            disabled={busy || urls.length >= MAX_IMAGES}
            onChange={(e) => void handleFiles(e.target.files)}
            className="sr-only"
            id={`${name}-file`}
          />
          <label
            htmlFor={`${name}-file`}
            className={`btn-secondary inline-block ${
              busy || urls.length >= MAX_IMAGES ? "pointer-events-none opacity-50" : "cursor-pointer"
            }`}
          >
            {busy
              ? progress
                ? `Uploading ${progress.done + 1} of ${progress.total}…`
                : "Uploading…"
              : "Choose photos"}
          </label>
          <p className="mt-2 text-[13px] text-ink-600">
            or drag them here · JPEG, PNG or WebP · up to {MAX_IMAGES} per product
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="field-error mt-2">
          {error}
        </p>
      )}

      {urls.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {urls.map((url, i) => (
            <li key={`${url}-${i}`} className="group relative">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-white">
                {/* Unoptimized: these are admin thumbnails of images Cloudinary
                    already serves at a sensible size, and optimising them again
                    would spend the host's image quota for no visible gain. */}
                <Image
                  src={url}
                  alt=""
                  fill
                  sizes="120px"
                  unoptimized
                  className="object-cover"
                />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-rose-700 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                    Main
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    aria-label={`Move photo ${i + 1} earlier`}
                    className="rounded border border-line px-1.5 text-[13px] disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, i + 1)}
                    disabled={i === urls.length - 1}
                    aria-label={`Move photo ${i + 1} later`}
                    className="rounded border border-line px-1.5 text-[13px] disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setUrls((c) => c.filter((_, n) => n !== i))}
                  aria-label={`Remove photo ${i + 1}`}
                  className="text-[13px] text-rose-700 underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* The form field itself. The server action reads this name and is
          unchanged — the uploader is only a nicer way to fill it in. */}
      {/* Open by default when uploads are off, since the textarea is then the
          only way to set a photo and a collapsed section would hide it. */}
      <details className="mt-3" open={!uploadsEnabled}>
        <summary className="cursor-pointer text-[13px] text-ink-600">
          Edit image URLs directly
        </summary>
        <textarea
          id={name}
          name={name}
          rows={4}
          value={urls.join("\n")}
          onChange={(e) =>
            setUrls(e.target.value.split("\n").map((u) => u.trim()).filter(Boolean))
          }
          className="field mt-2 font-mono text-[13px]"
          placeholder={"/img/categories/pots-vases.svg\nhttps://res.cloudinary.com/…/pot-2.jpg"}
        />
        <span className="field-hint">
          One URL per line, up to {MAX_IMAGES}. The first is the main photo. Alt text is written for you.
        </span>
      </details>

      {!uploadsEnabled && (
        <p className="field-hint mt-2">
          Uploads are switched off until Cloudinary is configured. Paste image URLs above for now.
        </p>
      )}
    </div>
  );
}
