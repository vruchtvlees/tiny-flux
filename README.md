# tiny-flux
A very small, fast implementation of the Flux design pattern

## Installation
```
npm install tiny-flux
```

## Download
If you're not using npm you can simply download the source here: [tiny-flux.js](https://raw.githubusercontent.com/bartjoyce/tiny-flux/master/tiny-flux.js), or as a minified file here: [bin/tiny-flux.min.js](https://raw.githubusercontent.com/bartjoyce/tiny-flux/master/bin/tiny-flux.min.js).

## Usage
```javascript

var Dispatcher = require('tiny-flux').Dispatcher,
	Store = require('tiny-flux').Store;

```
If you don't use `require()` you'll find `Dispatcher` and `Store` in the global scope.

## Documentation
### The `Dispatcher`

The `Dispatcher` is a simple constructor that takes no arguments. You construct a `Dispatcher` like so:
```javascript

var MyDispatcher = new Dispatcher();
// That's all!

```

#### `MyDispatcher` will have the following methods:
##### `register(store, callback)`
This registers a new store to the dispatcher. The `store` argument can be anything, but a TinyFlux `Store` object is recommended. The `callback` will be the function that's called for handling an action.

Example usage:
```javascript

var MyStore = {};
MyDispatcher.register(MyStore, function(action) {
	// ...
});

```

Note: If you use a custom object like in this example instead of a TinyFlux `Store`, your callback needs to return whether or not it emitted a change (boolean). If you use the TinyFlux `Store`, this will be handled automatically.

##### `dispatch(action)`
This dispatches the supplied object, `action`, handing it to all the registered stores.

Example usage:
```javascript

MyDispatcher.dispatch({
	type: ACTION_TYPE,
	property: // ...
});

```

##### `waitFor(store1, store2, ..., storeN)`
When called it makes sure that stores `1` through `N` have handled the current action before continuing in the current callback.

Note: Must be called from within a store callback.

Example usage:
```javascript

var MyStore = {};
MyDispatcher.register(MyStore, function(action) {
	// ...
});

var MyOtherStore = {};
MyDispatcher.register(MyOtherStore, function(action) {
	// ... might execute before MyStore, might execute after MyStore

	MyDispatcher.waitFor(MyStore);

	// ... will definitely execute after MyStore
});
```

##### `didEmitChange(store1, store2, ..., storeN)`
Tells you whether any of the stores from `1` through `N` have emitted a change. If any have, it'll return `true`, otherwise `false`.

Note: Must be called from within a store callback.

Example usage:
```javascript

var MyStore = {};
MyDispatcher.register(MyStore, function(action) {
	// ...
});

var MyOtherStore = {};
MyDispatcher.register(MyOtherStore, function(action) {
	MyDispatcher.waitFor(MyStore);
	if (!MyDispatcher.didEmitChange(MyStore))
		return;

	// ... will only execute if MyStore has changed.
	// ... useful for creating stores whos data depends on other stores
});
```

##### `addPostDispatchCallback(callback)` and `removePostDispatchCallback(callback)`
Internal functions...

### The `Store`

The `Store` is a constructor for creating a TinyFlux `Store` object that gives you all the functionality you want from a Flux Store in a simple package.

A `Store` works like so:
```javascript

var MyStore = new Store({
	dispatcher: MyDispatcher, // what Dispatcher does this store listen to?
	initialize: function() {

		this.myPrivateNumber = 0; // only accessible from inside the store
		this.myPrivateFunction = function() {
			// 'this' can always from within private functions as well
			return this.myPrivateNumber * 2;
		};

	},
	callback: function(action) {
		// this callback function is automatically registered with the dispatcher: MyDispatcher

		switch (action.type) {
			case INCREMENT_NUMBER:
				this.myPrivateNumber++;
				this.emitChange(); // call this to emit a change
				break;

			default:
				break;
		}

	},
	getPrivateNumber: function() {
		// public function
		return this.myPrivateNumber;
	},
	getPrivateCalculation: function() {
		return this.myPrivateFunction();
	}
});

```

#### `MyStore` will have the following methods:
##### `getPrivateNumber()` and `getPrivateCalculation()`
The methods you define in the constructor object will be available.

Example usage:
```javascript

MyStore.getPrivateNumber();

```

##### `addChangeListener(callback)`
This method allows you to listen for changes emitted by the `Store`.

Example usage:
```javascript

MyStore.addChangeListener(function() {
	updateUI();
});

```

##### `removeChangeListener(callback)`
This method allows you to remove callbacks from the `Store`.

Example usage in a React component:
```javascript

var MyComponent = React.createComponent({
	componentWillMount: function() {
		MyStore.addChangeListener(this.handleChange);
	},
	componentWillUnmount: function() {
		MyStore.removeChangeListener(this.handleChange);
	},
	handleChange: function() {
		// ...
	},
	render: function() {
		// ...
	}
});

```