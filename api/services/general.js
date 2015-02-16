

var phoneUtil = require('libphonenumber').phoneUtil;


module.exports = {

  find_common_contacts: function (user_id1, user_id2, callback){

    var myQuery = "select find_common_contacts("+user_id1+","+user_id2+")";
    // The above function returns common contacts of user_id1 and user_id2
    // Return type is array of names
    Contact.query(myQuery, function (err, common){
      if(err){
        callback(err);
      }
      else{
        common = common && common.rows && common.rows[0] && common.rows[0].find_common_contacts;
        common = common || [];
        callback(null, common);
      }
    });
  },


  user_create: function(packet, req, callback){

    function doLogin(user) {
      // Auto-login
      req.logIn(user, function (err){
        if (err) {
          sails.log.error(err);
          callback(err);
        }
        else{
          req.session.authenticated = true;
          callback(null, user);
        }
      });
    }

    packet.handle = IdGenerator.generateHex(30);

    // packet variables
    // iso :  input of POST /api/phone 
    // name:  input of POST /api/phone
    // handle: randomly generated string of 25 chars
    // primary_phone: output of POST /api/phone
    // primary_email: input of POST /api/phone
    // other_phone: input of POST /api/phone
    // other_email: input of POST /api/phone

    // if(typeof packet.other_email != 'object'){
    //   packet.other_email = JSON.parse(packet.other_email);
    // }

    // if(typeof packet.other_phone != 'object'){
    //   packet.other_phone = JSON.parse(packet.other_phone);
    // }

    sails.log.debug("Usercontroller.create : ", packet);

    if( !packet.handle || !packet.primary_phone ){
      sails.log.error("UserController.create : Invalid request");
      callback({"error": "Invalid request"});     
    }
    // packet will contain handle, name and phone and email JSON object. It may contain permission and as well

    Email.create({'email': packet.primary_email, 'verified': true}, function (err, primary_email){
      if(err){
        sails.log.error("UserController.create: 1", err);
        callback(err);
      }
      else{
        packet['primary_email'] = primary_email.id;
        packet['email'] = [];
        packet['email'].push(primary_email.id);
        packet['phone'] = [];
        packet['phone'].push(packet.primary_phone);
        sails.log.info("UserController.create: Creating a new user ", packet);
        User.create(packet, function (err, user){
          if(err){
            sails.log.error("UserController].create 2 : ", err);
            callback(err);
          }
          else{
            packet['other_phone'] = packet.other_phone || [];
            async.each(packet.other_phone, function (phone, phoneCb){
              // create records for all the phone numbers
              var phoneObj = {'iso': packet.iso};
              var phoneProto = phoneUtil.parse(phone, packet.iso);
              phoneObj['isd'] = phoneProto["values_"]["1"];
              phoneObj['number'] = phoneProto["values_"]["2"];
              phoneObj['intl'] = phoneUtil.format(phoneProto, 1);
              phoneObj['owner'] = user.id;
              delete phoneObj['id'];
              Phone.create(phoneObj, function (err, newPhone){
                if(err){
                  phoneCb(err);
                }
                else{
                  phoneCb();
                }
              });
            }, function (err){
              if(err){
                sails.log.error("UserController.create: 3", err);
                User.destroy({'id': user.id}, function (err, result1){
                  sails.log.info("Rolling back changes");
                });
                callback(err);
              }
              else{
                packet['other_email'] = packet.other_email || [];
                async.each(packet.other_email, function (email, emailCb){
                  // create records for all the email addresses
                  Email.create({'email': email, 'owner': user.id}, function (err, newEmail){
                    if(err){
                      emailCb(err);
                    }
                    else{
                      emailCb();
                    }
                  }); 
                }, function(err){
                  if(err){
                    sails.log.error("UserController.create :  45", err);
                    User.destroy({'id': user.id}, function (err, result1){
                      sails.log.info("Rolling back changes");
                    });
                    callback(err);
                  }
                  else{
                    sails.log.info("UserController.create : ", user);
                    primary_email.owner = user.id;
                    primary_email.save(function (err){
                      if(err){
                        sails.log.error("UserController.create: 56",err);
                        User.destroy({'id': user.id}, function (err, result1){
                          sails.log.info("Rolling back changes");
                        });
                        callback(err);
                      }
                      else{
                        sails.log.info("User creation , finding primary phone ");
                        Phone.findOne({'id': packet.primary_phone}, function (err, phone){
                          if(err){
                            sails.log.error("UserController.create: 67",err);
                            User.destroy({'id': user.id}, function (err, result1){
                              sails.log.info("Rolling back changes");
                            });
                            callback(err);
                          }
                          else{
                            if(phone.owner){
                              sails.log.error("UserController.create : Phone number already taken");
                              User.destroy({'id': user.id}, function (err, result1){
                                sails.log.info("Rolling back changes");
                              });
                              callback({"error": "Phone number already taken"});
                            }
                            phone.owner = user.id;
                            phone.save(function (err, result){
                              if(err){
                                sails.log.error("UserController.create 43: ", err);
                                User.destroy({'id': user.id}, function (err, result1){
                                  sails.log.info("Rolling back changes");
                                });
                                callback(err);
                              }
                              else{
                                sails.log.info("updated primary phone of user ", phone);
                                User.findOne(user.id)
                                .populate('primary_email')
                                .populate('primary_phone')
                                .populate('phone')
                                .populate('email')
                                .exec(function (err, user){
                                  if(err){
                                    sails.log.error("UserController.create: 88", err);
                                    callback(err);
                                  }
                                  else{
                                    Mailer.sendWelcomeEmail(user);
                                    //return res.json({"status": 1, "user": user});                
                                    doLogin(user);
                                  }
                                });
                              }
                            });
                          }
                        });
                      }
                    });
                  }
                });                
              }
            });
          }
        });
      }
    });

  }


};

