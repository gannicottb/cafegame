var LargeLeft = (function() {

  //Private Variables
  //
  var canvas, ctx;
  var session, googleAppKey, round_number, keyword, timer_interval, animation_interval;
  var round;
  var states, image_result;

  //Private Functions
  //
  var init = function(){
    session = null;

    googleAppKey = {
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
    };

    states = {
      WAIT: 0,
      PREPARE: 1,
      PROGRESS: 2
    };

    round_number = -1;
    keyword = "";

    round = null;

    timer_interval = null;

    img = new Image();

    image_result = {
      result: [],
      index: 0
    };
  };

  // Handle results of Image Search
  //
  function hndlr (response) {
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
  };

  // Launch a google image search with the current keyword
  //
  function loadGoogleImage() {
    var keyword = round.correct_answer.keyword;

    console.log("loading " + keyword);

    // Check to see if the image url is already cached
    var cached_image_url = localStorage.getItem(keyword);
    if(cached_image_url){
      console.log("cache hit!");
      img.src = cached_image_url + '?' + new Date().getTime(); // cache bust
    } else { // The keyword doesn't have a cached URL
      console.log("cache miss!");
      var idx = googleAppKey.currentIndex;
      var appkey = googleAppKey.items[idx];
      console.log("Using app key: " + idx);

      $.ajax({
        url: 'https://www.googleapis.com/customsearch/v1?key=' + appkey + '&cx=009496675471206614083:yhwvgwxk0ws&q=' + round.correct_answer.keyword + '&callback=hndlr&searchType=image&imgSize=medium',
        context: document.body,
        statusCode:{
          200: function(ok){
            var retry = eval(ok.responseText);
            if (retry) loadGoogleImage(); // retry
          },
          400: function(err){
            console.log("AJAX call to Google API errored out,", err)
          }
        },
      });      
    }
  };

  // Round start handling, more or less
  //
  function guessStart() {
    $("#person_name").html("NAME THAT PERSON!");
    console.log("Guess start");

    // TODO: Use round.end to determine how many intervals to display

    duration = round.end - new Date().getTime(); // how long are we pixelating?
    console.log("duration", duration);

    var level = 0.01; // initial pixelation level
    var interval = 50; // change pixelation level every interval
    var max_pixelate = 0.3; // maximum pixelation level

    var change = (max_pixelate-level) / (duration/interval) // how much do we change at each interval?
    console.log("change", change);

    var nextPixelate = function(){
      if (level >=  1){
        showAnswer();
      } else {
        pixelate(level);
        if (level <= max_pixelate/2)//change slowly in first half
          level += (change/2)        
        else
          level += change //change more quickly in last half
      }
    }

    nextPixelate();
    animation_interval = setInterval(nextPixelate, interval);
    
    // var changeLeft = 4;

    // var nextPixelate = function() {
    //   if (changeLeft === 0) {
    //     showAnswer();
    //   } else {
    //     pixelate(2 * (6 - changeLeft));
    //     changeLeft -= 1;
    //   }
    // };

    // nextPixelate();

    // animation_interval = setInterval(nextPixelate, 5000)

  };

  // End the animation and display the answer and clear image
  //
  function showAnswer() {
    clearInterval(animation_interval);
    animation_interval = undefined;
    pixelate(1); // show origin image
    console.log("Round Over! Show Answer: XXXX");
  
    $("#person_name").html("ANSWER: " + round.correct_answer.keyword);
  };

  //Image error handling
  //
  function imgError(event) {
    console.log("img error");
    if (animation_interval != undefined) {
      console.log("interval id " + animation_interval);
      clearInterval(animation_interval);
    }

    if (image_result.index < image_result.result.items.length - 1) {
      image_result.index += 1;
      img.src = image_result.result.items[image_result.index].link + '?' + new Date().getTime();
    }
  };

  //Pixelation method
  //
  function pixelate(size) {
    console.log("pixelating " + size);
    //var size = v * 0.01,

    // cache scaled width and height
    w = canvas.width * size,
    h = canvas.height * size;

    // draw original image to the scaled size
    ctx.drawImage(img, 0, 0, w, h);

    // then draw that scaled image thumb back to fill canvas
    // As smoothing is off the result will be pixelated
    ctx.drawImage(canvas, 0, 0, w, h, 0, 0, canvas.width, canvas.height);
  };

  // Round Start handling
  //
  var onRoundStart = function(args, kwargs, details){
    // Update our round info
    round = kwargs;      
    $('#round_number').html("Round " + round.number);    

    // Clear out the status line
    $("#status").html("");

    //Set round timer
    timer_interval = GuessWho.setTimer($(".timer"), round.end);

    // Load the image to start the round
    loadGoogleImage();
  };

  //Round End
  //
  var onRoundEnd = function(args, kwargs, details){
    round = kwargs;

    switch(kwargs.state){
      case GuessWho.states.WAIT:
        $("#status").html("Waiting for "+round.players_needed+" players to start next round");
        break;
      case GuessWho.states.PREPARE:
        $("#status").html("Next round beginning in 5 seconds");
        break; 
    }

    // Clear the timer
    // clearInterval(timer_interval);
    // var timer = new EJS({url: 'templates/timer.ejs'}).render({time_left: 0});
    // $('.timer').html(timer);
    GuessWho.clearTimer($('.timer'), timer_interval);

    //Skip to the end of the animation
    showAnswer();
  }

  //stateChange??
  //
  var onStateChange = function(args, kwargs, details){
    
    switch(kwargs.state){
      case GuessWho.states.WAIT:
        $("#status").html("Waiting for "+kwargs.players_needed+" players to start next round");
        break;
      case GuessWho.states.PREPARE:
        $("#status").append("Next round beginning in 5 seconds");
        break;       
    }
  };

  //entry point
  //
  var main = function(a_session){

    session = a_session;

    // Pixelate
    canvas = document.getElementById("demo_body_img");
    ctx = canvas.getContext('2d');

    /// turn off image smoothing - this will give the pixelated effect
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;

    /// wait until image is actually available
    img.onload = guessStart; //so load the image to start everything
    img.onerror = imgError;

    

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
  };

  return {

    connect: function(){

      init();

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
        console.log("LargeLeft connected");
        main(session);
      };

      //Open connection to crossbar
      //
      connection.open();

    }
  }

})();