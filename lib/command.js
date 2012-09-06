var nopt = require('nopt')
  , path = require('path')
  , errors = require('./errors')

var options = {
      port: Number
    , address: String
    , cpus: Number
    , poll: Number
    , adaptor: path
    }
  , shorthand = {
      p: ['--port']
    , addr: ['--address']
    , c: ['--cpus']
    , a: ['--adaptor']
  }

module.exports = command

function command() {
  var parsed = nopt(options, shorthand)
    , dir = parsed.argv.remain[0] || process.cwd()

  if(!/^(\.|\/)/.test(dir)) 
    dir = require('path').join(process.cwd(), dir)

  try {
    require('./server').cli(
        dir
      , {
          PORT: parsed.port || 8124
        , ADDR: parsed.addr || '0.0.0.0'
        , CPUS: parsed.cpus
        , POLL: parsed.poll
        , adaptor: parsed.adaptor
      }
      , onerror
    )
  } catch(e) {
    onerror(e)
  }

  function onerror(e) {
    if(e.constructor === errors.BadAdaptor) {
      console.log('Bad adaptor "%s"', e.message)
      return process.exit(1)
    } 
    
    console.log(errors.HELP)
    if(e.constructor === errors.NoApplication) {
      console.log('Could not find app: checked app.js, server.js, and index.js in %s', e.message)
    }

    return process.exit(1)
  }
}
