/**
* User.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/
var DEFAULT_IMG = process.env.HOME + "/vault/user/default.jpg" ;

module.exports = {

  tableName: "users",

  attributes: {

  	handle: {
  		type: "string",
  		required: true,
  		unique: true
  	},

  	name: {
  		type: "string",
  		required: false
  	},

  	permission: {
  		type: "integer",
      defaultsTo: 2
      
  	},

    primary_phone: {
      model: "phone",
      required: true
    },

  	phone: {
  		collection: "phone",
  		via: "id"
  	},

    primary_email: {
      model: "email",
      required: true
    },

  	email: {
  		collection: "email",
  		via: "id"
  	},

    dp: {
      type: "string",
      defaultsTo: DEFAULT_IMG
    },

    last: {
      type: "date",
      defaultsTo: new Date()
    },

    twitter: {
      type: "boolean",
      defaultsTo: false
    },

    //GCM reg id used for noticiation
    reg_id: {
      type: "string",
      defaultsTo: null
    },

    active: {
      type: "boolean",
      defaultsTo: false
    },

    downloads: {
      type: "integer",
      defaultsTo: 20
    }

  }
};

