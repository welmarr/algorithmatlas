/** Declarative pack manifests are data only. This module never loads code. */
export class PackManifestError extends Error {
  constructor(message) {
    super(message);
    this.name = "PackManifestError";
  }
}

function fail(message) {
  throw new PackManifestError(message);
}

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(`${label} must be an object`);
  return value;
}

function string(value, label, maximum = 160) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum)
    fail(`${label} must be a nonempty string of at most ${maximum} characters`);
  return value.trim();
}

function id(value, label) {
  const parsed = string(value, label, 64);
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(parsed))
    fail(`${label} must be a lowercase slug`);
  return parsed;
}

function modulePath(value, label) {
  const parsed = string(value, label, 180);
  if (
    !/^\.\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(?:ts|tsx|js|mjs)$/.test(parsed) ||
    parsed.includes("..")
  )
    fail(`${label} must be a safe relative module path`);
  return parsed;
}

/** Parse untrusted JSON metadata without importing any manifest-listed module. */
export function validatePackManifest(raw) {
  const pack = object(raw, "Pack");
  if (pack.schemaVersion !== "0.1") fail("Unsupported pack schemaVersion");
  const packId = id(pack.id, "Pack id");
  const version = string(pack.version, "Pack version", 40);
  if (
    !/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/.test(
      version,
    )
  )
    fail("Pack version must be semantic x.y.z");
  const title = string(pack.title, "Pack title", 100);
  const publisher = string(pack.publisher, "Pack publisher", 100);
  const description = string(pack.description, "Pack description", 500);
  const license = string(pack.license, "Pack license", 80);
  if (
    !Array.isArray(pack.problems) ||
    !pack.problems.length ||
    pack.problems.length > 100
  )
    fail("Pack needs 1–100 problem declarations");
  const seen = new Set();
  const problems = pack.problems.map((rawProblem, index) => {
    const problem = object(rawProblem, `Problem ${index}`);
    const problemId = id(problem.id, `Problem ${index} id`);
    if (!problemId.startsWith(`${packId}-`))
      fail(`Problem ${problemId} must be prefixed with ${packId}-`);
    if (seen.has(problemId)) fail(`Duplicate problem id: ${problemId}`);
    seen.add(problemId);
    return {
      id: problemId,
      module: modulePath(problem.module, `Problem ${index} module`),
      renderer: id(problem.renderer, `Problem ${index} renderer`),
    };
  });
  const renderers = pack.renderers ?? [];
  if (!Array.isArray(renderers) || renderers.length > 20)
    fail("Pack renderers must be an array of at most 20 declarations");
  const rendererIds = new Set();
  const parsedRenderers = renderers.map((rawRenderer, index) => {
    const renderer = object(rawRenderer, `Renderer ${index}`);
    const rendererId = id(renderer.id, `Renderer ${index} id`);
    if (!rendererId.startsWith(`${packId}-`))
      fail(`Renderer ${rendererId} must be prefixed with ${packId}-`);
    if (rendererIds.has(rendererId))
      fail(`Duplicate renderer id: ${rendererId}`);
    rendererIds.add(rendererId);
    return {
      id: rendererId,
      module: modulePath(renderer.module, `Renderer ${index} module`),
    };
  });
  return Object.freeze({
    schemaVersion: "0.1",
    id: packId,
    version,
    title,
    publisher,
    description,
    license,
    problems,
    renderers: parsedRenderers,
  });
}
