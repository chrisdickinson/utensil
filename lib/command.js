var nopt = require('nopt')
  , path = require('path')

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

  require('./server').cli(
      dir
    , {
        PORT: parsed.port || 8124
      , ADDR: parsed.addr || '0.0.0.0'
      , CPUS: parsed.cpus
      , POLL: parsed.poll
      , adaptor: parsed.adaptor
    }
  )
}
