# couchdb-log-parse

A program for parsing CouchDB logs

## Usage

```
var LogParse = require('couchdb-log-parse')
var parser = new LogParse()

fs.createReadStream('couchdb.log').pipe(parser)

parser.on('data', function (c) {
  // this is the raw data, don't know why you need this, but whatever
})

parser.on('message', function (message) {
  // this is probably what you want.
  // it's the parsed object with informative fields
})
```

## Fields

The parsed messages all have these fields:

* `date` The date that the log was posted
* `level` Usually one of info, warn, or error
* `pid` Not a real pid.  Some kind of silly erlang goober.
* `type` Either 'http', 'erl', or 'misc'

Depending on the `type` they may have the following fields as well:

### http

* `ip` The requesting IP.  (If you're behind a proxy or load balancer,
  then it's not super interesting.)
* `method` Something like GET, POST, PUT, etc.
* `url` The url requested
* `statusCode` The response status code.

### erl

* `message` Whatever comes before the dump.  Sometimes blank.
* `dump` The dumped erlang object.  (If someone wants to write a
  parser for the erlang objdump notation, that'd be rad.)

### misc

* `message` Whatever it was that couldn't be parsed.
