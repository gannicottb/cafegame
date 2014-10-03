var Test = (function() {

  //Private variables
  //

  var session;
  var correct_answer = {id: 1, keyword: "Mrs. Right"};
  var wrong_answer = {id: 0, keyword: "Mr. Wrong"};
  var round_duration = 5;
 
  //Private functions
  //

  var setup = function(){
    Backend.connect();
    Mobile.connect();            
  };

  var testRoundStart = function()  {
    session.publish("com.google.guesswho.roundStart", [wrong_answer, correct_answer],
     {
      correct_answer: correct_answer,
      round: 1,
      round_end: new Date().getTime() + (round_duration * 1000)
    });        
        
  };

  var testRoundEnd = function() {
    session.publish("com.google.guesswho.roundEnd",[], {
      round: 1,
      answers: correct_answer
    });
  };


  var main = function(autobahn_session){
    session = autobahn_session;
    console.log('test connected on', session);
    sessionStorage.clear();

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
      setup();     
      
      expect(2);

      setTimeout(function(){
        assert.equal(sessionStorage.getItem("id"), Mobile.user().id, "sessionStorage and Mobile.user agree on id");  
        assert.ok($(".name_container:contains('"+Mobile.user().name+"')").length > 0, "name_container has the user name");    
        QUnit.start();
      }, 1000);
    });

    QUnit.asyncTest("Mobile sets timer on round start", function(assert){
      setup();

      expect(1);

      // Wait one second for Mobile to connect, then publish roundStart
      
      setTimeout(function(){

        testRoundStart();       
        
        //Wait 1/2 second for Mobile to receive roundStart, then check timer
        setTimeout(function(){         
          assert.ok($(".timer:contains('"+(round_duration - 1)+"')").length > 0, "timer set to correct value");    
          
          testRoundEnd();

          QUnit.start();              
        }, 500);

      }, 1000);

    });

    // QUnit.asyncTest("Mobile populates buttons on round start", function(assert){
    //   setup();
      
    //   expect(2);

    //   // Wait one second for Mobile to connect, then publish roundStart     
    //   setTimeout(function(){
        
    //     testRoundStart();      
        
    //     //Wait 1/2 second for Mobile to receive roundStart, then check timer
    //     setTimeout(function(){         
    //       for(var btn = 0; btn < $("#input_body").children().length; btn++){
    //         var button = $("#input_body").children()[btn];
    //         assert.equal($(button).val(), btn, "button"+btn+" has correct value");
    //       }

    //       testRoundEnd();

    //       QUnit.start();                        
    //     }, 500);

    //   }, 1000);

    // });

    


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