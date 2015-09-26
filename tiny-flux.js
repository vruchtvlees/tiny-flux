var Dispatcher = function Dispatcher() {
    var IDLE = 0,
        DISPATCHING = 1,
        DISPATCHED = 2;

    var self = this;

    self.phase = IDLE;
    self.stores = [];

    self.register = function(store, callback) {
        if (self.phase === DISPATCHING)
            throw 'Cannot register new store whilst dispatching!';

        self.stores.push({
            storeObj: store,
            callback: callback
        });
    };

    self.dispatch = function(action) {
        if (self.phase === DISPATCHING)
            throw 'Cannot dispatch an action whilst another is already being dispatched';

        self.phase = DISPATCHING;
        postDispatchCallbacks = [];

        for (var i = self.stores.length - 1; i >= 0; i--) {
            self.stores[i].phase = IDLE;
            self.stores[i].didEmitChange = false;
        }

        for (var i = self.stores.length - 1; i >= 0; i--)
            dispatchActionToStore(action, self.stores[i]);

        for (var i = postDispatchCallbacks.length - 1; i >= 0; i--)
            postDispatchCallbacks[i]();

        self.phase = IDLE;
    };

    var postDispatchCallbacks;
    self.addPostDispatchCallback = function(callback) {
        if ((self.phase !== DISPATCHING) ||
            (postDispatchCallbacks.indexOf(callback)) !== -1)
            return;

        postDispatchCallbacks.push(callback);
    };
    self.removePostDispatchCallback = function(callback) {
        if (self.phase !== DISPATCHING)
            return;

        var index = postDispatchCallbacks.indexOf(callback);
        if (index === -1)
            return;

        postDispatchCallbacks[index] = (function(){});
    };

    var waitForStack = [];
    var dispatchActionToStore = function(action, store) {
        if (store.phase === DISPATCHED)
            return;

        if (store.phase === DISPATCHING)
            throw 'Cannot dispatch action: circular dependency amongst stores';

        store.phase = DISPATCHING;

        waitForStack.push(self.waitFor);
        self.waitFor = function(store) {
            if (arguments.length !== 1) {
                for (var i = 0; i < arguments.length; i++)
                    self.waitFor(arguments[i]);

                return;
            }

            for (var i = self.stores.length - 1; i >= 0; i--)
                if (self.stores[i].storeObj === store)
                    break;

            if (i < 0)
                throw 'Unregistered store';

            dispatchActionToStore(action, self.stores[i]);
        };

        store.didEmitChange = store.callback(action);

        self.waitFor = waitForStack.pop(self.waitFor);

        store.phase = DISPATCHED;
    };

    self.waitFor = (function() {});

    self.didEmitChange = function(store) {
        if (arguments.length !== 1) {
            for (var i = 0; i < arguments.length; i++)
                if (self.didEmitChange(arguments[i]))
                    return true;

            return false;
        }

        for (var i = self.stores.length - 1; i >= 0; i--)
            if (self.stores[i].storeObj === store)
                break;

        if (i < 0)
            throw 'Unregistered store';

        return self.stores[i].didEmitChange;
    };
    
    return self;
}

var Store = function Store(options) {
    var innerSelf = {};

    // Copy options over to instance
    var keys = Object.keys(options);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i],
            obj = options[key];

        this[key] = (typeof obj === 'function') ? obj.bind(innerSelf) : obj;
    }

    var handlerFns = [];
    this.addChangeListener = function(handlerFn) {
        handlerFns.push(handlerFn);
        return handlerFn;
    };
    this.removeChangeListener = function(handlerFn) {
        var index = handlerFns.indexOf(handlerFn);
        if (index === -1)
            return;

        this.dispatcher.removePostDispatchCallback(handlerFn);

        if (handlerFns.length === 1) {
            handlerFns = [];
            return;
        }

        var popped = handlerFns.pop();
        if (popped === handlerFn)
            return;

        handlerFns[index] = popped;
    };

    var didEmitChange = false;
    innerSelf.emitChange = (function() {
        for (var i = handlerFns.length - 1; i >= 0; i--)
            this.dispatcher.addPostDispatchCallback(handlerFns[i]);

        didEmitChange = true;
        
    }).bind(this);

    var innerCallback = this.callback;
    this.callback = function(action) {
        didEmitChange = false;

        innerCallback(action);

        return didEmitChange;
    };
    this.dispatcher.register(this, this.callback);

    if (this.initialize)
        this.initialize();

    return this;
}

module && (module.exports = {
    Dispatcher: Dispatcher,
    Store: Store
});