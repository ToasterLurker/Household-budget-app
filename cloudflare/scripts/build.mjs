import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, "../..");
const out = resolve(directory, "../public/shared");
await mkdir(out, { recursive: true });
for (const filename of ["ledger-core.mjs", "demo-portability.mjs"]) {
  await copyFile(resolve(root, "lib", filename), resolve(out, filename));
}
console.log("Built portable demo assets from shared ledger modules.");
