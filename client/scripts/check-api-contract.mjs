import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const serverRoot = resolve(mobileRoot, "../server");
const temporaryRoot = mkdtempSync(join(tmpdir(), "pfm-mobile-api-"));
const temporarySchema = join(temporaryRoot, "openapi.json");
const temporaryTypes = join(temporaryRoot, "api-types.ts");

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: process.env,
  });

  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    process.exit(result.status ?? 1);
  }
}

try {
  run(
    join(serverRoot, ".venv/bin/python"),
    [join(serverRoot, "scripts/export_openapi.py"), temporarySchema],
    serverRoot,
  );
  run(
    join(mobileRoot, "node_modules/.bin/openapi-typescript"),
    [temporarySchema, "-o", temporaryTypes],
    mobileRoot,
  );

  const expectedFiles = [
    [resolve(mobileRoot, "generated/openapi.json"), temporarySchema],
    [resolve(mobileRoot, "generated/api-types.ts"), temporaryTypes],
  ];

  const drifted = expectedFiles.filter(
    ([committed, generated]) =>
      readFileSync(committed, "utf8") !== readFileSync(generated, "utf8"),
  );

  if (drifted.length > 0) {
    process.stderr.write(
      "Generated API contract is stale. Run `npm run api:generate`.\n",
    );
    process.exit(1);
  }

  process.stdout.write("API contract matches the FastAPI OpenAPI schema.\n");
} finally {
  rmSync(temporaryRoot, { force: true, recursive: true });
}
