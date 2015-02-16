/**
* Request.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {


  attributes: {

    iso: {
      type: "string",
      required: true
    },

    isd: {
      type: "integer",
      required: true
    },

  	number: {
  		type: "string",
  		required: true
  	},

  	imei: {
  		type: "string",
  		required: true
  	},

    intl: {
      type: "string",
      defaultsTo: null
    },

  	code: {
  		type: "string",
  		required: true
  	}

  }

};

