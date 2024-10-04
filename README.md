# Spotify Playlist Downloader

This Node.js project allows you to download all tracks from a Spotify playlist as audio files using the Spotify Web API, YouTube search, and `youtube-dl-exec`. It searches for the tracks on YouTube, then downloads the best audio quality available.## Features
- Authenticate with Spotify Web API
- Fetch all tracks from a Spotify playlist
- Search for tracks on YouTube
- Download audio files in the best available quality (`.m4a` format)
- Logging using `winston` to capture events and errors
## prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v14 or higher)
- [Spotify Developer Account](https://developer.spotify.com/) for API credentials
- [YouTube-dl](https://github.com/ytdl-org/youtube-dl/) (Optional, handled by `youtube-dl-exec`)
## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/username/repo_name.git
   cd repo_name
   ```
2. **Install Dependnecies**
   ```bash
   npm init -y
   ```    
3. **Setup Environment Variables**
Create new .env file in the root of project and add your spotify credentials
   ```bash
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   ```
## Usage

1. **Run the Script**

```bash
   node index.js
```
2. **Input the Spotify playlist URL when prompted. The script will:**

- Authenticate with Spotify.
- Fetch the playlist tracks.
- Search for each track on YouTube.
- Download the audio in .m4a format and save it in a folder named after the playlist.

