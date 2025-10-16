import { OAuthTokens, TokenService } from "./auth";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  console.log(`[API] Making request to: ${url}`);
  console.log(`[API] Headers:`, init.headers);

  const res = await fetch(url as any, init as any);

  if (!res.ok) {
    const text = await res.text();
    console.error(
      `[API] Request failed - Status: ${res.status}, Response: ${text}`
    );
    console.error(`[API] Request URL: ${url}`);
    console.error(`[API] Request headers:`, init.headers);
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  const result = (await res.json()) as T;
  console.log(`[API] Request successful`);
  return result;
}

function authHeader(tokens: OAuthTokens): Record<string, string> {
  return { Authorization: `Bearer ${tokens.accessToken}` };
}

export class SpotifyApi {
  constructor(private tokens: TokenService) {}

  private async withAuth<T>(fn: (t: OAuthTokens) => Promise<T>): Promise<T> {
    console.log(`[API] Getting authentication tokens...`);

    try {
      const t = await this.tokens.getTokens();
      console.log(
        `[API] Got tokens, access token starts with: ${t.accessToken.substring(
          0,
          10
        )}...`
      );

      try {
        return await fn(t);
      } catch (err: any) {
        console.error(`[API] Request failed with error:`, err);

        if (typeof err.message === "string" && /401/.test(err.message)) {
          console.log(`[API] Got 401 error, attempting to refresh token...`);
          const refreshed = await this.tokens.refresh(t.refreshToken);
          console.log(`[API] Token refreshed, retrying request...`);
          return await fn(refreshed);
        }
        throw err;
      }
    } catch (authError) {
      console.error(`[API] Authentication failed:`, authError);
      throw authError;
    }
  }

  async search(args: {
    query: string;
    type: "track" | "album" | "artist";
    limit?: number;
  }): Promise<unknown> {
    const { query, type, limit = 10 } = args;
    const url = new URL(`${SPOTIFY_API_BASE}/search`);
    url.searchParams.set("q", query);
    url.searchParams.set("type", type);
    url.searchParams.set("limit", String(limit));
    return await this.withAuth((t) =>
      fetchJson(url.toString(), { headers: authHeader(t) })
    );
  }

  async getUserPlaylists(args: {
    limit?: number;
    offset?: number;
  }): Promise<unknown> {
    const { limit = 20, offset = 0 } = args;
    const url = new URL(`${SPOTIFY_API_BASE}/me/playlists`);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    return await this.withAuth((t) =>
      fetchJson(url.toString(), { headers: authHeader(t) })
    );
  }

  async getPlaylistItems(args: {
    playlistId: string;
    limit?: number;
    offset?: number;
  }): Promise<unknown> {
    const { playlistId, limit = 50, offset = 0 } = args;
    const url = new URL(
      `${SPOTIFY_API_BASE}/playlists/${encodeURIComponent(playlistId)}/tracks`
    );
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    return await this.withAuth((t) =>
      fetchJson(url.toString(), { headers: authHeader(t) })
    );
  }

  async getDevices(): Promise<unknown> {
    console.log(`[API] Getting user devices...`);
    const url = `${SPOTIFY_API_BASE}/me/player/devices`;

    try {
      const result = await this.withAuth((t) =>
        fetchJson(url, { headers: authHeader(t) })
      );
      console.log(`[API] Successfully retrieved devices`);
      return result;
    } catch (error) {
      console.error(`[API] Failed to get devices:`, error);
      throw error;
    }
  }

  async getCurrentPlayback(): Promise<unknown | null> {
    const url = `${SPOTIFY_API_BASE}/me/player`;
    return await this.withAuth(async (t) => {
      const res = await fetch(url as any, { headers: authHeader(t) } as any);
      if (res.status === 204) return null;
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      return (await res.json()) as unknown;
    });
  }

  async play(
    args: {
      deviceId?: string;
      uris?: string[];
      contextUri?: string;
      positionMs?: number;
    } = {}
  ): Promise<void> {
    const url = new URL(`${SPOTIFY_API_BASE}/me/player/play`);
    if (args.deviceId) url.searchParams.set("device_id", args.deviceId);
    const body: any = {};
    if (args.uris) body.uris = args.uris;
    if (args.contextUri) body.context_uri = args.contextUri;
    if (typeof args.positionMs === "number") body.position_ms = args.positionMs;
    await this.withAuth((t) =>
      fetch(
        url.toString() as any,
        {
          method: "PUT",
          headers: { ...authHeader(t), "Content-Type": "application/json" },
          body: Object.keys(body).length ? JSON.stringify(body) : undefined,
        } as any
      )
    );
  }

  async pause(args: { deviceId?: string } = {}): Promise<void> {
    const url = new URL(`${SPOTIFY_API_BASE}/me/player/pause`);
    if (args.deviceId) url.searchParams.set("device_id", args.deviceId);
    await this.withAuth((t) =>
      fetch(
        url.toString() as any,
        { method: "PUT", headers: authHeader(t) } as any
      )
    );
  }

  async next(args: { deviceId?: string } = {}): Promise<void> {
    const url = new URL(`${SPOTIFY_API_BASE}/me/player/next`);
    if (args.deviceId) url.searchParams.set("device_id", args.deviceId);
    await this.withAuth((t) =>
      fetch(
        url.toString() as any,
        { method: "POST", headers: authHeader(t) } as any
      )
    );
  }

  async previous(args: { deviceId?: string } = {}): Promise<void> {
    const url = new URL(`${SPOTIFY_API_BASE}/me/player/previous`);
    if (args.deviceId) url.searchParams.set("device_id", args.deviceId);
    await this.withAuth((t) =>
      fetch(
        url.toString() as any,
        { method: "POST", headers: authHeader(t) } as any
      )
    );
  }
}
