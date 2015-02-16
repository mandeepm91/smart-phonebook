/**
* Log.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {

    phone: {
      model: "phone",
      required: false
    },

    number: {
      type: "string",
      required: false
    },

    name: {
      type: "string",
      defaultsTo: null
    },

    timestamp: {
      type: "datetime",
      required: false
    },

    // 0 means missed, 1 means incoming, 2 means outgoing
    type: {
      type: "integer",
      required: false
    },

    duration: {
      type: "integer",
      required: false
    }

  }
};

