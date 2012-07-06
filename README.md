# Utensil

A command-line tool for running node.js servers.

* Uses `cluster` to automatically fork server processes into the background
* Uses adaptors to send process metrics to monitoring
* Uses node 0.8's `domain` module to catch and report errors per-request
* Programmatic interface as well as CLI

````sh
$ ls .
package.json        node_modules/       app.js
$ cat app.js
module.exports = http.createServer(function(req, resp) {
  resp.end('woo')
})
$ utensil -p 8000
spawning 8 processes listening on 0.0.0.0:8000
````

Zing! `utensil` will also handle unhandled exceptions for you, serving up a 
500 page where appropriate (without taking down your node process!)

## CLI

#### -p 8000
#### --port 8000

The port to bind to.

#### --addr
#### --address 0.0.0.0

The address to bind to.

#### -c
#### --cpus 8

The number of processes to fork. Defaults to the number of cpus
reported by `require('os').cpus().length`.

#### -p
#### --poll 2000

The millisecond interval that child process should report their memory usage.

#### -a
#### --adaptor path/to/file.js

Path to a JavaScript module that exports a single function taking `pid` and `msg`.

## Messages passed to the Adaptor

Messages are of the form:

````javascript
{ "type": "metrics" | "error" | "console"
, "subtype": <subtype>
, "data": <message> }
````

### metrics

#### memory

`data` will include the output of `process.memoryUsage()`.

#### request

````javascript
{ "type": "metrics"
, "subtype": "request"
, "data": { "start": <unix ms epoch timestamp>
          , "elapsed": <ms from request received till response>
          , "status": <HTTP status code of response>
          , "url": <contents of `req.url`> } }
```` 

#### error

For global, pre-runtime errors:

````javascript
{ "type": "error"
, "subtype": "application"
, "data": { "err": <err+''>
          , "stack": <err.stack if available> } } 
```` 

For errors during the duration of a request:

````javascript
{ "type": "error"
, "subtype": "request"
, "data": { "err": <err+''>
          , "start": <unix ms epoch timestamp>
          , "elapsed": <ms from request received till response>
          , "stack": <err.stack if available> } } 
```` 

#### console

All `console` output will be redirected to the adaptor, as well.

````javascript
{ "type": "console"
, "subtype": "error" | "warn" | "log"
, "data": [arguments to console] } 
````

## License

MIT
