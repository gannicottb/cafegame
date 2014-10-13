var Backend = (function() {

  //Private variables
  //

  //Constants
  var NUMBER_OF_ANSWERS, ROUND_DURATION, PREPARE_DURATION, MIN_PLAYERS_TO_START;

  // Members
  var session;
  var correct_answer, guess_list, round_in_progress, answers;
  var uid_counter, users, logged_in_users, timeout_id;
  var round, round_end;
  

  var init = function(){
    NUMBER_OF_ANSWERS = 4;
    ROUND_DURATION = 20000; // in ms
    MIN_PLAYERS_TO_START = 2; //set to 2 for DEBUG
    PREPARE_DURATION = 5000; // in ms

    // Members
    session;
    //correct_answer = null;
    uid_counter = 0;
    users = [];
    logged_in_users = 0;
    timeout_id = null;
    
    guess_list = [];
    
    states = {
      WAIT: 0,
      PREPARE: 1,
      PROGRESS: 2
    }

    round = {
      state: states.WAIT,
      correct_answer: null,
      answers: [],
      number: -1,
      end: 0,
      players_needed: MIN_PLAYERS_TO_START,
      submitted_guesses: 0
    }
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
    var result = {};

    var uid = args[0]; //it's a string
    console.log("uid " + args[0] + " logging in");

    // Register if the user passes in a null id or with an id the backend doesn't recognize
    if (uid == null || uid == undefined || lookup(uid) == undefined) {
      uid = register();
    }

    // Grab the user from the "database"
    var user = lookup(uid);
    // Log them in
    var logged_back_in = user.logged_in;
    user.logged_in = true;

    console.log("User " + user.name + " is logged in.");

    result.user = user; // add the user to the result bundle

    logged_in_users = getLoggedInUsers().length;

    switch(round.state){
      case states.WAIT:
        if(logged_in_users >= MIN_PLAYERS_TO_START){
          // We have enough players to go to Prepare
          round.state = states.PREPARE;
          // Set a clear-able timeout to start the next round
          timeout_id = setTimeout(startNextRound, PREPARE_DURATION);
          // Tell everyone that the round is about to begin
          session.publish("com.google.guesswho.stateChange", [], round);
        } else {
          // We don't have enough players, so let's calculate how many more we need
          round.players_needed = logged_in_users < MIN_PLAYERS_TO_START ? MIN_PLAYERS_TO_START - logged_in_users : 0
        }        
        break;
      case states.PREPARE:
        // do nothing for now
        break;
      case states.PROGRESS:
        // do nothing for now
        break;
    }

    result.round = round; // add the round to the result bundle
  
    if(!logged_back_in){ // only publish newlogin event if the person wasn't logged in before
      session.publish("com.google.guesswho.newLogin", [], {      
        new_player: {
          id: user.id,
          name: user.name
        }
      });     
    }
    return result;
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
    if (round.state != states.PROGRESS ) {
      return;
    }

    var user = lookup(kwargs.id);

    verify(user);

    round.submitted_guesses++;

    // Is the guess correct?
    var correct = (Number(kwargs.val) === round.correct_answer.id);

    // Determine their score, add it to their total
    var score = 0;

    if (correct) { // If you didn't get it right, you get a score of 0 (maybe some very small number just for playing?)
      var time_left = Math.floor((round.end - kwargs.time)); // in ms
      score = Math.round(time_left/1000) * 10;  //Score = number of seconds left * 10
    }

    user.score += score;

    // Publish the new guess event
    session.publish('com.google.guesswho.newGuess', [], {
      round: round.number,
      id: user.id,
      correct: correct
    })

    // End the round early if everyone has guessed
    //
    if(round.submitted_guesses === logged_in_users){
      clearTimeout(timeout_id);
      onRoundOver();
    }

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
    var logout_msg = 'User ' + user.name + ' has logged out!';    
    logged_in_users = getLoggedInUsers().length;

    if(round.state === states.PREPARE && logged_in_users < MIN_PLAYERS_TO_START){
        round.state = states.WAIT; // backend is now waiting
        clearTimeout(timeout_id); // clear future events
        session.publish("com.google.guesswho.stateChange", [], round);
      }
    

    console.log(logout_msg);
    //return logout_msg;
  };

  // Begin the round
  //
  var startNextRound = function() {

    // Round now in progress
    round.state = states.PROGRESS;

    // Increment (wrapping if at end of list) the round number
    round.number = (round.number + 1) % guess_list.length;

    //Pick the keyword for the round, save the id
    round.correct_answer = guess_list[round.number];

    //Generate the answers
    //
    //Slice the list of keywords before and after the current keyword, then glue them together and shuffle the result
    var potentialAnswers = shuffle(guess_list.slice(0, round.number).concat(guess_list.slice(round.number + 1, guess_list.length)));
    // clear out the answers  
    round.answers = [];
    //load in the correct answer
    round.answers[0] = round.correct_answer;
    // concatenate a slice of more possible answers to the array
    round.answers = round.answers.concat(potentialAnswers.slice(0, NUMBER_OF_ANSWERS - 1));
    // randomize the answer choices
    shuffle(round.answers);

    //Set the alarm
    round.end = new Date().getTime() + ROUND_DURATION;

    timeout_id = setTimeout(onRoundOver, ROUND_DURATION);

    // //Display Timer
    // setTimer(round.end);

    //Publish the roundStart event (everyone wants to know)
    session.publish("com.google.guesswho.roundStart", [], round);
  };

  // When the round timeout is reached
  //
  var onRoundOver = function(args, kwargs, details) {
    round.submitted_guesses = 0;
    
    if(round.state === states.PROGRESS){
      round.state = states.PREPARE;      
    }
    round.end = 0;

    
    //setTimer(0);
    
    //TODO:
    // Grab the top X highest scoring players and put their info into an object
    // Publish that leaderboard object for the large-right display


    // If we still have enough players to play, then set a timeout to start a new round
    if(logged_in_users >= MIN_PLAYERS_TO_START){
      timeout_id = setTimeout(startNextRound, PREPARE_DURATION);
    }else{
      // otherwise, we go back to Wait and let everyone know that we're waiting for players
      round.state = states.WAIT;
    }


    //Leaderboard logic (construct array of users in descending order of their scores)
    var leaders = users;

    //(Logic  needs to be enhanced ---- )
    
    if(leaders.length > 0)
    {
        //Sort logged in users based on score
        leaders.sort(function(a,b){
          if(b.score > a.score){
            return 1;
          }
          if(b.score < a.score){
            return -1;
          }
          return 0;
        });
    }

    var top_5_leaders;

    if(leaders.length > 5)
      top_5_leaders = leaders.slice(0,5);
    else
      top_5_leaders = leaders;

    session.publish('com.google.guesswho.roundEnd', top_5_leaders, round);

  };


  var main = function(autobahn_session) {
    
    // auto resize iframes
    $('.demo_window').height($(window).height() - 50);
    $('.demo_window').width($(window).width()/2 - 25);

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

      round: function(){
        return round;
      },

      setCorrectAnswer: function(correct){
        round.correct_answer = correct;
      },

      roundInProgress: function(in_progress){
        if(in_progress){
          round.state = states.PROGRESS;
        }
      }
      
    }


  };
})();