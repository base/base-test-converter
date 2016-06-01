'use strict';

var replacer = require('./replacer');

module.exports = function converter(str) {
  var fixtures = [];
  var hasProps = [];
  var move = [];

  var lines = str.split('\n');
  var len = lines.length;
  var idx = -1;
  var result = [];

  while (++idx < len) {
    var line = lines[idx];

    if (filter(line)) {
      continue;
    }

    var newLine = hasProperties(line);
    if (newLine !== line) {
      hasProps = [
        `var support = require('./support');`,
        `var hasProperties = support.hasProperties;`
      ];
      line = newLine;
    }

    line = haveLength(line);
    line = hasOwn(line);
    line = notHasOwn(line);
    line = assert(line);
    line = notAssert(line);
    line = assertEqual(line);
    line = assertNotEqual(line);
    line = assertStrictEqual(line);
    line = shouldBeInstanceOf(line);
    line = toTryCatch(line, result);
    line = strictEquals(line);

    if (match(line, /assert/)) {
      if (move.indexOf('assert') === -1) {
        move.push('assert');
      }
    }

    if (match(line, 'assert')) {
      if (move.indexOf('assert') === -1) {
        move.push('assert');
      }
      continue;
    }

    if (match(line, 'consolidate')) {
      if (move.indexOf('consolidate') === -1) {
        move.push('consolidate');
      }
      continue;
    }
    if (match(line, 'fs')) {
      if (move.indexOf('fs') === -1) {
        move.push('fs');
      }
      continue;
    }
    if (match(line, 'path')) {
      if (move.indexOf('path') === -1) {
        move.push('path');
      }
      continue;
    }

    newLine = convertPath(line);
    if (newLine !== line) {
      if (move.indexOf('path') === -1) {
        move.push('path');
      }
      fixtures = ['var fixtures = path.resolve.bind(path, __dirname, \'fixtures\');'];
      line = newLine;
    }

    result.push('  ' + line);
  }

  var prefix = [
    '\'use strict\';',
    '',
    ...move.map(toRequire),
    ...fixtures,
    ...hasProps,
    '',
    'module.exports = function(App, options, runner) {',
    '  var app;',
    ''
  ];

  result.push('};');
  var res = prefix.concat(result).join('\n');

  res = res.split('../lib/plugins').join('templates/lib/plugins');
  // res = res.split('      (function() {').join('      try {');
  return res.replace(/\n {2}\n};$/, '\n};') + '\n';
}

function match(line, name) {
  var re = !(name instanceof RegExp)
    ? new RegExp(`var ${name} = require\\('${name}'\\)`)
    : name;

  if (re.test(line)) {
    return name;
  }
}

function toTryCatch(line, lines) {
  if (/^\s+\(function\(\) {$/.test(line)) {
    var m = /^(\s+)(.*)/.exec(line);
    if (!m) return line;
    var prefix = m[1];
    var fnLine;
    var idx = lines.length;
    var count = 0;

    while ((fnLine = lines[--idx]) && idx >= 0) {
      if (/, function\((?:cb)?\) {\s*$/.test(fnLine)) {
        lines[idx] = lines[idx].replace(/function\((?:cb)?\) {$/, 'function(cb) {');
        break;
      }
    }
    return prefix + 'try {';
  }

  if (/\.should\.throw/.test(line)) {
    line = line.split('}).should.throw(').join('  cb(new Error(\'expected an error\'));\n      } catch (err) {\n        assert.equal(err.message, ');
    return line + '\n        cb();' + '\n      }';
  }
  return line;
}

function toRequire(name) {
  return `var ${name} = require('${name}');`;
}

function filter(str) {
  if (/use strict/.test(str)) {
    return true;
  }
  if (/var app;/.test(str)) {
    return true;
  }
  if (/require\('(mocha|should)'\)/.test(str)) {
    return true;
  }
  if (/var support = require\('\.\/support'\)/.test(str)) {
    return true;
  }
  if (/support\.resolve\(/.test(str)) {
    return true;
  }
  return false;
}

function convertPath(line) {
  if (/<%/.test(line)) {
    return line;
  }
  var re = /(["'])(test\/fixtures\/)([^\1]+?)\1/g;
  return line.replace(re, function(_, $1, $2, $3) {
    return 'fixtures(\'' + $3 + '\')';
  });
}

function strictEquals(str) {
  return replacer(/assert\(.*? === /, str, function(line) {
    return line.split('assert(')
      .join('assert.equal(')
      .split(' === ')
      .join(', ');
  });
}

function hasProperties(str) {
  return replacer(/should\.have\.properties/, str, function(line) {
    return 'hasProperties(' + line.split('.should.have.properties(').join(', ');
  });
}

function doesNotHaveProperties(str) {
  return replacer(/\.should\.not\.have\.properties\(/, str, function(line) {
    return 'doesNotHaveProperties(' + line.split('.should.not.have.properties(').join(', ');
  });
}

function assertEqual(str) {
  return replacer(/\.should\.equal/, str, function(line) {
    return 'assert.equal(' + line.split('.should.equal(').join(', ');
  });
}

function assertNotEqual(str) {
  return replacer(/\.should\.not\.equal/, str, function(line) {
    return 'assert.notEqual(' + line.split('.should.not.equal(').join(', ');
  });
}

function hasOwn(str) {
  return replacer(/should\.have\.property\('/, str, function(line) {
    return 'assert(' + line
      .split('should.have.property(\'')
      .join('hasOwnProperty(\'')
      .replace(/;$/, ');');
  });
}

function haveLength(str) {

  return replacer(/\.should\.have\.length\(/, str, function(line) {
    return 'assert.equal(' + line
      .split('.should.have.length(')
      .join('.length, ')
      .replace(/\)?\);?$/, ');');
  });
}

function notHasOwn(str) {
  return replacer(/should\.not\.have\.property\('/, str, function(line) {
    return 'assert(!' + line
      .split('should.not.have.property(\'')
      .join('hasOwnProperty(\'')
      .replace(/;$/, ');');
  });
}

function shouldBeInstanceOf(str) {
  return replacer(/\.should\.be\.instanceof\(Array/, str, function(line) {
    return 'assert(Array.isArray(' + line
      .split('.should.be.instanceof(Array')
      .join('')
      .replace(/;$/, ');');
  });
}

function assert(str) {
  return replacer(/should\.exist\(/, str, function(line) {
    return line.split('should.exist(').join('assert(');
  });
}

function notAssert(str) {
  return replacer(/should\.not\.exist\(/, str, function(line) {
    return line.split('should.not.exist(').join('assert(!');
  });
}

function assertStrictEqual(str) {
  return replacer(/\.should\.eql/, str, function(line) {
    return 'assert.deepEqual(' + line.split('.should.eql(').join(', ');
  });
}
