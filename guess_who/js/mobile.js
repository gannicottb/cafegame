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
var name = "";

function set_name(name){
   var name_tag = new EJS({url: 'templates/user_name.ejs'}).render({name: name});
   $(".name_container").html(name_tag);
}

function main(session) {

   //EXAMPLE EJS
   //var html = new EJS({url: 'templates/temp.ejs'}).render(data);
   //EXAMPLE EJS

   //Check to see if the device already has a user id
   //Note: needs to be localStorage for mobile testing
   uid = sessionStorage.getItem("uid");
   //Log in to the server (and get auto-registered if no uid is present)
   session.call("com.google.guesswho.login", [uid]).then(
      function(user) {
         // Store the uid returned from the server  
         uid = user.uid;
         name = user.name;
         sessionStorage.setItem("uid", uid);
         // Display the username
         set_name(name);
         // var html = new EJS({url: 'templates/user_name.ejs'}).render(user);
         // $(".name_container").html(html);
         console.log("user is logged in with uid " + uid + ", and their score is " + user.score);
      },
      session.log
   );

   // // Wire up the guess button
   // var guessInput = $("#inputGuess");
   // var guessButton = $("#submitGuess");
   // //Declare an event handlers
   // guessButton.on('click', function(event) {
   //    session.call("com.google.guesswho.submit", [guessInput.val(), Number(uid)]).then(
   //       session.log, session.log
   //    );
   // });

   // Wire up the name container for setting new user names
   $(".name_container").on('click', function(event){
      var container = $(event.target);
      var edit_widget = new EJS({url: 'templates/edit_name.ejs'}).render({name: name});
      container.html(edit_widget);
      // Wire up the edit_widget
      $("#submit_name").on('click', function(event){
         var widget = $(event.target);
         console.log('submit_name clicked');
         session.call("com.google.guesswho.changename", [uid, $("#edit_name").val()]).then(
            function(new_name){
               console.log(new_name);
               set_name(new_name);
            },
            function(error){
               set_name(name); //cached name
            }
         )
      })
   })


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