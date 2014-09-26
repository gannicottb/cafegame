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
var users = [];
var trendingGuesses = []; //Array to collect trending guesses

function verify(user){
  if(user == undefined || user == null || user.loggedin == false){
      //the user isn't registered or logged in
      //throw an error of some kind
      throw new autobahn.Error('com.google.guesswho.error', ["User isn't registered or logged in"], user);
    }
}

function main(session) {
  // User login
  //
  var login = function(args, kwargs, details) {    
    var uid = args[0];//it's a string
    console.log("uid "+args[0]+" logging in"); 
    // Register if the user passes in a null id
    if (uid == null){
      uid = register();
    }
    // Grab the user from the "database"
    var user = users[Number(uid)];    
    // Log them in
    user.loggedin = true;
    
    console.log("User "+user.name+" is logged in.");
    
    return user;
  }

  // Register new devices
  //
  var register = function() {
    users[uidCounter] = {
      uid: uidCounter,
      name: "guest" + uidCounter,
      loggedin: false,
      score: 0
    };
    return uidCounter++;
  }

  // Change user names
  //
  var changename = function(args, kwargs, details){
    var user = users[args[0]];
    var new_name = args[1];
    
    verify(user); // throw an error if the user doesn't exist

    console.log("User "+user.uid+" changed their name to "+new_name);
    user.name = new_name;

    return user.name; //receipt

  }

  // Handle guess submission
  //
  var submitGuess = function(args, kwargs, details) {
    var guess = args[0];
    var user = users[args[1]];
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
      user: user.name,
      guess: guess,
      guesses: trendingGuesses

    }]);
  }

  // REGISTER RPC
  //
  session.register('com.google.guesswho.submit', submitGuess);
  session.register('com.google.guesswho.login', login);
  session.register('com.google.guesswho.changename', changename);

}

connection.onopen = function(session) {

  console.log("connected");

  main(session);

};

connection.open();
