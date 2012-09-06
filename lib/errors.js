var HELP = require('fs').readFileSync(require('path').join(__dirname, 'help'), 'utf8')

module.exports = {
  BadAdaptor: BadAdaptor
, NoApplication: NoApplication
, HELP: HELP
}

function BadAdaptor(adaptor) {
  this.message = adaptor
  Error.captureStackTrace(this)
}

function NoApplication(application) {
  this.message = application
  Error.captureStackTrace(this)
}

