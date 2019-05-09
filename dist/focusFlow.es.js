// * Released under the MIT License.

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var runtime_1 = createCommonjsModule(function (module) {
/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var runtime = (function (exports) {

  var Op = Object.prototype;
  var hasOwn = Op.hasOwnProperty;
  var undefined; // More compressible than void 0.
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";
  var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
    var generator = Object.create(protoGenerator.prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
  }
  exports.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  // This is a polyfill for %IteratorPrototype% for environments that
  // don't natively support it.
  var IteratorPrototype = {};
  IteratorPrototype[iteratorSymbol] = function () {
    return this;
  };

  var getProto = Object.getPrototypeOf;
  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  if (NativeIteratorPrototype &&
      NativeIteratorPrototype !== Op &&
      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
    // This environment has a native %IteratorPrototype%; use it instead
    // of the polyfill.
    IteratorPrototype = NativeIteratorPrototype;
  }

  var Gp = GeneratorFunctionPrototype.prototype =
    Generator.prototype = Object.create(IteratorPrototype);
  GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
  GeneratorFunctionPrototype.constructor = GeneratorFunction;
  GeneratorFunctionPrototype[toStringTagSymbol] =
    GeneratorFunction.displayName = "GeneratorFunction";

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
      prototype[method] = function(arg) {
        return this._invoke(method, arg);
      };
    });
  }

  exports.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  exports.mark = function(genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
      if (!(toStringTagSymbol in genFun)) {
        genFun[toStringTagSymbol] = "GeneratorFunction";
      }
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `hasOwn.call(value, "__await")` to determine if the yielded value is
  // meant to be awaited.
  exports.awrap = function(arg) {
    return { __await: arg };
  };

  function AsyncIterator(generator) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if (record.type === "throw") {
        reject(record.arg);
      } else {
        var result = record.arg;
        var value = result.value;
        if (value &&
            typeof value === "object" &&
            hasOwn.call(value, "__await")) {
          return Promise.resolve(value.__await).then(function(value) {
            invoke("next", value, resolve, reject);
          }, function(err) {
            invoke("throw", err, resolve, reject);
          });
        }

        return Promise.resolve(value).then(function(unwrapped) {
          // When a yielded Promise is resolved, its final value becomes
          // the .value of the Promise<{value,done}> result for the
          // current iteration.
          result.value = unwrapped;
          resolve(result);
        }, function(error) {
          // If a rejected Promise was yielded, throw the rejection back
          // into the async generator function so it can be handled there.
          return invoke("throw", error, resolve, reject);
        });
      }
    }

    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return new Promise(function(resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise =
        // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(
          callInvokeWithMethodAndArg,
          // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg
        ) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
  }

  defineIteratorMethods(AsyncIterator.prototype);
  AsyncIterator.prototype[asyncIteratorSymbol] = function () {
    return this;
  };
  exports.AsyncIterator = AsyncIterator;

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  exports.async = function(innerFn, outerFn, self, tryLocsList) {
    var iter = new AsyncIterator(
      wrap(innerFn, outerFn, self, tryLocsList)
    );

    return exports.isGeneratorFunction(outerFn)
      ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      context.method = method;
      context.arg = arg;

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          var delegateResult = maybeInvokeDelegate(delegate, context);
          if (delegateResult) {
            if (delegateResult === ContinueSentinel) { continue; }
            return delegateResult;
          }
        }

        if (context.method === "next") {
          // Setting context._sent for legacy support of Babel's
          // function.sent implementation.
          context.sent = context._sent = context.arg;

        } else if (context.method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw context.arg;
          }

          context.dispatchException(context.arg);

        } else if (context.method === "return") {
          context.abrupt("return", context.arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          if (record.arg === ContinueSentinel) {
            continue;
          }

          return {
            value: record.arg,
            done: context.done
          };

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(context.arg) call above.
          context.method = "throw";
          context.arg = record.arg;
        }
      }
    };
  }

  // Call delegate.iterator[context.method](context.arg) and handle the
  // result, either by returning a { value, done } result from the
  // delegate iterator, or by modifying context.method and context.arg,
  // setting context.delegate to null, and returning the ContinueSentinel.
  function maybeInvokeDelegate(delegate, context) {
    var method = delegate.iterator[context.method];
    if (method === undefined) {
      // A .throw or .return when the delegate iterator has no .throw
      // method always terminates the yield* loop.
      context.delegate = null;

      if (context.method === "throw") {
        // Note: ["return"] must be used for ES3 parsing compatibility.
        if (delegate.iterator["return"]) {
          // If the delegate iterator has a return method, give it a
          // chance to clean up.
          context.method = "return";
          context.arg = undefined;
          maybeInvokeDelegate(delegate, context);

          if (context.method === "throw") {
            // If maybeInvokeDelegate(context) changed context.method from
            // "return" to "throw", let that override the TypeError below.
            return ContinueSentinel;
          }
        }

        context.method = "throw";
        context.arg = new TypeError(
          "The iterator does not provide a 'throw' method");
      }

      return ContinueSentinel;
    }

    var record = tryCatch(method, delegate.iterator, context.arg);

    if (record.type === "throw") {
      context.method = "throw";
      context.arg = record.arg;
      context.delegate = null;
      return ContinueSentinel;
    }

    var info = record.arg;

    if (! info) {
      context.method = "throw";
      context.arg = new TypeError("iterator result is not an object");
      context.delegate = null;
      return ContinueSentinel;
    }

    if (info.done) {
      // Assign the result of the finished delegate to the temporary
      // variable specified by delegate.resultName (see delegateYield).
      context[delegate.resultName] = info.value;

      // Resume execution at the desired location (see delegateYield).
      context.next = delegate.nextLoc;

      // If context.method was "throw" but the delegate handled the
      // exception, let the outer generator proceed normally. If
      // context.method was "next", forget context.arg since it has been
      // "consumed" by the delegate iterator. If context.method was
      // "return", allow the original .return call to continue in the
      // outer generator.
      if (context.method !== "return") {
        context.method = "next";
        context.arg = undefined;
      }

    } else {
      // Re-yield the result returned by the delegate method.
      return info;
    }

    // The delegate iterator is finished, so forget it and continue with
    // the outer generator.
    context.delegate = null;
    return ContinueSentinel;
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  Gp[toStringTagSymbol] = "Generator";

  // A Generator should always return itself as the iterator object when the
  // @@iterator function is called on it. Some browsers' implementations of the
  // iterator prototype chain incorrectly implement this, causing the Generator
  // object to not be returned from this call. This ensures that doesn't happen.
  // See https://github.com/facebook/regenerator/issues/274 for more details.
  Gp[iteratorSymbol] = function() {
    return this;
  };

  Gp.toString = function() {
    return "[object Generator]";
  };

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  exports.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  exports.values = values;

  function doneResult() {
    return { value: undefined, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      // Resetting context._sent for legacy support of Babel's
      // function.sent implementation.
      this.sent = this._sent = undefined;
      this.done = false;
      this.delegate = null;

      this.method = "next";
      this.arg = undefined;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" &&
              hasOwn.call(this, name) &&
              !isNaN(+name.slice(1))) {
            this[name] = undefined;
          }
        }
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;

        if (caught) {
          // If the dispatched exception was caught by a catch block,
          // then let that catch block handle the exception normally.
          context.method = "next";
          context.arg = undefined;
        }

        return !! caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.method = "next";
        this.next = finallyEntry.finallyLoc;
        return ContinueSentinel;
      }

      return this.complete(record);
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = this.arg = record.arg;
        this.method = "return";
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }

      return ContinueSentinel;
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      if (this.method === "next") {
        // Deliberately forget the last sent value so that we don't
        // accidentally pass it on to the delegate.
        this.arg = undefined;
      }

      return ContinueSentinel;
    }
  };

  // Regardless of whether this script is executing as a CommonJS module
  // or not, return the runtime object so that we can declare the variable
  // regeneratorRuntime in the outer scope, which allows this module to be
  // injected easily by `bin/regenerator --include-runtime script.js`.
  return exports;

}(
  // If this script is executing as a CommonJS module, use module.exports
  // as the regeneratorRuntime namespace. Otherwise create a new empty
  // object. Either way, the resulting object will be used to initialize
  // the regeneratorRuntime variable at the top of this file.
  module.exports
));

