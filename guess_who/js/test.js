/*
 * This test suite is built on QUnit http://qunitjs.com/cookbook/
 * The Test module runs alongside a Mobile and Backend module (all connected to Crossbar)
 * The tests themselves are largely integration tests (ensuring that the behavior is correct)
 * Check out the examples to get an idea of how to write new tests.
 * Author: Brandon Gannicott
 * Project: Google Practicum 2014: Collaborative Games for Large Displays
 */

var Test = (function() {

  //Private variables
  //

  var session;
  var correct_answer, wrong_answer;
  var round_duration, pause;

  //Private functions
  //

  var init = function() {

    correct_answer = {
      id: 1,
      keyword: "Mrs. Right"
    };
    wrong_answer = {
      id: 0,
      keyword: "Mr. Wrong"
    };
    round_duration = 5;

    pause = 50; // this value seems to work - latency is quite low
  }

  var defined = function(val) {
    return val != null && val != undefined
  }

  var publishRoundStart = function() {
    session.publish("com.google.guesswho.roundStart", [wrong_answer, correct_answer], {
      correct_answer: correct_answer,
      round: 1,
      round_end: new Date().getTime() + (round_duration * 1000)
    });

  };

  var publishRoundEnd = function() {
    session.publish("com.google.guesswho.roundEnd", [], {
      round: 1,
      answers: correct_answer
    });
  };

  // Call setupThen before every test
  // The setTimeout() calls account for network latency
  //
  var setupThen = function(doThis) {
    sessionStorage.clear();
    Backend.connect();
    setTimeout(function() {
      Mobile.connect();
      setTimeout(function() {
        doThis();
      }, pause);
    }, pause);
  };

  // Pass testRound() into setupThen() to test a game round
  // The assertions object may contain an assertion to run after the round starts, 
  // or an assertion to run after the round ends.
  // IMPORTANT: the assertion functions passed in must call QUnit.start() as the last call
  //
  var testRound = function(assertions) {
    publishRoundStart();
    setTimeout(function() {
      //wait, then test assertion after round start
      if (assertions.afterStart != undefined) {
        assertions.afterStart();
      }
      setTimeout(function() {
        //wait, then end the round
        publishRoundEnd();
        setTimeout(function() {
          //wait, then test assertion after round end
          if (assertions.afterEnd != undefined) {
            assertions.afterEnd();
          }
        }, pause);
      }, pause);
    }, pause);
  };

  var main = function(autobahn_session) {
    init();
    session = autobahn_session;
    console.log('test connected on', session);

    // Each call to QUnit adds the test to the queue. They are not guaranteed to run in order
    //
    QUnit.asyncTest("Mobile logged in and set its id", function(assert) {
      expect(4);

      setupThen(function() {
        assert.ok(defined(sessionStorage.getItem("id")), "sessionStorage id not null");
        assert.ok(defined(Mobile.user().id), "Mobile user id not null");
        assert.equal(sessionStorage.getItem("id"), Mobile.user().id, "sessionStorage and Mobile.user agree on id");
        assert.ok($(".name_container:contains('" + Mobile.user().name + "')").length > 0, "name_container has the user name");
        QUnit.start();
      });
    });

    QUnit.asyncTest("Mobile logged in and changes its name", function(assert) {
      expect(2);

      setupThen(function() {
        // Expose the name change elements
        $("#qunit-fixture .name_container").trigger('click');

        var edit_name_field = $("#qunit-fixture #edit_name");
        var submit_name_button = $("#qunit-fixture #submit_name");
        var new_name = "Foobar";

        edit_name_field.val(new_name);
        submit_name_button.trigger('click');
        setTimeout(function() {
          //Verify that the name has changed
          assert.ok(Mobile.user().name == new_name, "the name changed")
          assert.ok($(".name_container:contains('" + Mobile.user().name + "')").length > 0, "name_container has the user name");
          QUnit.start();
        }, pause);
      });
    });

    QUnit.asyncTest("Mobile sets timer on round start", function(assert) {
      expect(1);
      setupThen(function() {
        testRound({
          afterStart: function() {
            assert.ok($(".timer:contains('" + (round_duration - Math.ceil(pause / 1000)) + "')").length > 0, "timer set to correct value");
            QUnit.start();
          }
        });
      });
    });

    QUnit.asyncTest("Mobile populates buttons on round start", function(assert) {
      expect(2);

      setupThen(function() {
        testRound({
          afterStart: function() {
            var input_body = $("#qunit-fixture #input_body");
            for (var btn = 0; btn < input_body.children().length; btn++) {
              var button = input_body.children()[btn];
              assert.equal($(button).val(), btn, "button" + btn + " has correct value");
            }
            QUnit.start();
          }
        });
      });
    });

    QUnit.asyncTest("User submits wrong answer", function(assert) {
      expect(2);

      setupThen(function() {
        testRound({
          afterStart: function() {
            Backend.debug.setCorrectAnswer(correct_answer);
            Backend.debug.roundInProgress(true);
            // Click a button
            var wrong_button = $("#qunit-fixture #input_body .answer[value='" + wrong_answer.id + "']");
            wrong_button.trigger('click');
            // wait, then check to see if the button reacts correctly
            setTimeout(function() {
              assert.ok(wrong_button.prop('disabled'), "the incorrect answer button is disabled");
              assert.ok(wrong_button.hasClass('incorrect'), "the incorrect answer button has class incorrect");
              QUnit.start();
            }, pause);
          }
        });
      });
    });

    QUnit.asyncTest("User submits right answer", function(assert) {
      expect(2);

      setupThen(function() {
        testRound({
          afterStart: function() {
            Backend.debug.setCorrectAnswer(correct_answer);
            Backend.debug.roundInProgress(true);
            // Click the correct answer
            var correct_button = $("#qunit-fixture #input_body .answer[value='" + correct_answer.id + "']");
            correct_button.trigger('click');
            // wait, then check to see if the button reacts correctly
            setTimeout(function() {
              assert.ok(correct_button.prop('disabled'), "the correct answer button is disabled");
              assert.ok(correct_button.hasClass('correct'), "the correct answer button has class correct");
              QUnit.start();
            }, pause);
          }
        });
      });
    });

    QUnit.asyncTest("Mobile displays the correct answer in the input body on round end", function(assert) {
      expect(4);

      setupThen(function() {
        testRound({
          afterEnd: function() {
            var input_body = $("#qunit-fixture #input_body");
            var answer = input_body.find('.answer:first');
            // Make sure the display is correct after the round ends
            assert.equal(input_body.children().length, 1, "there is only one answer button");
            assert.ok(answer.prop('disabled'), "the correct answer button is disabled");
            assert.ok(answer.hasClass('correct'), "the correct answer button has class correct");
            assert.equal(answer.html(), correct_answer.keyword, "the correct keyword is displayed in the button");
            QUnit.start();
          }
        });
      });
    });

    // More tests to come


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