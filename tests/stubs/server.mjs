// Local stand-ins for the two outside services "Add products from a PDF" uses,
// so the test suite exercises the real code paths without an API key, without
// spending money and without writing to the shop's Cloudinary account.
//
//   POST /v1/messages               the Claude Messages API (structured output)
//   POST /v1_1/:cloud/image/upload  Cloudinary's signed upload
//   GET  /u/:id                     serves an uploaded photo back
//   GET  /__log                     what the app sent, for assertions
//
// The fake reader is deliberately dumb: it reads the code, the first name line
// and the "NNN/-" price off the extracted text, which is all the tests need to
// prove the plumbing. Judging real pages is the model's job, not this file's.
import { createServer } from "node:http";
import { createHash } from "node:crypto";

const PORT = Number(process.env.STUB_PORT ?? 3999);
const SECRET = "stub-cloudinary-secret";
const uploads = new Map();
const log = { messages: [], uploads: 0 };

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function fakeRead(body) {
  const blocks = body.messages?.[0]?.content ?? [];
  const textBlock = blocks.find((b) => b.type === "text" && b.text.startsWith("Extracted page text:"));
  const text = textBlock?.text.replace("Extracted page text:\n", "") ?? "";
  const photos = blocks.filter((b) => b.type === "image").length - 1;
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const code = lines.find((l) => /^\d{4}$/.test(l)) ?? null;
  if (!code) return { products: [] };
  const name = lines[lines.indexOf(code) + 1].replace(/Pannel/g, "Panel").replace(/Tiwal/g, "Taiwan");
  const m = text.match(/(\d+)\/-/);
  // The shop's categories are listed in the system prompt as "- slug — Name".
  const system = (body.system ?? []).map((b) => b.text).join("\n");
  const enumSlugs = [...system.matchAll(/^- ([a-z0-9-]+) — /gm)].map((m) => m[1]);
  const category = /Panel|Pannel/.test(name) && enumSlugs.includes("backdrops-wall-panels-cloths")
    ? "backdrops-wall-panels-cloths"
    : enumSlugs.includes("artificial-flowers-greenery") ? "artificial-flowers-greenery" : enumSlugs[0];
  return {
    products: [
      {
        code,
        name,
        spec: /Mtr/.test(text) ? "Sold per metre" : "per piece",
        price: m ? Number(m[1]) : null,
        description: `${name}, from the test catalogue.`,
        category,
        subcategory: null,
        availability: "in_stock",
        photos: Array.from({ length: photos }, (_, i) => i + 1),
        check: m ? null : "No price printed on the page.",
      },
    ],
  };
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const json = (status, obj) => {
    res.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*" });
    res.end(JSON.stringify(obj));
  };

  if (req.method === "OPTIONS") {
    res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-headers": "*" });
    return res.end();
  }
  if (url.pathname === "/health") return json(200, { ok: true });
  if (url.pathname === "/__log") return json(200, log);

  if (req.method === "POST" && url.pathname === "/v1/messages") {
    const body = JSON.parse((await readBody(req)).toString("utf8"));
    log.messages.push({
      model: body.model,
      system: body.system?.map?.((s) => s.text).join("\n") ?? "",
      images: (body.messages?.[0]?.content ?? []).filter((b) => b.type === "image").length,
      fallbacks: body.fallbacks ?? null,
      effort: body.output_config?.effort ?? null,
    });
    const out = fakeRead(body);
    return json(200, {
      id: `msg_stub_${log.messages.length}`,
      type: "message",
      role: "assistant",
      model: body.model,
      content: [{ type: "text", text: JSON.stringify(out) }],
      stop_reason: "end_turn",
      stop_sequence: null,
      stop_details: null,
      usage: { input_tokens: 10, output_tokens: 10 },
    });
  }

  const up = url.pathname.match(/^\/v1_1\/[^/]+\/image\/upload$/);
  if (req.method === "POST" && up) {
    const raw = await readBody(req);
    const type = req.headers["content-type"] ?? "";
    const form = await new Response(raw, { headers: { "content-type": type } }).formData();
    const file = form.get("file");
    const toSign = `folder=${form.get("folder")}&timestamp=${form.get("timestamp")}${SECRET}`;
    const expected = createHash("sha1").update(toSign).digest("hex");
    if (form.get("signature") !== expected) return json(401, { error: { message: "Invalid signature" } });
    const id = `${++log.uploads}.webp`;
    uploads.set(id, Buffer.from(await file.arrayBuffer()));
    return json(200, { secure_url: `http://127.0.0.1:${PORT}/u/${id}` });
  }

  const got = url.pathname.match(/^\/u\/(.+)$/);
  if (got && uploads.has(got[1])) {
    res.writeHead(200, { "content-type": "image/webp", "access-control-allow-origin": "*" });
    return res.end(uploads.get(got[1]));
  }

  json(404, { error: "not found" });
}).listen(PORT, "127.0.0.1", () => console.log(`stub on ${PORT}`));
