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

var uidCounter = 0;
var uids = [];
var trendingGuesses = []; //Array to collect trending guesses

function main(session) {

  // Register new devices
  //
  var register = function(args, kwargs, details) {
    uids[uidCounter] = {
      uname: "guest" + uidCounter,
      loggedin: false,
      score: 0
    };
    return uidCounter++;
  }

  // User login
  //
  var login = function(args, kwargs, details) {
    var user = uids[args[0]];
    var result;
    if (user == undefined || user == null) {
      // handle error case
      result = -1;
      console.log("uid "+args[0]+ " not found.");
    } else {
      // Log them in
      user.loggedin = true;
      // Fetch score
      result = user.score;
      console.log("uid "+args[0]+" found and logged in.");
    }
    return result;
  }

  // Handle guess submission
  //
  var submitGuess = function(args, kwargs, details) {
    var guess = args[0];
    var user = uids[args[1]];
    if(user == undefined || user == null){
      //do something reasonable
    }else{
      console.log("received guess: " + guess + " from " + user.uname);
      session.publish("com.google.guesswho.onguess", [{
        user: user,
        guess: guess
      }]);      
    }
  }

  // Handle guess submission
  //
  var submitGuess = function(args, kwargs, details) {
    var guess = args[0];
    var user = uids[args[1]];
    if(user == undefined || user == null || user.loggedin == false){
      //the user isn't registered or logged in
      //throw an error of some kind
      return;
    }

    var guessAlreadyPresent = false; //Boolean flag to check if guess already exists in the list

    //If a guess already exists in the list, update its count 
    if (trendingGuesses.length > 0) {

      for (var i = 0; i < trendingGuesses.length; i++) {

        if (trendingGuesses[i].name === guess) {
          guessAlreadyPresent = true;
          trendingGuesses[i].count++; //Increments the value of count            
          console.log("Guess was found in the list. Updated count for " + guess + " to " + trendingGuesses[i].count);
          break;
        }
      }
    }

    //New guesses are pushed into the list with count = 1
    if (guessAlreadyPresent !== true) {
      trendingGuesses.push({
        name: guess,
        count: 1
      });
      console.log("Guess not found. Adding new row. Name = " + guess + ", Count = " + 1);
    }

    //Sort the trending guesses in descending order of count of each guess
    trendingGuesses.sort(function(a, b) {
      return b.count - a.count;
    });

    for (var i = 0; i < trendingGuesses.length; i++) {
      console.log(trendingGuesses[i]);
    }

    session.publish("com.google.guesswho.onguess", [{
      user: user.uname,
      guess: guess
    }]);
  }

  // REGISTER RPC
  //
  session.register('com.google.guesswho.submit', submitGuess);
  session.register('com.google.guesswho.register', register);
  session.register('com.google.guesswho.login', login);

}

connection.onopen = function(session) {

  console.log("connected");

  main(session);

};

connection.open();