try {
  regeneratorRuntime = runtime;
} catch (accidentalStrictMode) {
  // This module should not be running in strict mode, so the above
  // assignment should always work unless something is misconfigured. Just
  // in case runtime.js accidentally runs in strict mode, we can escape
  // strict mode using a global Function call. This could conceivably fail
  // if a Content Security Policy forbids using Function, but in that case
  // the proper solution is to fix the accidental strict mode problem. If
  // you've misconfigured your bundler to force strict mode and applied a
  // CSP to forbid Function, and you're not willing to fix either of those
  // problems, please detail your unique predicament in a GitHub issue.
  Function("r", "regeneratorRuntime = r")(runtime);
}
});

var regenerator = runtime_1;

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }

  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator(fn) {
  return function () {
    var self = this,
        args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);

      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }

      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }

      _next(undefined);
    });
  };
}

var asyncToGenerator = _asyncToGenerator;

var _typeof_1 = createCommonjsModule(function (module) {
function _typeof2(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof2 = function _typeof2(obj) { return typeof obj; }; } else { _typeof2 = function _typeof2(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof2(obj); }

function _typeof(obj) {
  if (typeof Symbol === "function" && _typeof2(Symbol.iterator) === "symbol") {
    module.exports = _typeof = function _typeof(obj) {
      return _typeof2(obj);
    };
  } else {
    module.exports = _typeof = function _typeof(obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : _typeof2(obj);
    };
  }

  return _typeof(obj);
}

module.exports = _typeof;
});

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

var classCallCheck = _classCallCheck;

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) { descriptor.writable = true; }
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) { _defineProperties(Constructor.prototype, protoProps); }
  if (staticProps) { _defineProperties(Constructor, staticProps); }
  return Constructor;
}

