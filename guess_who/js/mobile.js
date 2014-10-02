var Mobile = (function() {

  //Private variables
  //

  var session;
  var user = {
    id: null,
    name: "",
    score: 0
  };
  var input_body = $('#input_body');
  var name_container = $('.name_container');
  var round_in_progress = false;
  var timer_interval = null;


  // Private functions
  //

  //set the value of the name container
  var setName = function(new_name) {
    new_name = new_name || user.name // default to user name if no new name is passed
    // update user name
    user.name = new_name;
    // render user name in the name container
    //
    name_container.html(new EJS({
      url: 'templates/user_name.ejs'
    }).render(user));
  };

  //set the value of the timer
  var setTimer = function(timeout) {
    var timeLeft = function(timeout) {
      var now = new Date();
      // if we set a timer with a negative or zero time, simply set it to now
      if (timeout <= 0) timeout = now.getTime();
      // that way, timeLeft returns 0s instead of a huge negative number
      return Math.floor((timeout - now.getTime()) / 1000);
    }
    var renderTimer = function(time_left) {
      var timer = new EJS({
        url: 'templates/timer.ejs'
      }).render({
        time_left: time_left
      });
      $('.timer').html(timer);
    }

    renderTimer(timeLeft(timeout));

    // Update the timer every second until the timer runs out
    timer_interval = setInterval(function() {
      var time_left = timeLeft(timeout);
      if (time_left <= 0) {
        clearInterval(timer_interval);
        timer_interval = null;
        time_left = 0;
      }
      renderTimer(time_left);
    }, 1000);
  };

  // Handle round start
  var onRoundStart = function(args, kwargs, details) {
    //Populate the input body with buttons
    var buttons = new EJS({
      url: 'templates/buttons.ejs'
    }).render({
      answers: args
    });
    input_body.html(buttons);

    round_in_progress = true;

    setTimer(kwargs.round_end);
  };

  // Handle round end
  var onRoundEnd = function(args, kwargs, details) {
    round_in_progress = false;

    if (kwargs.round != round) return;

    //Populate the input body with only the correct button
    var buttons = new EJS({
      url: 'templates/buttons.ejs'
    }).render({
      answers: kwargs.answers
    });
    input_body.html(buttons);

    // Disable the button and color it appropriately
    var answer = input_body.find('.answer:first');
    answer.prop('disabled', true);
    answer.addClass('correct');

    // Clear the timer
    setTimer(0);
  };

  // Handle new login event
  var onLogins = function(args, kwargs, details) {
    // Update the waiting message
    var waiting = new EJS({
      url: 'templates/waiting.ejs'
    }).render(kwargs);
    if (!round_in_progress) {
      input_body.html(waiting);
    }
  };

  var answerClick = function(event){
    // Disable all buttons in the input_body
      clicked_button = $(event.target);
      input_body.children('.answer').prop('disabled', true);
      clicked_button.addClass('selected'); // add a border to indicate that the button has been clicked

      // Submit the answer to the server
      session.call("com.google.guesswho.submit", [], {
        id: user.id,
        val: clicked_button.val(),
        time: new Date().getTime()
      }).then(
        function(success) {
          clicked_button.addClass(success.correct ? 'correct' : 'incorrect');
          // TODO: Display the score in some nice way

          // Update the score
          user.score += success.score
          name_container.html(new EJS({
            url: 'templates/user_name.ejs'
          }).render(user));

          console.log("Score for this round was ", success.score);
        },
        function(error) {
          console.log("Submit guess failed", error)
          //retry
        }
      );
  };

  var changeNameClick = function(event) {
    var container = $(event.target);

    // Render the edit_widget with the name
    var edit_widget = new EJS({
      url: 'templates/edit_name.ejs'
    }).render(user);
    container.html(edit_widget);
    container.find('input').prop('autofocus', true);

    // Wire up the edit_widget
    $("#submit_name").on('click', function(event) {
      var widget = $(event.target);
      console.log('submit_name clicked');
      session.call("com.google.guesswho.changeName", [user.id, $("#edit_name").val()]).then(
        function(new_name) {
          console.log(new_name);
          setName(new_name);
        },
        function(error) {
          console.log("Change name failed", error)
          setName(); //re render with cached name
        }
      )
    })
  };

  // Register and subscribe, plus anything else that needs to be done at startup
  var main = function(autobahn_session) {

    session = autobahn_session;

    // Auto logout if the user leaves the page (notify the backend)
    //
    $(window).on('beforeunload', function() {
      session.publish('com.google.guesswho.logout', [user.id]).then(
        function(success) {
          console.log(success);
        }
      );
    })

    //Check to see if the device already has a user id
    //Note: needs to use localStorage for 'real' mobile testing
    user.id = sessionStorage.getItem("id");

    //Log in to the server (and get auto-registered if no uid is present)
    //
    session.call("com.google.guesswho.login", [user.id]).then(
      function(success) {
        // Store the user object returned from the server  
        user = success;
        sessionStorage.setItem("id", user.id);
        // Display the username
        setName(user.name);

        console.log("user is logged in with uid " + Number(user.id) + ", and their score is " + user.score);
        //retry = false;
      },
      function(error) {
        console.log("login failed", error);
      }
    );

    // CLICK HANDLERS //

    // Wire up multiple choice buttons
    input_body.on('click', '.answer', answerClick);

    // Wire up the name container for setting new user names
    name_container.on('click', changeNameClick);

    // SUBSCRIPTIONS //

    // Subscribe to Round Start event
    //
    session.subscribe("com.google.guesswho.roundStart", onRoundStart).then(
      function(success) {
        console.log("subscribed to ", success.topic);
      }, session.log
    );

    // Subscribe to Round End event
    //
    session.subscribe("com.google.guesswho.roundEnd", onRoundEnd).then(
      function(success) {
        console.log("subscribed to ", success.topic);
      }, session.log
    );

    // Subscribe to Logins event
    //
    session.subscribe("com.google.guesswho.newLogin", onLogins).then(
      function(success) {
        console.log("subscribed to ", success.topic);
      }, session.log
    );
  };

  return {

    // A public function utilizing privates
    connect: function() {
      // the URL of the WAMP Router (Crossbar.io)
      //
      var wsuri = null;
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

      // now actually open the connection
      //
      connection.open();
    },

  user: function(){
      return user;
    }
  };

})();

Mobile.connect();