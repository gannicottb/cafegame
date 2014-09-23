// the URL of the WAMP Router (Crossbar.io)
//
var wsuri;
if (document.location.origin == "file://") {
   wsuri = "ws://127.0.0.1:8080/ws";

} else {
   wsuri = (document.location.protocol === "http:" ? "ws:" : "wss:") + "//" +
      document.location.host + "/ws";
}


// the WAMP connection to the Router
//
var connection = new autobahn.Connection({
   url: wsuri,
   realm: "realm1"
});


// fired when connection is established and session attached
//
connection.onopen = function(session, details) {
   main(session);
};

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
  console.log("load google image");
  var keyword = guesslist[Math.floor(Math.random() * guesslist.length)];
  console.log("loading " + keyword);
  var idx = googleAppKey.currentIndex;
  var appkey = googleAppKey.items[idx];
  console.log("Using app key: " + idx);
  $.ajax({
    url: 'https://www.googleapis.com/customsearch/v1?key=' + appkey + '&cx=009496675471206614083:yhwvgwxk0ws&q=' + keyword + '&callback=hndlr&searchType=image&imgSize=medium',
    context: document.body,
    success: function(responseText) {
      var retry = eval(responseText);
      if (retry) loadGoogleImage(); // retry
    }
  });
}

function main(session){

   // Subscribe to trending guesses
   // 
   session.subscribe("com.google.guesswho.onguess",
      function(args) {
         var event = args[0];
         console.log(event);      
         $('#guessList').append("<p>"+event.guess+" from " + event.user);   
         //document.getElementById("guessList").getElementsByTagName("span").value = event.user + "from" + event.guess;
      });


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

// now actually open the connection
//
connection.open();