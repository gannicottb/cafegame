var LargeRight = (function() {
  //Private Variables
  //
  var session;
  var qrcode;

  //Private Functions
  //
  var init = function(){
    qrcode = new QRCode($("#qr_code")[0], {
      text: 'http://'+document.location.host+'/mobile.html',
      width: 256,
      height: 256,
      colorDark : "#000000",
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.H
    });
  };

  var loadQRCode = function(){
    // Courtesy of http://net.ipcalf.com/
    // NOTE: window.RTCPeerConnection is "not a constructor" in FF22/23
    var RTCPeerConnection = /*window.RTCPeerConnection ||*/ window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    
    if (RTCPeerConnection){
      var rtc = new RTCPeerConnection({iceServers:[]});      

      if (window.mozRTCPeerConnection) {      // FF needs a channel/stream to proceed
          rtc.createDataChannel('', {reliable:false});
      };
      
      rtc.onicecandidate = function (evt) {
          if (evt.candidate) grepSDP(evt.candidate.candidate);      
      };

      rtc.createOffer(function (offerDesc) {
          grepSDP(offerDesc.sdp);        
          rtc.setLocalDescription(offerDesc);        
      }, function (e) { console.warn("offer failed", e); });     

      var addrs = Object.create(null);
      addrs["0.0.0.0"] = false;
      function updateDisplay(newAddr) {
          if (newAddr in addrs) return;
          else addrs[newAddr] = true;
          var displayAddrs = Object.keys(addrs).filter(function (k) { return addrs[k]; });
          var link = "http://"+displayAddrs[0]+":8080/mobile.html"
          $("#link_text").html(link);
          qrcode.makeCode(link);
      }

      function grepSDP(sdp) {       
        var hosts = [];
        sdp.split('\r\n').forEach(function (line) { // c.f. http://tools.ietf.org/html/rfc4566#page-39
            if (~line.indexOf("a=candidate")) {     // http://tools.ietf.org/html/rfc4566#section-5.13
                var parts = line.split(' '),        // http://tools.ietf.org/html/rfc5245#section-15.1
                    addr = parts[4],
                    type = parts[7];
                if (type === 'host') updateDisplay(addr);
            } else if (~line.indexOf("c=")) {       // http://tools.ietf.org/html/rfc4566#section-5.7
                var parts = line.split(' '),
                    addr = parts[2];
                updateDisplay(addr);
            }
        });
      };       
    }  
  };

  var showAllLoggedInUsers = function(){
    session.call("com.google.guesswho.getLoggedInUsers").then(
       function(loggedInUsers){
          console.log("length of loggedInUsers ="+loggedInUsers.length);
          if(loggedInUsers.length > 0)
          {
            var guesses_body = $('#guesses_body');
            var icons = new EJS({url: 'templates/guesses_display.ejs'}).render({loggedInUsers: loggedInUsers});
            guesses_body.html(icons);
          }            
       },
       function(error){
          session.log();
          //retry
          setTimeout(showAllLoggedInUsers, 500);
       }
    ); 
  };

   //Load gray colored icons to represent players in the round
  var onRoundStart = function(args, kwargs, details){     
      showAllLoggedInUsers();
  }

  //Change icon color based on guess correctness
  var onNewGuess = function(args, kwargs, details){
    //Get icon representing the user
    var player_icon = $('[data-id="'+kwargs.id+'"]');

    //Change icon to green if guess is right, red if guess is wrong
    if(kwargs.correct)
      player_icon.attr('src','img/green_led.png');
    else
      player_icon.attr('src','img/red_led.png');
  }

  //Remove icon representing logged out user
  var onLogout = function(args, kwargs, details) {    
    var user_id = args[0];
    
    //Get icon representing the user
    var player_icon = $('[data-id="'+user_id+'"]');

    //Remove icon representing this user
    player_icon.remove();

  };

  //Add new icon to represent logged in user
  var onLogins = function(args, kwargs, details) {  
    $('#guesses_body').append(new EJS({
      url: 'templates/guesses_display.ejs'
    }).render({
      loggedInUsers: [kwargs.new_player]
    }));
  };

  //Display leader board on round end
  var onRoundEnd = function(args, kwargs, details){
    //args contains the top X leaders for the leader board
    if(args.length>0){
        var leader_board_body = $('#leader_board_body');
        var leaders = new EJS({url: 'templates/leader_board.ejs'}).render({leaders: args});
        leader_board_body.html(leaders);      
    }
  };

  var main = function(a_session){
    session = a_session;

    //Find local IP and display QR Code 
    if(document.location.host.split(':')[0] == "localhost"){
      loadQRCode();
    }
    
    //
    // SUBSCRIPTIONS
    // 

    // Subscribe to New Guess event
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

    // Subscribe to Logout event
    session.subscribe('com.google.guesswho.logout', onLogout).then(
      function(success){
         console.log("subscribed to ", success.topic);
      }, session.log
    );

    // Subscribe to Logins event
    session.subscribe("com.google.guesswho.newLogin", onLogins).then(
      function(success) {
        console.log("subscribed to ", success.topic);
      }, session.log
    );

    // Subscribe to Round End event
    session.subscribe("com.google.guesswho.roundEnd", onRoundEnd).then(
      function(success){
         console.log("subscribed to ", success.topic);
      }, session.log
    );
  };

  return {
    connect: function(){
      init();
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

      // now actually open the connection
      //
      connection.open();
    }
  }
})();
