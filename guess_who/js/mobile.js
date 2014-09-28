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

var my = {id: null, name: "", score: 0}

function set_name(new_name){
   new_name = new_name || my.name // default to my name if no new name is passed
   // update my name
   my.name = new_name;
   // render my name in the name container
   var name_tag = new EJS({url: 'templates/user_name.ejs'}).render(my);
   $(".name_container").html(name_tag);
}

function main(session) {

   // Auto logout if the user leaves the page (notify the backend)
   //
   $(window).on('beforeunload', function(){
      session.publish('com.google.guesswho.logout', [my.id]).then(
         function(success){
            console.log(success);
         }
      );
   })

   //EXAMPLE EJS
   //var html = new EJS({url: 'templates/temp.ejs'}).render(data);
   //EXAMPLE EJS

   //Check to see if the device already has a user id
   //Note: needs to be localStorage for mobile testing
   my.id = sessionStorage.getItem("id");
   //Log in to the server (and get auto-registered if no uid is present)
   session.call("com.google.guesswho.login", [my.id]).then(
      function(user) {
         // Store the user object returned from the server  
         my = user;
         sessionStorage.setItem("id", my.id);
         // Display the username
         set_name(my.name);
         console.log("user is logged in with uid " + my.id + ", and their score is " + my.score);
      },
      session.log
   );

   // Attach delegated handlers for the multiple choice buttons
   //
   var input_body = $('#demo_body');
   input_body.on('click', '.answer', function(event){
      // Disable all buttons in the input_body
      clicked_button = $(event.target);
      input_body.children('.answer').prop('disabled', true);
      clicked_button.addClass('selected'); // add a border to indicate that the button has been clicked
      // Submit the answer to the server
      session.call("com.google.guesswho.submit", [], {id: my.id, val: clicked_button.val()}).then(
         function(success){
            // answer was retrieved, success is probably a boolean
            clicked_button.addClass(success.correct? 'correct' : 'incorrect');
            console.log("Score for this round was ", success.score);
         },
         function(error){
            session.log();
            //retry
         }
      );

   });

   // Wire up the name container for setting new user names
   $(".name_container").on('click', function(event){
      var container = $(event.target);
      // Render the edit_widget with the name
      var edit_widget = new EJS({url: 'templates/edit_name.ejs'}).render(my);
      container.html(edit_widget);
      // Wire up the edit_widget
      $("#submit_name").on('click', function(event){
         var widget = $(event.target);
         console.log('submit_name clicked');
         session.call("com.google.guesswho.changename", [my.id, $("#edit_name").val()]).then(
            function(new_name){
               console.log(new_name);
               set_name(new_name);
            },
            function(error){
               set_name(); //re render with cached name
            }
         )
      })
   })

   // Handle round start
   var onRoundStart = function(args, kwargs, details){
      //Populate the input body with buttons
      //var input_body = $('#demo_body');
      buttons = new EJS({url: 'templates/buttons.ejs'}).render(kwargs);
      input_body.html(buttons);      
   }
   // Subscribe to Round Start event
   //
   session.subscribe("com.google.guesswho.roundStart", onRoundStart).then(
      function(success){
         console.log("subscribed to roundStart");
      }, session.log
   );
}

// fired when connection was lost (or could not be established)
//
connection.onclose = function(reason, details) {

   console.log("Connection lost: " + reason);

}

// now actually open the connection
//
connection.open();