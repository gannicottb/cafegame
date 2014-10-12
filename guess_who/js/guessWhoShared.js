var GuessWho = {

	setTimer: function(selector, timeout){

    var timeLeft = function(timeout) {
		  var now = new Date();
      // if we set a timer with a negative or zero time, simply set it to now
      if (timeout <= 0) timeout = now.getTime();
      // that way, timeLeft returns 0s instead of a huge negative number
      return Math.floor((timeout - now.getTime()) / 1000);
    }
    var renderTimer = function(time_left) {
      if (time_left <= 0) {
        clearInterval(timer_interval);
        timer_interval = null;
        time_left = 0;
      }
      var timer = new EJS({url: 'templates/timer.ejs'}).render({time_left: time_left});
      selector.html(timer);
    }

    //First, render the timer with timeout
    renderTimer(timeLeft(timeout));
    // Update the timer every second until the timer runs out
    var timer_interval = setInterval(function() {     
      renderTimer(timeLeft(timeout));
    }, 1000);

    return timer_interval;
	},

  clearTimer: function(selector, timer_id){
    clearInterval(timer_id);
    var timer = new EJS({url: 'templates/timer.ejs'}).render({time_left: 0});
    selector.html(timer);
  },

	states: {
	  WAIT: 0,
    PREPARE: 1,
    PROGRESS: 2
	}
};