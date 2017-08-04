# observable-melt

This code adds the `melt()` method to Microsoft's [RxJS](http://reactivex.io/) library. `melt()` converts a **cold observable** to a **hot observable**. It is somewhat similar to the `publish()` method, already included in RxJS. The difference is that `melt()`
can automatically subscribe and unsubscribe to the source as needed and will do so correctly. `publish()` solves a similar challenge
by using an extra `connect()` method, to avoid some [tricky situations](#difference-between-publish-and-melt).

`melt()` does not rely on `publish()` in any way.

`publish()` and `connect()` work together well. This piece of code was made just out of interest, as a fun exercise.

* [Cold vs Hot Observables](#cold-vs-hot-observables)
* [Why Convert Cold to Hot](#why-convert-cold-to-hot)
* [Acquisition and usage](#acquisition-and-usage)
* [Examples](#examples)
* [Difference between publish and melt](#difference-between-publish-and-melt)

### Cold vs Hot Observables

**Hot observables** exist independently from their subscriptions. When an observer subscribes to a hot source,
the observer will miss all values emitted before the subscription took place. And if another observer subscribes later,
from that moment both will continue to receive the same values (almost) simultaneously.
``` JavaScript
// Observable emits values: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, ...
//               Observer 1 subscribes: 4, 5, 6, 7, 8, 9, 10, 11, ...
//                     Observer 2 subscribes: 6, 7, 8, 9, 10, 11, ...
```

**Cold observables**, on the other hand, do not emit values until subscribed. They are 'created' afresh for each subscription,
which means they will always re-start from the same initial value (with some caveats). Late subscribers do not miss
any values.
``` JavaScript
// Observable created: - no values. 're-created' on each subscription.
//               Observer 1 subscribes: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, ...
//                     Observer 2 subscribes: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, ...
```
Hot observables are usually bound to 'natural' events, like mouse clicks. For example:
``` JavaScript
Rx.Observable.fromEvent(button,'click');  // Emits click events at every click
```

Cold observables are 'artificially' created and not bound to 'natural' events. For example:
``` JavaScript
Rx.Observable.of(1,2,3);        // Emit three values: 1,2 and 3
Rx.Observable.interval(1000);   // Emit incremental values each second
```

(Read [more](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/gettingstarted/creating.md))

## Why Convert Cold to Hot
Sometimes it is desirable to convert a cold observable to a hot one. For example, if we want to implement a ticker,
which should get data from a remote server once a minute. If five observers were to subscribe to the underlying observable,
we would not want the remote server to be queried five times a minute. Yet this is precisely what would happen if the
observable is implemented, say, with `Observable.create()` without deliberatly 'protecting' the source from being
're-created' on each subscription.

The `publish()` method, and of course now the `melt()` method, represent that deliberate 'protection' of the source.
They both return a surrogate observable, which itself subscribes to the underlying source only once and then propagates events
down to its own subscribers.

## Acquisition and usage
The following assumes you have `node.js` installed with `npm` package manager.
```
git clone https://github.com/levanroinishvili/observable-melt.git observable-melt
cd observable-melt
npm install

// Then, inside a js file
const Rx = require('./index'); // With correct path to index.js file

Rx.Observable
  .interval(1000)
  .melt(startImediate,persistent);
```
* startImediate : if true, immediately subscribe to the source observable. Otherwsie,
subscribe to source as necessary. Defaults to `false`.
* persistent    : if true, do not automatically unsubscribe from source, when all children unsubscribe.
Defaults to `false`.

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

## Examples
In addition to sample use below, `demo.js` can be run (e.g. using `node.js`) for a small demonstration.

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
## Difference between publish and melt
Consider these two, slightly different, uses of `publish()`:
``` JavaScript
// ------------------------------ Use one:
let source = Rx.Observable
              .interval(1000) // Emit values every second
              .publish();     // convert to hot observable using publish()
 let subscription = source.subscribe(console.log);  // Subscribe with a very simple observable
 
 // ------------------------------ Use two:
 let subscription = Rx.Observable
               .of(0,1,2,3,4,5)
               .publish()
               .subscribe(console.log);
```
The second use is trickier to implement internally. As soon as `publish()` subscribes to the source observable `.of(0,1,2,3,4,5)`,
it will immediately emit all values and complete. Only then the method `.subscribe()` will fire, but will not observe any
values. To solve this problem, `publish()` does not automatically subscribe to the source observable. Instead, the source is
activated by a separate call to `connect()`. By separating subscription to the source from subscription to the 'children',
the tricky situation is avoided.

`melt()` will handle such cases correctly. That is, subscribed observers will receive all expected values.
