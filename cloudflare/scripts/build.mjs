import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const directory = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(directory, "..");
const out = resolve(appRoot, "public/shared");
await mkdir(out, { recursive: true });
for (const filename of ["ledger-core.mjs", "demo-portability.mjs"]) {
  await copyFile(resolve(appRoot, "src/shared", filename), resolve(out, filename));
}
console.log("Built portable demo assets without requiring the legacy Next.js app.");
