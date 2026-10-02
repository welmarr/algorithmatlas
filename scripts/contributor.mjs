#!/usr/bin/env node
import { readFile, writeFile, mkdir, realpath } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePackManifest } from "../packages/problem-sdk/src/pack-manifest.mjs";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const usage = `Usage:
  node scripts/contributor.mjs create-pack <directory> <pack-id>
  node scripts/contributor.mjs create-problem <pack-directory> <problem-id>
  node scripts/contributor.mjs create-renderer <pack-directory> <renderer-id>
  node scripts/contributor.mjs validate-pack <pack-directory-or-json-file>

Create commands write new files only. Validation reads metadata and verifies module paths; it never imports the listed code.`;

function slug(value, label) {
  if (
    typeof value !== "string" ||
    !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)
  )
    throw new Error(`${label} must be a lowercase slug`);
  return value;
}

async function manifestPath(argument) {
  if (!argument) throw new Error(usage);
  const path = resolve(argument);
  return path.endsWith(".json") ? path : join(path, "pack.json");
}

async function loadManifest(argument) {
  const path = await manifestPath(argument);
  return { path, manifest: JSON.parse(await readFile(path, "utf8")) };
}

async function createPack(directory, rawId) {
  const id = slug(rawId, "Pack id");
  if (!directory) throw new Error(usage);
  const root = resolve(directory);
  await mkdir(root, { recursive: true });
  await writeFile(
    join(root, "pack.json"),
    JSON.stringify(
      {
        schemaVersion: "0.1",
        id,
        version: "0.1.0",
        title: `${id} pack`,
        publisher: "Your name",
        description: "Describe what learners will explore.",
        license: "MIT",
        problems: [],
        renderers: [],
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  await writeFile(
    join(root, "README.md"),
    `# ${id}\n\nAdd a problem with \`node scripts/contributor.mjs create-problem ${directory} ${id}-example\`. Review all code locally before registration. Run \`node scripts/contributor.mjs validate-pack ${directory}\` after adding a problem.\n`,
    { flag: "wx" },
  );
  console.log(`Created ${join(root, "pack.json")}`);
}

async function createProblem(directory, rawId) {
  const id = slug(rawId, "Problem id");
  const { path, manifest } = await loadManifest(directory);
  const packId = slug(manifest.id, "Pack id");
  if (!id.startsWith(`${packId}-`))
    throw new Error(`Problem id must begin with ${packId}-`);
  if (
    !Array.isArray(manifest.problems) ||
    manifest.problems.some((item) => item.id === id)
  )
    throw new Error("Pack problems are invalid or already contain this id");
  const root = dirname(path);
  const target = join(root, "problems", `${id}.ts`);
  await mkdir(dirname(target), { recursive: true });
  const sample = await readFile(
    join(
      repository,
      "examples",
      "community-pack",
      "problems",
      "sample-pack-reverse-array.ts",
    ),
    "utf8",
  );
  await writeFile(
    target,
    sample
      .replaceAll("sample-pack-reverse-array", id)
      .replaceAll("sample-pack-array-list", "array"),
    { flag: "wx" },
  );
  manifest.problems.push({
    id,
    module: `./problems/${id}.ts`,
    renderer: "array",
  });
  await writeFile(path, JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    `Created ${target}. Replace the sample algorithm, examples, and learning text.`,
  );
}

async function createRenderer(directory, rawId) {
  const id = slug(rawId, "Renderer id");
  const { path, manifest } = await loadManifest(directory);
  const packId = slug(manifest.id, "Pack id");
  if (!id.startsWith(`${packId}-`))
    throw new Error(`Renderer id must begin with ${packId}-`);
  if (
    !Array.isArray(manifest.renderers) ||
    manifest.renderers.some((item) => item.id === id)
  )
    throw new Error("Pack renderers are invalid or already contain this id");
  const root = dirname(path);
  const target = join(root, "renderers", `${id}.tsx`);
  await mkdir(dirname(target), { recursive: true });
  const source = `import type { SimulationState } from "@sim/domain";
import { defineRenderer } from "@sim/renderer-sdk";

export const descriptor = defineRenderer({
  schemaVersion: "0.1",
  id: "${id}",
  label: "Example list renderer",
  capabilities: {
    entityKinds: ["array"],
    eventTypes: ["READ_INDEX", "WRITE_INDEX"],
    focusKinds: ["inspect", "update", "result"],
  },
  stateContract: { requiredCollections: [], requiredVariables: [] },
  legend: [
    { label: "Current value", cue: "inspect", textCue: "READ" },
    { label: "Changed value", cue: "update", textCue: "CHANGE" },
    { label: "Final result", cue: "result", textCue: "RESULT" },
  ],
  accessibility: {
    role: "region",
    label: "Example list visualization",
    textAlternative: "Each row states its index, value, and semantic status.",
    keyboard: "No renderer-specific controls; use the player keyboard controls.",
  },
});

export function ExampleRenderer({ state }: { state: SimulationState }) {
  return <ul aria-label="Values">{Object.values(state.entities)
    .filter((item) => item.kind === "array")
    .map((item) => <li key={item.id}>
      Index {item.label}: {String(item.value)}; {item.status}
      {state.activeEntities.includes(item.id) ? "; current" : ""}
    </li>)}</ul>;
}
`;
  await writeFile(target, source, { flag: "wx" });
  manifest.renderers.push({ id, module: `./renderers/${id}.tsx` });
  await writeFile(path, JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    `Created ${target}. Register reviewed local code in the web composition root.`,
  );
}

async function validatePack(argument) {
  const { path, manifest: raw } = await loadManifest(argument);
  const manifest = validatePackManifest(raw);
  const root = await realpath(dirname(path));
  for (const declaration of [...manifest.problems, ...manifest.renderers]) {
    const file = await realpath(join(root, declaration.module));
    if (!file.startsWith(root + sep))
      throw new Error(`Module escapes pack directory: ${declaration.module}`);
  }
  console.log(
    `${manifest.id}@${manifest.version}: ${manifest.problems.length} problems, ${manifest.renderers.length} renderers; metadata and paths valid; no code executed.`,
  );
}

const [command, first, second] = process.argv.slice(2);
try {
  switch (command) {
    case "create-pack":
      await createPack(first, second);
      break;
    case "create-problem":
      await createProblem(first, second);
      break;
    case "create-renderer":
      await createRenderer(first, second);
      break;
    case "validate-pack":
      await validatePack(first);
      break;
    default:
      throw new Error(usage);
  }
} catch (cause) {
  console.error(cause instanceof Error ? cause.message : String(cause));
  process.exitCode = 1;
}
