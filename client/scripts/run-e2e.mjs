import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const scriptDir = resolve(fileURLToPath(new URL(".", import.meta.url)));
const rootDir = resolve(scriptDir, "../..");
const clientDir = resolve(rootDir, "client");
const serverDir = resolve(rootDir, "server");
const python = resolve(serverDir, ".venv/bin/python");
const processes = [];
let postgresDataDir;

async function main() {
  const apiPort = await freePort();
  const appPort = await freePort();
  const postgresPort = await freePort();
  const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
  const appBaseUrl = `http://127.0.0.1:${appPort}`;
  const databaseUrl = `postgresql+asyncpg://pfm_e2e@127.0.0.1:${postgresPort}/postgres`;

  postgresDataDir = mkdtempSync(join(tmpdir(), "pfm-e2e-postgres-"));
  startPostgres(postgresDataDir, postgresPort);

  run("alembic upgrade head", python, ["-m", "alembic", "upgrade", "head"], {
    cwd: serverDir,
    env: { DATABASE_URL: databaseUrl },
  });

  const api = startProcess("api", python, [
    "-m",
    "uvicorn",
    "app.main:app",
    "--host",
    "127.0.0.1",
    "--port",
    String(apiPort),
  ], {
    cwd: serverDir,
    env: {
      ACCESS_TOKEN_SECRET_KEY: "local-e2e-access-token-secret-32-bytes",
      APP_ENV: "test",
      CORS_ORIGINS: JSON.stringify([appBaseUrl]),
      DATABASE_URL: databaseUrl,
      EMAIL_BACKEND: "local",
      REFRESH_TOKEN_SECRET_KEY: "local-e2e-refresh-token-secret-32-bytes",
    },
  });
  await waitForUrl(`${apiBaseUrl}/api/v1/health/live`, "api");

  const next = startProcess("next", "npm", [
    "run",
    "dev",
    "--",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(appPort),
  ], {
    cwd: clientDir,
    env: { NEXT_PUBLIC_API_BASE_URL: apiBaseUrl },
  });
  await waitForUrl(appBaseUrl, "next");

  run("playwright test", "npx", [
    "playwright",
    "test",
    "--config",
    "e2e/playwright.config.mjs",
  ], {
    cwd: clientDir,
    env: {
      E2E_API_BASE_URL: apiBaseUrl,
      E2E_APP_BASE_URL: appBaseUrl,
    },
  });

  await stopProcess(next);
  await stopProcess(api);
}

function startPostgres(dataDir, port) {
  const bindir = execFileSync("pg_config", ["--bindir"], {
    encoding: "utf8",
  }).trim();
  run("initdb", join(bindir, "initdb"), [
    "-D",
    join(dataDir, "data"),
    "-A",
    "trust",
    "-U",
    "pfm_e2e",
  ]);
  run("pg_ctl start", join(bindir, "pg_ctl"), [
    "-D",
    join(dataDir, "data"),
    "-l",
    join(dataDir, "postgres.log"),
    "-o",
    `-F -h 127.0.0.1 -p ${port}`,
    "-w",
    "start",
  ]);
  processes.push({
    name: "postgres",
    stop: () =>
      execFileSync(join(bindir, "pg_ctl"), [
        "-D",
        join(dataDir, "data"),
        "-m",
        "fast",
        "-w",
        "stop",
      ], { stdio: "ignore" }),
  });
}

function run(label, command, args, options = {}) {
  execFileSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdio: "inherit",
  });
}

function startProcess(name, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  child.on("exit", (code, signal) => {
    if (code !== null && code !== 0) {
      process.stderr.write(`[${name}] exited with code ${code}\n`);
    }
    if (signal) {
      process.stderr.write(`[${name}] exited with signal ${signal}\n`);
    }
  });
  processes.push({ child, name, stop: () => stopProcess(child) });
  return child;
}

function stopProcess(child) {
  if (!child || child.exitCode !== null) return Promise.resolve();
  return new Promise((resolveStop) => {
    const timeout = setTimeout(resolveStop, 2_000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolveStop();
    });
    child.kill("SIGTERM");
  });
}

async function waitForUrl(url, label) {
  const deadline = Date.now() + 60_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 500));
  }
  throw new Error(`Timed out waiting for ${label} at ${url}: ${lastError}`);
}

function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolvePort(address.port));
    });
  });
}

async function cleanup() {
  for (const processEntry of [...processes].reverse()) {
    try {
      await processEntry.stop();
    } catch {
      // Best-effort cleanup.
    }
  }
  if (postgresDataDir) {
    rmSync(postgresDataDir, { force: true, recursive: true });
  }
}

process.on("exit", () => {
  void cleanup();
});
process.on("SIGINT", async () => {
  await cleanup();
  process.exit(130);
});
process.on("SIGTERM", async () => {
  await cleanup();
  process.exit(143);
});

main()
  .catch(async (error) => {
    console.error(error);
    await cleanup();
    process.exit(1);
  })
  .finally(cleanup);
