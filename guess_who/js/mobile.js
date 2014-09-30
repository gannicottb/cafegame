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

// fired when connection was lost (or could not be established)
//
connection.onclose = function(reason, details) {

   console.log("Connection lost: " + reason);

}

// Mobile.js variables
var my = {id: null, name: "", score: 0}
var input_body = $('#input_body');
var round_in_progress = false;
var timer_interval = null;

// Utility functions
function set_name(new_name){
   new_name = new_name || my.name // default to my name if no new name is passed
   // update my name
   my.name = new_name;
   // render my name in the name container
   var name_tag = new EJS({url: 'templates/user_name.ejs'}).render(my);
   $(".name_container").html(name_tag);
}

function set_timer(timeout){
   var timeLeft = function(timeout){
      var now = new Date();
      return Math.floor((timeout - now.getTime())/1000);      
   }
   var renderTimer = function(time_left){      
      var timer = new EJS({url: 'templates/timer.ejs'}).render({time_left: time_left});
      $('.timer').html(timer);
   }

   renderTimer(timeLeft(timeout));

   // Update the timer every second until the timer runs out
   timer_interval = setInterval(function(){
      // var now = new Date();
      // var time_left = (timeout - now.getTime())/1000
      var time_left = timeLeft(timeout);
      if(time_left <= 0){
         clearInterval(timer_interval);
         timer_interval = null;
         time_left = 0;
      }
      // var timer = new EJS({url: 'templates/timer.ejs'}).render({time_left: time_left});
      // $('.timer').html(timer);
      renderTimer(time_left);
   }, 1000);

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

   //Check to see if the device already has a user id
      //Note: needs to use localStorage for 'real' mobile testing
   my.id = sessionStorage.getItem("id");

   //Log in to the server (and get auto-registered if no uid is present)
   //
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

   //
   // CLICK HANDLERS
   //

   // Wire up multiple choice buttons
   //
   input_body.on('click', '.answer', function(event){
      
      // Disable all buttons in the input_body
      clicked_button = $(event.target);
      input_body.children('.answer').prop('disabled', true);
      clicked_button.addClass('selected'); // add a border to indicate that the button has been clicked

      // Submit the answer to the server
      session.call("com.google.guesswho.submit", [], {id: my.id, val: clicked_button.val()}).then(
         function(success){
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
      container.find('input').prop('autofocus', true);

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

   //
   // SUBSCRIPTIONS
   //

   // Handle round start
   var onRoundStart = function(args, kwargs, details){
      //Populate the input body with buttons
      //
      var buttons = new EJS({url: 'templates/buttons.ejs'}).render({answers: args});
      input_body.html(buttons); 

      round_in_progress = true;     

      set_timer(kwargs.round_end);
   }

   // Handle new login event
   var onLogins = function(args, kwargs, details){
      // Update the waiting message
      var waiting = new EJS({url: 'templates/waiting.ejs'}).render(kwargs); 
      if (!round_in_progress){
         input_body.html(waiting);
      }
   }

   // Subscribe to Round Start event
   //
   session.subscribe("com.google.guesswho.roundStart", onRoundStart).then(
      function(success){
         console.log("subscribed to roundStart");
      }, session.log
   );

   // Subscribe to Logins event
   //
   session.subscribe("com.google.guesswho.logins", onLogins).then(
      function(success){
         console.log("subscribed to logins");
      }, session.log
   );
}


// now actually open the connection
//
connection.open();