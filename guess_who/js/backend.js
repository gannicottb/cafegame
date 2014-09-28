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

var correct_id = null;
var NUMBER_OF_ANSWERS = 8;
var ROUND_DURATION = 20000; // in ms
var MIN_PLAYERS_TO_START = 2; //set to 2 for DEBUG
var uidCounter = 0;
var users = [];
var loggedInUsers = 0;
var guessList = [];
var roundInProgress = false;
var answers = [];
var round = -1; // keep track of what round we're on
//var trendingGuesses = []; //Array to collect trending guesses

function verify(user){
  if(user == undefined || user == null || user.loggedin == false){
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

// function nextKeyword(){
//   //I'd rather just shuffle the guessList at the beginning and then go through in order
//   return guessList[Math.floor(Math.random() * guesslist.length)];
// }

function main(session) {

  //Get the curated list of people
  //
  $.get('http://localhost:8080/guesslist.txt', function(myContentFile) {
    var lines = myContentFile.split("\n");
    for (var i = 0; i < lines.length; i++) {
      //save in object "guesslist": 
      guessList[i] = {id: i, keyword: lines[i]}
      console.log(guessList[i].id, guessList[i].keyword);
    }
    console.log("guessList.length =" + guessList.length);
    //Shuffle the keywords in the list
    guessList = shuffle(guessList);
  }, 'text');


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
    user.loggedin = true;
    loggedInUsers++;
    
    console.log("User "+user.name+" is logged in.");
    
    if (roundInProgress == false && loggedInUsers >= MIN_PLAYERS_TO_START){
      //Start the next round in 5 seconds
      setTimeout(startNextRound, 5000);
    }

    return user;
  }

  // Register new devices
  //
  var register = function() {
    users[uidCounter] = {
      id: uidCounter,
      name: "guest" + uidCounter,
      loggedin: false,
      score: 0
    };
    return uidCounter++;
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
    if(roundInProgress == false){
      return;
    }
    new_guess = kwargs;

    var user = lookup(new_guess.id);

    verify(user);

    //TODO:
    // Determine their score, add it to their total
    // return the score for that guess

    //DEBUG:
    result = {correct: new_guess.val == correct_id, score: 1}
    return result;
  }

  // What to do when a user logs out
  //
  var onLogout = function(args, kwargs, details){
    var user = lookup(args[0]);
    user.loggedin = false;
    loggedInUsers--;
    var logout_msg = 'User '+user.name+' has logged out!';
    console.log(logout_msg);
    return logout_msg;
  }

  // Begin the round
  //
  var startNextRound = function(){

    round = (round+1)%guessList.length;
    roundInProgress = true;
    //TODO:
    //Start the timer
    
    //Pick the keyword for the round, save the id
    correct_id = guessList[round].id;
    //var keyword = guessList[round].keyword;
    //Generate the answers
    //Slice the list of keywords before and after the current keyword, then glue them together and shuffle the result
    var potentialAnswers = shuffle(guessList.slice(0,round).concat(guessList.slice(round + 1,guessList.length)));    
    answers = []; // clear out the answers
    //Add the correct answer
    //answers[0] = {keyword: keyword, correct: true};
    //Add incorrect answers

    answers[0] = guessList[round]; //load in the correct answer
    // then concatenate a slice of 7 more possible answers to the array
    answers = answers.concat(potentialAnswers.slice(1, NUMBER_OF_ANSWERS+1));
    // for(var i = 1; i < NUMBER_OF_ANSWERS; i++){
    //   answers[i] = {keyword: potentialAnswers[i], correct: false};
    // }

    //Publish the roundStart event (everyone wants to know)
    session.publish("com.google.guesswho.roundStart", [], {
      round: round,
      duration: ROUND_DURATION,
      answers: answers
    });

  }
  // When the display has finished animating the image
  //
  var onRoundOver = function(args, kwargs, details){
    roundInProgress = false;
    //TODO:
    // Grab the top X highest scoring players and put their info into an object
    // Publish that leaderboard object for the large-right display
    //session.publish('com.google.guesswho.roundResult', [], {});

    if (roundInProgress == false && loggedInUsers >= MIN_PLAYERS_TO_START){
      //Start the next round in 5 seconds
      setTimeout(startNextRound, 5000);
    }
  }

  // Subscriptions
  session.subscribe('com.google.guesswho.logout', onLogout);
  session.subscribe('com.google.guesswho.roundOver', onRoundOver);

  // REGISTER RPC
  //
  session.register('com.google.guesswho.submit', submitGuess);
  session.register('com.google.guesswho.login', login);
  session.register('com.google.guesswho.changename', changeName);

}

connection.onopen = function(session) {

  console.log("connected");

  main(session);

};

connection.open();
