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
connection.onopen = function (session, details) {

   main(session);


};

function main (session) {

   // Wire up the guess button
   var guessInput = document.getElementById("inputGuess");
   var guessButton = document.getElementById("submitGuess");
   //Declare an event handlers
   guessButton.onclick = function(event){
      session.call("com.google.guesswho.submit", 
         [guessInput.value, "brandon"]).then(session.log, session.log);
   }

   // Subscribe to trending guesses
   // Backend Q: do we push out a full list, or just updates and have the client manage the guesses in memory?
   //    It'll be faster to send less data
   session.subscribe("com.google.guesswho.onguess",
      function(args){
         var event = args[0];
         console.log(event);
         $(document)
         document.getElementById("guessList").getElementsByTagName("span").value = event.user+"from"+event.guess;
      });

   // // subscribe to future vote event
   // session.subscribe("io.crossbar.demo.vote.onvote",
   //    function(args) {
   //       var event = args[0];
   //       document.getElementById("votes" + event.subject).value =
   //          event.votes;
   //    });

   // // get the current vote count
   // session.call("io.crossbar.demo.vote.get").then(
   //    function(res){
   //       for(var i = 0; i < res.length; i++) {
   //          document.getElementById("votes" + res[i].subject).value =
   //             res[i].votes;
   //       }
   // }, session.log);

   // // wire up vote buttons
   // var voteButtons = document.getElementById("voteContainer").
   //                            getElementsByTagName("button");
   // for (var i = 0; i < voteButtons.length; i++) {
   //    voteButtons[i].onclick = function(evt) {
   //       session.call("io.crossbar.demo.vote.vote",
   //          [evt.target.id]).then(session.log, session.log);
   //    };
   // }

   // // subscribe to vote reset event
   // session.subscribe("io.crossbar.demo.vote.onreset", function() {
   //       var voteCounters = document.getElementById("voteContainer").
   //                                   getElementsByTagName("input");
   //       for(var i = 0; i < voteCounters.length; i++) {
   //          voteCounters[i].value = 0;
   //       }
   //    });

   // // wire up reset button
   // document.getElementById("resetVotes").onclick = function() {
   //    session.call("io.crossbar.demo.vote.reset").
   //       then(session.log, session.log);
   // };
}


// fired when connection was lost (or could not be established)
//
connection.onclose = function (reason, details) {

   console.log("Connection lost: " + reason);

}


// now actually open the connection
//
connection.open();

