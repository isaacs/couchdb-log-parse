var Stream = require('stream')

module.exports = LogParser

var specials = new Buffer('{}[]<>"\'\n\\ ')
var openCurly = specials[0]
var closeCurly = specials[1]
var openSquare = specials[2]
var closeSquare = specials[3]
var openWaka = specials[4]
var closeWaka = specials[5]
var doubleQuote = specials[6]
var singleQuote = specials[7]
var lf = specials[8]
var escape = specials[9]
var space = specials[10]

function LogParser () {
  Stream.call(this)
  this.readable = true
  this.writable = true
  this._buffer = []

  this._curly = 0
  this._square = 0
  this._waka = 0
  this._type = []

  this._quoted = false
  this._escaped = false
  this._sawLF = false
}

LogParser.prototype = Object.create(Stream.prototype, {
  constructor: { value: LogParser, enumerable: false }
})

LogParser.prototype.write = function (chunk) {
  if (this._ended) this.emit('error', new Error('write after end'));
  this._process(chunk)
  return !this._paused
}

LogParser.prototype._process = function (chunk) {
  // assume that this._buffer[0] is the start of the line.
  // for every end-of-message in chunk, emit it, and then
  // save whatever's left in this._buffer
  if (chunk) for (var i = 0; i < chunk.length && !this._paused; i ++) {
    var c = chunk[i]

    if (this._sawLF) {
      this._sawLF = false
      if (c === space)
        continue

      var msg = this._buffer
      this._buffer = []
      // if it's [c,\n,x], then push [c], skip \n, continue with x
      // if it's [\n,xxx], then just continue
      // if it's [\n,\n,x], walk over the second one
      if (i > 1) msg.push(chunk.slice(0, i - 1))
      // slice off multiple \n chars
      while ((c = chunk[i]) === lf && i < chunk.length) i++;
      chunk = chunk.slice(i)
      i = 0
      this._handleMessage(msg)
      continue
    }

    if (c === lf) {
      this._sawLF = true
      continue
    }

    // any special char can be escaped with \
    if (this._escaped) {
      this._escaped = false
      continue
    }

    if (c === escape) {
      this._escaped = true
      continue
    }

    if (c === doubleQuote || c === singleQuote) {
      if (this._quote) {
        if (c === this._quote) {
          this._quote = false
        }
      } else {
        this._quote = c
      }
      continue
    }

    if (this._quote) {
      continue
    }

  }
  if (chunk && chunk.length !== 0) this._buffer.push(chunk);
  if (this._ended && !this._paused) {
    if (this._buffer.length) this._handleMessage(this._buffer)
    this.emit('end')
  }
}

// msg is an array of chunks representing a single message
LogParser.prototype._handleMessage = function (msg) {
  msg = Buffer.concat(msg).toString().trim() + '\n'
  this.emit('data', msg)
  if (this.listeners('message')) {
    this.emit('message', this.parseMessage(msg))
  }
}

var messageExpr = /^\[([^\]]+)\] \[([^\]]+)\] \[([^\]]+)\] ([\s\S]*)$/
var httpExpr = /^([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+) - - ([A-Z]+) (.*) ([0-9]+)\n?$/
var erlWtfExpr = /^([^{\[]+ )?([\s\S]*)/

LogParser.prototype.parseMessage = function (msg) {
  msg = msg.toString()
  var parsed = msg.match(messageExpr)
  if (!parsed) return { raw: msg }

  var result = {}
  result.date = new Date(parsed[1])
  result.level = parsed[2]
  result.pid = parsed[3]
  var more = parsed[4]
  var http, erlWtf
  if (http = more.match(httpExpr)) {
    result.type = 'http'
    result.ip = http[1]
    result.method = http[2]
    result.url = http[3]
    result.statusCode = +http[4]
  } else if (erlWtf = more.match(erlWtfExpr)) {
    result.type = 'erl'
    result.message = erlWtf[1]
    result.dump = erlWtf[2].trim().split(/\n/).map(function (l) {
      return l.trim()
    }).join('')
  } else {
    result.type = 'misc'
    result.message = more
  }

  return result
}

LogParser.prototype.end = function (chunk) {
  this._ended = true
  this._process(chunk)
}

LogParser.prototype.pause = function () {
  this._paused = true
}

LogParser.prototype.resume = function () {
  this._paused = false
  var c = this._buffer.pop()
  if (c) this._process(c);
}
