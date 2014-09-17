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
   realm: 'realm1'}
);

// var votes = {
//    Banana: 0,
//    Chocolate: 0,
//    Lemon: 0,
//    Crossbar: 0
// };

function main (session) {

   // Ok, so what are we actually doing here?
   // Version 1: Users are submitting arbitrary text guesses
   // Version 2: Users are choosing from a list of choices

   // So the backend would keep track of all of the guesses, yeah? And probably the user that submitted them? Hmm

   // Handle guess submission
   //
   var submitGuess = function(args, kwargs, details){
      var guess = args[0];
      var user = args[1];
      console.log("received guess: "+guess+" from "+user);
      session.publish("com.google.guesswho.onguess", [{user: user, guess: guess}]);
   }



   session.register('com.google.guesswho.submit', submitGuess);

   // // return set of present votes on request
   // var getVote = function() {
   //    var votesArr = [];
   //    for (var flavor in votes) {
   //       if (votes.hasOwnProperty(flavor)) {
   //          votesArr.push({
   //             subject: flavor,
   //             votes: votes[flavor]
   //          })
   //       }
   //    }
   //    console.log("received request for current vote count");
   //    return votesArr;
   // };

   // handle vote submission
   // var submitVote = function(args, kwargs, details) {
   //    var flavor = args[0];
   //    votes[flavor] += 1;

   //    var res = {
   //       subject: flavor,
   //       votes: votes[flavor]
   //    };

   //    // publish the vote event
   //    session.publish("io.crossbar.demo.vote.onvote", [res]);

   //    console.log("received vote for " + flavor);

   //    return "voted for " + flavor;
   // };

   // // reset vote count
   // var resetVotes = function() {
   //    for (var fl in votes) {
   //       if (votes.hasOwnProperty(fl)) {
   //          votes[fl] = 0;
   //       }
   //    }
   //    // publish the reset event
   //    session.publish("io.crossbar.demo.vote.onreset");

   //    console.log("received vote reset");

   //    return "votes reset";
   // };


   // // register the procedures
   // session.register('io.crossbar.demo.vote.get', getVote);
   // session.register('io.crossbar.demo.vote.vote', submitVote);
   // session.register('io.crossbar.demo.vote.reset', resetVotes);

   // Game loop
   //

   // var mainImage = $('.mainImage');
   // mainImage.on('webkitAnimationEnd', function(event){
   //    var el = $(this);
   //    //Get the next image (obviously swap this for a non-local approach)
   //    testImages.index = (testImages.index + 1) % testImages.list.length;
      
   //    //Restart the animation
   //    el.removeClass('animate');      
   //    setTimeout(function() {
   //        el.addClass('animate');
   //    },1);
   //    //Swap in the next image
   //    el.attr('src',testImages.list[testImages.index]);
   // })

}

function hndlr(response) {
   if (response.items.length > 1) {
      var item = response.items[0];
      // in production code, item.htmlTitle should have the HTML entities escaped.
      document.getElementById("demo_body_img").src = item.link;
   }
}

connection.onopen = function (session) {

   console.log("connected");

   main(session);

};

myObject = []; //myObject[numberline] = "textEachLine";
$.get('http://localhost:8080/guesslist.txt', function(myContentFile) {
   var lines = myContentFile.split("\n");

   for(var i  in lines){
      //save in object "myObject": 
      myObject[i] = lines[i]

      //print in console
      console.log("line " + i + " :" + lines[i]);
   }
   console.log("my objects" + myObject.length);

   setInterval(loadGoogleImage,10000);

   function loadGoogleImage() {
      var keyword = myObject[Math.floor(Math.random()*myObject.length)];
      document.getElementById('loadarea').src = 'https://www.googleapis.com/customsearch/v1?key=AIzaSyBZfKB3rDMm7GRdLwa5HpCrn7erJFJcjnE&cx=009496675471206614083:yhwvgwxk0ws&q=' + keyword + '&callback=hndlr&searchType=image';
   }

}, 'text');


connection.open();
