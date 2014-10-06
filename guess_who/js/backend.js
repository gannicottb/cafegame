var Backend = (function() {

  //Private variables
  //

  //Constants
  var NUMBER_OF_ANSWERS, ROUND_DURATION, MIN_PLAYERS_TO_START;

  // Members
  var session;
  var correct_answer, guess_list, round_in_progress, answers;
  var uid_counter, users, logged_in_users;
  var round, round_end;

  var init = function(){
    NUMBER_OF_ANSWERS = 4;
    ROUND_DURATION = 20000; // in ms
    MIN_PLAYERS_TO_START = 2; //set to 2 for DEBUG

    // Members
    session;
    correct_answer = null;
    uid_counter = 0;
    users = [];
    logged_in_users = 0;
    guess_list = [];
    round_in_progress = false;
    answers = [];
    round = -1; // keep track of what round we're on
    round_end = 0;
  };

  //Get logged in users
  //Return array of logged in user objects from users
  var getLoggedInUsers = function() {

    //Filter logged in users from all users
    var loggedInUsers = users.filter(function(check) {
      return check.logged_in === true;
    });

    return loggedInUsers;

  };

  //Private methods
  var verify = function(user) {
    if (user == undefined || user == null || user.logged_in == false) {
      //the user isn't registered or logged in
      //throw an error of some kind
      throw new autobahn.Error('com.google.guesswho.error', ["User isn't registered or logged in"], user);
    }
  };

  var lookup = function(uid) {
    return users[Number(uid)];
  };

  //+ Jonas Raoni Soares Silva
  //@ http://jsfromhell.com/array/shuffle [v1.0]
  var shuffle = function(o) { //v1.0
    for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
  };


  // Login new and existing users
  var login = function(args, kwargs, details) {
    var uid = args[0]; //it's a string
    console.log("uid " + args[0] + " logging in");

    // Register if the user passes in a null id
    if (uid == null || uid == undefined) {
      uid = register();
    }

    // Grab the user from the "database"
    var user = lookup(uid);
    // Log them in
    user.logged_in = true;
    logged_in_users = getLoggedInUsers().length;

    if (round_in_progress == false && logged_in_users >= MIN_PLAYERS_TO_START) {
      //Start the next round in 5 seconds
      setTimeout(startNextRound, 5000);
    }
  
    session.publish("com.google.guesswho.newLogin", [], {
      players_needed: (logged_in_users < MIN_PLAYERS_TO_START ? MIN_PLAYERS_TO_START - logged_in_users : 0),
      new_player: {
        id: user.id,
        name: user.name
      }
    });     
    
    if(round_in_progress && logged_in_users >= MIN_PLAYERS_TO_START)
    {  
      continueOnThisRound();
    }

    console.log("User " + user.name + " is logged in.");

    return user;
  };

  //set the value of the timer
  setTimer = function(timeout) {
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


  // Register new devices
  //
  var register = function() {
    users[uid_counter] = {
      id: uid_counter,
      name: "guest" + uid_counter,
      logged_in: false,
      score: 0
    };
    return uid_counter++;
  };


  // Change user names
  //
  var changeName = function(args, kwargs, details) {
    var user = lookup(args[0]);
    var new_name = args[1];

    verify(user); // throw an error if the user doesn't exist

    console.log("User " + user.id + " changed their name to " + new_name);
    user.name = new_name;

    return user.name; //receipt

  };

  // Handle guess submission
  //
  var submitGuess = function(args, kwargs, details) {
    // Check to make sure the round is still going
    if (round_in_progress === false) {
      return;
    }

    var user = lookup(kwargs.id);

    verify(user);

    // Is the guess correct?
    var correct = (Number(kwargs.val) === correct_answer.id);

    // Determine their score, add it to their total
    var score = 0;

    if (correct) { // If you didn't get it right, you get a score of 0 (maybe some very small number just for playing?)
      var time_left = Math.floor((round_end - kwargs.time)); // in ms
      score = ((time_left / ROUND_DURATION) * 5) | 0; // Max score is 5.   
    }

    user.score += score;

    // Publish the new guess event
    session.publish('com.google.guesswho.newGuess', [], {
      round: round,
      id: user.id,
      correct: correct
    })

    // Return their score for the round
    result = {
      correct: correct,
      score: score
    }
    return result;
  };



  // When a user logs out
  //
  var onLogout = function(args, kwargs, details) {
    var user = lookup(args[0]);
    user.logged_in = false;
    // Just in case something weird has happened. We can't have a negative number of users.
    if (logged_in_users > 0) logged_in_users--;
    var logout_msg = 'User ' + user.name + ' has logged out!';
    console.log(logout_msg);
    return logout_msg;
  };

  // Begin the round
  //
  var startNextRound = function() {
    // Increment (wrapping if at end of list) the round
    round = (round + 1) % guess_list.length;
    round_in_progress = true;

    $('#round_number').html("Round" + round);

    //Pick the keyword for the round, save the id
    //correct_id = guess_list[round].id;
    correct_answer = guess_list[round];

    //Generate the answers
    //
    //Slice the list of keywords before and after the current keyword, then glue them together and shuffle the result
    var potentialAnswers = shuffle(guess_list.slice(0, round).concat(guess_list.slice(round + 1, guess_list.length)));
    // clear out the answers  
    answers = [];
    //load in the correct answer
    answers[0] = correct_answer;
    // concatenate a slice of more possible answers to the array
    answers = answers.concat(potentialAnswers.slice(0, NUMBER_OF_ANSWERS - 1));
    // randomize the answer choices
    shuffle(answers);

    //Set the alarm
    round_end = new Date().getTime() + ROUND_DURATION;

    setTimeout(onRoundOver, ROUND_DURATION);

    //Display Timer
    setTimer(round_end);

    //Publish the roundStart event (everyone wants to know)
    session.publish("com.google.guesswho.roundStart", answers, {
      correct_answer: correct_answer,
      round: round,
      round_end: round_end
    });
  };

  // When the round timeout is reached
  //
  var onRoundOver = function(args, kwargs, details) {
    round_in_progress = false;
    round_end = 0;

    // Clear the timer
    setTimer(0);
    
    //TODO:
    // Grab the top X highest scoring players and put their info into an object
    // Publish that leaderboard object for the large-right display

    session.publish('com.google.guesswho.roundEnd', [], {
      round: round,
      answers: correct_answer
    });

    if (round_in_progress === false && logged_in_users >= MIN_PLAYERS_TO_START) {
      //Start the next round in 5 seconds
      setTimeout(startNextRound, 5000);
    }
  };

  //Player entered mid-round
  var continueOnThisRound = function(){
  
    //Publish the event 
    session.publish("com.google.guesswho.continueOnThisRound", answers, {
      correct_answer: correct_answer,
      round: round,
      round_end: round_end
    });    

  }

  var main = function(autobahn_session) {

    session = autobahn_session;
    //Get the curated list of people
    //
    $.get('http://localhost:8080/guesslist.txt', function(myContentFile) {
      var lines = myContentFile.split("\n");
      for (var i = 0; i < lines.length; i++) {
        //save in object "guesslist": 
        guess_list[i] = {
          id: i,
          keyword: lines[i]
        }
        console.log(guess_list[i].id, guess_list[i].keyword);
      }
      console.log("guess_list.length =" + guess_list.length);
      //Shuffle the keywords in the list
      guess_list = shuffle(guess_list);
    }, 'text');

    // Subscriptions
    session.subscribe('com.google.guesswho.logout', onLogout);

    // REGISTER RPC
    //
    session.register('com.google.guesswho.submit', submitGuess).then(
      function(success) {
        console.log("registered ", success.procedure);
      }, session.log
    );
    session.register('com.google.guesswho.login', login).then(
      function(success) {
        console.log("registered ", success.procedure);
      }, session.log
    );
    session.register('com.google.guesswho.changeName', changeName).then(
      function(success) {
        console.log("registered ", success.procedure);
      }, session.log
    );

    session.register('com.google.guesswho.getLoggedInUsers', function(args, kwargs, details){
        console.log("Entered getLoggedInUsers RPC");
        return getLoggedInUsers();
      }
     ).then(
      function(success){
         console.log("registered ", success.procedure);
      }, session.log
     );    
    

  };

  return {

    connect: function() {

      init(); 
      
      var wsuri = null;

      // include AutobahnJS
      try {
        autobahn = require('autobahn');

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
        realm: 'realm1'
      });

      connection.onopen = function(session) {

        console.log("connected");

        main(session);

      };

      // Open the connection to Crossbar
      //
      connection.open();
    },

    debug: {
      users: function(){
        return users;
      },

      setCorrectAnswer: function(correct){
        correct_answer = correct;
      },

      roundInProgress: function(in_progress){
        round_in_progress = in_progress;
      }
      
    }


  };
})();