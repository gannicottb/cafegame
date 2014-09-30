var wsuri = null;

// include AutobahnJS
try {
  var autobahn = require('autobahn');

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

window.backend = window.backend || {
  constants: {
    NUMBER_OF_ANSWERS: 4,
    ROUND_DURATION: 20000, // in ms
    MIN_PLAYERS_TO_START: 2 //set to 2 for DEBUG
  }
  // },
  // correct_id = null,
  // uid_counter = 0,
  // users = [],
  // logged_in_users = 0,
  // guess_list = [],
  // round_in_progress = false,
  // answers = [],
  // round = -1 // keep track of what round we're on

};

// var correct_id = null;
var correct_answer = null;
var uid_counter = 0;
var users = [];
var logged_in_users = 0;
var guess_list = [];
var round_in_progress = false;
var answers = [];
var round = -1; // keep track of what round we're on
var round_end = 0;

function verify(user){
  if(user == undefined || user == null || user.logged_in == false){
      //the user isn't registered or logged in
      //throw an error of some kind
      throw new autobahn.Error('com.google.guesswho.error', ["User isn't registered or logged in"], user);
    }
}

function lookup(uid){
  return users[Number(uid)];
}

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [v1.0]
function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

function main(session) {

  //Get the curated list of people
  //
  $.get('http://localhost:8080/guesslist.txt', function(myContentFile) {
    var lines = myContentFile.split("\n");
    for (var i = 0; i < lines.length; i++) {
      //save in object "guesslist": 
      guess_list[i] = {id: i, keyword: lines[i]}
      console.log(guess_list[i].id, guess_list[i].keyword);
    }
    console.log("guess_list.length =" + guess_list.length);
    //Shuffle the keywords in the list
    guess_list = shuffle(guess_list);
  }, 'text');

  //
  //RPC 
  //

  // User login
  //
  var login = function(args, kwargs, details) {    
    var uid = args[0];//it's a string
    console.log("uid "+args[0]+" logging in"); 
    // Register if the user passes in a null id
    if (uid == null || uid == undefined){
      uid = register();
    }
    // Grab the user from the "database"
    var user = lookup(uid);    
    // Log them in
    user.logged_in = true;
    logged_in_users++;
    
    console.log("User "+user.name+" is logged in.");
    
    if (round_in_progress == false && logged_in_users >= backend.constants.MIN_PLAYERS_TO_START){
      //Start the next round in 5 seconds
      setTimeout(startNextRound, 5000);
    }

    session.publish("com.google.guesswho.newLogin", [], {
      players_needed: backend.constants.MIN_PLAYERS_TO_START - logged_in_users,
      new_player: {id: user.id, name: user.name}
    });

    return user;
  }

  // Register new devices
  //
  var register = function() {
    users[uid_counter] = {
      id: uid_counter,
      name: "guest" + uid_counter,
      loggedin: false,
      score: 0
    };
    return uid_counter++;
  }

  // Change user names
  //
  var changeName = function(args, kwargs, details){
    var user = lookup(args[0]);
    var new_name = args[1];
    
    verify(user); // throw an error if the user doesn't exist

    console.log("User "+user.id+" changed their name to "+new_name);
    user.name = new_name;

    return user.name; //receipt

  }

  // Handle guess submission
  //
  var submitGuess = function(args, kwargs, details) {
    // Check to make sure the round is still going
    if(round_in_progress === false){
      return;
    }

    new_guess = kwargs;

    var user = lookup(new_guess.id);

    verify(user);

    // Is the guess correct?
    var correct = (new_guess.val === correct_answer.id);

    //TODO:
    // Determine their score, add it to their total
    var time_left = Math.floor((round_end - kwargs.time)); // in ms
    var score = (time_left/backend.constants.ROUND_DURATION) * 5 // Max score is 5.   

    // Publish the new guess event
    session.publish('com.google.guesswho.newGuess', {
      round: round,
      id: user.id,
      correct: correct
    })

    // Return their score for the round
    result = {correct: correct, score: score}
    return result;
  }

  // What to do when a user logs out
  //
  var onLogout = function(args, kwargs, details){
    var user = lookup(args[0]);
    user.logged_in = false;
    // Just in case something weird has happened. We can't have a negative number of users.
    if(logged_in_users > 0) logged_in_users--;
    var logout_msg = 'User '+user.name+' has logged out!';
    console.log(logout_msg);
    return logout_msg;
  }

  // Begin the round
  //
  var startNextRound = function(){
    // Increment (wrapping if at end of list) the round
    round = (round+1)%guess_list.length;
    round_in_progress = true;
    
    //Pick the keyword for the round, save the id
    //correct_id = guess_list[round].id;
    correct_answer = guess_list[round];
    
    //Generate the answers
    //
    //Slice the list of keywords before and after the current keyword, then glue them together and shuffle the result
    var potentialAnswers = shuffle(guess_list.slice(0,round).concat(guess_list.slice(round + 1,guess_list.length)));    
    // clear out the answers  
    answers = [];   
    //load in the correct answer
    answers[0] = correct_answer; 
    // concatenate a slice of more possible answers to the array
    answers = answers.concat(potentialAnswers.slice(0, backend.constants.NUMBER_OF_ANSWERS - 1));
    // randomize the answer choices
    shuffle(answers);

    //Set the alarm
    var now = new Date();
    round_end = now.getTime() + backend.constants.ROUND_DURATION;

    setTimeout(onRoundOver, backend.constants.ROUND_DURATION);

    //Publish the roundStart event (everyone wants to know)
    session.publish("com.google.guesswho.roundStart", answers, {
      correct_answer: correct_answer,
      round: round,
      round_end: round_end
    });

  }
  // When the round timeout is reached
  //
  var onRoundOver = function(args, kwargs, details){
    round_in_progress = false;
    round_end = 0;
    //TODO:
    // Grab the top X highest scoring players and put their info into an object
    // Publish that leaderboard object for the large-right display
    
    session.publish('com.google.guesswho.roundEnd', [], {round: round, answers: correct_answer});

    if (round_in_progress === false && logged_in_users >= backend.constants.MIN_PLAYERS_TO_START){
      //Start the next round in 5 seconds
      setTimeout(startNextRound, 5000);
    }
  }

  // Subscriptions
  session.subscribe('com.google.guesswho.logout', onLogout);
  session.subscribe('com.google.guesswho.roundOver', onRoundOver);

  // REGISTER RPC
  //
  session.register('com.google.guesswho.submit', submitGuess).then(
      function(success){
         console.log("registered ", success.procedure);
      }, session.log
  );
  session.register('com.google.guesswho.login', login).then(
      function(success){
         console.log("registered ", success.procedure);
      }, session.log
   );
  session.register('com.google.guesswho.changeName', changeName).then(
      function(success){
         console.log("registered ", success.procedure);
      }, session.log
   );

}

connection.onopen = function(session) {

  console.log("connected");

  main(session);

};

connection.open();
