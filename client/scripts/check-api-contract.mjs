import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(scriptDir, "..");
const repoDir = resolve(clientDir, "..");
const serverDir = join(repoDir, "server");
const generatedDir = join(clientDir, "generated");
const tmpDir = mkdtempSync(join(tmpdir(), "pfm-api-contract-"));
const tmpSchemaPath = join(tmpDir, "openapi.json");
const tmpTypesPath = join(tmpDir, "api-types.ts");

const pythonPath = existsSync(join(serverDir, ".venv", "bin", "python"))
  ? join(serverDir, ".venv", "bin", "python")
  : "python3";
const generatorPath = join(clientDir, "node_modules", ".bin", "openapi-typescript");

function run(command, args, options = {}) {
  execFileSync(command, args, {
    stdio: "inherit",
    ...options,
  });
}

function readNormalized(path) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

run(pythonPath, ["scripts/export_openapi.py", tmpSchemaPath], {
  cwd: serverDir,
});
run(generatorPath, [tmpSchemaPath, "-o", tmpTypesPath], {
  cwd: clientDir,
});

const expectedSchemaPath = join(generatedDir, "openapi.json");
const expectedTypesPath = join(generatedDir, "api-types.ts");
const schemaMatches =
  readNormalized(expectedSchemaPath) === readNormalized(tmpSchemaPath);
const typesMatch =
  readNormalized(expectedTypesPath) === readNormalized(tmpTypesPath);

if (!schemaMatches || !typesMatch) {
  console.error(
    "Generated API contract is out of date. Run `npm run api:generate` from client/.",
  );
  process.exit(1);
}

console.log("Generated API contract is up to date.");
