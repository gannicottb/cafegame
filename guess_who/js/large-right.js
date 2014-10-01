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

var loggedInUsers = [];

function main(session) {

  //Display all logged in users
  //showAllLoggedInUsers();

  var printGuesses = function(guesses) {
    //Create a list item
    var list = document.createElement('ul');

    var total = 0;

    for (var i = guesses.length - 1; i >= 0; i--) {
      total += guesses[i].count;
    }

    for (var i = 0; i < guesses.length; i++) {

      console.log(guesses[i]);

      // Create the list item:
      var item = document.createElement('li');
      item.className = 'trendinglist';
      // Set its contents:
      item.appendChild(document.createTextNode(guesses[i].name+": "+guesses[i].count+" guesses"));
      var prog = document.createElement('progress');
      prog.id = "progressbar" + i;
      prog.value = guesses[i].count;
      prog.max = total;
      prog.className = 'progress';
      item.appendChild(prog);

      // Add it to the list:
      list.appendChild(item);
    }

    var listElement = document.getElementById('guessList');

    if (listElement.hasChildNodes() === true)
      listElement.removeChild(listElement.childNodes[0]);

    listElement.appendChild(list);

  }

  var showAllLoggedInUsers = function(){

    session.call("com.google.guesswho.getLoggedInUsers").then(
       function(success){
        
          loggedInUsers=success;
        
          console.log("length of loggedInUsers ="+loggedInUsers.length);    

          if(loggedInUsers.length > 0)
          {
            var guesses_body = $('#guesses_body');
            var btns = new EJS({url: 'templates/guesses_display.ejs'}).render({loggedInUsers: loggedInUsers});
            guesses_body.html(btns);
          }            
       },
       function(error){
          session.log();
          //retry
       }

    ); 
  }
  //
  // SUBSCRIPTIONS
  //
  var onRoundStart = function(args, kwargs, details){
     
      showAllLoggedInUsers();
  }

  var onNewGuess = function(args, kwargs, details){
      
      new_guess = kwargs;

      // And then add the new_guess to the screen

      var player_icon = $('[data-id="'+kwargs.id+'"]');

      if(kwargs.correct)
        player_icon.attr('src','img/green_led.png');
      else
        player_icon.attr('src','img/red_led.png');

  }

  session.subscribe("com.google.guesswho.newGuess", onNewGuess).then(
      function(success){
         console.log("subscribed to ", success.topic);
      }, session.log
  );
  // Subscribe to Round Start event
 
  session.subscribe("com.google.guesswho.roundStart", onRoundStart).then(
    function(success){
       console.log("subscribed to ", success.topic);
    }, session.log
  );

}

// now actually open the connection
//
connection.open();