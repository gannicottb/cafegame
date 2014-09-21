var wsuri = null;

var trendingGuesses = []; //Array to collect trending guesses


// include AutobahnJS
try {
  var autobahn = require('autobahn');

  wsuri = "ws://127.0.0.1:8080/ws"; // assume that this is running locally
} catch (e) {
  // when running in browser, AutobahnJS will
  // be included without a module system

  // router url either localhost or assumed to be
  // at IP of server of backend HTML
  if (document.location.origin == "file://") {
    wsuri = "ws://127.0.0.1:8080/ws";

  } else {
    wsuri = (document.location.protocol === "http:" ? "ws:" : "wss:") + "//" +
      document.location.host + "/ws";
  }
}

var connection = new autobahn.Connection({
  url: wsuri,
  realm: 'realm1'
});

// 100 calls / day
var googleAppKey = {
  items: [
    'AIzaSyBZfKB3rDMm7GRdLwa5HpCrn7erJFJcjnE',
    'AIzaSyCzJGVD7YPPONquk_QIPtkwKvU4s32Ikfw',
    'AIzaSyBwT7_aSaryzJx_FYdFwsmbVYiIDVbf0EY',
    'AIzaSyAS3GJlkNH8r2tpAIKnqYh_tui3g1fKZB4',
    'AIzaSyBqrlYZVP5Rx8o6hXotfmHFPVbYoSdfi3E',
    'AIzaSyB7avM8P_ouc4lDhbfVXimbujLuh237pps'
  ],
  currentIndex: 0
}

guesslist = [];

var img = new Image();
var image_result = {
  result: [],
  index: 0
};

function hndlr(response) {
  if (response.items === undefined) {
    console.log("error occured: " + response.items);
    // error handling
    if (response.error != undefined) {
      if (response.error.code === 403) { //limit exceeds 
        console.log("exceeds limit");
        googleAppKey.currentIndex += 1;
        if (googleAppKey.currentIndex >= googleAppKey.items.length) {
          alert("FATAL: Limit ALL exceeds!");
          console.log("FATAL: Limit ALL exceeds!");
        } else {
          console.log("Retry next key " + googleAppKey.currentIndex + "...");
          return true;
        }
      } else {
        alert("FATAL: Error " + response.error.code + ": " + response.error.message);
        console.log("FATAL: Error " + response.error.code + ": " + response.error.message);
      }
    }
  }
  if (response.items.length >= 1) {
    console.log("Valid response");
    image_result.result = response;
    image_result.index = 0;
    var item = response.items[0];
    img.src = item.link;
  }
  return false;
}

function loadGoogleImage() {
  // console.log("load google image");
  // var keyword = guesslist[Math.floor(Math.random() * guesslist.length)];
  // console.log("loading " + keyword);
  // var idx = googleAppKey.currentIndex;
  // var appkey = googleAppKey.items[idx];
  // console.log("Using app key: " + idx);
  // $.ajax({
  //   url: 'https://www.googleapis.com/customsearch/v1?key=' + appkey + '&cx=009496675471206614083:yhwvgwxk0ws&q=' + keyword + '&callback=hndlr&searchType=image&imgSize=medium',
  //   context: document.body,
  //   success: function(responseText) {
  //     var retry = eval(responseText);
  //     if (retry) loadGoogleImage(); // retry
  //   }
  // });
}

var uidCounter = 0;
var uids = [];

