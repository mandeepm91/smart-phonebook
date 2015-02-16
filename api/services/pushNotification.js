

var gcm = require('node-gcm');


module.exports = {

  // Generates a random 
  sendDummyMessage: function (regId, req, res){

    // create a message with default values
    var message = new gcm.Message();

    // or with object values
  /* 
    var message = new gcm.Message({
      collapseKey: 'demo',
      delayWhileIdle: true,
      timeToLive: 3,
      data: {
          title: 'test',
          message: 'dummy message'
      }
    });
*/
    message.addData('title','test');
    message.addData('message','dummy message');
    message.delayWhileIdle = true;

    var sender = new gcm.Sender('AIzaSyAYgl12VzYVXJiAd2OQ9y0nkSHiDLgplZA');
    var registrationIds = [];

    // At least one required
    registrationIds.push(regId);

    sails.log.debug(registrationIds)

    /**
     * Params: message-literal, registrationIds-array, No. of retries, callback-function
     **/
    sails.log.debug("Sending message");
    sender.send(message, registrationIds, 4, function (err, result) {
      if(err){
        return res.json({"status": 0, "error": err});
      }
      else{
        sails.log.debug("Sent message : ", message, registrationIds);
        return res.json({"status": 1, "message": "sent!"});
      }
    });
  },

  sendRequest: function (user_id, messageData, reg_ids, req, res){

    var message = new gcm.Message({
      "collapseKey": 'demo',
      "delayWhileIdle": true,
      "timeToLive": 3,
      "data": messageData      
    });

    var sender = new gcm.Sender('AIzaSyAYgl12VzYVXJiAd2OQ9y0nkSHiDLgplZA');
    var registrationIds = reg_ids || [];
    sails.log.debug(registrationIds)


    User.findOne({'id': user_id}, function (err, user){
      if(err || !user){
        return res.json(err);
      }
      else{
        message.addData('user',user);
        sender.send(message, registrationIds, 4, function (err, result) {
          if(err){
            return res.json({"status": 0, "error": err});
          }
          else{
            sails.log.debug("Sent message : ", message, registrationIds);
            return res.json({"status": 1, "message": "sent!"});
          }
        });
      }
    });

  },

  sendNotification: function (user_id, messageData){

    var message = new gcm.Message({
      "collapseKey": 'demo',
      "delayWhileIdle": true,
      "timeToLive": 3,
      "data": messageData      
    });

    var sender = new gcm.Sender('AIzaSyAYgl12VzYVXJiAd2OQ9y0nkSHiDLgplZA');

    if(!user_id){
      sails.log.error("pushNotification.sendNotification : Missing user id", err);
      return ;
    }
    User.findOne({'id': user_id})
    .populate('primary_phone')
    .populate('primary_email')
    .populate('phone')
    .populate('email')
    .exec( function (err, user){
      if(err || !user){
        sails.log.error("pushNotification.sendNotification 1 : ", err);
        return ;
      }
      else{
        sails.log.info("pushNotification.sendNotification 2 ");
        var myQuery = "select notify_contacts("+user.id+")";
          User.query(myQuery, function (err, contacts){
          if(err){
            sails.log.error("pushNotification.sendNotification 3 : ", err);
            return;
          }
          else{
            contacts = contacts && contacts.rows && contacts.rows[0].notify_contacts;
            sails.log.info("pushNotification.sendNotification 4 : ", contacts);
            sails.log.debug("pushNotification.sendNotification,  Reg ids of contacts", contacts);
            // create a message with default values
            message.data['user'] = user;
            contacts = contacts || [];
            sender.send(message, contacts, 4, function (err, result) {
              if(err){
                sails.log.error("pushNotification.sendNotification 5 :", err);
                return;
              }
              else{
                sails.log.debug("pushNotification.sendNotification : Sent message : ", message, contacts);
                return;
              }
            });
          }
        });       
      }
    });

  },

  sendAddedNotification: function(user, reg_id){
    // user is the object of the user sending the request
    // reg_id is the person for whom this request is being sent
    var message = new gcm.Message({
      "collapseKey": 'demo',
      "delayWhileIdle": true,
      "timeToLive": 3,
      "data": {
        "user": user,
        "type": "added"
      }      
    });

    sails.log.info("sendAddedNotification : sending message with reg_id : ", reg_id);

    var sender = new gcm.Sender('AIzaSyAYgl12VzYVXJiAd2OQ9y0nkSHiDLgplZA');
    sender.send(message, reg_id, 4, function (err, result) {
      if(err){
        sails.log.error(err);
        return;
      }
      else{
        sails.log.debug("sendAddedNotification Sent message : ", message, reg_id);
        return;
      }
    });    
  },

  sendAddRequest: function (user, reg_id){
    // user is the object of the user sending the request
    // reg_id is the person for whom this request is being sent
    var message = new gcm.Message({
      "collapseKey": 'demo',
      "delayWhileIdle": true,
      "timeToLive": 3,
      "data": {
        // "user": user,
        "type": "addrequest",
        "subType": "number",
        "handle": user.handle,
        "dp": user.dp,
        "sender": user.name,
        "id": user.id,
        "timestamp": (new Date()).valueOf(),
        "data": {
          "common": user.common
        }
      }      
    });

    sails.log.info("sendAddRequest : sending message with reg_id : ", reg_id);

    var sender = new gcm.Sender('AIzaSyAYgl12VzYVXJiAd2OQ9y0nkSHiDLgplZA');
    sender.send(message, reg_id, 4, function (err, result) {
      if(err){
        sails.log.error(err);
        return;
      }
      else{
        sails.log.debug("sendAddRequest Sent message : ", message, reg_id);
        return;
      }
    });

  },

  sendNewAddRequest: function(messageData, reg_id, caller){
    var message = new gcm.Message({
      "collapseKey": 'demo',
      "delayWhileIdle": true,
      "timeToLive": 3,
      "data": messageData      
    });    

    sails.log.info("sendNewAddRequest : sending message with reg_id : ", reg_id);

    var reg_id_array = [];
    reg_id_array.push(reg_id);

    var sender = new gcm.Sender('AIzaSyAYgl12VzYVXJiAd2OQ9y0nkSHiDLgplZA');

    sails.log.info("sendNewAddRequest : sending message with reg_id : ", reg_id_array);
    sails.log.debug("CALLER FOR this notification is", caller);

    sender.send(message, reg_id_array, 4, function (err, result) {
      if(err){
        sails.log.error(err);
        return;
      }
      else{
        sails.log.debug("sendNewAddRequest Sent message : ", message, reg_id_array);
        return;
      }
    });
 
  }


};

