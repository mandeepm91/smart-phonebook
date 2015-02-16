/**
* Phone.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {

    iso: {
      type: "string",
      required: false
    },

    isd: {
      type: "integer",
      required: false
    },

    number: {
      type: "string",
      required: true
    },

    imei: {
      type: "string",
      defaultsTo: null 
    },

    intl: {
      type: "string",
      defaultsTo: null
    },

  	owner: {
  		model: "user"
  	},

    verified: {
      type: "boolean",
      defaultsTo: false
    }      

  }

};

