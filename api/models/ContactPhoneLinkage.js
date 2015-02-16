/**
* ContactPhoneLinkage.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {

  	contact: {
  		model: "contact"
  	},

  	phone_id: {
  		model: "phone"
  	},

  	name: {
  		type: "string"
  	},

  	contactId: {
  		type: "string"
  	},

  	label: {
  		type: "string"
  	},

  	email: {
  		type: "json",
  		defaultsTo: null
  	}

  }
};

