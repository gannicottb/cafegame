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


function main(session) {
  // Subscribe to trending guesses
  // 
  session.subscribe("com.google.guesswho.onguess",
    function(args) {
      var event = args[0];
      console.log(event);
      printGuesses(event.guesses);
    });

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
      item.appendChild(document.createTextNode(guesses[i].name));
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

}

// now actually open the connection
//
connection.open();