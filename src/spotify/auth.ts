import crypto from "node:crypto";
import http from "node:http";
import { AddressInfo } from "node:net";
import open from "open";
import keytar from "keytar";
import { URL } from "node:url";

const SPOTIFY_AUTH_BASE = "https://accounts.spotify.com";
const SERVICE = "spotify-mcp";

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch seconds
  scope: string;
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateCodeVerifier(): string {
  return base64UrlEncode(crypto.randomBytes(64));
}

function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return base64UrlEncode(hash);
}

function nowEpoch(): number {
  return Math.floor(Date.now() / 1000);
}

async function fetchJson<T>(input: string | URL, init?: any): Promise<T> {
  console.log(`[AUTH] Making request to: ${input}`);
  const res = await fetch(input as any, init as any);
  if (!res.ok) {
    const text = await res.text();
    console.error(
      `[AUTH] Request failed - Status: ${res.status}, Response: ${text}`
    );
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const result = (await res.json()) as T;
  console.log(`[AUTH] Request successful`);
  return result;
}

export class TokenService {
  constructor(private clientId: string, private scopes: string[]) {}

  // Ensure only one interactive auth flow runs at a time to avoid
  // port conflicts and OAuth state mismatches
  private inflightAuthFlow: Promise<OAuthTokens> | null = null;

  private accountName(): string {
    return `${this.clientId}`;
  }

  async getTokens(): Promise<OAuthTokens> {
    console.log(
      `[AUTH] Getting tokens for client ID: ${
        this.clientId ? "SET" : "NOT SET"
      }`
    );

    if (!this.clientId) {
      console.error(`[AUTH] SPOTIFY_CLIENT_ID is not set`);
      throw new Error(
        "SPOTIFY_CLIENT_ID is required. Set it in your environment or .env file."
      );
    }

    const raw = await keytar.getPassword(SERVICE, this.accountName());
    console.log(`[AUTH] Stored tokens found: ${raw ? "YES" : "NO"}`);

    if (!raw) {
      console.log(`[AUTH] No stored tokens, starting auth flow`);
      if (!this.inflightAuthFlow) {
        this.inflightAuthFlow = this.performAuthFlow().finally(() => {
          this.inflightAuthFlow = null;
        });
      }
      return await this.inflightAuthFlow;
    }

    const tokens = JSON.parse(raw) as OAuthTokens;
    const now = nowEpoch();
    const expiresIn = tokens.expiresAt - now;
    console.log(
      `[AUTH] Token expires in ${expiresIn} seconds (${
        expiresIn > 60 ? "VALID" : "EXPIRED"
      })`
    );

    if (tokens.expiresAt - 60 <= now) {
      console.log(`[AUTH] Token expired, refreshing...`);
      return await this.refresh(tokens.refreshToken);
    }

    console.log(`[AUTH] Using valid stored token`);
    return tokens;
  }

  async refresh(refreshToken: string): Promise<OAuthTokens> {
    console.log(`[AUTH] Refreshing token...`);

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.clientId,
    });

    try {
      const data = await fetchJson<{
        access_token: string;
        token_type: string;
        scope: string;
        expires_in: number;
        refresh_token?: string;
      }>(`${SPOTIFY_AUTH_BASE}/api/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      const stored = await keytar.getPassword(SERVICE, this.accountName());
      const prev = stored ? (JSON.parse(stored) as OAuthTokens) : undefined;
      const next: OAuthTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? prev?.refreshToken ?? refreshToken,
        scope: data.scope,
        expiresAt: nowEpoch() + data.expires_in,
      };

      await keytar.setPassword(
        SERVICE,
        this.accountName(),
        JSON.stringify(next)
      );
      console.log(
        `[AUTH] Token refreshed successfully, expires in ${data.expires_in} seconds`
      );
      return next;
    } catch (error) {
      console.error(`[AUTH] Token refresh failed:`, error);
      throw error;
    }
  }

  private async performAuthFlow(): Promise<OAuthTokens> {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Start local server for redirect on a fixed port (configurable)
    const preferredPort = Number(process.env.SPOTIFY_REDIRECT_PORT ?? "5173");
    let server = http.createServer();

    const listenOnPort = async (
      srv: http.Server,
      port: number
    ): Promise<AddressInfo> => {
      return await new Promise<AddressInfo>((resolve, reject) => {
        const onListening = () => {
          srv.off("error", onError);
          resolve(srv.address() as AddressInfo);
        };
        const onError = (err: any) => {
          srv.off("listening", onListening);
          reject(err);
        };
        srv.once("error", onError);
        srv.listen(port, "127.0.0.1", onListening);
      });
    };

    let addr: AddressInfo;
    try {
      addr = await listenOnPort(server, preferredPort);
      console.log(`[AUTH] Redirect server listening on port ${addr.port}`);
    } catch (err: any) {
      if (
        err &&
        (err.code === "EADDRINUSE" || /EADDRINUSE/.test(String(err)))
      ) {
        console.warn(
          `[AUTH] Port ${preferredPort} in use, falling back to an ephemeral port`
        );
        server = http.createServer();
        addr = await listenOnPort(server, 0);
        console.log(`[AUTH] Redirect server listening on port ${addr.port}`);
      } else {
        throw err;
      }
    }
    const redirectUri = `http://127.0.0.1:${addr.port}/callback`;

    const state = base64UrlEncode(crypto.randomBytes(16));

    const authUrl = new URL(`${SPOTIFY_AUTH_BASE}/authorize`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", this.clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", this.scopes.join(" "));

    const authPromise = new Promise<string>((resolve, reject) => {
      server.on("request", async (req, res) => {
        try {
          if (!req.url) return;
          const url = new URL(req.url, `http://127.0.0.1:${addr.port}`);
          if (url.pathname !== "/callback") return;
          const rcvState = url.searchParams.get("state");
          const code = url.searchParams.get("code");
          const error = url.searchParams.get("error");
          if (error) throw new Error(error);
          if (!code || rcvState !== state)
            throw new Error("Invalid OAuth response");
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html");
          res.end(
            "<html><body><h1>Spotify auth complete. You can close this window.</h1></body></html>"
          );
          resolve(code);
        } catch (err: any) {
          res.statusCode = 500;
          const message =
            typeof err?.message === "string" ? err.message : "Unknown error";
          res.end(`Auth error: ${message}`);
          reject(err);
        } finally {
          server.close();
        }
      });
    });

    // Open browser and wait for user consent
    await open(authUrl.toString());
    const code = await authPromise;

    // Exchange code
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: this.clientId,
      code_verifier: codeVerifier,
    });
    const data = await fetchJson<{
      access_token: string;
      token_type: string;
      scope: string;
      expires_in: number;
      refresh_token: string;
    }>(`${SPOTIFY_AUTH_BASE}/api/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const tokens: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      scope: data.scope,
      expiresAt: nowEpoch() + data.expires_in,
    };
    await keytar.setPassword(
      SERVICE,
      this.accountName(),
      JSON.stringify(tokens)
    );
    return tokens;
  }
}

const requiredEnv = ["SPOTIFY_CLIENT_ID"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    // Do not throw at import time; the server might only need it on first use
  }
}

export const tokenService = new TokenService(
  process.env.SPOTIFY_CLIENT_ID ?? "",
  [
    // Scopes for playback control and playlist read
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
    "playlist-read-private",
    "playlist-read-collaborative",
  ]
);
