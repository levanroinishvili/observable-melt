const Rx = require('rxjs/Rx');

Rx.Observable.prototype.melt = function(startImediate,persistent) {
	// Wrap the source observable into a smart 'cacoon'
	//   which will 'protect' it from being re-subscribed on every subsequent subscription

	let cocoon = {
		sourceObservable   : this, // Retain reference to the source observable (through closure), to re-subscribe later if necessary
		subscriptions      : [],   // Hold data about each subscription: {id:our_internal_id, observer:observer_used_for_each_subscribe, completed:bollean }
		uplink             : null, // Hold reference to the subscription to the source observable, when subscribed
		nextId             : 0,    // Give each subscription unique id so that they can be identified later by unsubscribe() method
		sourceIsSubscribed :       // Teach cocoon to identify if the subscription to the source observable is active
					function () { return cocoon.uplink && cocoon.uplink.closed===false ; },
		subscribeToSource  : null // Teach cocoon to subscribe to the source observable - implemented below
	};

	// Implement login to subscribe to the source observable
	cocoon.subscribeToSource = function() {
		cocoon.uplink = cocoon.sourceObservable.subscribe({
			// When the source observable emits event 'next', propagate the value to all subscribed observers, i.e. call each observer.next(value)
			next:    	val => {
							for (i=0; i<cocoon.subscriptions.length; i++ )
								if (!cocoon.subscriptions[i].closed && typeof cocoon.subscriptions[i].observer.next === 'function')
									cocoon.subscriptions[i].observer.next(val) ;
						},

			// When the source observable emits event 'error', propagate the error to all subscribed observers, i.e. call each observer.error(value)
			error:    	err => {
							for (i=0; i<cocoon.subscriptions.length; i++ )
								if (!cocoon.subscriptions[i].closed && typeof cocoon.subscriptions[i].observer.error === 'function')
									cocoon.subscriptions[i].observer.error(err) ;
						},

			// When the source observable emits event 'complete', propagate the event to all subscribed observers, i.e. call each observer.next(value)
			complete: 	()  => {
							for (i=0; i<cocoon.subscriptions.length; i++ )
								if (!cocoon.subscriptions[i].closed && typeof cocoon.subscriptions[i].observer.complete === 'function')
									cocoon.subscriptions[i].observer.complete() ;
						}
		});
	};

  // If startImediate is true, subscribe to the source. However, this should not actually be done immediately
  // as there may me a .subscribe() method chained to the observer creation, which will then did not have chance to register before
  // the source activates.
  // e.g. the following would not output anything:
  //    Rx.Observable.of(1,2,3).melt(true).subscribe(console.log);
  // This problem can be alleviated by subscribing when the function stack is empty, i.e. all chained methods have been processed.
	if ( startImediate ) setTimeout(function() {cocoon.subscribeToSource();});

	// Return a new (surrogate) observable, which will retain link to the 'cocoon' object through closure
	// Every time an observer subscribes to this surrogate observable, a new 'subscription' object is merely added to cocoon.subscriptions
	// The source observable is never subscribed more than once simultanousely
	// The 'next', 'error' and 'complete' events are then propagated to all active subscriptions through the cocoon.subscriptions array
	let surrogate = Rx.Observable.create(function(o) {
    // It is possible that there is no subscription to the source observable
    // In such case first register child subscription, and only then subscribe to the source
		// Subscription to the source observable is now created
		// But the main job of this function is to create a 'child' subscription to which events from the source observable will propagete
		// First, create a wrapper object which will be accessible (through closure) to the unsubscribe() method
		let thisSubscriptionWrapper = {
			id: ++cocoon.nextId,	// Give the subscription a unique internal id to later identify it in the unsubscribe() method
			observer: o,			// Retain access to the observer that subscribed. We will need its methods next(), error() and complete()
			closed: false		// When observer unsubscribes, mark the subscription as closed, rather than remove it from the array
									//   Removing from the array can interrupt propagation of events.
		};

		// Push the wrapper to the subscriptions array.
		// This will be used for propagating events emetted by the source observable down to children subscriptions
		// Also, unsubscribe will mark the subscription as closed - to stop event propagation
		cocoon.subscriptions.push(thisSubscriptionWrapper);

    // If there is no active subscription to the source observable, subscribe to it
    // Since the child subscription is already registered, source observable can start emitting immediately
    if ( ! cocoon.sourceIsSubscribed() ) cocoon.subscribeToSource();

		// Return the function which can be used to unsubscribe from current subscriptions
		return function() {
			let empty = true, found = false;
			for ( let i=0; i<cocoon.subscriptions.length; i++ ) {
				if ( cocoon.subscriptions[i].id === thisSubscriptionWrapper.id ) {
					found = true;
					cocoon.subscriptions[i].closed = true;
					//cocoon.subscriptions.splice(i,1);
				} else if ( !cocoon.subscriptions[i].closed ) empty = false;
				if ( found && ! empty ) break;
			}
			if ( empty && ! persistent ) { // cocoon.subscriptions.length===0
				if ( typeof cocoon.uplink.unsubscribe === 'function' && !(typeof cocoon.uplink.closed === 'boolean' && cocoon.uplink.closed) ) cocoon.uplink.unsubscribe();
				cocoon.subscriptions = [];
			}

			// When the function stack is next empty, schedule cleaning of the cocoon.subscriptions array from closed subscriptions
			setTimeout(()=>{
				for (let i=0; i<cocoon.subscriptions.length; i++) {
					if ( cocoon.subscriptions[i].closed ) cocoon.subscriptions.splice(i,1);
				}
			});
		};
	});

	// Teach surrogate to connect to the source observable
	surrogate.connect = function() {
		if ( ! cocoon.sourceIsSubscribed() ) cocoon.subscribeToSource();
		return cocoon;
	};

	return surrogate; // Return a replacement observable
};

module.exports = Rx;
