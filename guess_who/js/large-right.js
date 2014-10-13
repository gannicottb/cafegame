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
}

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
var qrcode;

function main(session) {

  //Display all logged in users
  //showAllLoggedInUsers();

  //Find local IP and display QR Code  
  loadQRCode();

  //Display the QR code
  qrcode = new QRCode($("#qr_code")[0], {
      text: 'http://127.0.0.1:8080/mobile.html',
      width: 256,
      height: 256,
      colorDark : "#000000",
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.H
    }
  );

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
  
  //Load gray colored icons to represent players in the round
  var onRoundStart = function(args, kwargs, details){
     
      showAllLoggedInUsers();
  }

  //Change icon color based on guess correctness
  var onNewGuess = function(args, kwargs, details){
      
      new_guess = kwargs;

      // And then add the new_guess to the screen

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
    
    var new_player = kwargs.new_player;
    var new_players = [];
    new_players.push(new_player);
    
    var guesses_body = $('#guesses_body');

    var image = new EJS({url: 'templates/guesses_display.ejs'}).render({loggedInUsers: new_players});

    guesses_body.append(image);

  };

  //Display leader board on round end
  var onRoundEnd = function(args, kwargs, details){
     
    session.call("com.google.guesswho.getLoggedInUsers").then(
       function(success){
        
          loggedInUsers=success;  

          if(loggedInUsers.length > 0)
          {

            //Sort logged in users based on score
            loggedInUsers.sort(function(a,b){
              if(b.score > a.score){
                return 1;
              }
              if(b.score < a.score){
                return -1;
              }
              return 0;
            });

            var leader_board_body = $('#leader_board_body');
            var leaders = new EJS({url: 'templates/leader_board.ejs'}).render({leaders: loggedInUsers});
            leader_board_body.html(leaders);
          }            
       },
       function(error){
          session.log();
          //retry
       }

    ); 
  }

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
}

// now actually open the connection
//
connection.open();