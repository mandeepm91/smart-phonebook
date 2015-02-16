/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var UPLOAD_PATH = process.env.HOME + "/vault/user/" ;

var DEFAULT_IMG = process.env.HOME + "/vault/user/default.jpg" ;


var phoneUtil = require('libphonenumber').phoneUtil;

var fs = require('fs');

module.exports = {

  create: function (req, res){
    return res.send(403, "forbidden");
  },


  clear_db: function (req, res){
    var myQuery = "select clear_db()";
    User.query(myQuery, function (err, result){
      if(err){
        return res.json(err);
      }
      else{
        sails.log.debug("DB CLEARED", result);
        return res.json({"status": 1, "message": "DB CLEARED"});
      }
    })
  },


  dummy: function (req, res){
    return res.json(req.user);
  },

  fetch_via_handles:  function(req, res){
    
    var packet = req.params.all();
    if(!packet.handles){
      return res.json({"status": 0, "error": "invalid request"});
    }
    User.find()
    .where({'handle': packet.handles})
    .populate('primary_email')
    .populate('primary_phone')
    .populate('phone')
    .populate('email')
    .exec( function (err, users){
      if(err){
        sails.log.error(err);
        return res.json({"status": 0, "error": err});
      }
      else{
        return res.json({"status": 1, "users": users});
      }
    });
  },

  update: function(req, res) {
    var id = req.param('id');
    User
    .update(id, req.params.all())
    .exec(function (err, users) {
      if(err){
       return res.json({"status": 0, "error": err});
      }
      else{
        var user = users[0];
        if(!user){
          return res.json({"status": 0, "error": "user not found"});
        }
        //AddRequests.generate_add_requests(user.id, user.reg_id);
        if(user.active){
          pushNotification.sendNotification(id, {"type": "userupdate"}, req, res);
          AddRequests.add_hellos(id);          
        }

        User.findOne({'id': user.id})
        .populate('primary_email')
        .populate('primary_phone')
        .populate('phone')
        .populate('email')
        .exec(function (err, user){
          if(err){
            sails.log.error(err);
            return res.json({"status": 0, "error": err});
          }
          else{
            if(user.handle.length < 16 && user.name.length > 0 && user.dp != DEFAULT_IMG && !user.active){
              user.active = true;
              user.save(function (err){
                if(err){
                  sails.log.error("Error updating user active flag", err);
                  return res.json({"status": 0, "error": err});
                }
                else{
                  pushNotification.sendNotification(id, {"type": "userupdate"}, req, res);
                  AddRequests.add_hellos(id);          
                  sails.log.debug("User activated", user);
                  return res.json({"status": 1,"user": user});
                }
              });
            }
            else{
              return res.json({"status": 1,"user": user});
            }            
          }
        });

      }
    });
  },


  find_handle: function (req, res){

    var packet = req.params.all();

    var myQuery = "select distinct handle from users where active = true and handle like '" + packet.handle +"%'";

    User.query(myQuery, function (err, handles){
      if(err){
        sails.log.error("UserController.find_handle : ", err);
        return res.json({"status": 0, "error": err});
      }
      else{
        sails.log.info("UserController.find_handle : Fetched handles");
        return res.json({"status": 1, "handles": handles.rows});
      }
    });
  },

  store_contacts: function (req, res){
    
    var packet = req.params.all();

    if( !packet.phone || !packet.contacts || !packet.iso){
      sails.log.error("UserController.store_contacts : Invalid request");
      return res.json({"status": 0, "error": "Invalid request"});     
    }

    if(typeof packet.contacts != 'object'){
      packet.contacts = JSON.parse(packet.contacts);
    }

    async.each(packet.contacts, function (contactObj, contactsCB){
      var modified_phone_array = [];
      if(contactObj.phone){
        if(typeof contactObj.phone != 'object'){
          contactObj.phone = JSON.parse(contactObj.phone);
        }
        if(typeof contactObj.email != 'object'){
          contactObj.phone = JSON.parse(contactObj.phone);
        }

        async.each(contactObj.phone, function (phoneItem, phoneCB){
          try {
            var phoneProto = phoneUtil.parse(phoneItem, packet.iso);
            phoneProto.intl = phoneUtil.format(phoneProto, 1);
            if(phoneUtil.isValidNumber(phoneProto)){
              phoneItem = phoneProto.intl;
              phoneItem = 'i' + phoneItem;
            }
            else{
              phoneItem = 'x' + phoneItem; 
            }
            modified_phone_array.push(phoneItem);
            phoneCB(); 
          } catch (e) {
            phoneItem = 'x' + phoneItem;
            modified_phone_array.push(phoneItem);
            phoneCB();
          }
        }, function (err){
          if(err){
            contactsCB(err);
          }
          else{
            contactObj.phone = modified_phone_array;
            contactsCB();
          }
        })        
      }
    }, function (err){
      if(err){
        return res.json(err);
      }
      else{
        sails.log.debug("CHECKPOINT 1 BEFORE REPLACE ", packet.contacts);
        //return res.send(myQuery);
        var contactsJSONString = JSON.stringify(packet.contacts);
        contactsJSONString = contactsJSONString.replace(/\t/g," ").replace(/\n/g," ").replace(/\r/g,"").replace(/\b/g,"").replace(/\f/g,"").replace(/\'/g,'').replace(/\\"/g,'');
        contactsJSONString = JSON.parse(contactsJSONString);
        contactsJSONString = JSON.stringify(contactsJSONString);
        var myQuery = "select store_contacts(" + packet.id + ",'" + packet.iso + "'," + packet.phone + ",E'" + contactsJSONString + "')";  

        sails.log.debug("CHECKPOINT 2 AFTER processing ", myQuery);

        Contact.query(myQuery, function (err, result){
          sails.log.debug("CHECKPOINT MAIN: ", myQuery.length);
          if(err){
            sails.log.debug("CHECKPOINT 2", myQuery.length);
            sails.log.error(myQuery);
            sails.log.error(err);
            return res.json({"status": 0, "error": err});
          }
          else{
            sails.log.debug("CHECKPOINT 4", result);
            result = result.rows[0].store_contacts;
            var notification_id = result.notification_id;
            result = result.hellos_users;
            result = result || [];
            sails.log.debug("RESULT : ", result); 
            sails.log.debug("notification_id : ", notification_id);
            var new_result = {};
            async.each(result, function (user, cb){
              if(!user.id){
                cb(err);
              }
              else{
                new_result[user.id] = user;
                cb();                
              }
            }, function (err){
              if(err){
                sails.log.error(err);
                return res.json({"status": 0,"error": err});
              }
              else{
                sails.log.debug("CHECKPOINT 5", new_result);
                User.find()
                .where({'id': Object.keys(new_result)})
                .populate('primary_email')
                .populate('primary_phone')
                .populate('phone')
                .populate('email')
                .exec( function (err, users){
                  if(err){
                    sails.log.error(err);
                    return res.json({"status": 0, "error": err});
                  }
                  else{
                    async.each(users, function (newUser, newUserCB){
                      if(!new_result[newUser.id]){
                        newUserCB(err)
                      }
                      newUser.contactid = new_result[newUser.id]['contactid'];
                      newUserCB();
                    }, function (err){
                      if(err){
                        sails.log.error(err);
                        return res.json({"status": 0,"error": err});
                      }
                      else{
                        sails.log.info("Hellos users", users);
                        AddRequests.notify_contacts(packet.id);
                        AddRequests.send_add_request(packet.id, notification_id);
                        AddRequests.generate_add_requests(packet.id);
                        AddRequests.add_hellos(packet.id);
                        return res.json({"status": 1,"hellos_users": users, "notification_id": notification_id});
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
  },

  find_unknown: function (req, res){

    var packet = req.params.all();
    // sails.log.debug("find_unknown : ", packet.contacts);
    if(typeof packet.contacts != 'object'){
      packet.contacts = JSON.parse(packet.contacts);
    }
    // sails.log.debug("find_unknown : ", packet.contacts);
    var parsed_contacts = {};
    async.each(packet.contacts, function (phoneItem, callback){
      try { 
        var phoneProto = phoneUtil.parse(phoneItem, packet.iso);
        phoneProto.intl = phoneUtil.format(phoneProto, 1);
        if(phoneUtil.isValidNumber(phoneProto)){
          parsed_contacts[phoneProto.intl] = phoneItem;
        }  
        callback();
      } catch(e) {
        sails.log.debug(e, phoneItem)
      }
    }, function (err){
      if(err){
        sails.log.error("UserController.find_unknown : 1 ", err);
        return res.json({"status": 0, "error": err});
      }
      else{
        var myQuery = "select find_unknown('" +JSON.stringify(Object.keys(parsed_contacts)) +"')";
        // sails.log.debug(myQuery);
        Contact.query(myQuery, function (err, results){
          if(err){
            sails.log.error("UserController.find_unknown 2 : ", err);
            return res.json({"status": 0, "error": err});
          }
          else{
            results = results && results.rows && results.rows[0].find_unknown;
            results = results || [];
            sails.log.info("UserController.find_unknown 3 : ");
            async.each(results, function (result, resultCB){
              result['number'] = parsed_contacts[result['intl']];
              resultCB();
            }, function (err){
              if(err){
                sails.log.error("UserController.notify_contacts 4 : ", err);
                return res.json(err);
              }
              else{
                return res.json({"status": 1, "results": results});
              }
            });
            //return res.json({"status": 1, "results": results});
          }
        });
       }
    });

  },

/*
  dummy: function (req, res){

    var packet = req.params.all();
    pushNotification.sendDummyMessage(packet.reg_id, req, res);
    // return res.json({"status": 1});
  },
*/
  fetch_contacts: function (req, res){

    var packet = req.params.all();
    sails.log.debug(packet.userId);
    var myQuery = "select fetch_contacts("+packet.userId+")";
    User.query(myQuery, function (err, contacts){
      if(err){
        sails.log.error("UserController.fetch_contacts : ", err);
        return res.json({"status": 0, "error": err});
      }
      else{
        sails.log.info("UserController.fetch_contacts : fetched contacts");
        return res.json({"status": 1, "contacts": contacts.rows[0].fetch_contacts});
      }
    });

  },

  dpFile:  function (req, res){
    res.view();
  },

  dpUpload: function (req, res){

    var packet = req.params.all();
    // @HACK

    sails.log.debug(packet);
    var inputFileName = req.file('dp')._files[0]["stream"]["filename"];
    var parts = inputFileName.split('.');
    var inputFileNameWOExt = parts.slice(0, parts.length - 1).join(".");
    var ext = parts[parts.length - 1]; 
    var newFileName = inputFileNameWOExt + '_' + (new Date()).valueOf() + '.' + ext;
    var fileName = UPLOAD_PATH + newFileName;

    sails.log.debug(fileName);

    req.file('dp').upload(fileName, function (err, files) {
      if (err){
        sails.log.error(err);
        return res.json(err);
      }
      else{
        var file = files[0];
        /*if(file.type.slice(0,5)!='image'){
          fs.unlink(fileName, function (err){
            sails.log.error("File deleted! ", file);
            return res.json({"status": 0,"error": "Invalid file type"});          
          });
        }*/
        delete file["filename"];
        file.url = "http://api.hellos.co/api/user/dp?url=" + fileName;
        //return res.json({"file": file});

        User.findOne({'id': packet.id})
        .populate('primary_email')
        .populate('primary_phone')
        .populate('phone')
        .populate('email')
        .exec( function (err, user){
          if(err || !user){
            return res.json(err);
          }
          else{
            user.dp = file.url;
            user.save(function (err){
              if(err){
                return res.json(err);
              }
              else{
                if(user.active){
                  pushNotification.sendNotification(user.id, {"type": "userupdate"}, req, res);
                  AddRequests.add_hellos(user.id);          
                  return res.json({"status": 1,"user": user});
                }
                else if(user.handle.length < 16 && user.name.length > 0 && user.dp != DEFAULT_IMG && !user.active){
                  user.active = true;
                  user.save(function (err){
                    if(err){
                      sails.log.error("Error updating user active flag", err);
                      return res.json({"status": 0, "error": err});
                    }
                    else{
                      pushNotification.sendNotification(user.id, {"type": "userupdate"}, req, res);
                      AddRequests.add_hellos(user.id);          
                      sails.log.debug("User activated", user);
                      return res.json({"status": 1,"user": user});
                    }
                  });
                }
                else{
                  return res.json({"status": 1,"user": user});
                }            
              }
            });
          }
        });
      }
    });

  },

  dp: function (req, res){

    var packet = req.params.all();
    fs.readFile(packet.url, function (err, file){
      if(err){
        return res.json(err);
      }
      else{
        return res.send(file);
      }
    });

  },

  unlink_email: function (req, res){

    // find the user using the id from packet
    // remove the email id from user.email
    // set verified to false in the email collection and owner to null
    var packet = req.params.all();
    sails.log.debug(packet);

    User.findOne({'id': packet.id})
    .populate('email')
    .exec(function (err, user){
      if(err || !user){
        err = err || {"error": "invalid user id"};
        return res.json({"status": 0, "error": err});
      }
      else{
        user.email.remove(packet.email);
        user.save(function (err){
          if(err){
            return res.json({"status": 0, "error": err});
          }
          else{
            Email.findOne({'id': packet.email}, function (err, email){
              if(err || !email){
                err = err || {"error": "invalid email id"};
                return res.json({"status": 0, "error": err});
              }
              else{
                email.verified = false;
                email.owner = null;
                email.save(function (err){
                  if(err){
                    return res.json({"status": 0, "error": err});
                  }
                  else{
                    User.findOne({'id': packet.id})
                    .populate('email')
                    .populate('phone')
                    .populate('primary_phone')
                    .populate('primary_email')
                    .exec(function (err, updatedUser){
                      if(err || !user){
                        err = err || {"error": "missing user"};
                        return res.json({"status": 0, "error": err});
                      }
                      else{
                        pushNotification.sendNotification(updatedUser.id, {"type": "userupdate"}, req, res);
                        AddRequests.add_hellos(updatedUser.id);                                                              
                        return res.json({"status": 1, "user": updatedUser});
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

  },

  unlink_phone: function (req, res){

    // find the user using the id from packet
    // remove the phone id from user.phone
    // set verified to false in the phone collection and owner to null
    var packet = req.params.all();
    sails.log.debug(packet);

    User.findOne({'id': packet.id})
    .populate('phone')
    .exec(function (err, user){
      if(err || !user){
        err = err || {"error": "invalid user id"};
        return res.json({"status": 0, "error": err});
      }
      else{
        user.phone.remove(packet.phone);
        user.save(function (err){
          if(err){
            return res.json({"status": 0, "error": err});
          }
          else{
            Phone.findOne({'id': packet.phone}, function (err, phone){
              if(err || !phone){
                err = err || {"error": "invalid phone id"};
                return res.json({"status": 0, "error": err});
              }
              else{
                phone.verified = false;
                phone.owner = null;
                phone.save(function (err){
                  if(err){
                    return res.json({"status": 0, "error": err});
                  }
                  else{
                    User.findOne({'id': packet.id})
                    .populate('email')
                    .populate('phone')
                    .populate('primary_phone')
                    .populate('primary_email')
                    .exec(function (err, updatedUser){
                      if(err || !user){
                        err = err || {"error": "missing user"};
                        return res.json({"status": 0, "error": err});
                      }
                      else{
                        pushNotification.sendNotification(updatedUser.id, {"type": "userupdate"}, req, res);
                        AddRequests.add_hellos(updatedUser.id);                                                                                      
                        return res.json({"status": 1, "user": updatedUser});
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

