# observable-melt

This adds `melt()` method to Microsoft's [RxJS](http://reactivex.io/) library. `melt()` converts a cold observable to a hot observable.
This is similar to `publish()` method, included in the RxJS.

### Cold vs Hot Observables
Cold observables do not emit values until subscribed. They are also re-created for each subscription.
(Read [more](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/gettingstarted/creating.md))

## Installation and usage
The following assumes you have `node.js` installed with `npm` package manager.
```
git clone https://github.com/levanroinishvili/observable-melt.git observable-melt
cd observable-melt
npm install

// Then, inside a file
const Rx = require('./index');

Rx.Observable
  .interval(1000)
  .melt(startImediate,persistent);
```
* startImediate : if true, immediately subscribe to the source observable. Otherwsie,
subscribe to source as necessary.
* persistent    : if true, do not automatically unsubscribe from source, when all children unsubscribe

For example:
``` JavaScript
let source = Rx.Observable.interval(1000); // Emit values every second: 0,1,2,3,...
source.take(10).subscribe(console.log); // Will start outputting 0,1,2,...9
// in a few seconds, subscribe again
source.take(10).subscribe(console.log); // Will start outputting values from 0
```

This is not always desirable. For example, consider a ticker which should get values from a server
once a second. If we subscribe three times to the ticker, we do not want it to activate three times a second.
This issue can be solved by the `publish()` method, included in the RxJS. And, it can also be solved with
my `melt()` method

### Examples
From `node.js` you can run `demo.js` for a small demonstration.

``` JavaScript
let source = Rx.Observable
              .interval(1000) // Emit values every second
              .melt();        // Convert cold observable to hot

// Create first subscription
let subscription1 = source.subscribe(val=>{console.log('Observer 1 received',val);});
//      Starts outputting 0,1,2,3,...

// After a few seconds create a second subscription
let subscription2 = source.subscribe(val=>{console.log('Observer 2 received',val);});
//      Starts outputting in sync with the first observable:
//    0,1,2,3,4,5,6,7,8,9,...
//                6,7,8,9,...

 subscription1.unsubscribe();
 // Second subscription keeps outputting values

 subscription2.unsubscribe();
```
