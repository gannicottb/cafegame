var Test = (function() {

  //Private variables
  //

  var session;
 
  //Private functions
  //

  var main = function(autobahn_session){
    session = autobahn_session;
    console.log('test connected on', session);

    //login
    //setName
    //setTimer
    //onRoundStart
    //onRoundEnd
    //onLogins
    //answerClick
    //changeNameClick

    Qunit.test("");


  };

  return {

    // A public API
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
    }
  };

})();

Test.connect();