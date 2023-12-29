import bsky from '@atproto/api';
const { BskyAgent } = bsky;
import * as dotenv from 'dotenv';
dotenv.config();
import { Blob } from 'buffer';
import axios from 'axios';
import fs from 'fs';
import Jimp from 'jimp';
import sharp from 'sharp';
import { keepAlive } from './server.js'; // for replit uptimerobot

// Agent initialization 
const agent = new BskyAgent({
  service: process.env.SERVICE
});

// Bsky login
await agent.login({
  identifier: process.env.BSKY_IDENTIFIER,
  password: process.env.BSKY_PASSWORD
});

// Function to get recent folowers
async function getLatestFollowers() {
  try {
    const data = await agent.getFollowers({
      actor: process.env.BSKY_IDENTIFIER,
      limit: 3
    });
    //console.log(data)
  
    let count = 0;
    const downloads = new Promise((resolve, reject) => {
      data.data.followers.forEach((user, index, arr) => {
        downloadImage(user.avatar, `${index}.png`).then(() => {
          count++;
          if (count === arr.length) resolve();
          console.log('Downloading avatar', `${index}.png...`)
        });
      })
    })
    downloads.then(() => {
      downloadAlbumImage();
    })
  } catch (error) {
    console.error('Error download avatar:', error.message);
  }
}

// Function to resize downloaded avatar
async function downloadImage(url, image_path) {
  await axios({
    url,
    responseType: 'arraybuffer',
  }).then((response) => {
    new Promise((resolve, reject) => {
      resolve(sharp(response.data)
      //.grayscale()
      .resize(96, 96)
      .composite([{
        input: circleShape,
        blend: 'dest-in'
      }])
      .toFile(image_path))
    })
  }).catch((err) => {
    console.log(err)    
  });
}

// Function to crop image
const width = 96, // avatar size
  r = width / 2, // for circle avatar
  circleShape = Buffer.from(`<svg><circle cx="${r}" cy="${r}" r="${r}" /></svg>`);

// Fetch recent track from LastFM
async function getLastFm() {
  try {
    const response = await axios.get(process.env.LASTFM);
    //console.log("Get lastFM data")
    return response;
  } catch (error) {
    console.error('Error getting lastfm data:', error.response.data);
  }
}

// Get nowPlaying status
async function nowPlaying() {
  //const [hariMundur, jamMundur, menitMundur, detikMundur] = hitungMundur();
  let nowPlaying = "";
  var artist = await getRecentArtist();
  await getLastFm()
    .then(response => {
      var latestTrack = response.data.recenttracks.track[0];
      var trackTitle = latestTrack.name;
      var trackArtist = latestTrack.artist["#text"];
      // detect if the track has attributes associated with it
      var attr = latestTrack["@attr"];
      // if nowplaying attr is undefined
      if (typeof attr === 'undefined') {
        nowPlaying = ("Recently Played");
        // updateProfile("Ramadhan is just " + hariMundur + " day(s) away! ☪️");
        //updateProfile(["Nobody Nearby...", "Lebaran is just " + hariMundur + " day(s) away", "🦣 sgitsp@mastodon.social"].random());
        updateProfile("How long can this name get? Pretty long it seems...", "I'm usually that person who has no idea what's going on. Since there's no DM features yet, you can DM me on SimpleX without an account: https://dm.oops.wtf\n\n♫ Recently Played: " + "\"" + trackTitle + "\"" + " by " + trackArtist + " ♫");
      } else {
        nowPlaying = ("I'm currently listening to");
        updateProfile("♫ NowPlaying: " + artist + " ♫", "Listen to many, sing to a few~\n\n" + "I'm currently listening to " + "\"" + trackTitle + "\"" + " by " + trackArtist);
        //updateProfile('♫ NowPlaying: ' + artist + ' ♫');
      }
    })
    .catch (error => console.log(error.response.data))
  return nowPlaying;
}

// Get recent song title
async function getRecentTitle() {
  let trackTitle = ""
  await getLastFm()
    .then(response => {
      var latestTrack = response.data.recenttracks.track[0];
      trackTitle = latestTrack.name;
    })
    .catch (error => console.log(error.response.data))
  console.log('Get track title ♪');
  return trimString(trackTitle, 17);
}

// Get recent song artist
async function getRecentArtist() {
  let trackArtist = ""
  await getLastFm()
    .then(response => {
      var latestTrack = response.data.recenttracks.track[0];
      trackArtist = latestTrack.artist["#text"];
    })
    .catch (error => console.log(error.response.data))
  console.log('Get track artist ♪');
  return trimString(trackArtist, 17);
}

