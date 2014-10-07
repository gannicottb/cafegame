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
    'AIzaSyB7avM8P_ouc4lDhbfVXimbujLuh237pps',
    'AIzaSyCpElm3KrFqHAGWtgEukyl6pXWlUOyzQ-Q'
  ],
  currentIndex: 0
}

var round_number;
var keyword = "";

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

    // Cache the result
    var search_term = response.queries.request[0].searchTerms;
    localStorage.setItem(search_term, item.link);
    console.log("caching", search_term );

    img.src = item.link + '?' + new Date().getTime(); // cache bust
  }
  return false;
}

function loadGoogleImage() {
  console.log("loading " + keyword);

  // Check to see if the image url is already cached
  var cached_image_url = localStorage.getItem(keyword);
  if(cached_image_url){
    console.log("cache hit!");
    img.src = cached_image_url + '?' + new Date().getTime(); // cache bust
  } 
  else { // The keyword doesn't have a cached URL
    console.log("cache miss!");
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
}

function main(session){

  // Pixelate
    var canvas = document.getElementById("demo_body_img");
    var ctx = canvas.getContext('2d');

    /// turn off image smoothing - this will give the pixelated effect
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;

    /// wait until image is actually available
    img.onload = guessStart; //so load the image to start everything
    img.onerror = imgError;

    var intervalId;

    function guessStart() {
      $("#person_name").html("NAME THAT PERSON!");
      console.log("Guess start");
      
      var changeLeft = 4;

      var nextPixelate = function() {
        if (changeLeft === 0) {
          showAnswer();
        } else {
          pixelate(2 * (6 - changeLeft));
          changeLeft -= 1;
        }
      };

      nextPixelate();

      intervalId = setInterval(nextPixelate, 5000)

      function showAnswer() {
        clearInterval(intervalId);
        intervalId = undefined;
        pixelate(100); // show origin image
        console.log("Round Over! Show Answer: XXXX");
      
        $("#person_name").html("ANSWER: " + keyword);
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
        img.src = image_result.result.items[image_result.index].link + '?' + new Date().getTime();
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

    var onRoundStart = function(args, kwargs, details){
      // Update what round we're on
      round_number = kwargs.number;      
      // Get the keyword for this round
      keyword = kwargs.correct_answer.keyword;      
      
      // TODO: Use this to determine how many intervals to display
      var round_end = kwargs.end;

      // Load the image to start the round
      loadGoogleImage();
    }

    var onRoundEnd = function(args, kwargs, details){
      //Assuming that the message isn't outdated
      if(kwargs.number != round_number) return;
      //Skip to the end of the animation
      showAnswer();
      
    }

    var onStateChange = function(args, kwargs, details){
      round_number = kwargs.number;
      switch(kwargs.state){
        case states.WAIT:
          break;
        case states.PREPARE:
          break;
        case states.PROGRESS
          break;
      }
    }
    //
    // SUBSCRIPTIONS
    //

    session.subscribe("com.google.guesswho.roundStart", onRoundStart).then(
      function(success){
         console.log("subscribed to ", success.topic);
      }, session.log
    );  
    session.subscribe("com.google.guesswho.roundEnd", onRoundEnd).then(
      function(success){
         console.log("subscribed to ", success.topic);
      }, session.log
    );
    session.subscribe("com.google.guesswho.stateChange", onStateChange).then(
      function(success){
         console.log("subscribed to ", success.topic);
      }, session.log
    ); 
}

// now actually open the connection
//
connection.open();