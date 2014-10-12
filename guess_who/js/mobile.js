var Mobile = (function() {

  //Private variables
  //

  var session, user, states;
  var round, round_in_progress, timer_interval
  var input_body, name_container;

  // Private functions
  //

  var init = function(){
    states = {
      WAIT: 0,
      PREPARE: 1,
      PROGRESS: 2
    };

    user = {
      id: null,
      name: "",
      score: 0
    };
    input_body = $('#input_body');
    name_container = $('.name_container');
    round = null;
    timer_interval = null;
  }

  //set the value of the name container
  var setName = function(new_name) {
    new_name = new_name || user.name // default to user name if no new name is passed
    // update user name
    user.name = new_name;
    // render user name in the name container
    name_container.html(new EJS({
      url: 'templates/user_name.ejs'
    }).render(user));
  };

  var logout = function() {
    session.publish('com.google.guesswho.logout', [user.id]);
  };

  var loginSuccess = function(kwargs) {
    // Store the user object returned from the server  
    user = kwargs.user;
    console.log("user is logged in with uid " + Number(user.id) + ", and their score is " + user.score);
    sessionStorage.setItem("id", user.id);
    // Store the round information returned from the server
    round = kwargs.round;

    // Display the username
    setName(user.name);

    switch(round.state){
      case states.PROGRESS:
        //Populate the input body with buttons
        var buttons = new EJS({
          url: 'templates/buttons.ejs'
        }).render({
          answers: round.answers
        });
        input_body.html(buttons);

        timer_interval = GuessWho.setTimer($('.timer'), round.end);
        break;
      case states.WAIT:
        // Update the waiting message
        var waiting = new EJS({url: 'templates/waiting.ejs'}).render(round);        
        input_body.html(waiting);
        break;
      case states.PREPARE:
        input_body.html("Preparing for next round in 5 seconds");
        break;      
    }
  }

  //Generic state change handling
  //
  var onStateChange = function(args, kwargs, details){
    round = kwargs;

    switch(round.state){
      case states.WAIT:
        console.log("Round is waiting");
        // Update the waiting message
        var waiting = new EJS({url: 'templates/waiting.ejs'}).render(round);        
        input_body.html(waiting);
        break;
      case states.PREPARE:
        console.log("Round is preparing");
        input_body.html("Preparing for next round in 5 seconds");
        break;      
    }
  }

  // Handle round start
  var onRoundStart = function(args, kwargs, details) {
    round = kwargs;
    console.log("Round", round.number, "starting!");

    // clear out the score line
    $('.round_score').html("");

    //Populate the input body with buttons
    var buttons = new EJS({url: 'templates/buttons.ejs'}).render(round);
    input_body.html(buttons);

    timer_interval = GuessWho.setTimer($('.timer'), round.end);
  };

  // Handle round end
  var onRoundEnd = function(args, kwargs, details) {
    round = kwargs;
    console.log("Round", round.number, "ended!");

    switch(round.state){
      case states.WAIT:
        console.log("Round is waiting");
        // Update the waiting message
        var waiting = new EJS({url: 'templates/waiting.ejs'}).render(round);        
        input_body.html(waiting);
        break;
      case states.PREPARE:
        //Populate the input body with only the correct button
        var buttons = new EJS({url: 'templates/buttons.ejs'}).render({answers: [round.correct_answer]});
        input_body.html(buttons);

        // Disable the button and color it appropriately
        var answer = input_body.find('.answer:first');
        answer.prop('disabled', true);
        answer.addClass('correct');

        // Clear the timer
        GuessWho.clearTimer($('.timer'), timer_interval);

        break;      
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

        $('.round_score').html("*"+success.score+"*");

        // Update the score
        user.score += success.score
        name_container.html(new EJS({url: 'templates/user_name.ejs'}).render(user));

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
    $(window).on('beforeunload', logout );

    //Check to see if the device already has a user id
    //Note: needs to use sessionStorage for 'real' mobile testing
    user.id = sessionStorage.getItem("id");

    //Log in to the server (and get auto-registered if no uid is present)
    //
    session.call("com.google.guesswho.login", [user.id]).then(
      loginSuccess,
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

    // Subscribe to State Change event
    //
    session.subscribe("com.google.guesswho.stateChange", onStateChange).then(
      function(success) {
        console.log("subscribed to ", success.topic);
      }, session.log
    );
  };

  return {

    // A public function utilizing privates
    connect: function() {

      init();
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