// Download album image
async function downloadAlbumImage() {
  await getLastFm()
    .then(response => {
      var latestTrack = response.data.recenttracks.track[0];
      const trackCover = latestTrack.image[2]["#text"];
      if (latestTrack.image[2]["#text"] === '') {
        axios({
          url: 'https://lastfm.freetls.fastly.net/i/u/300x300/c6f59c1e5e7240a4c0d427abd71f3dbb.jpg',
          responseType: 'arraybuffer',
        }).then(
          (response) =>
            new Promise((resolve, reject) => {
              resolve(sharp(response.data)
                //.grayscale()
                .resize(albumWidth, albumWidth)
                .composite([{
                  input: rect,
                  blend: 'dest-in'
                }])
                .toFile(`trackCover.png`));
                console.log(`Downloading track album image..`);
            })
        ).then(() => {
          drawBanner();
        })
      } else {
        axios({
          url: trackCover,
          responseType: 'arraybuffer',
        }).then(
          (response) =>
            new Promise((resolve, reject) => {
              resolve(sharp(response.data)
                //.grayscale()
                .resize(albumWidth, albumWidth)
                .composite([{
                  input: rect,
                  blend: 'dest-in'
                }])
                .toFile(`trackCover.png`));
                console.log(`Downloading track album image..`);
            })
        ).then(() => {
          drawBanner();
        })
      }
    })
    .catch (error => console.log('LastFM error:', error.response.data))
}

// Function to crop album cover
const albumWidth = 130, // album img size
  rAlbum = 8, // for border radius
  rect = Buffer.from(`<svg><rect x="0" y="0" width="${albumWidth}" height="${albumWidth}" rx="${rAlbum}" ry="${rAlbum}"/></svg>`);

// Current dateTime function
const timezone = 7; // add 7 based on GMT+7 location

function currentTime() {
  var today = new Date();
  today.setUTCHours(today.getHours() + timezone);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Caturday"];

  let day = days[today.getDay()];
  let date = today.getDate();
  let month = months[today.getMonth()];
  let year = today.getFullYear();
  let fullDate = today.getDate() + " " + month + " " + today.getFullYear();

  let hours = ("0" + today.getHours()).slice(-2);
  let minutes = ("0" + today.getMinutes()).slice(-2);
  let seconds = ("0" + today.getSeconds()).slice(-2);
  let fullTime = hours + ':' + minutes;

  return [day, date, month, year, fullDate, fullTime, seconds];
}

// Hello there greeting function
async function greeting() {
  let greetingText = "";

  var today = new Date();
  today.setUTCHours(today.getHours() + timezone);
  const h = today.getHours();
  const greetingTypes = ["Selamat pagi si paling morning person...", "GM to everyone except those who never say it back!", "Hi, my day is fine just afternoon here!", "Wish y'all a relaxing evening and later a good night~", "Y'all have a good night rest..", "Nighty night, why are you still up?", "Lingsir wengi, wayahe demit do tangi~", "Wes jam telu, wayahe demit do turu~"];

  if (h >= 3 && h < 4) { greetingText = greetingTypes[7]; } // Wes jam telu
  else if (h >= 4 && h < 6) { greetingText = greetingTypes[1]; } // si paling morning person
  else if (h >= 6 && h < 10) { greetingText = greetingTypes[1]; } // G' Morning!
  else if (h >= 10 && h < 15) { greetingText = greetingTypes[2]; } // Fine afternoon..
  else if (h >= 15 && h < 19) { greetingText = greetingTypes[3]; } // Nice Evening.
  else if (h >= 19 && h < 22) { greetingText = greetingTypes[4]; } // Prime time
  else if (h >= 22 && h < 24) { greetingText = greetingTypes[5]; } // Nighty Night!
  else greetingText = greetingTypes[6]; // Lingsir wengi~

  return greetingText;
}

// Function to trim long text
let trimString = function(string, length) {
  return string.length > length ?
    string.substring(0, length) + '...' :
    string;
};

