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

var uid = null;

function main(session) {

   //Check to see if the device already has a user id
   //Note: needs to be localStorage for mobile testing
   uid = sessionStorage.getItem("uid");
   //Log in to the server (and get auto-registered if no uid is present)
   session.call("com.google.guesswho.login", [uid]).then(
      function(user) {
         // Store the uid returned from the server  
         uid = user.uid;
         sessionStorage.setItem("uid", uid);
         // Display the username
         $("#user_name").html(user.uname);
         console.log("user is logged in with uid " + uid + ", and their score is " + user.score);

      },
      session.log
   );

   // Wire up the guess button
   var guessInput = $("#inputGuess");
   var guessButton = $("#submitGuess");
   //Declare an event handlers
   guessButton.on('click', function(event) {
      session.call("com.google.guesswho.submit", [guessInput.val(), Number(uid)]).then(
         session.log, session.log
      );
   });

   // Subscribe to trending guesses
   // 
   session.subscribe("com.google.guesswho.onguess",
      function(args) {
         var event = args[0];
         console.log(event);
         //$('#guessList').append("<p>" + event.guess + " from " + event.user);
         //document.getElementById("guessList").getElementsByTagName("span").value = event.user + "from" + event.guess;
      });
}

// fired when connection was lost (or could not be established)
//
connection.onclose = function(reason, details) {

   console.log("Connection lost: " + reason);

}


// now actually open the connection
//
connection.open();