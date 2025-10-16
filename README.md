# Spotify MCP (CLI server)

A Model Context Protocol server to access Spotify: search tracks/albums/artists, read playlists, and control playback (play/pause/next/previous). Runs over stdio for IDE agents.

## Setup

1. Create an app in the Spotify Developer Dashboard.
   - Add a redirect URI like `http://127.0.0.1:12345/callback`.
   - Copy Client ID.
2. Environment:

```
# .env
SPOTIFY_CLIENT_ID=your_client_id
```

3. Install and build:

```
npm install
npm run build
```

## Run

- Dev: `npm run dev`
- MCP stdio server: `npm run mcp`

On first run, a browser will open for OAuth. Tokens are stored via the OS keychain under service `spotify-mcp`.

## Tools

- search(type, q, limit?)
- get_playlists(limit?, offset?)
- get_playlist_items(playlistId, limit?, offset?)
- playback_control(action, deviceId?)
- current_playback()
- devices()







