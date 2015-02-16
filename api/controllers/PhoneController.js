/**
 * PhoneController
 *
 * @description :: Server-side logic for managing phones
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var phoneUtil = require('libphonenumber').phoneUtil;

module.exports = {

  create: function (req, res){


    // packet variables
    // iso :  input of POST /api/phone 
    // name:  input of POST /api/phone
    // handle: randomly generated string of 25 chars
    // primary_phone: output of POST /api/phone
    // primary_email: input of POST /api/phone
    // other_phone: input of POST /api/phone
    // other_email: input of POST /api/phone
    // reg_id : input of POST /api/phone

    function doLogin(user) {
      // Auto-login
      req.logIn(user, function (err){
        if (err) {
          sails.log.error(err);
          userCb(err);
        }
        else{
          sails.log.info("Logged in ");
          req.session.authenticated = true;
          userCb(null, user);
        }
      });
    }

    function userCb(err, user){
      if(err){
        return res.json({"status": 0, "error": err});
      }
      else{
        sails.log.info("UserCb returning user ", user);
        return res.json({"status": 1, "user": user})
      }
    }

    var packet = req.params.all();
    // Packet will contains phone, imei and code

    if(!packet.owner){
      if(!packet.iso || !packet.imei || !packet.code || !packet.number ||!packet.primary_email){
        sails.log.error("PhoneController.create : Invalid request");
        return res.json({"status": 0, "error": "Invalid request"});
      }
    }
    else{
      if(!packet.iso || !packet.imei || !packet.code || !packet.number){
        sails.log.error("PhoneController.create : Invalid request");
        return res.json({"status": 0, "error": "Invalid request"});
      }      
    }

    sails.log.debug("PHONE packet  is: ", packet);
    var phoneProto = phoneUtil.parse(packet.number, packet.iso);
    packet.isd = phoneProto["values_"]["1"];
    packet.intl = phoneUtil.format(phoneProto, 1);

    Request.findOne(
      {
        'iso': packet.iso,
        'imei': packet.imei, 
        'code': packet.code, 
        'number': packet.number 
      }, function (err, request){
      if(err || !request){
        err = err || "Request not found";
        sails.log.error("PhoneController.create : ", err);
        return res.json({"status": 0, "error": err});
      }
      else{
        sails.log.info("PhoneController.create : found request ", request);
        delete packet.code;
        
        // See if the phone number exists with missing imei
        // which means someone else's contacts contains this phone number who is already on hellos
        // If if it exists, update the imei number and return the updated result
        // Else create a new one
        // Owner is used to add new phone numbers in the phone array to verify them
        if(!packet.owner){
          sails.log.info("request.intl and packet.intl ", request.intl, packet.intl);
          Phone.findOne({'intl': request.intl}, function (err, phone){
            if(err){
              sails.log.error("PhoneController.create 1 : ", err);
              return res.json({"status": 0, "error": err});            
            }
            else if(phone){
              sails.log.info("Phone already exists in DB ", phone);
              if(phone.owner && phone.imei && phone.verified){
                sails.log.info("Phone already exists in DB and linked to a users ", phone);
                User.findOne(phone.owner)
                .populate('primary_phone')
                .populate('primary_email')
                .populate('email')
                .populate('phone')
                .exec(function (err, user){
                  if(err){
                    sails.log.error("PhoneController.create : ", err);
                    return res.json({"status": 0, "error": err});
                  }
                  else{
                    sails.log.info("PhoneController.create : Existing user", user);
                    //return res.json({"status": 1, "user": user});
                    doLogin(user);
                  }                
                });
              }
              else{
                sails.log.info("Phone is not linked to an existing user");
                phone.imei = packet.imei;
                phone.verified = true;
                phone.save(function (err, phone){
                  if(err){
                    sails.log.error("PhoneController.create 2 : ", err);
                    return res.json({"status": 0, "error": err});
                  }
                  else{
                    var userObj = {
                      'iso': packet.iso,
                      'name': packet.name,
                      'primary_phone': phone.id,
                      'primary_email': packet.primary_email,
                      'other_email': packet.other_email,
                      'other_phone': packet.other_phone,
                      'reg_id': packet.reg_id
                    }
                    general.user_create(userObj, req, userCb);
                    // CHECKPOINT
                    // return res.json({"status": 1, "phone": phone});                
                  }
                });                
              }
            }
            else{
              sails.log.info("Phone does not exist in DB ");
              packet.verified = true;
              sails.log.debug("Before error:", packet);
              Phone.create(packet, function (err, phone){
                if(err){
                  sails.log.error("PhoneController.create 3 : ", err);
                  return res.json({"status": 0, "error": err});
                }
                else{
                  sails.log.info("PhoneController.create : 4 Created an entry for a new phone ", phone);
                  var userObj = {
                    'iso': packet.iso,
                    'name': packet.name,
                    'primary_phone': phone.id,
                    'primary_email': packet.primary_email,
                    'other_email': packet.other_email,
                    'other_phone': packet.other_phone,
                    'reg_id': packet.reg_id
                  }
                  general.user_create(userObj, req, userCb);
                  // CHECKPOINT
                  // return res.json({"status": 1, "phone": phone});
                }
              });            
            }
          });    
        }
        else{
          // Else check if Phone exists in DB
          // If yes then is it linked to another user
            //  If yes then return error
            //  Else link it with this user and set verified = true
          // Else create phone record, set verified = true and link it with this user
          Phone.findOne({'intl': request.intl}, function (err, phone){
            if(err || ( phone && phone.owner && phone.owner!=packet.owner)){
              err = err || {'error': 'phone already in use'};
              return res.json({"status": 0, "error": err});
            }
            else{
              if(phone){
                phone.owner = packet.owner;
                phone.verified = true;
                phone.save(function (err){
                  if(err){
                    return res.json({"status": 0, "error": err});
                  }
                  else{
                    // Find user and update
                    User.findOne({'id': packet.owner})
                    .populate('primary_email')
                    .populate('primary_phone')
                    .populate('email')
                    .populate('phone')
                    .exec(function (err, user){
                      if(err){
                        return res.json({"status": 0, "error": err});
                      }
                      else if(user){
                        user.phone.add(phone.id);
                        if(packet.set_primary){
                          user.primary_phone = phone.id;
                        }
                        user.save(function (err){
                          if(err){
                            return res.json({"status": 0, "error": err});
                          }
                          else{
                            pushNotification.sendNotification(user.id, {"type": "userupdate"}, req, res);
                            AddRequests.add_hellos(user.id);                                      
                            return res.json({"status": 1, "phone": phone});
                          }
                        });                      
                      }
                      else{
                        return res.json({"status": 0, "error": "you screwed up bigtime"});
                      }
                    });
                  }
                });
              }
              else{
                packet.verified= true;
                Phone.create(packet, function (err, newPhone){
                  if(err){
                    return res.json({"status": 0, "error": err});
                  }
                  else{
                    // Find user and update
                    User.findOne({'id': packet.owner})
                    .populate('primary_email')
                    .populate('primary_phone')
                    .populate('email')
                    .populate('phone')
                    .exec(function (err, user){
                      if(err){
                        return res.json({"status": 0, "error": err});
                      }
                      else if(user){
                        user.phone.add(newPhone.id);
                        user.save(function (err){
                          if(err){
                            return res.json({"status": 0, "error": err});
                          }
                          else{
                            pushNotification.sendNotification(user.id, {"type": "userupdate"}, req, res);
                            AddRequests.add_hellos(user.id);                                      
                            return res.json({"status": 1, "phone": newPhone});
                          }
                        });
                      }
                      else{
                        return res.json({"status": 0, "error": "you screwed up bigtime"});
                      }                      
                    });
                  }
                });
              }
            }
          });
        }
      }
    });   
  }
};

