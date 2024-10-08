var global = (function() {
  return this;
}());

var AssertError;
if (Error.captureStackTrace) {
  AssertError = function AssertError(message, caller) {
    Error.prototype.constructor.call(this, message);
    this.message = message;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, caller || AssertError);
    }
  };

  AssertError.prototype = new Error();
} else {
  AssertError = Error;
}

/**
 * @deprecated Use "expectTemplate(template)...toCompileTo(output)" instead
 */
global.shouldCompileTo = function(string, hashOrArray, expected, message) {
  shouldCompileToWithPartials(string, hashOrArray, false, expected, message);
};

/**
 * @deprecated Use "expectTemplate(template)...toCompileTo(output)" instead
 */
global.shouldCompileToWithPartials = function shouldCompileToWithPartials(string, hashOrArray, partials, expected, message) {
  var result = compileWithPartials(string, hashOrArray, partials);
  if (result !== expected) {
    throw new AssertError("'" + result + "' should === '" + expected + "': " + message, shouldCompileToWithPartials);
  }
};

/**
 * @deprecated Use "expectTemplate(template)...toCompileTo(output)" instead
 */
global.compileWithPartials = function(string, hashOrArray, partials) {
  var template,
      ary,
      options;
  if (hashOrArray && hashOrArray.hash) {
    ary = [hashOrArray.hash, hashOrArray];
    delete hashOrArray.hash;
  } else if (Object.prototype.toString.call(hashOrArray) === '[object Array]') {
    ary = [];
    ary.push(hashOrArray[0]); // input
    ary.push({helpers: hashOrArray[1], partials: hashOrArray[2]});
    options = typeof hashOrArray[3] === 'object' ? hashOrArray[3] : {compat: hashOrArray[3]};
    if (hashOrArray[4] != null) {
      options.data = !!hashOrArray[4];
      ary[1].data = hashOrArray[4];
    }
  } else {
    ary = [hashOrArray];
  }

  template = CompilerContext[partials ? 'compileWithPartial' : 'compile'](string, options);
  return template.apply(this, ary);
};


global.equals = global.equal = function equals(a, b, msg) {
  if (a !== b) {
    throw new AssertError("'" + a + "' should === '" + b + "'" + (msg ? ': ' + msg : ''), equals);
  }
};

global.shouldThrow = function(callback, type, msg) {
  var failed;
  try {
    callback();
    failed = true;
  } catch (caught) {
    if (type && !(caught instanceof type)) {
      throw new AssertError('Type failure: ' + caught);
    }
    if (msg && !(msg.test ? msg.test(caught.message) : msg === caught.message)) {
      throw new AssertError('Throw mismatch: Expected ' + caught.message + ' to match ' + msg + '\n\n' + caught.stack, shouldThrow);
    }
  }
  if (failed) {
    throw new AssertError('It failed to throw', shouldThrow);
  }
};


global.expectTemplate = function(templateAsString) {
  return new HandlebarsTestBench(templateAsString);
};


function HandlebarsTestBench(templateAsString) {
  this.templateAsString = templateAsString;
  this.helpers = {};
  this.partials = {};
  this.input = {};
  this.message = 'Template' + templateAsString + ' does not evaluate to expected output';
  this.compileOptions = {};
  this.runtimeOptions = {};
}

HandlebarsTestBench.prototype.withInput = function(input) {
  this.input = input;
  return this;
};

HandlebarsTestBench.prototype.withHelper = function(name, helperFunction) {
  this.helpers[name] = helperFunction;
  return this;
};

HandlebarsTestBench.prototype.withPartial = function(name, partialAsString) {
  this.partials[name] = partialAsString;
  return this;
};

HandlebarsTestBench.prototype.withCompileOptions = function(compileOptions) {
  this.compileOptions = compileOptions;
  return this;
};

HandlebarsTestBench.prototype.withRuntimeOptions = function(runtimeOptions) {
  this.runtimeOptions = runtimeOptions;
  return this;
};

HandlebarsTestBench.prototype.withMessage = function(message) {
  this.message = message;
  return this;
};

HandlebarsTestBench.prototype.toCompileTo = function(expectedOutputAsString) {
  var self = this;
  var compile = Object.keys(this.partials).length > 0
      ? CompilerContext.compileWithPartial
      : CompilerContext.compile;

  var combinedRuntimeOptions = {};
  Object.keys(this.runtimeOptions).forEach(function(key) {
    combinedRuntimeOptions[key] = self.runtimeOptions[key];
  });
  combinedRuntimeOptions.helpers = this.helpers;
  combinedRuntimeOptions.partials = this.partials;

  var template = compile(this.templateAsString, this.compileOptions);
  var output = template(this.input, combinedRuntimeOptions);

  if (output !== expectedOutputAsString) {
    // Error message formatted so that IntelliJ-Idea shows "diff"-button
    // https://stackoverflow.com/a/10945655/4251384
    throw new AssertError(this.message + '\nexpected:' + expectedOutputAsString + 'but was:' + output);
  }
};