function main(session) {

  // Register new devices
  //
  var register = function(args, kwargs, details) {
    uids[uidCounter] = {
      uname: "guest" + uidCounter,
      loggedin: false,
      score: 0
    };
    return uidCounter++;
  }

  // User login
  //
  var login = function(args, kwargs, details) {
    var user = uids[args[0]];
    var result;
    if (user == undefined || user == null) {
      // handle error case
      result = -1;
      console.log("uid "+args[0]+ " not found.");
    } else {
      // Log them in
      user.loggedin = true;
      // Fetch score
      result = user.score;
      console.log("uid "+args[0]+" found and logged in.");
    }
    return result;
  }

  // Handle guess submission
  //
  var submitGuess = function(args, kwargs, details) {
    var guess = args[0];
    var user = uids[args[1]];
    if(user == undefined || user == null){
      //do something reasonable
    }else{
      console.log("received guess: " + guess + " from " + user.uname);
      session.publish("com.google.guesswho.onguess", [{
        user: user,
        guess: guess
      }]);      
    }
  }

  // Handle guess submission
  //
  var submitGuess = function(args, kwargs, details) {
    var guess = args[0];
    var user = uids[args[1]];
    if(user == undefined || user == null || user.loggedin == false){
      //the user isn't registered or logged in
      //throw an error of some kind
      return;
    }

    var guessAlreadyPresent = false; //Boolean flag to check if guess already exists in the list

    //If a guess already exists in the list, update its count 
    if (trendingGuesses.length > 0) {

      for (var i = 0; i < trendingGuesses.length; i++) {

        if (trendingGuesses[i].name === guess) {
          guessAlreadyPresent = true;
          trendingGuesses[i].count++; //Increments the value of count            
          console.log("Guess was found in the list. Updated count for " + guess + " to " + trendingGuesses[i].count);
          break;
        }
      }
    }

    //New guesses are pushed into the list with count = 1
    if (guessAlreadyPresent !== true) {
      trendingGuesses.push({
        name: guess,
        count: 1
      });
      console.log("Guess not found. Adding new row. Name = " + guess + ", Count = " + 1);
    }

    //Sort the trending guesses in descending order of count of each guess
    trendingGuesses.sort(function(a, b) {
      return b.count - a.count;
    });

    for (var i = 0; i < trendingGuesses.length; i++) {
      console.log(trendingGuesses[i]);
    }

    session.publish("com.google.guesswho.onguess", [{
      user: user.uname,
      guess: guess
    }]);
  }

  // REGISTER RPC
  //
  session.register('com.google.guesswho.submit', submitGuess);
  session.register('com.google.guesswho.register', register);
  session.register('com.google.guesswho.login', login);


  // Pixelate
  var canvas = document.getElementById("demo_body_img");
  var ctx = canvas.getContext('2d');

  /// turn off image smoothing - this will give the pixelated effect
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;

  /// wait until image is actually available
  img.onload = guessStart;
  img.onerror = imgError;

  /// some image, we are not struck with CORS restrictions as we
  /// do not use pixel buffer to pixelate, so any image will do
  // img.src = 'http://i.imgur.com/w1yg6qo.jpg';


  $.get('http://localhost:8080/guesslist.txt', function(myContentFile) {
    var lines = myContentFile.split("\n");

    for (var i in lines) {
      //save in object "guesslist": 
      guesslist[i] = lines[i]

      //print in console
      console.log("line " + i + " :" + lines[i]);
    }
    console.log("my objects" + guesslist.length);
    loadGoogleImage();
  }, 'text');


  var intervalId;

  function guessStart() {
    var changeLeft = 4;
    intervalId = setInterval(function() {
      if (changeLeft === 0) {
        showAnswer();
      } else {
        pixelate(2 * (6 - changeLeft));
        changeLeft -= 1;
      }
    }, 1500)

    function showAnswer() {
      clearInterval(intervalId);
      intervalId = undefined;
      pixelate(100); // show origin image
      console.log("Round Over! Show Answer: XXXX");
      setTimeout(loadGoogleImage, 3000);
    }
  }

  function imgError(event) {
    console.log("img error");
    if (intervalId != undefined) {
      console.log("interval id " + intervalId);
      clearInterval(intervalId);
    }

    if (image_result.index < image_result.result.items.length - 1) {
      image_result.index += 1;
      img.src = image_result.result.items[image_result.index].link;
    }
  }

  function pixelate(v) {
    console.log("pixelating " + v);
    var size = v * 0.01,

      /// cache scaled width and height
      w = canvas.width * size,
      h = canvas.height * size;

    /// draw original image to the scaled size
    ctx.drawImage(img, 0, 0, w, h);

    /// then draw that scaled image thumb back to fill canvas
    /// As smoothing is off the result will be pixelated
    ctx.drawImage(canvas, 0, 0, w, h, 0, 0, canvas.width, canvas.height);
  }
}



connection.onopen = function(session) {

  console.log("connected");

  main(session);

};

connection.open();