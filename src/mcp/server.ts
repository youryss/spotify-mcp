import { z } from "zod";
import { setTimeout as delay } from "node:timers/promises";

import { SpotifyApi } from "../spotify/api.js";
import { tokenService } from "../spotify/auth.js";

// MCP SDK
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export function createServer() {
  // Debug environment variables
  console.log(`[SERVER] Starting Spotify MCP Server...`);
  console.log(
    `[SERVER] SPOTIFY_CLIENT_ID: ${
      process.env.SPOTIFY_CLIENT_ID ? "SET" : "NOT SET"
    }`
  );
  console.log(
    `[SERVER] SPOTIFY_REDIRECT_PORT: ${
      process.env.SPOTIFY_REDIRECT_PORT || "5173 (default)"
    }`
  );

  const transport = new StdioServerTransport();
  const server = new McpServer(
    { name: "spotify-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  // After client initialization, proactively notify tool list
  server.server.oninitialized = () => {
    server.sendToolListChanged();
  };

  const api = new SpotifyApi(tokenService);

  // Minimal always-available tool
  server.tool("ping", "Ping the server", {}, async () => {
    return { content: [{ type: "text", text: "pong" }] };
  });

  // Diagnostic tool
  server.tool("debug", "Show debug information", {}, async () => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              environment: {
                SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID
                  ? "SET"
                  : "NOT SET",
                SPOTIFY_REDIRECT_PORT:
                  process.env.SPOTIFY_REDIRECT_PORT ||
                  "NOT SET (default: 5173)",
                NODE_ENV: process.env.NODE_ENV || "NOT SET",
              },
              timestamp: new Date().toISOString(),
              message: "Debug information for Spotify MCP server",
            },
            null,
            2
          ),
        },
      ],
    };
  });

  // Tools
  server.tool(
    "search",
    "Search Spotify for tracks, albums, or artists",
    {
      type: z
        .enum(["track", "album", "artist"])
        .describe("Type of item to search"),
      q: z.string().min(1).describe("Search query string"),
      limit: z.number().int().min(1).max(50).optional().default(10),
    },
    async ({ q, type, limit }) => {
      const result = await api.search({ query: q, type, limit });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "get_playlists",
    "Get current user playlists",
    {
      limit: z.number().int().min(1).max(50).optional().default(20),
      offset: z.number().int().min(0).optional().default(0),
    },
    async ({ limit, offset }) => {
      const result = await api.getUserPlaylists({ limit, offset });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "get_playlist_items",
    "Get items from a playlist",
    {
      playlistId: z.string(),
      limit: z.number().int().min(1).max(100).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    },
    async ({ playlistId, limit, offset }) => {
      const result = await api.getPlaylistItems({ playlistId, limit, offset });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "playback_control",
    "Control playback: play, pause, next, previous",
    {
      action: z.enum(["play", "pause", "next", "previous"]),
      deviceId: z.string().optional(),
    },
    async ({ action, deviceId }) => {
      switch (action) {
        case "play":
          await api.play({ deviceId });
          break;
        case "pause":
          await api.pause({ deviceId });
          break;
        case "next":
          await api.next({ deviceId });
          break;
        case "previous":
          await api.previous({ deviceId });
          break;
      }
      // Small delay to let Spotify apply change before fetching state
      await delay(150);
      const state = await api.getCurrentPlayback();
      return {
        content: [
          { type: "text", text: JSON.stringify(state ?? { status: "ok" }) },
        ],
      };
    }
  );

  server.tool(
    "current_playback",
    "Get current playback state",
    {},
    async () => {
      const state = await api.getCurrentPlayback();
      return { content: [{ type: "text", text: JSON.stringify(state) }] };
    }
  );

  server.tool(
    "devices",
    "List user devices available for playback",
    {},
    async () => {
      const debugInfo: string[] = [];

      try {
        debugInfo.push(
          `[SERVER] Executing devices tool at ${new Date().toISOString()}`
        );
        debugInfo.push(
          `[SERVER] SPOTIFY_CLIENT_ID is ${
            process.env.SPOTIFY_CLIENT_ID ? "SET" : "NOT SET"
          }`
        );

        console.log(`[SERVER] Executing devices tool...`);
        const devices = await api.getDevices();
        console.log(`[SERVER] Devices tool completed successfully`);
        return { content: [{ type: "text", text: JSON.stringify(devices) }] };
      } catch (error) {
        debugInfo.push(`[SERVER] Devices tool failed with error: ${error}`);
        console.error(`[SERVER] Devices tool failed:`, error);

        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: "Failed to fetch devices",
                  details: errorMessage,
                  stack: errorStack,
                  debugLog: debugInfo,
                  timestamp: new Date().toISOString(),
                  environment: {
                    clientIdSet: !!process.env.SPOTIFY_CLIENT_ID,
                    redirectPort:
                      process.env.SPOTIFY_REDIRECT_PORT || "5173 (default)",
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  );

  return {
    start: async () => {
      await server.connect(transport);
    },
  };
}
