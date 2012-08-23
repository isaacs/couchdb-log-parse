var LogParser = require('../parser.js')
var fs = require('fs')
var expect = require('./fixtures/log-parsed.js')
var tap = require('tap')

tap.test('basic parsing test', function (t) {
  var log = fs.createReadStream(__dirname + '/fixtures/log')
  var parser = new LogParser()
  log.pipe(parser)

  var logRaw = ''
  log.on('data', function (c) {
    logRaw += c
  })

  var parserRaw = ''
  parser.on('data', function (c) {
    parserRaw += c
  })

  var i = 0
  parser.on('message', function (c) {
    var r = t.same(c, expect[i], 'item '+i)
    if (!r.ok) console.error(c)
    i++
  })

  parser.on('end', function () {
    t.equal(i, expect.length, 'saw all messages')
    logRaw = logRaw.replace(/\n+/g, '\n')
    t.equal(parserRaw, logRaw, 'emitted data matches input')
    t.end()
  })
})
