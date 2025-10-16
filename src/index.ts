import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Bypass SSL certificate verification for Spotify API calls
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
loadEnv({ path: join(__dirname, "../.env"), override: true });

import { createServer } from "./mcp/server.js";

async function main(): Promise<void> {
  const server = createServer();
  await server.start();
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
