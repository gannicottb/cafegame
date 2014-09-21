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

var uid;

function main(session) {
   //Check to see if the device already has a user id
   uid = sessionStorage.getItem("uid");
   if (uid == null) {
      //The device does not have a user id, so let's get one
      session.call("com.google.guesswho.register").then(
         function(result) {
            //Backend returned us our uid
            uid = result;
            //Store uid in sessionStorage
            sessionStorage.setItem("uid", uid);
         },
         function(error){            
            session.log
            
         }
      );
   }
   //Ok, the device has its uid now, so let's login to the server
   session.call("com.google.guesswho.login", [Number(uid)]).then(
      function(result){
         session.log();
         console.log("user is logged in with uid "+uid+", and their score is "+result);

   }, session.log);


   // Wire up the guess button
   var guessInput = document.getElementById("inputGuess");
   var guessButton = document.getElementById("submitGuess");
   //Declare an event handlers
   guessButton.onclick = function(event) {
      session.call("com.google.guesswho.submit", [guessInput.value, Number(uid)]).then(session.log, session.log);
   }

   // Subscribe to trending guesses
   // 
   session.subscribe("com.google.guesswho.onguess",
      function(args) {
         var event = args[0];
         console.log(event);      
         $('#guessList').append("<p>"+event.guess+" from " + event.user);   
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