# Spotify MCP (CLI server)

A Model Context Protocol server to access Spotify: search tracks/albums/artists, read playlists, and control playback (play/pause/next/previous). Runs over stdio for IDE agents.

## Setup

### 1. Spotify Developer Setup

First, you need to create a Spotify application to get your Client ID:

1. **Visit the Spotify Developer Dashboard**: [https://developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. **Log in** with your Spotify account
3. **Create a new app**:
   - Click "Create app"
   - Fill in the app name and description
   - Set the redirect URI to: `http://127.0.0.1:5173/callback` (or use your custom port)
   - Accept the terms and create the app
4. **Copy your Client ID** from the app settings

For detailed instructions, see the [Spotify Web API Getting Started Guide](https://developer.spotify.com/documentation/web-api/tutorials/getting-started).

### 2. Environment Configuration

Copy the `.env.example` file to create your local environment configuration:

```bash
cp .env.example .env
```

Then edit `.env` with your Spotify credentials:

```bash
# .env
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_REDIRECT_PORT=5173
```

**Important**:

- Replace `your_spotify_client_id_here` with your actual Spotify Client ID
- The `SPOTIFY_REDIRECT_PORT` must match the port in your Spotify app's redirect URI
- Never commit `.env` to version control (it's already in `.gitignore`)

### 3. Install and Build

```bash
npm install
npm run build
```

## Usage

### Running the Server

- **Development mode**: `npm run dev`
- **MCP stdio server**: `npm run mcp`

On first run, a browser will open for OAuth authentication. Tokens are stored securely via the OS keychain under service `spotify-mcp`.

### Using with Cursor IDE

1. **Install the MCP server** (follow setup steps above)
2. **Configure Cursor** to use this MCP server:
   - Open Cursor settings
   - Navigate to "Features" → "Model Context Protocol"
   - Add a new server configuration:
     ```json
     {
       "name": "spotify-mcp",
       "command": "npm",
       "args": ["run", "mcp"],
       "cwd": "/path/to/your/spotify-mcp"
     }
     ```
3. **Start using Spotify tools** in your Cursor chat:
   - "Search for songs by The Beatles"
   - "Show my playlists"
   - "Play the next song"
   - "What's currently playing?"

### Using with Claude Desktop

1. **Add to Claude Desktop configuration**:
   - Open Claude Desktop settings
   - Add the MCP server to your configuration file:
     ```json
     {
       "mcpServers": {
         "spotify-mcp": {
           "command": "npm",
           "args": ["run", "mcp"],
           "cwd": "/path/to/your/spotify-mcp"
         }
       }
     }
     ```
2. **Restart Claude Desktop**
3. **Use Spotify commands** in your conversations:
   - Ask Claude to search for music, control playback, or browse your playlists

### Quick Start Commands

Once configured, you can use natural language commands like:

- "Search for jazz albums"
- "Play my liked songs playlist"
- "Skip to the next track"
- "What devices are available for playback?"
- "Show me songs from my 'Chill' playlist"

## Available Tools

The MCP server provides the following Spotify integration tools:

- **`search(type, q, limit?)`** - Search for tracks, albums, or artists
- **`get_playlists(limit?, offset?)`** - Get user's playlists
- **`get_playlist_items(playlistId, limit?, offset?)`** - Get items from a specific playlist
- **`playback_control(action, deviceId?)`** - Control playback (play, pause, next, previous)
- **`current_playback()`** - Get current playback state
- **`devices()`** - List available playback devices

## Troubleshooting

### Common Issues

1. **"Client ID not found" error**:

   - Ensure your `.env` file exists and contains `SPOTIFY_CLIENT_ID`
   - Verify the Client ID is correct (copy from Spotify Developer Dashboard)

2. **"Redirect URI mismatch" error**:

   - Check that `SPOTIFY_REDIRECT_PORT` in `.env` matches your Spotify app's redirect URI
   - The redirect URI should be `http://127.0.0.1:5173/callback` (replace 5173 with your port)

3. **Authentication issues**:

   - Clear stored tokens: The tokens are stored in your OS keychain under `spotify-mcp`
   - On macOS: Use Keychain Access app to delete `spotify-mcp` entries
   - Try running the server again to re-authenticate

4. **MCP server not connecting**:
   - Ensure the server builds successfully: `npm run build`
   - Check that the `cwd` path in your MCP configuration is correct
   - Verify Node.js and npm are installed and up to date

### Getting Help

- Check the [Spotify Web API documentation](https://developer.spotify.com/documentation/web-api)
- Review the [Model Context Protocol specification](https://modelcontextprotocol.io/)
- Open an issue on the project repository for bugs or feature requests
