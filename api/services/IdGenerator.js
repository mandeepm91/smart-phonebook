/**
 * Random ID generator
 **/

var randomBytes = require('crypto').randomBytes;

module.exports = {

  // Generates a random 
  generate: function (len) {
    if (!len) {
      len = 6;
    }
    return Math.floor(Math.random()*900000) + 100000;
  },

  generateHex: function (len) {
    if (!len) {
      len = 4;
    }
    return randomBytes(Math.ceil(len / 2)).toString('hex');
  },


};