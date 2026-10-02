import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative, basename } from "node:path";
import { createRequire } from "node:module";
const root = resolve(process.argv[2] ?? "");
if (
  !root.startsWith(
    resolve("artifacts", "visual-audit") +
      (process.platform === "win32" ? "\\" : "/"),
  )
)
  throw new Error("Expected a project visual-audit directory");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
if (!manifest.complete || manifest.routesNotCaptured.length)
  throw new Error("Capture is incomplete; do not publish a misleading bundle");
const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const categories = [...new Set(manifest.screenshots.map((s) => s.category))];
const contacts = [];
for (const category of categories) {
  const items = manifest.screenshots.filter((s) => s.category === category);
  for (let i = 0; i < items.length; i += 2) {
    const tiles = [];
    let top = 0;
    for (const shot of items.slice(i, i + 2)) {
      const label = Buffer.from(
        '<svg width="1440" height="100"><rect width="1440" height="100" fill="#102b2b"/><text x="24" y="38" font-family="Arial" font-size="24" fill="white">' +
          escape(shot.filename) +
          '</text><text x="24" y="74" font-family="Arial" font-size="18" fill="#bbdcd4">' +
          escape(
            shot.route +
              " · " +
              shot.viewport.width +
              "×" +
              shot.viewport.height +
              " · " +
              (shot.choreographyPhase ?? "interface"),
          ) +
          "</text></svg>",
      );
      tiles.push({ input: label, left: 0, top });
      top += 100;
      const { data, info } = await sharp(join(root, shot.filename))
        .resize({
          width: 1440,
          fit: "inside",
          withoutEnlargement: true,
        })
        .png()
        .toBuffer({ resolveWithObject: true });
      tiles.push({
        input: data,
        left: Math.floor((1440 - info.width) / 2),
        top,
      });
      top += info.height + 36;
    }
    const filename =
      "00-overview/contact-" +
      category +
      "-" +
      String(i / 2 + 1).padStart(2, "0") +
      ".png";
    await sharp({
      create: { width: 1440, height: top, channels: 3, background: "#edf3f0" },
    })
      .composite(tiles)
      .png()
      .toFile(join(root, filename));
    contacts.push(filename);
  }
}
manifest.contactSheets = contacts;
manifest.counts = {
  screenshots: manifest.screenshots.length,
  desktop: manifest.screenshots.filter((s) => s.viewport.width === 1440).length,
  tablet: manifest.screenshots.filter((s) => s.viewport.width === 768).length,
  mobile: manifest.screenshots.filter((s) => s.viewport.width === 390).length,
  categories: Object.fromEntries(
    categories.map((c) => [
      c,
      manifest.screenshots.filter((s) => s.category === c).length,
    ]),
  ),
  contactSheets: contacts.length,
};
writeFileSync(join(root, "manifest.json"), JSON.stringify(manifest, null, 2));
const questions = [
  "Is the primary action obvious?",
  "Is the algorithmic reason visible before/with the visual change?",
  "Is color carrying useful meaning rather than decoration?",
  "Is meaning available without color?",
  "Are visual states too busy or too sparse?",
  "Is motion being used where it helps understanding?",
  "Does each algorithm family use an appropriate representation?",
  "Are code, explanation and visualization synchronized?",
  "Is mobile layout understandable?",
  "Does anonymous use feel first-class?",
  "Does account UX explain that signup is for saving?",
  "Does Own Code clearly connect source → execution → visualization?",
  "Are error/queue/timeout states understandable?",
  "Are any labels misleading?",
  "Are any panels visually redundant?",
];
const index =
  "# Algorithm Atlas — visual review\n\nReal application screenshots from tested commit " +
  manifest.commit +
  ". AI was off. This package supports human review; screenshot generation alone is not visual certification.\n\n" +
  JSON.stringify(manifest.counts, null, 2) +
  "\n\n## Review questions\n\n" +
  questions.map((q, i) => i + 1 + ". " + q).join("\n") +
  "\n\n## Coverage notes\n\nHome and catalog share /. Sign-in and registration share /account. There is no supported dark mode. Only disposable test identities were used. Email action links are redacted. Error states come from actual runtime failures or explicit disposable service/quota fixtures. A database dependency failure exercises the application error boundary; the root-layout catastrophic boundary is not a separate route.\n" +
  categories
    .toSorted()
    .map(
      (category) =>
        "\n\n## " +
        category.replace(/^\d+-/, "").replaceAll("-", " ") +
        "\n\n| Image | Route | Viewport | Why review it |\n| --- | --- | --- | --- |\n" +
        manifest.screenshots
          .filter((s) => s.category === category)
          .map(
            (s) =>
              "| [" +
              s.filename +
              "](" +
              s.filename +
              ") | " +
              s.route +
              " | " +
              s.viewport.width +
              "×" +
              s.viewport.height +
              " | " +
              s.description.replaceAll("|", "/") +
              " |",
          )
          .join("\n"),
    )
    .join("") +
  "\n\n## Contact sheets\n\n" +
  contacts.map((f) => "- [" + f + "](" + f + ")").join("\n") +
  "\n";
