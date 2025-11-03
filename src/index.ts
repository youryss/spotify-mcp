import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { existsSync } from "node:fs";

// Bypass SSL certificate verification for Spotify API calls
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envFilePath = (() => {
  const customPath = process.env.SPOTIFY_MCP_ENV_FILE;
  if (customPath && customPath.trim().length > 0) {
    return isAbsolute(customPath)
      ? customPath
      : resolve(process.cwd(), customPath);
  }
  return join(__dirname, "../.env");
})();

if (existsSync(envFilePath)) {
  // Suppress dotenv console output to avoid interfering with MCP stdio
  const originalConsoleLog = console.log;
  console.log = () => {};
  loadEnv({ path: envFilePath });
  console.log = originalConsoleLog;
} else if (process.env.SPOTIFY_MCP_ENV_FILE) {
  console.error(
    `[ENV] Specified env file not found at ${envFilePath}. Proceeding with existing environment.`
  );
}

import { createServer } from "./mcp/server.js";

async function main(): Promise<void> {
  // Redirect console methods to stderr after imports but before server creation
  // This prevents debug logs from interfering with MCP's JSON-RPC on stdout
  const originalLog = console.log;
  const originalWarn = console.warn;

  console.log = (...args: any[]) => console.error(...args);
  console.warn = (...args: any[]) => console.error(...args);

  const server = createServer();
  await server.start();
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
