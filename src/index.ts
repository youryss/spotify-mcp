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
  loadEnv({ path: envFilePath });
} else if (process.env.SPOTIFY_MCP_ENV_FILE) {
  console.warn(
    `[ENV] Specified env file not found at ${envFilePath}. Proceeding with existing environment.`
  );
}

import { createServer } from "./mcp/server.js";

async function main(): Promise<void> {
  const server = createServer();
  await server.start();
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
