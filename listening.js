import bsky from '@atproto/api';
const { BskyAgent } = bsky;
import * as dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
//import { setupCache } from 'axios-cache-interceptor';
//const axios = setupCache(Axios);
import { keepAlive } from './server.js';

// Agent initialization 
const agent = new BskyAgent({
  service: process.env.SERVICE
});

// Login
await agent.login({
  identifier: process.env.BSKY_USERNAME,
  password: process.env.BSKY_PASSWORD
});

// Get nowPlaying status
async function nowPlaying() {
  const last = await axios.get(process.env.LASTFM);
  console.log("Get NowPlaying status")

  var latestTrack = last.data.recenttracks.track[0];
  var attr = latestTrack["@attr"];
  var latestTrack = last.data.recenttracks.track[0];
  console.log("Get track title...")
  let trackTitle = latestTrack.name;
  let title = trimString(trackTitle, 30);
  console.log("Get track artist...")
  let trackArtist = latestTrack.artist["#text"];
  let artist = trimString(trackArtist, 17);
  console.log("♫ " + last.data.recenttracks.track[0].name + " by " + last.data.recenttracks.track[0].artist['#text'] + " ♫");
  //console.log("LastFm cached status: " + last.cached);

  if (typeof attr === 'undefined') {
    //nowPlaying = ("Recently Played");
    updateProfile("Nobody Nearby", "♫ ---------------\nRecently Played: " + "\"" + trackTitle + "\"" + " by " + trackArtist + "\n ----------------- ♫\n\nI'm usually that person who has no idea what's going on. Raw version of @gits.bsky.london");
  } else {
    //nowPlaying = ("I'm currently listening to");
    updateProfile("♫ NowPlaying: " + artist + " ♫", "♫ ---------------\nCurrently listening to " + "\"" + trackTitle + "\"" + " by " + trackArtist + "\n ----------------- ♫\n\nRaw version of @gits.bsky.london");
  }
}

// Function to trim long text
const trimString = function(string, length) {
  return string.length > length ?
    string.substring(0, length) + '...' :
    string;
};

// Update profile
async function updateProfile(names, desc) {
  // get current profile information
  const { data } = await agent.getProfile({ actor: process.env.BSKY_IDENTIFIER });

  console.log("Update profile begin...")
  console.log("Display Name: " + names)
  const record = {
    // Main of this article You can put `\n` here > I □ \nUnicode
    displayName: names,

    // Profile description (to keep current settings)
    //description: "I'm usually that person who has no idea what's going on\n\nRaw version of @sgt.bsky.london",
    // description: "As seen on the internet\nRaw version of @sgt.bsky.london",
    // description: data.description,
    // description: "♫ I'm currently listening to " + title + " by " + artist + " ♫",
    description: desc,

    // Specify the icon image (to keep the current settings)
    avatar: {
      // $type and mimeType are type information
      $type: "blob",
      mimeType: "image/jpeg",
      // ref.$link is the image URL
      // data.avatar contains CDN URL, so extract only ref
      ref: { $link: (data.avatar || "").replace(/^.*\/plain\/|@jpeg$/g, "") },
      // size is a number type argument Required but zero is fine if passed
      size: 0
    },

    // Specify the header background image (to keep the current settings)
    // type is the same as icon
    banner: {
      $type: "blob",
      // ref: { $link: (uploadBanner.data.blob.ref.toString()) },
      ref: { $link: (data.banner || "").replace(/^.*\/plain\/|@jpeg$/g, "") },
      mimeType: "image/png",
      size: 0
    },
  };

  const response = await agent.com.atproto.repo.putRecord({
    collection: "app.bsky.actor.profile",
    repo: data.did,
    rkey: "self",
    record,
  });
  console.log("Update profile finished!")
}

// Starter
nowPlaying();
keepAlive();

// Set loop interval every millisec
setInterval(() => {
  nowPlaying();
}, 70000);