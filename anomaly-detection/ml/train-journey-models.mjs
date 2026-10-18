import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MODELS } from "../lib/journey-training.mjs";

const output = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "journey-models.json");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(MODELS) + "\n");
console.log(`Wrote ${Object.keys(MODELS).length} synthetic journey models to ${output}`);
