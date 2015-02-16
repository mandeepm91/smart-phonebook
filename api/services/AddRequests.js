

module.exports = {

	generate_add_requests: function(user_id){

    function commonCallback(err, common){
      if(err){
        callback(err);
      }
      else{
        return common;
      }
    }


		var myQuery = "select generate_add_requests("+user_id+")";

    User.findOne({'id': user_id},  function (err, newUser){
      if(err){
        sails.log.error("AddRequest.generate_add_requests : 0 ", err);
      }
      else{
    		Notification.query(myQuery, function (err, userIds){
    			if(err){
    				sails.log.error("AddRequests.generate_add_requests : 1 ", err);
    				return;
    			}
    			else{
    				userIds = userIds && userIds.rows && userIds.rows[0] && userIds.rows[0].generate_add_requests;
    				userIds = userIds || [];
    				sails.log.info("AddRequests.generate_add_requests : 2 ", userIds);
    				async.each(userIds, function (userId, callback){
    					User.findOne({'id': userId.id}, function (err, user){
    						if(err){
    							callback(err);
    						}
    						else{
    							reg_id_array = [];
    							reg_id_array.push(newUser.reg_id);
    							sails.log.info("AddRequests.generate_add_requests : 3 ", reg_id_array);
    							var common = general.find_common_contacts(newUser.id, user.id, commonCallback);
    							user['common'] = common || [];
    							pushNotification.sendAddRequest(user, reg_id_array);
    							callback();
    						}
    					}, function (err){
    						if(err){
    							sails.log.error("AddRequests.generate_add_requests : 4 ", err);
    						}
    						else{
    							sails.log.error("AddRequests.generate_add_requests : 5  SUCCESS!! ");
    						}
    					});
    				});
    			}
    		});        
      }
    });

	},

  notify_contacts: function (user_id) {
    pushNotification.sendNotification(user_id, {"type": "userupdate"});
    return ;
  },

  send_add_request: function(user_id, notification_id){
    User.findOne({'id': user_id}, function (err, user){
      if(err || !user){
        return 
      }
      else{
        var myQuery = "select add_request(" + user_id + "," + notification_id + ")";
        sails.log.debug("SENDING ADD REQUESTS", myQuery);
        Notification.query(myQuery, function (err, result){
          if(err){
            sails.log.error("send_add_request 1", err);
            return;
          }
          else{
            result = result && result.rows && result.rows[0] && result.rows[0].add_request;
            result = result || [];
            sails.log.info("send_add_request 3 ", result);
            async.each( result, function (contact, callback){
              //user['common'] = contact.common || [];
              contact.common || [];
              contact.common = contact.common.map(function (element){
                return element.name;
              });

              contact.common = contact.common.filter(function (element){
                return element && element.length;
              });

              var messageData = { 
                "type": "addrequest",
                "subType": "number",
                "sender": user.name,
                "handle": user.handle,
                "id": user.id,
                "dp": user.dp,
                "timestamp": (new Date()).valueOf(),
                "data": {
                  "common": contact.common
                }
              };

              pushNotification.sendNewAddRequest(messageData, contact.owner_reg_id, "send_add_request");
              callback();

              // pushNotification.sendAddRequest(user, contact.owner_reg_id);
            }, function (err){
              if(err){
                sails.log.error("send_add_request 2 ", err);
                return;
              }
              else{
                Notification.destroy({'id': notification_id}, function (err, notification){
                  if(err){
                    sails.log.error("AddRequests.send_add_request : error deletion notification ", err);
                  }
                  else{
                    sails.log.debug("AddRequests.send_add_request : successfully deleted notification");
                    return ;
                  }
                })                
              }
            });
          }
        });    
      }
    });

  },


  add_via_handle: function(userId, handle, calledVia, user_response, callback){

    // This function is called in two cases
    // Either by the adder who sends the add request
    // Or by the addee who accepts the add request
    // It can be called twice when addee calls it with add_back option


    // calledVia denotes whether this service was called from add via handle or add 90s style
    // End user will get different notification in such cases

    // user response will be null if this function is being called by the adder

    if(user_response == "allow" || user_response == "add_back"){
      // No checks are performed over permission settings
      // true sent as third parameter adds the user to contacts
      var myQuery = "select add_via_handle(" + userId + ",'" + handle +"'," + true + ")";
    }
    else{
      var myQuery = "select add_via_handle(" + userId + ",'" + handle +"')"; 
    }

    function commonCallback(err, common){
      if(err){
        callback(err);
      }
      else{
        return common;
      }
    }

    User.findOne({'id': userId})
    .populate('email')
    .populate('phone')
    .populate('primary_phone')
    .populate('primary_email')
    .exec( function (err, selfUser){
      if(err || !selfUser){
        callback(err);
      }
      else{
        Contact.query(myQuery, function (err, foundUser){
          if(err){
            sails.log.error("ContactController.add_via_handle : checkpoint 1: ", err);
            callback(err);
            // return res.json({"status": 0, "error": err});
          }
          else if(foundUser && foundUser.rows && foundUser.rows[0] && foundUser.rows[0].add_via_handle){
            sails.log.info("ContactController.add_via_handle checkpoint 2 ", foundUser);
            foundUser = foundUser.rows[0].add_via_handle;
            sails.log.info("ContactController.add_via_handle 3 : ", foundUser);
            User.findOne({'id': foundUser.id})
            .populate('email')
            .populate('phone')
            .populate('primary_phone')
            .populate('primary_email')
            .exec( function (err, user){
              if(err){
                callback(err);
                //return res.json(err);
              }
              else{
                // foundUser is basically addee if user response is null or allow
                // foundUser must be adder if the user response is add_back
                if(foundUser.linked){

                  // Cases possible
                  // This is being called from add_via_handle and foundUser is already added
                  // No notifications need to be sent in this case
                  // User object of foundUser will be sent to call back and sent back to the adder

                  if(user_response){

                    // Reaching here means addee has accepted adder's request
                    // and addee is already added to adder's contacts when adder tried to add him
                    // It means addee has responded to a type 1 add request
                    // In this case addee must get the adder's user object

                    // Important to note that still adder is selfUser and addee is foundUser
                    // selfUser will receive a notification userupdate from foundUser
                    // and foundUser (who is actually calling this function via allow_add)
                    // will receive the user object of selfUser


                    // Final case is that this function is called with add_back parameter
                    // here addee is trying to add the adder
                    // now selfUser is the addee who is pressed add_back button on his screen
                    // and foundUser is the adder who sent the add request originally
                    // foundUser has already received a notification about selfUser
                    // if we reach this if condition in this case, then no need to do anything

                    if(user_response == "allow"){
                      var messageData = {
                        "type": "userupdate",
                        "user": user
                      }
                      sails.log.debug("Sending notification to user ", selfUser.handle);
                      sails.log.debug("Notification contains user update for ", foundUser.handle);                  
                      pushNotification.sendNewAddRequest(messageData, selfUser.reg_id, "add_via_handle4");                      
                      callback(null, selfUser);
                    }
                    else{
                      callback(null, selfUser);                    
                    }
                  }
                  else{
                    callback(null, user, 2);                  
                  }
                }
                else if(!foundUser.added){
                  // this case is only possible when this is called by the adder
                  // ie via add_via_handle. Since allow or add_back will always set added = true
                  general.find_common_contacts(selfUser.id, user.id, function (err, common){
                    if(err){
                      callback(err);
                    }
                    else{
                      var messageData = { 
                        "type": "addrequest",
                        "subType": calledVia,
                        "sender": selfUser.name,
                        "handle": selfUser.handle,
                        "id": selfUser.id,
                        "dp": selfUser.dp,
                        "timestamp": (new Date()).valueOf(),
                        "data": {
                          "common": common || []
                        }
                      };
                      // User's permission settings did not allow him to be added
                      pushNotification.sendNewAddRequest(messageData, user.reg_id, "add_via_handle");
                      var returnUser = {};
                      returnUser['name'] = user['name'];
                      returnUser['handle'] = user['handle'];
                      returnUser['dp'] = user['dp'];
                      callback(null, returnUser, 0);                                    
                    }
                  });
                }
                else{
                  // Add all phones of the user.phone to the primary phone of the adder user

                  // Cases, if this is being called by adder from add_via_handle
                  // No need to send any userupdate notifications
                  // Add the contacts and send foundUser object back to callback
                  // However, need to send the addrequest in this case



                  // if(user_response == "allow"){

                  //   // Reaching here means addee has accepted adder's request
                  //   // but addee is not already added to adder's contacts when adder tried to add him
                  //   // It means addee has responded to a type 0 add request
                  //   // In this case addee must get the adder's user object

                  //   // Important to note that still adder is selfUser and addee is foundUser
                  //   // selfUser will receive a notification userupdate from foundUser
                  //   // and foundUser (who is actually calling this function via allow_add)
                  //   // will receive the user object of selfUser

                  //   var messageData = {
                  //     "type": "userupdate",
                  //     "user": user
                  //   }
                  //   sails.log.debug("Sending notification to user ", selfUser.handle);
                  //   sails.log.debug("Notification contains user update for ", foundUser.handle);                  
                  //   pushNotification.sendNewAddRequest(messageData, selfUser.reg_id, "add_via_handle4");
                  //   // callback(null, selfUser);
                  // }

                  // else if(user_response == "add_back"){
                  //   callback(null, user);
                  // }




                  // Reaching here means either this is being called from add_via_handle
                  // Or via allow_add
                  // We do not need to send an add request if it is being called via allow_add


                  User.findOne({'id': userId}).exec( function (err, adder){
                    if(err || !adder){
                      callback(err);
                      //return res.json({"status": 0, "error": err});
                    }
                    else{
                      var primary_phone = adder.primary_phone;
                      sails.log.debug("ContactController.add_via_handle primary phone of the adder :", primary_phone)
                      var contact_array = [];
                      async.each(user.phone, function (phone_entry, cb){
                        contact_array.push(phone_entry.id);
                        sails.log.debug("ContactController.add_via_handle Contact array current state: ", contact_array);
                        cb();
                      }, function (err){
                        if(err){
                          sails.log.error("ContactController.add_via_handle : checkpoint 1", err);
                          callback(err);
                          //return res.json({"status": 0, "error": err});
                        }
                        else{
                          sails.log.debug("CHECKPOINT 4");
                          Contact.create({'phone': primary_phone, 'contact': contact_array})
                          .exec(function (err, contact){
                            if(err){
                              sails.log.error("ContactController.add_via_handle : checkpoint 2", err);
                              callback(err);
                              //return res.json({"status": 0, "error": err});
                            }
                            else{
                              sails.log.debug("CHECKPOINT 5 ", contact);
                              async.each(contact_array, function (phoneId, cplCb){
                                ContactPhoneLinkage.create({'phone_id': phoneId, 'contact': contact.id})
                                .exec( function (err, cplRecord){
                                  if(err){
                                    sails.log.error("ContactController.add_via_handle : checkpoint 3", err);
                                    cplCb(err);
                                  }
                                  else{
                                    cplCb();
                                  }
                                })
                              }, function (err, success){
                                if(err){
                                  callback(err);
                                  // return res.json({"status": 0, "error": err});
                                }
                                else{
                                	sails.log.debug("THECHECKPOINT ", user_response);
                                  //pushNotification.sendAddRequest(selfUser, user.reg_id);
                                  if(!user_response){
                                    // Reaching here means this function was called from add_via_handle
                                    // and addee settings allowed the adder to add him 
                                    // Still an add request is sent to founUser from selfUser
                                    general.find_common_contacts(selfUser.id, user.id, function (err, common){
                                      if(err){
                                        callback(err);
                                      }
                                      else{
                                        var messageData = { 
                                          "type": "addrequest",
                                          "sender": selfUser.name,
                                          "handle": selfUser.handle,
                                          "id": selfUser.id,
                                          "dp": selfUser.dp,
                                          "timestamp": (new Date()).valueOf(),
                                          "data": {
                                            "common": common || []
                                          }
                                        };
                                        pushNotification.sendNewAddRequest(messageData, user.reg_id, "add_via_handle2");
                                        callback(null, user, 1);
                                      }
                                    });
                                  }

                                  else if(user_response == "allow"){

                                    // Reaching here means addee has accepted adder's request
                                    // but addee is not already added to adder's contacts when adder tried to add him
                                    // It means addee has responded to a type 0 add request
                                    // In this case addee must get the adder's user object

                                    // Important to note that still adder is selfUser and addee is foundUser
                                    // selfUser will receive a notification userupdate from foundUser
                                    // and foundUser (who is actually calling this function via allow_add)
                                    // will receive the user object of selfUser

                                    var messageData = {
                                      "type": "userupdate",
                                      "user": user
                                    }
                                    sails.log.debug("Sending notification to user ", selfUser.handle);
                                    sails.log.debug("Notification contains user update for ", foundUser.handle);                  
                                    pushNotification.sendNewAddRequest(messageData, selfUser.reg_id, "add_via_handle4");
                                    callback(null, selfUser);
                                  }

                                  else if(user_response == "add_back"){
                                    callback(null, user);
                                  }

                                  else{
                                    callback({"error": "Something horrible happened here"});
                                  }

                                }
                              });
                            }
                          });
                        }
                      });
                    }
                  });                                                            
                }
              }
            });
          }
          else{
            err = { "error": "user not found" };
            callback(err);
            //return res.json({"status": 0, "error": "user not found"});
          }
        });
        
      }
    });
  },

  add_hellos: function (userId){

  	User.findOne({'id': 1}, function (err, hellos_team){
  		if(err || !hellos_team){
  			sails.log.error("AddRequests.add_hellos 1: ", err);
  			return;
  		}
  		else{
  			User.findOne({'id': userId})
  			.populate('primary_phone')
  			.populate('primary_email')
  			.populate('phone')
  			.populate('email')
  			.exec( function (err, user){
  				if(err || !user){
  					sails.log.error("AddRequests.add_hellos 2: ", err);
  				}
  				else{
            var messageData = { 
              "type": "userupdate",
              "user": user
            };
            pushNotification.sendNewAddRequest(messageData, hellos_team.reg_id, "add_hellos");
            return;
  				}
  			});
  		}
  	});
  }

};

