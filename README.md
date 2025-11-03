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

### Quick Configuration Example

Here's a complete working example for Cursor IDE:

```json
{
  "spotify-mcp": {
    "command": "/Users/yourusername/.nvm/versions/node/v22.11.0/bin/node",
    "args": [
      "--env-file",
      "/Users/yourusername/spotify-mcp/.env",
      "/Users/yourusername/spotify-mcp/dist/index.js"
    ]
  }
}
```

**Important customization steps:**

1. Replace `/Users/yourusername` with your actual home directory path
2. Update the node version path if you're using nvm (check with `which node`)
3. Update the project path to where you cloned `spotify-mcp`

**To find your paths:**

```bash
# Your node path (if using nvm)
which node

# Your project path
cd /path/to/spotify-mcp
pwd
```

**Why this configuration?**

- Uses `--env-file` flag to automatically load your `.env` file
- No need to manually set environment variables
- Works reliably with nvm-managed Node.js installations

### Running the Server

- **Development mode**: `npm run dev`
- **MCP stdio server**: `npm run mcp`

On first run, a browser will open for OAuth authentication. Tokens are stored securely via the OS keychain under service `spotify-mcp`.

### Using with Cursor IDE

1. **Complete the setup steps above** (Spotify Developer Setup, Environment Configuration, Install and Build)

2. **Configure Cursor** to use this MCP server:

   - Open Cursor Settings (Cmd+, on macOS or Ctrl+, on Windows/Linux)
   - Go to "Features" → "Model Context Protocol"
   - Click "Add Server" or edit your MCP configuration file directly (`~/.cursor/mcp.json`)
   - Use the configuration from the "Quick Configuration Example" section above
   - Customize the paths to match your system (see instructions in that section)

   **Alternative: Simple npm configuration (may not work with nvm)**

   ```json
   {
     "spotify-mcp": {
       "command": "npm",
       "args": ["run", "mcp"],
       "cwd": "/absolute/path/to/your/spotify-mcp"
     }
   }
   ```

3. **Restart Cursor** after adding the configuration

4. **Verify the connection**:
   - Open a new chat in Cursor
   - Type: "ping" - you should get a "pong" response from the Spotify MCP server
   - Type: "get devices" - should list your available Spotify devices
5. **First-time authentication**:

   - On first use, a browser window will open automatically for Spotify OAuth
   - Log in and authorize the application
   - Your tokens will be stored securely in your system's keychain
   - After authorization, return to Cursor - the server will be ready to use

6. **Start using Spotify tools** in your Cursor chat:
   - "Search for songs by The Beatles"
   - "Show my playlists"
   - "Play the next song"
   - "What's currently playing?"
   - "List my available devices"

### Using with Claude Desktop

1. **Complete the setup steps above** (Spotify Developer Setup, Environment Configuration, Install and Build)

2. **Add to Claude Desktop configuration**:

   - Locate your Claude Desktop configuration file:
     - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
     - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
     - Linux: `~/.config/Claude/claude_desktop_config.json`
   - Edit the configuration file and add the MCP server:

   ```json
   {
     "mcpServers": {
       "spotify-mcp": {
         "command": "/Users/yourusername/.nvm/versions/node/nodeversion/bin/node",
         "args": [
           "--env-file",
           "/Users/yourusername/spotify-mcp/.env",
           "/Users/yourusername/spotify-mcp/dist/index.js"
         ]
       }
     }
   }
   ```

   **Important**:

   - Customize the paths as described in the "Quick Configuration Example" section
   - Use absolute paths, not relative paths
   - Ensure the `dist` folder exists by running `npm run build` first
   - Save the configuration file after editing

   **Alternative: Simple npm configuration (may not work with nvm)**

   ```json
   {
     "mcpServers": {
       "spotify-mcp": {
         "command": "npm",
         "args": ["run", "mcp"],
         "cwd": "/absolute/path/to/your/spotify-mcp"
       }
     }
   }
   ```

3. **Restart Claude Desktop** completely

4. **First-time authentication**:

   - On first use, a browser window will open automatically for Spotify OAuth
   - Log in and authorize the application
   - Your tokens will be stored securely in your system's keychain

5. **Use Spotify commands** in your conversations:
   - Ask Claude to search for music, control playback, or browse your playlists
   - Examples: "Search for songs by Coldplay", "What's playing on my Spotify?", "Skip to next track"

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
