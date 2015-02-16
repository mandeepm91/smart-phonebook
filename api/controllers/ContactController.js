/**
 * ContactController
 *
 * @description :: Server-side logic for managing contacts
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var phoneUtil = require('libphonenumber').phoneUtil;


module.exports = {


  dont_use: function(req, res){
    
    var packet = req.params.all();

    if(!packet.user || !packet.user || !packet.type){
      sails.log.error("Error invalid request");
      return res.json({"status": 0, "error": "invalid request"});
    }
    sails.log.debug("packet for dont use ", packet);
    RequestUpdate.create({
      'user': packet.id,
      'type': packet.type,
      'data': packet.data
    }, function (err, request){
      if(err){
        return res.json({"status": 0, "error": err});
      }
      else{
        User.findOne({'id': packet.id})
        .populate('primary_email')        
        .populate('primary_phone')
        .populate('phone')
        .populate('email')
        .exec(function (err, selfUser){
          if(err || !selfUser){
            return res.json({"status": 0, "error": err})
          }
          else{
            User.findOne({'id': packet.user}, function (err, user){
              if(err || !user){
                return res.json({"status": 0, "error": err})
              }
              else{
                var messageData = {
                  "type": "dontuse",
                  "subType": packet.type,
                  "timestamp": (new Date()).valueOf(),
                  "data": packet.data,
                  "user": packet.type == 'email' ? selfUser : null          
                };
                sails.log.debug("DONT USE messageData ", messageData);
                pushNotification.sendNewAddRequest(messageData, user.reg_id, "dont_use");
                return res.json({"status": 1});
              }
            });
          }
        });
      }
    });
  },


  request_update: function (req, res){

    var packet = req.params.all();

    if(!packet.id || !packet.contact_user_id){
      sails.log.error("ContactController.request_update 1 ", err);
      return res.json({"status": 0, "error": "Invalid request"});
    }

    RequestUpdate.findOne({
      'user': packet.contact_user_id,
      'type': packet.type,
      'data': packet.data
    }, function (err, request){
      if(err){
        return res.json({"status": 0, "error": err});
      }
      else if(request){
        return res.json({"status": 2, "error": "user does not use this number any more"});
      }
      else{
        User.findOne({'id': packet.id}, function (err, selfUser){
          if(err || !selfUser){
            return res.json({"status": 0, "error": err});
          }
          else{
            User.findOne({'id': packet.contact_user_id}, function (err, user){
              if(err || !user){
                return res.json({"status": 0, "error": err});
              }
              else{
                var messageData = { 
                  "type": "requpdate",
                  "subType": packet.type,
                  "sender": selfUser.name,
                  "handle": selfUser.handle,
                  "id": selfUser.id,
                  "dp": selfUser.dp,
                  "timestamp": (new Date()).valueOf(),
                  "data": packet.data
                };    
                pushNotification.sendNewAddRequest(messageData, user.reg_id, "request_update");
                return res.json({"status": 1, "user": user});        
              }
            });        
          }
        });
      }
    });

/*
    {
      id: ,
      contact_user_id: ,
      type: "phone" / "email"
      data: {
        "phone": 
      }
    }
*/

  },


	add_via_handle: function (req, res){

		var packet = req.params.all();
		// packet must contain user id of the adder and handle of the addee

    function addCallback(err, user, type){
      if(err){
        sails.log.debug("Callback error message: ", err);
        return res.json({"status": 0, "error": err});
      }
      else{
        sails.log.debug("Callback results : ", user, type);
        return res.json({"status": 1, "user": user, "type": type});
      }
    }

		sails.log.debug(packet);
		if(!packet.user || !packet.handle){
      sails.log.error("ContactController.add_via_handle : Invalid request");
      return res.json({"status": 0, "error": "Invalid request"});			
		}

    User.findOne({'handle': packet.handle}, function (err, handleUser){
      if(err || !handleUser || handleUser.id == packet.user){
        return res.json({"status": 0, "error": err});
      }
      else{
        AddRequests.add_via_handle(packet.user, packet.handle, "handle", null, addCallback);        
      }
    });

	},

	add_90s_style: function (req, res){

    function addCallback(err, user, type){
      if(err){
        sails.log.debug("Callback error message: ", err);
        return res.json({"status": 0, "error": err});
      }
      else{
        sails.log.debug("Callback results : ", user, type);
        return res.json({"status": 1, "user": user, "type": type});
      }
    }
		// packet will contain primary phone id of the user who is adding
		// number
		// ISO 

		// Algo see if number already exists by parsing and searching for intl
		// if it does and is linked to hellos user, ie owner is not null then call sails.controller.contact
		// otherwise create a phone record and add it to the contacts

		var packet = req.params.all();
		if(!packet.number || !packet.user){
			sails.log.error("Invalid request");
			return res.json({"status": 0, "error": err});
		}

    sails.log.debug("Add 90s style : ", packet);

    var myQuery = "select u.handle" 
    + " from users u, phone p" 
    + " where p.owner = u.id"
    + " and p.verified = true"
    + " and u.id  <> " + packet.user 
    + " and p.intl = '" + packet.number + "'" ; 

    sails.log.debug("Query :", myQuery);

    Phone.query(myQuery, function (err, foundHandle){
      if(err || !foundHandle.rows.length){
        sails.log.debug("Error :", foundHandle);
        return res.json({"status": 0, "error": err});
      }
      else{
        sails.log.debug("foundHandle ", foundHandle);
        foundHandle = foundHandle.rows[0].handle;
        AddRequests.add_via_handle(packet.user, foundHandle, "phone", null, addCallback);
      }
    });
	},

  allow_add: function (req, res){

    function addCallback(err, user){
      if(err){
        sails.log.debug("Callback error message: ", err);
        return res.json({"status": 0, "error": err});
      }
      else{
        sails.log.debug("Callback results : ", user);
        return res.json({"status": 1, "user": user});
      }
    }

    var packet = req.params.all();

    if(!packet.adder_user || !packet.addee_handle || !packet.addee_user || !packet.adder_handle){
      sails.log.error("Allow add invalid request");
      return res.json({"error": "invalid request"});
    }

    sails.log.info("packet for allow_add", packet);


    sails.log.debug("ADD BACK IS ", packet.add_back);

    AddRequests.add_via_handle(packet.adder_user, packet.addee_handle, "phone", "allow", function (err, user){
      if(err){
        sails.log.debug("Callback error message: ", err);
        return res.json({"status": 0, "error": err});
      }
      else{
        sails.log.debug("Callback results : ", user);
        if(packet.add_back){
          sails.log.debug("################################ NOW CALLING ADD BACK#################");
          AddRequests.add_via_handle(packet.addee_user, packet.adder_handle, "phone", "add_back", addCallback);
        }
        else{
          Allowed.create({'allowed_by': packet.addee_user, 'allowed_user': packet.adder_user}, function (err, allowed){
            if(err){
              return res.json({"status": 0, "error": err});
            }
            else{
              sails.log.info("###############ALLOWED ONLY############### ", allowed);
              return res.json({"status": 1});          
            }
          });
        }
      }
    });
    

  },

  dont_allow: function (req, res){

    // user_id will contain the id of the user who sent me this request
    // I am req.user and I want to remove myself from the contacts of user_id
    // that function will return the user object of the user_id
    // Then I need to send a notification to reg_id of user_id from req.user

    var packet = req.params.all();

    User.findOne({'id': packet.self_id})
    .populate('email')
    .populate('phone')
    .populate('primary_phone')
    .populate('primary_email')
    .exec(function (err, selfUser){
      if(err){
        return res.json(err);
      }
      else{
        var myQuery = "select dont_allow(" + selfUser.id + "," + packet.user_id + ")"; 

        Contact.query(myQuery, function (err, user){
          if(err || !user){
            sails.log.error("ContactController.dont_allow ", err);
            return res.json(err);
          }
          else{
            user = user.rows && user.rows[0] && user.rows[0].dont_allow;
            User.findOne({'id': user.id})
            .exec(function (err, user){
              if(err || !user){
                return res.json({"status": 0, "error": err});
              }
              else{

                var messageData = { 
                  "type": "dontallow",
                  "user":  selfUser,
                  "timestamp": (new Date()).valueOf()
                };
                pushNotification.sendNewAddRequest(messageData, user.reg_id, "dont_allow");
                return res.json({"status": 1});
              }
            });
          }
        });        
      }
    });
  },


  remove_contact: function (req, res){

    var packet = req.params.all();

    // packet will contain id of user
    // iso
    // an array numbers : [ ] 
    // a flag all true if need to delete contact entirely

    // First parse the phone numbers in numbers array to identify intl represenation
    // create an array of objects called contact_phones
    // pass this to the function

    sails.log.info("remove_contact packet ", packet);

    var numbers = [];

    numbers.push(packet.number);

    sails.log.info("remove_contact numbers ", numbers);    

    var contact_phones = [];
    async.each(numbers , function (number, callback){
      try {
        var phoneProto = phoneUtil.parse(number, packet.iso);
        phoneProto.intl = phoneUtil.format(phoneProto, 1);
        if(phoneUtil.isValidNumber(phoneProto)){
          var contact_phone  = {
            'number': phoneProto.intl,
            'intl': true
          };
          contact_phones.push(contact_phone);
        }
        else{
          var contact_phone  = {
            'number': number,
            'intl': false
          };          
          contact_phones.push(contact_phone);
        }
        callback(); 
      } catch (e) {
        var contact_phone  = {
          'number': number,
          'intl': false
        };          
        contact_phones.push(contact_phone);
        callback();
      }
    }, function (err){
      if(err){
        sails.log.error("ContactController.remove_contact 1 :", err);
        return res.json({"status": 0, "error":  err});
      }
      else{
        sails.log.info("remove_contact contact_phones ", contact_phones);

        if(packet.name){
          var myQuery = "select remove_contact (" + packet.id 
                        + "," + packet.all 
                        + ",'" + contact_phones[0].number  
                        + "'," + contact_phones[0].intl 
                        + ",'" + packet.name + "')";          
        }
        else{
          var myQuery = "select remove_contact (" + packet.id 
                        + "," + packet.all 
                        + ",'" + contact_phones[0].number  
                        + "'," + contact_phones[0].intl + ")";                    
        }

        sails.log.info("remove_contact myQuery ", myQuery);

        Contact.query(myQuery, function (err, result){
          if(err){
            sails.log.error("ContactController.remove_contact 2 :", err);
            return res.json({"status": 0, "error": err});
          }
          else{
            result = result.rows && result.rows[0] && result.rows[0].remove_contact;
            sails.log.info("remove_contact result ", result);
            if(result == 0){
              return res.json({"status": 0, "error": "contact not found"});
            }
            else{
              return res.json({"status": 1});
            }
          }
        });
      }
    });
  }
	
};