writeFileSync(join(root, "VISUAL_AUDIT_INDEX.md"), index);
writeFileSync(
  join(root, "index.html"),
  '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Algorithm Atlas · Visual review</title><style>body{margin:0;background:#eff4f0;color:#102b2b;font:16px system-ui}header{padding:32px;max-width:1400px;margin:auto}h1{font-size:36px}nav{display:flex;gap:8px;flex-wrap:wrap}button,a{color:#006e61}button{padding:10px;border:1px solid #9ebdb4;border-radius:8px;background:white;cursor:pointer}button[aria-pressed=true]{background:#006e61;color:white}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:24px;padding:24px;max-width:1600px;margin:auto}article{background:white;padding:16px;border:1px solid #ccdcd5;border-radius:12px}article img{width:100%;height:320px;object-fit:contain;object-position:top;background:#f5f7f6}article h2{font-size:16px;overflow-wrap:anywhere}small{display:block;line-height:1.6}article[hidden]{display:none}</style><header><p>ACTUAL APPLICATION · HUMAN REVIEW</p><h1>Algorithm Atlas visual audit</h1><p>' +
    manifest.screenshots.length +
    " screenshots · " +
    contacts.length +
    " contact sheets · commit " +
    escape(manifest.commit.slice(0, 12)) +
    '</p><p>Use full-resolution images to read details. <a href="VISUAL_AUDIT_INDEX.md">Review questions and index</a> · <a href="manifest.json">Manifest</a> · <a href="route-inventory.json">Route inventory</a></p><nav><button data-filter="all" aria-pressed="true">All</button>' +
    categories
      .map(
        (c) =>
          '<button data-filter="' +
          escape(c) +
          '" aria-pressed="false">' +
          escape(c) +
          "</button>",
      )
      .join("") +
    '</nav></header><main class="grid">' +
    manifest.screenshots
      .map(
        (s) =>
          '<article data-category="' +
          escape(s.category) +
          '"><a href="' +
          escape(s.filename) +
          '" target="_blank" rel="noopener"><img loading="lazy" src="' +
          escape(s.filename) +
          '" alt="' +
          escape(s.description) +
          '"></a><h2><a href="' +
          escape(s.filename) +
          '">' +
          escape(s.filename) +
          "</a></h2><small>" +
          escape(s.route) +
          " · " +
          s.viewport.width +
          "×" +
          s.viewport.height +
          " · " +
          escape(s.authState) +
          "</small><small>Step: " +
          escape(s.teachingStep ?? "—") +
          " · phase: " +
          escape(s.choreographyPhase ?? "—") +
          "</small><p>" +
          escape(s.description) +
          "</p></article>",
      )
      .join("") +
    '</main><script>document.querySelectorAll("button[data-filter]").forEach(button=>button.onclick=()=>{document.querySelectorAll("button[data-filter]").forEach(b=>b.setAttribute("aria-pressed",String(b===button)));document.querySelectorAll("article").forEach(a=>a.hidden=button.dataset.filter!=="all"&&a.dataset.category!==button.dataset.filter)});</script></html>',
);
// PNG files are already compressed. A portable ZIP writer uses stored entries and CRC32.
const table = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
const crc = (data) => {
  let n = 0xffffffff;
  for (const byte of data) n = table[(n ^ byte) & 255] ^ (n >>> 8);
  return (n ^ 0xffffffff) >>> 0;
};
const files = [];
function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, e.name);
    if (e.isDirectory()) walk(path);
    else files.push(path);
  }
}
walk(root);
const chunks = [],
  central = [];
let offset = 0;
for (const path of files) {
  const data = readFileSync(path),
    name = Buffer.from(relative(root, path).replaceAll("\\", "/")),
    checksum = crc(data);
  if (data.length > 0xffffffff) throw new Error("ZIP64 is not supported");
  const head = Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50);
  head.writeUInt16LE(20, 4);
  head.writeUInt16LE(0x800, 6);
  head.writeUInt32LE(checksum, 14);
  head.writeUInt32LE(data.length, 18);
  head.writeUInt32LE(data.length, 22);
  head.writeUInt16LE(name.length, 26);
  chunks.push(head, name, data);
  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50);
  entry.writeUInt16LE(20, 4);
  entry.writeUInt16LE(20, 6);
  entry.writeUInt16LE(0x800, 8);
  entry.writeUInt32LE(checksum, 16);
  entry.writeUInt32LE(data.length, 20);
  entry.writeUInt32LE(data.length, 24);
  entry.writeUInt16LE(name.length, 28);
  entry.writeUInt32LE(offset, 42);
  central.push(entry, name);
  offset += head.length + name.length + data.length;
}
const directory = Buffer.concat(central),
  end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(directory.length, 12);
end.writeUInt32LE(offset, 16);
const zip = resolve(
  root,
  "..",
  "AlgorithmAtlas-visual-audit-" + basename(root) + ".zip",
);
writeFileSync(zip, Buffer.concat([...chunks, directory, end]), { flag: "wx" });
console.info(
  JSON.stringify(
    {
      counts: manifest.counts,
      artifactRoot: root,
      zipPath: zip,
      zipBytes: statSync(zip).size,
    },
    null,
    2,
  ),
);
