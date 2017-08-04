const Rx = require('./index');
const chalk = require('chalk');

// Create source observable
let source = Rx.Observable
              .of('======= Source Connected =======',-3,-2,-1) // Emit connection sygnal at start
              .concat( Rx.Observable.interval(1000).map(n=>n+2) ) // then emits values every 3 seconds, starting from value 1
              .take(30)       // Take first 20 values
              .melt(true);        // melt - convert cold observable to hot

// Will use some helper functions (defined later in the code) to make this (hopefully) more readable

// Subscribe Bear in 1 seconds from start and keep subscribed for 10 seconds
subscribe_later(source,'Bear' /* Observer 'name' */, 1 /* Subscription delay in seconds */, 20 /* Keep subscribed for seconds*/);

// Subscribe Cheetah in 4 seconds from start and keep subscribed for 5 seconds
subscribe_later(source,'Cheetah' /* Observer 'name' */, 4 /* Subscription delay in seconds */, 5 /* Keep subscribed for seconds*/);

// Subscribe Rabbit in 7 seconds from start and keep subscribed for 3 seconds
subscribe_later(source,'Rabbit' /* Observer 'name' */, 7 /* Subscription delay in seconds */, 3 /* Keep subscribed for seconds*/);


// ----------------------------- Helper functions -------------------------------

function subscribe_later(source,observerName,subscribeDelaySeconds,keepSubscribedForSeconds=null) {
  setTimeout(function() {
      console.log();  // Skip a line for visibility when a new subscription is made
      timedlog('------ New Subscription ------',observerName,'subscribed for',keepSubscribedForSeconds,' seconds ------');
      let subscription = source.subscribe(observer(observerName));
      if (keepSubscribedForSeconds) setTimeout(function() {
//console.log(subscription);
        subscription.unsubscribe();
        timedlog(' ----------------------',observerName,'unsubscribed -----------------------');
        console.log(); // Skip a line for visibility when a subscription is over
      } , 1000 * keepSubscribedForSeconds);
    },
    1000 * subscribeDelaySeconds
  );
}

// Get current time, formatted as hh:mm:ss [milliseconds]
function now() {
	let now = new Date();
	let h = String(now.getHours()),
		m = String(now.getMinutes()),
		s = String(now.getSeconds()),
		b = String(now.getMilliseconds());

	h = '0'.repeat(h.length<2?2-h.length:0).concat(h);
	m = '0'.repeat(m.length<2?2-m.length:0).concat(m);
	s = '0'.repeat(s.length<2?2-s.length:0).concat(s);
	b = '0'.repeat(b.length<3?3-b.length:0).concat(b);
	let time = chalk.blue(h + ':' + m + ':') + chalk.redBright(s) + chalk.gray(' [' + b + ']');
	return time;
}

// Prepent console.log with current time
function timedlog() {
	console.log.call(null,now(),...arguments);
}


// Easily creat 'named' observers
function observer(name) {
  observer.count = (typeof observer.count === 'undefined'? 0 : ++observer.count );
  let index = 0, prefix = ' '.repeat(2*observer.count);
  return {
    next : val => {
      timedlog(prefix,'||--->',++index,'Observer',name,'received',val);
    },
    error : err => {
      timedlog(prefix,'ERROR:',++index,'Observer',name,'erred with',err);
    },

    complete : () => {
      timedlog(prefix,'===>||',++index,'Observer',name,'completed');
    }
  };
}
