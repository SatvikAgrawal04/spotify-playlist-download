import SpotifyWebApi from "spotify-web-api-node";
import yts from "yt-search";
import dotenv from "dotenv";
import readline from "readline";
import youtubedl from "youtube-dl-exec";
import ora from "ora";
import path from "path";
dotenv.config();

const searchCache = {};

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// Authenticate Spotify API
async function authenticateSpotify() {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body["access_token"]);
    console.log("Spotify authenticated successfully");
  } catch (err) {
    console.error("Error authenticating Spotify:", err);
  }
}

// Fetch tracks from the Spotify playlist
async function getPlaylistTracks(playlistId) {
  try {
    const data = await spotifyApi.getPlaylistTracks(playlistId);
    console.log(`Playlist: ${data.body.name}`);
    const playlistName = data.body.name;
    const tracks = data.body.tracks.items.map((item) => ({
      name: item.track.name,
      artist: item.track.artists[0].name,
    }));
    console.log("No. of Tracks: ", tracks.length);
    return { playlistName, tracks };
  } catch (err) {
    console.error("Error getting playlist tracks:", err);
  }
}

// Search YouTube for the given song and artist
async function searchYoutube(songName, artist) {
  const cacheKey = `${songName}-${artist}`;
  if (searchCache[cacheKey]) {
    console.log(`Returning cached result for: ${songName} by ${artist}`);
    return searchCache[cacheKey];
  }

  try {
    const response = await yts(`${songName} ${artist}`);
    const video = response.videos.length ? response.videos[0] : null;

    if (video) {
      searchCache[cacheKey] = video.url;
      return video.url;
    } else {
      console.error(`No video found for: ${songName} by ${artist}`);
      return null;
    }
  } catch (error) {
    console.error("Error searching YouTube:", error);
    return null;
  }
}

// Download audio from YouTube
async function downloadAudio(youtubeUrl, outputDir) {
  try {
    const videoInfo = await youtubedl(youtubeUrl, { dumpSingleJson: true });
    const videoTitle = videoInfo.title;

    const spinner = ora(`Downloading: ${videoTitle}`).start();

    const promise = youtubedl(youtubeUrl, {
      format: "bestaudio[ext=m4a]",
      output: path.join(outputDir, "%(title)s.%(ext)s"),
    });

    await promise;
    spinner.succeed(`Download completed: ${videoTitle}`);
  } catch (err) {
    console.error("Error downloading audio:", err);
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

process.on("SIGINT", () => {
  console.log("Process interrupted. Cleaning up...");
  // Add any necessary cleanup here (e.g., stopping active downloads)
  process.exit();
});

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
    console.log("All songs downloaded successfully!");
  } else {
    console.log("No tracks found in the playlist.");
  }
})();
