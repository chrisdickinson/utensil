var http = require('http')
  , fs = require('fs')

module.exports = http.createServer(function(req, resp) {
  fs.stat(process.cwd(), function(err) {
    throw new Error("wuh oh")
  })
})
