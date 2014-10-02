var Test = (function() {

  //Private variables
  //

  var session;
 
  //Private functions
  //

  var main = function(autobahn_session){
    session = autobahn_session;
    console.log('test connected on', session);

    //initial list of things to test in mobile.js

    //login
    //setName
    //setTimer

    //onRoundStart
    //onRoundEnd
    //onLogins
    //answerClick
    //changeNameClick

    QUnit.asyncTest("Mobile logged in and set its id", function(assert){
      expect(2);

      Mobile.connect();

      setTimeout(function(){
        assert.equal(sessionStorage.getItem("id"), Mobile.user().id);  
        assert.ok($(".name_container:contains('"+Mobile.user().name+"')").length > 0, "name_container has the user name");    
        QUnit.start();
      }, 1000);
    });

    QUnit.asyncTest("Mobile sets timer on round start", function(assert){
      expect(1);

      Mobile.connect();

      // Wait one second for Mobile to connect, then publish roundStart
      var correct_answer = {id: 1, keyword: "Mrs. Right"};
      var wrong_answer = {id: 0, keyword: "Mr. Wrong"};
      setTimeout(function(){
        session.publish("com.google.guesswho.roundStart", [wrong_answer, correct_answer],
         {
          correct_answer: correct_answer,
          round: 1,
          round_end: new Date().getTime()+20000
        });        
        
        //Wait 1/2 second for Mobile to receive roundStart, then check timer
        setTimeout(function(){         
          assert.ok($(".timer:contains('19')").length > 0, "timer has the text 19");    
          QUnit.start();
        }, 500);

      }, 1000);

    });

  


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