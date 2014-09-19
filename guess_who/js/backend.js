var wsuri = null;

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
    'AIzaSyAS3GJlkNH8r2tpAIKnqYh_tui3g1fKZB4'
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
  if (response.items == undefined) {
    console.log("error occured");
    // error handling
    if (response.error != undefined) {
      console.log("exceeds limit");
      googleAppKey.currentIndex += 1;
      loadGoogleImage(); // retry
    }
    return;
  }
  if (response.items.length >= 1) {
    console.log("Valid response");
    image_result.result = response;
    image_result.index = 0;
    var item = response.items[0];
    img.src = item.link;
  }
}

function loadGoogleImage() {
  console.log("load google image");
  var keyword = guesslist[Math.floor(Math.random() * guesslist.length)];
  console.log("loading " + keyword);
  var idx = googleAppKey.currentIndex % googleAppKey.items.length;
  var appkey = googleAppKey.items[idx];
  console.log("Using app key: " + idx);
  $.ajax({
    url: 'https://www.googleapis.com/customsearch/v1?key=' + appkey + '&cx=009496675471206614083:yhwvgwxk0ws&q=' + keyword + '&callback=hndlr&searchType=image&imgSize=medium',
    context: document.body,
    success: function(responseText) {
      eval(responseText);
    }
  });
}

function main(session) {

  // Ok, so what are we actually doing here?
  // Version 1: Users are submitting arbitrary text guesses
  // Version 2: Users are choosing from a list of choices

  // Handle guess submission
  //
  var submitGuess = function(args, kwargs, details) {
    var guess = args[0];
    var user = args[1];
    console.log("received guess: " + guess + " from " + user);
    session.publish("com.google.guesswho.onguess", [{
      user: user,
      guess: guess
    }]);
  }



  session.register('com.google.guesswho.submit', submitGuess);

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