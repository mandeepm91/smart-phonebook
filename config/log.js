/**
 * Built-in Log Configuration
 * (sails.config.log)
 *
 * Configure the log level for your app, as well as the transport
 * (Underneath the covers, Sails uses Winston for logging, which
 * allows for some pretty neat custom transports/adapters for log messages)
 *
 * For more information on the Sails logger, check out:
 * http://links.sailsjs.org/docs/config/log
 */
var winston = require('winston');

var customLogger = new winston.Logger({
    transports: [
        new(winston.transports.File)({
            level: 'debug',
            filename: './logs/server_logs.log'
        }),
    ],
});

var customDev = new winston.Logger({
    transports: [
      new (winston.transports.Console)({
        level: 'debug'
      })
    ],
});

module.exports = {

  // Valid `level` configs:
  // i.e. the minimum log level to capture with sails.log.*()
  //
  // 'error'  : Display calls to `.error()`
  // 'warn' : Display calls from `.error()` to `.warn()`
  // 'debug'  : Display calls from `.error()`, `.warn()` to `.debug()`
  // 'info' : Display calls from `.error()`, `.warn()`, `.debug()` to `.info()`
  // 'verbose': Display calls from `.error()`, `.warn()`, `.debug()`, `.info()` to `.verbose()`
  //

  log: {
    custom: process.env.NODE_ENV == 'production' ? customLogger  : customDev
  }

};
