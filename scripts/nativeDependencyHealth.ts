import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const modulePath = fileURLToPath(import.meta.url);
const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));

function runPnpmCommand(args: string[]): boolean {
  const result = process.platform === "win32"
    ? spawnSync(["corepack", "pnpm", ...args].join(" "), {
        cwd: rootDir,
        stdio: "inherit",
        shell: true
      })
    : spawnSync("corepack", ["pnpm", ...args], {
        cwd: rootDir,
        stdio: "inherit"
      });

  return result.status === 0;
}

function tryLoadBetterSqlite3(): void {
  const localRequire = createRequire(import.meta.url);
  const BetterSqlite3 = localRequire("better-sqlite3") as new (path: string, options?: Record<string, unknown>) => { close: () => void };
  const database = new BetterSqlite3(":memory:");
  database.close();
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRepairableBetterSqlite3Error(error: unknown): boolean {
  const message = formatErrorMessage(error);
  return message.includes("better-sqlite3")
    || message.includes("better_sqlite3.node")
    || message.includes("NODE_MODULE_VERSION")
    || message.includes("compiled against a different Node.js version")
    || message.includes("module could not be found");
}

export function ensureBetterSqlite3Ready(): void {
  try {
    tryLoadBetterSqlite3();
    return;
  } catch (error) {
    if (!isRepairableBetterSqlite3Error(error)) {
      throw error;
    }

    process.stdout.write("Detected an incompatible better-sqlite3 native binary. Rebuilding it for the current Node.js runtime...\n");

    if (!runPnpmCommand(["rebuild", "better-sqlite3"])) {
      process.stdout.write("The rebuild step did not complete cleanly. Reinstalling project dependencies to repair native modules...\n");
      if (!runPnpmCommand(["install", "--force"])) {
        throw new Error(
          `Argument Critic could not repair better-sqlite3 automatically. Original error: ${formatErrorMessage(error)}`
        );
      }
    }

    try {
      tryLoadBetterSqlite3();
    } catch (retryError) {
      throw new Error(
        `better-sqlite3 is still not loadable after automatic repair. Original error: ${formatErrorMessage(error)}. Current error: ${formatErrorMessage(retryError)}`
      );
    }

    process.stdout.write("better-sqlite3 was repaired successfully for the current Node.js runtime.\n");
  }
}

if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  try {
    ensureBetterSqlite3Ready();
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}