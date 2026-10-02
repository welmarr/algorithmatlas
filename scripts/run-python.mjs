import { readFile } from "node:fs/promises";
import { runPython } from "@sim/isolated-runner";

if (process.argv.length !== 3) {
  console.error("Usage: node scripts/run-python.mjs request.json");
  process.exitCode = 2;
} else {
  const request = JSON.parse(await readFile(process.argv[2], "utf8"));
  const result = await runPython(request);
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "ok") process.exitCode = 1;
}
