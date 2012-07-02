var cluster = require('cluster')
  , os = require('os')
  , fs = require('fs')
  , path = require('path')
  , cluster = require('cluster')
  , fork = cluster.fork.bind(cluster)

module.exports = spawn

module.exports.cli = function(dir, opts) {
  if(cluster.isWorker) {
    process.chdir(process.env.CWD)
    require('./client')
    return 
  }

  attempt(Array.isArray(dir) ? dir : [dir], opts)
}

function getAdaptor(adaptor) {
  if(typeof adaptor === 'function')
    return adaptor

  try {
    if(fs.statSync(adaptor).isDirectory())
      throw new Error

    adaptor = require(adaptor)

    if(typeof adaptor !== 'function')
      throw new Error

    return adaptor
  } catch(e) {
    console.log('bad adaptor')
    return function(pid, msg) { }
  }
}

function attempt(dirs, opts) {
  if(!dirs.length)
    return enofile()

  fs.stat(dirs[0], onStat)

  function onStat(err, stat) {
    if(err) {
      attempt(
          dirs.slice(1)
        , opts
      )
    } else if(stat.isDirectory()) {
      dirs = ['app.js', 'server.js', 'index.js'].map(function(x) {
        return path.join(dirs[0], x)
      }).concat(dirs.slice(1))
      return attempt(dirs, opts)
    }
    else spawn(dirs[0], opts) 
  } 
}

function spawn(filename, opts) {

  if(cluster.isWorker) {
    return require('./client') 
  }

  opts.adaptor = opts.adaptor ? getAdaptor(opts.adaptor) : function(pid, msg) {}

  var cpus = opts.CPUS || os.cpus().length
    , workers = []
    , respawn = true
    , worker

  process.on('SIGINT', function() {
    respawn = false

    cluster.disconnect(function() {
      process.exit(0)
    })
  })

  for(var i = 0; i < cpus; ++i) {
    workers.push(makeWorker())
  }

  function onMessage(msg) {
    opts.adaptor(this.process.pid, msg) 
  }

  function onExit(code) {
    opts.adaptor(this.process.pid, {type: 'status', subtype:'exit', data:Date.now()})

    workers.splice(workers.indexOf(this), 1)
    if(code !== 0 && respawn) {
      workers.push(makeWorker())
    }
  }

  function onOnline() {
    opts.adaptor(this.process.pid, {type: 'status', subtype:'online', data:Date.now()}) 
  }

  function makeWorker() {
    var worker = fork({
          SERVER_MODULE: filename
        , CWD: path.dirname(filename)
        , PORT: opts.PORT
        , ADDR: opts.ADDR
        , POLL: opts.POLL || 2000
        , METRICS: false
        , IS_UTENSIL: true
      })

    opts.adaptor(worker.process.pid, {type:'status', subtype:'enter', data:Date.now()})

    worker.on('message', onMessage.bind(worker))
          .on('exit', onExit.bind(worker))
          .on('online', onOnline.bind(worker))

    return worker
  }
}

function enofile() {
  console.error('no file detected')
  process.exit(1)
}
