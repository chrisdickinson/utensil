var domain = require('domain')
  , mainDomain = domain.create()
  , util = require('util')

function send(type, subtype, data) {
  process.send({type:type, subtype:subtype, data:data})
}
  
function consoleOut(type) {
  return function() {
    send('console', type, [].slice.call(arguments).map(function(item) {
      return util.inspect(item) 
    }))
  }
}
console.log = consoleOut('log')
console.warn = consoleOut('warn')
console.error = consoleOut('error')

mainDomain.on('error', function(err) {
  send('error', 'application', {
      err: ''+err
    , stack: err && err.stack || ''
  })

  process.exit(1)
})

mainDomain.run(function() {
  var server = require(process.env.SERVER_MODULE)
    , port = process.env.PORT
    , addr = process.env.ADDR
    , fs = require('fs')
    , listeners = server.listeners('request')

  server.removeAllListeners('request')

  if(!/\d+\.\d+\.\d+.\d+/.test(addr))
    addr = '0.0.0.0'

  setInterval(function() {
    send('metrics', 'memory', process.memoryUsage())
  }, process.env.POLL)

  server.on('request', function(req, resp) {
    var reqd = domain.create()
      , start = Date.now()

    reqd.add(req)
    reqd.add(resp)

    resp.on('finish', function() {
      send('metrics', 'request', {
        start: start
      , elapsed: Date.now() - start
      , status: this.statusCode
      , url: req.url
      })
    })

    reqd.on('error', function(err) {
      try {
        resp.writeHead(500)
        resp.end('500 - Internal Server Error')
        resp.on('close', reqd.dispose.bind(reqd))
      } catch(e) {
        reqd.dispose()
      } finally {
        send('error', 'request', {
          err: ''+err
        , start: start
        , elapsed: Date.now() - start
        , stack: err && err.stack || ''
        })

        process.exit(1)
      }
    })

    var self = this

    reqd.run(function() { 
      for(var i = 0, len = listeners.length; i < len; ++i)
        listeners[i].call(this, req, resp, reqd)
    })
  })

  server.listen(+port, addr)

  if(process.getuid() === 0) {
    fs.stat(process.env.SERVER_MODULE, function(err, stats) {
      if(err)
        throw err

      process.setuid(stats.uid)
    })
  }
})
