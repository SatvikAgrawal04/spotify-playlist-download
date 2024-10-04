import SpotifyWebApi from "spotify-web-api-node";
import yts from "yt-search";
import dotenv from "dotenv";
import readline from "readline";
import youtubedl from "youtube-dl-exec";
import ora from "ora";
import path from "path";
import fs from "fs";
import winston from "winston";

// Load environment variables
dotenv.config();
const searchCache = {};

// Set up logging with winston
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      ({ timestamp, level, message }) =>
        `${timestamp} [${level.toUpperCase()}]: ${message}`
    )
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "app.log" }),
  ],
});

// Set up Spotify API with fallback to environment variables
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID || "your_default_client_id",
  clientSecret:
    process.env.SPOTIFY_CLIENT_SECRET || "your_default_client_secret",
});

// Authenticate Spotify API
async function authenticateSpotify() {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body["access_token"]);
    logger.info("Spotify authenticated successfully.");
  } catch (err) {
    logger.error("Error authenticating Spotify: " + err.message);
    process.exit(1); // Exit if authentication fails
  }
}

// Fetch tracks from the Spotify playlist
async function getPlaylistTracks(playlistId) {
  try {
    const data = await spotifyApi.getPlaylistTracks(playlistId);
    logger.info(`Playlist fetched: ${data.body.name}`);
    const playlistName = data.body.name;
    const tracks = data.body.tracks.items.map((item) => ({
      name: item.track.name,
      artist: item.track.artists[0].name,
    }));
    logger.info(`Number of tracks found: ${tracks.length}`);
    return { playlistName, tracks };
  } catch (err) {
    logger.error("Error getting playlist tracks: " + err.message);
    return null;
  }
}

// Search YouTube for the given song and artist
async function searchYoutube(songName, artist) {
  const cacheKey = `${songName}-${artist}`;
  if (searchCache[cacheKey]) {
    logger.info(`Returning cached result for: ${songName} by ${artist}`);
    return searchCache[cacheKey];
  }

  try {
    const response = await yts(`${songName} ${artist}`);
    const video = response.videos.length ? response.videos[0] : null;

    if (video) {
      searchCache[cacheKey] = video.url;
      return video.url;
    } else {
      logger.warn(`No video found for: ${songName} by ${artist}`);
      return null;
    }
  } catch (error) {
    logger.error("Error searching YouTube: " + error.message);
    return null;
  }
}

// Download audio from YouTube
async function downloadAudio(youtubeUrl, outputDir) {
  try {
    const videoInfo = await youtubedl(youtubeUrl, { dumpSingleJson: true });
    const videoTitle = videoInfo.title;

    const spinner = ora(`Downloading: ${videoTitle}`).start();

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const promise = youtubedl(youtubeUrl, {
      format: "bestaudio[ext=m4a]",
      output: path.join(outputDir, "%(title)s.%(ext)s"),
    });

    await promise;
    spinner.succeed(`Download completed: ${videoTitle}`);
    logger.info(`Downloaded: ${videoTitle}`);
  } catch (err) {
    logger.error("Error downloading audio: " + err.message);
  }
}

// Get playlist ID from user input
const getPlaylistId = () => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("Enter Spotify playlist URL: ", (input) => {
      const playlistId = input.split("playlist/")[1];
      rl.close();
      resolve(playlistId);
    });
  });
};

// Main function to download all songs from a Spotify playlist
(async () => {
  await authenticateSpotify();

  const playlistId = await getPlaylistId();
  const { playlistName, tracks } = await getPlaylistTracks(playlistId);

  if (tracks && tracks.length > 0) {
    for (const track of tracks) {
      const song = track.name;
      const artist = track.artist;

      const youtubeUrl = await searchYoutube(song, artist);
      if (youtubeUrl) {
        await downloadAudio(youtubeUrl, `./downloads/${playlistName}`);
      }
    }
    logger.info("All songs downloaded successfully!");
  } else {
    logger.warn("No tracks found in the playlist.");
  }
})();

// Handle process interruption
process.on("SIGINT", () => {
  logger.info("Process interrupted. Cleaning up...");
  process.exit();
});