var createClass = _createClass;

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

var defineProperty = _defineProperty;

var Thread =
/*#__PURE__*/
function () {
  function Thread(ff, ctx) {
    classCallCheck(this, Thread);

    this.ctx = Object.assign({}, ctx);
    this.$next = this.next.bind(this);
    this.$close = this.close.bind(this);
    this.ff = ff;
    this.initInfo(ff);
  }
  /**
   * 初始化上下文的$info
   * @param {FocusFlow} ff 
  * @private 
   */


  createClass(Thread, [{
    key: "initInfo",
    value: function initInfo(ff) {
      var $info = {
        id: FocusFlow._id++,
        //线程id
        ff: ff,
        index: 0 //从0开始

      };
      Object.defineProperty(this.ctx, '$info', {
        value: $info
      });
      this.active();
    }
    /**
    * 执行下一个管道
    * @param {FocusFlow|String|Number|Boolean} ff FocusFlow跨管道|管道标记
    * @param {String|Number|Boolean} sign 管道标记
    * @private
    */

  }, {
    key: "next",
    value: function () {
      var _next = asyncToGenerator(
      /*#__PURE__*/
      regenerator.mark(function _callee(ff, sign) {
        var $ff;
        return regenerator.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!(ff instanceof FocusFlow)) {
                  _context.next = 2;
                  break;
                }

                return _context.abrupt("return", this.span(ff, sign));

              case 2:
                $ff = this.ctx.$info.ff;
                this.active(); // if($ff.ram) this.active()

                if (!(typeof ff === 'boolean')) {
                  _context.next = 9;
                  break;
                }

                _context.next = 7;
                return $ff.run(this, ff);

              case 7:
                _context.next = 16;
                break;

              case 9:
                if (!ff) {
                  _context.next = 14;
                  break;
                }

                _context.next = 12;
                return $ff.nextStart(this, ff);

              case 12:
                _context.next = 16;
                break;

              case 14:
                _context.next = 16;
                return $ff.run(this);

              case 16:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function next(_x, _x2) {
        return _next.apply(this, arguments);
      }

      return next;
    }()
    /**
     * 跨管道
     * @param: {FocusFlow} ff
     * @param: {String|Number} 执行管道的标记
    * @private 
     */

  }, {
    key: "span",
    value: function span(ff, sign) {
      this.close();
      ff.start(this.ctx, sign);
      return this;
    } //更新线程寿命，防止被回收

  }, {
    key: "active",
    value: function active() {
      var info = this.ctx.$info;
      info.life = Date.now() + info.ff.options.life;
    } //关闭线程

  }, {
    key: "close",
    value: function close() {
      this.ff.closeThread(this);
    }
  }]);

  return Thread;
}();

var FocusFlow =
/*#__PURE__*/
function () {
  //每次生成线程+1
  function FocusFlow() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    classCallCheck(this, FocusFlow);

    this.pond = []; //管道仓库

    this.threads = []; //线程池

    this.defaults(options);
    this.junction();
  }

  createClass(FocusFlow, [{
    key: "defaults",
    value: function defaults(options) {
      var template = {
        threadMax: 1,
        //最大线程数
        "switch": true,
        //是否开放线程池
        life: 10000,
        //清理线程的周期，毫秒单位
        hand: null //函数this指向

      };
      this.options = Object.assign(template, options);
    } // 初始化状态函数

  }, {
    key: "junction",
    value: function junction() {
      function template(ctx, next) {
        next();
      } //水流（线程）必经之地


      this.basic = {};
      this.error(function (error) {
        console.log(error);
      }) //报错触发
      .success(template) //sign为true
      .fail(template) //sign为false
      .end(function () {}); //sign为null
    }
    /**
     * 返回管道的数量（不包括基本管道）
     */

  }, {
    key: "use",

    /**
     * 收集管道
     * @param {String|Function|FocusFlow} sign 标记|回调函数|FocusFlow实例，用来合并管道函数
     * @param {Function|Object} callback 回调函数|函数this
     * @param {Object} hand 函数指向的this
     * @return {Object} this
     * */
    value: function use(sign, callback, hand) {

      if (typeof sign === 'function') {
        if (callback) { hand = callback; }
        callback = sign;
        sign = this.pond.length;
      } else if (typeof sign === 'number') {
        sign = this.pond.length; //管道仓库的长度
      } else if (sign instanceof FocusFlow) {
        //FocusFlow,this
        return this.docking(sign, callback);
      }

      callback = this.redirect(callback, hand);
      this.pond.push({
        sign: sign,
        callback: callback
      });
      return this;
    }
    /**
     * 改变this指向
     * @param {Function} callback 
     * @param {Object} [hand = this.options.hand] 
     * @return {Function}
     * @private
     */

  }, {
    key: "redirect",
    value: function redirect(callback) {
      var hand = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.options.hand;
      return _typeof_1(hand) === 'object' && hand !== null ? callback.bind(hand) : callback;
    }
    /**
     * 抛错管道
     * @param {Function} callback 
     * @return {Object} this 
     */

  }, {
    key: "error",
    value: function error(callback) {
      var basic = this.basic;

      var fn =
      /*#__PURE__*/
      function () {
        var _ref = asyncToGenerator(
        /*#__PURE__*/
        regenerator.mark(function _callee(error, thread) {
          return regenerator.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  _context.next = 2;
                  return callback(error, thread.ctx);

                case 2:
                  thread.ctx.$info.index = null;
                  _context.next = 5;
                  return basic.end(thread);

                case 5:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee);
        }));

        return function fn(_x, _x2) {
          return _ref.apply(this, arguments);
        };
      }();

      basic.error = fn;
      return this;
    }
    /**
    * 成功管道
    * @param {Function} callback 
    * @return {Object} this 
    */

  }, {
    key: "success",
    value: function success(callback) {
      return this.isState('success', callback);
    }
    /**
     * 失败管道
     * @param {Function} callback 
     * @return {Object} this 
     */

  }, {
    key: "fail",
    value: function fail(callback) {
      return this.isState('fail', callback);
    }
    /**
     * 结束管道
     * @param {Function} callback 
     * @return {Object} this 
     */

  }, {
    key: "end",
    value: function end(callback) {
      var _this = this;

      var basic = this.basic;

      var fn =
      /*#__PURE__*/
      function () {
        var _ref2 = asyncToGenerator(
        /*#__PURE__*/
        regenerator.mark(function _callee2(thread) {
          return regenerator.wrap(function _callee2$(_context2) {
            while (1) {
              switch (_context2.prev = _context2.next) {
                case 0:
                  //end后删除线程
                  _this.closeThread(thread);

                  _context2.next = 3;
                  return callback(thread.ctx);

                case 3:
                case "end":
                  return _context2.stop();
              }
            }
          }, _callee2);
        }));

        return function fn(_x3) {
          return _ref2.apply(this, arguments);
        };
      }();

      basic.end = fn;
      return this;
    }
    /**
     * 成功失败的方法
     * @param {String} state 
     * @param {Function} callback 
     * @return {Object} this
     * @private	 
     */

  }, {
    key: "isState",
    value: function isState(state, callback) {
      function fnState(_x4) {
        return _fnState.apply(this, arguments);
      }

      function _fnState() {
        _fnState = asyncToGenerator(
        /*#__PURE__*/
        regenerator.mark(function _callee3(thread) {
          return regenerator.wrap(function _callee3$(_context3) {
            while (1) {
              switch (_context3.prev = _context3.next) {
                case 0:
                  thread.ctx.$info.index = null;
                  _context3.next = 3;
                  return callback(thread.ctx, thread.$next, thread.$close);

                case 3:
                case "end":
                  return _context3.stop();
              }
            }
          }, _callee3);
        }));
        return _fnState.apply(this, arguments);
      }

      this.basic[state] = fnState.bind(this);
      return this;
    }
    /**
      * 执行管道流
      * @param {Object|String|Number|Boolean} ctx object上下文内容|any管道标记
      * @param {Object|String|Number|Boolean} sign object上下文内容|any管道标记
     * @return {Object} this 
      */

  }, {
    key: "start",
    value: function () {
      var _start = asyncToGenerator(
      /*#__PURE__*/
      regenerator.mark(function _callee4(ctx, sign) {
        var _ref3, thread;

        return regenerator.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                if (!this.inspect()) {
                  _context4.next = 2;
                  break;
                }

                return _context4.abrupt("return", this);

              case 2:
                if (_typeof_1(ctx) !== 'object') {
                  _ref3 = [sign, ctx];
                  ctx = _ref3[0];
                  sign = _ref3[1];
                }

                thread = this.createThread(ctx);
                _context4.next = 6;
                return thread.next(sign);

              case 6:
                return _context4.abrupt("return", this);

              case 7:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function start(_x5, _x6) {
        return _start.apply(this, arguments);
      }

      return start;
    }()
    /**
     * 判断线程池是否满员，满员则清除失活的线程
     * @return {Boolean}
     */

  }, {
    key: "inspect",
    value: function inspect() {
      if (!this.ram) {
        return !this.clean();
      }

      return false;
    }
    /**
     * 目标管道，有则进入，没有则下一个
     * @param {Thread} thread 
     * @param {String|Number} sign 
     * @private
     */

  }, {
    key: "nextStart",
    value: function () {
      var _nextStart = asyncToGenerator(
      /*#__PURE__*/
      regenerator.mark(function _callee5(thread, sign) {
        var index;
        return regenerator.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                index = this.matching(sign);

                if (index === -1) {
                  thread.ctx.$info.index++;
                } else {
                  thread.ctx.$info.index = index;
                }

                _context5.next = 4;
                return this.run(thread);

              case 4:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function nextStart(_x7, _x8) {
        return _nextStart.apply(this, arguments);
      }

      return nextStart;
    }()
    /**
     * 执行管道
     * @param {Thread} thread 
     * @param {Boolean} state 
     * @private
     */

  }, {
    key: "run",
    value: function () {
      var _run = asyncToGenerator(
      /*#__PURE__*/
      regenerator.mark(function _callee6(thread, state) {
        var pond, ctx, surplus;
        return regenerator.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                pond = this.pond;
                ctx = thread.ctx;
                surplus = ctx.$info.index < pond.length;
                _context6.prev = 3;

                if (!(ctx.$info.index === null)) {
                  _context6.next = 9;
                  break;
                }

                _context6.next = 7;
                return this.basic.end(thread);

              case 7:
                _context6.next = 22;
                break;

              case 9:
                if (!(state === false)) {
                  _context6.next = 14;
                  break;
                }

                _context6.next = 12;
                return this.basic.fail(thread);

              case 12:
                _context6.next = 22;
                break;

              case 14:
                if (!(!surplus || state === true)) {
                  _context6.next = 19;
                  break;
                }

                _context6.next = 17;
                return this.basic.success(thread);

              case 17:
                _context6.next = 22;
                break;

              case 19:
                if (!surplus) {
                  _context6.next = 22;
                  break;
                }

                _context6.next = 22;
                return pond[ctx.$info.index++].callback(ctx, thread.$next, thread.$close);

              case 22:
                _context6.next = 27;
                break;

              case 24:
                _context6.prev = 24;
                _context6.t0 = _context6["catch"](3);
                this.basic.error(_context6.t0, thread);

              case 27:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this, [[3, 24]]);
      }));

      function run(_x9, _x10) {
        return _run.apply(this, arguments);
      }

      return run;
    }()
    /**
     * 关闭线程池，剩余的线程会执行完
     * @return {Object} this
     */

  }, {
    key: "close",
    value: function close() {
      this.options["switch"] = false;
      return this;
    }
    /**
     * 打开线程池
     * @return {Object} this
     */

  }, {
    key: "open",
    value: function open() {
      this.options["switch"] = true;
      return this;
    }
    /**
      * 通过标记获取管道下标,如果是Number则直接返回
      * @param {String|Number} sign 标记
     * @return {Number}
     * @private
      */

  }, {
    key: "matching",
    value: function matching(sign) {
      return typeof sign === 'number' ? sign : this.pond.findIndex(function (obj) {
        return obj.sign === sign;
      });
    }
    /**
     * 创建线程
     * @param {Object} ctx 上下文
    * @return {Thread}
    * @private
     */

  }, {
    key: "createThread",
    value: function createThread(ctx) {
      var thread = new Thread(this, ctx);
      this.threads.push(thread);
      return thread;
    }
    /**
     * 关闭线程(关闭后还会继续执行后面next的方法)
     * @param {Thread} thread 
     * @private
     */

  }, {
    key: "closeThread",
    value: function closeThread(thread) {
      var index = this.threads.findIndex(function (obj) {
        return obj === thread;
      });
      this.threads.splice(index, 1 + index);
    }
    /**
     * 清空线程池，剩余的线程会执行完
     * @return {Object} this
     */

  }, {
    key: "closeThreads",
    value: function closeThreads() {
      this.threads = [];
      return this;
    }
    /**
     * 清理过期的线程
     * @return {Boolean} 是否有过期的线程被清理
     */

  }, {
    key: "clean",
    value: function clean() {
      var oldLen = this.threads.length;
      this.threads = this.threads.filter(function (thread) {
        return thread.ctx.$info.life > Date.now();
      });
      return oldLen < this.threads.length;
    }
    /**
     * 合并其他FocusFlow的管道
     * @param {FocusFlow} ff 
     * @param {Object} [hand = this.options.hand]
     * @return {Object} this
     * @private
     */

  }, {
    key: "docking",
    value: function docking(ff) {
      var _this2 = this;

      var hand = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.options.hand;
      ff.pond.forEach(function (obj) {
        return _this2.use(obj.sign, obj.callback, hand);
      });
      return this;
    }
  }, {
    key: "length",
    get: function get() {
      return this.pond.length;
    }
    /**
     * 判断线程池的状态
     */

  }, {
    key: "ram",
    get: function get() {
      return this.options["switch"] && this.options.threadMax > this.threads.length;
    }
  }]);

  return FocusFlow;
}(); // FocusFlow._id = 0


defineProperty(FocusFlow, "_id", 0);

export default FocusFlow;