async function drawBanner() {
  const [day, date, month, year, fullDate, fullTime, seconds] = currentTime();
  const images = ['default.png', 'overlay.png', '0.png', '1.png', '2.png', 'trackCover.png'];
  const promiseArray = [];
  
  const dayFont = await Jimp.loadFont('fonts/Avigea/avigea-white-72.fnt');
  const timeFont = await Jimp.loadFont("fonts/Caviar/CaviarBold-white-32.fnt");
  const monthFont = await Jimp.loadFont("fonts/CaviarDreams_white-32.ttf.fnt");
  const nowPlayingFont = await Jimp.loadFont("fonts/Caviar/CaviarBold-white-18.fnt");
  const trackTitleFont = await Jimp.loadFont("fonts/Gotham/gothamMedium-white-12.fnt");
  const trackArtistFont = await Jimp.loadFont("fonts/Gotham/gothamBook-black-12.fnt");
  // const listeningFont = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
  
  images.forEach((image) => promiseArray.push(Jimp.read(image)));
  promiseArray.push(greeting());
  promiseArray.push(nowPlaying());
  promiseArray.push(getRecentTitle());
  promiseArray.push(getRecentArtist());

  Promise.all(promiseArray).then(
    ([banner, overlay, ava0, ava1, ava2, trackCover, greeting, nowPlaying, trackTitle, trackArtist]) => {
      banner.composite(overlay, 0, 0);
      banner.composite(ava0, 1032, 157);
      banner.composite(ava1, 1154, 157);
      banner.composite(ava2, 1274, 157);
      banner.composite(trackCover, 219, 145);
      console.log(`Recent followers added!`);
      banner.print(dayFont, 0, 58, {
        text: day, // Wednesday
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM
      }, 1500, 198);
      banner.print(monthFont, -0, -70, {
        text: date + ' ' + month + ' ' + year, // 17 Januari 1996
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM
      }, 1500, 344);
      banner.print(timeFont, 0, 37, {
        text: fullTime,  // 14:12
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM
      }, 1500, 295);
      console.log(`Local time updated!`);
      banner.print(nowPlayingFont, 365, 80, {
        text: nowPlaying, // Recently Played
        alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT,
        alignmentY: Jimp.VERTICAL_ALIGN_TOP
      }, 1385, 416);
      banner.print(trackTitleFont, -429, 65, {
        text: trackTitle, // Grey Sky Morning
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
      }, 1424, 459);
      banner.print(trackArtistFont, -429, 73, {
        text: trackArtist, // Vertical Horizon
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
      }, 1424, 479);
      banner.print(monthFont, 0, 170, {
        text: greeting, // Fine afternoon
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM
      }, 1500, 282);
      console.log(greeting);
      banner.write('1500x500.png', function() {
        uploadBanner();
      });
      console.log("Update profile finished...")
      console.log(`Update on ${day} ${fullDate} at ${fullTime}:${seconds} (UTC+${timezone})`);
      console.log("---------------")
      console.log(" ")
    }
  );
}

// Update profile
async function updateProfile(names, desc) {
  try {
    // get current profile information
    const { data } = await agent.getProfile({ actor: process.env.BSKY_IDENTIFIER });
    //const base64 = new Blob([ fs.readFileSync('1500x500.png')]);
    //const uploadBanner = await agent.uploadBlob(
    //  new Uint8Array(await base64.arrayBuffer()),
    //  {encoding: "image/png"},
    //);
    //console.log("Update profile begin...")

    const record = {
      // Main of this article You can put `\n` here > I □ \nUnicode
      displayName: names,
   
      // Profile description (to keep current settings)
      description: desc,
   
      // Specify the icon image (to keep the current settings)
      avatar: {
        // $type and mimeType are type information
        $type: "blob",
        mimeType: "image/jpeg",
        // ref.$link is the image URL
        // data.avatar contains CDN URL, so extract only ref
        ref: { $link: (data.avatar || "").replace(/^.*\/plain\/did.*\/|@jpeg$/g, "") },
        // size is a number type argument Required but zero is fine if passed
        size: 0
      },
   
      // Specify the header background image (to keep the current settings)
      // type is the same as icon
      banner: {
       $type: "blob",
       ref: { $link: (data.banner || "").replace(/^.*\/plain\/did.*\/|@jpeg$/g, "") },
       //ref: { $link: (uploadBanner.data.blob.ref.toString()) },
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
    console.log("Update profile finished...")
  } catch (e) {
    console.error('Error updating profile:', e.message);
  }
}

async function uploadBanner() {
  try {
    // get current profile information
    const { data } = await agent.getProfile({ actor: process.env.BSKY_IDENTIFIER });
    const base64 = new Blob([ fs.readFileSync('1500x500.png')]);
    const uploadBanner = await agent.uploadBlob(
      new Uint8Array(await base64.arrayBuffer()),
      {encoding: "image/png"},
    );
    //console.log("Update profile begin...")

    const record = {
      // Main of this article You can put `\n` here > I □ \nUnicode
      displayName: data.displayName,
   
      // Profile description (to keep current settings)
      description: data.description,
   
      // Specify the icon image (to keep the current settings)
      avatar: {
        // $type and mimeType are type information
        $type: "blob",
        mimeType: "image/jpeg",
        // ref.$link is the image URL
        // data.avatar contains CDN URL, so extract only ref
        ref: { $link: (data.avatar || "").replace(/^.*\/plain\/did.*\/|@jpeg$/g, "") },
        // size is a number type argument Required but zero is fine if passed
        size: 0
      },
   
      // Specify the header background image (to keep the current settings)
      // type is the same as icon
      banner: {
       $type: "blob",
       // ref: { $link: (uploadBanner.data.blob.ref.toString()) },
       //ref: { $link: (data.banner || "").replace(/^.*\/plain\/did.*\/|@jpeg$/g, "") },
       ref: { $link: (uploadBanner.data.blob.ref.toString()) },
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
    console.log("Upload banner finished...")
  } catch (e) {
    console.error('Error uploading banner:', e.message);
  }
}

// Starter
getLatestFollowers();
keepAlive();

// Set loop interval every millisec
setInterval(() => {
  getLatestFollowers();
}, 60000);