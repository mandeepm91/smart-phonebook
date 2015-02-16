/**
 * EmailController
 *
 * @description :: Server-side logic for managing emails
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

	create: function(req, res){

		var packet = req.params.all();

		// Search for the request.
		// If not exists return error
		// Else check if Email exists in DB
		// If yes then is it linked to another user
			//  If yes then return error
			//  Else link it with this user and set verified = true
		// Else create an email record, set verified = true and link it with this user

		if(!packet.code || !packet.email || !packet.owner){
			sails.log.error("EmailController.create : Invalid request");
			return res.json({"status": 0, "error": "Invalid request"});			
		}

		RequestEmail.findOne({'email': packet.email, 'code': packet.code}, function (err, emailreq){
			if(err || !emailreq){
				err = err || {'error': 'invalid code'}
				return res.json({"status": 0, "error": err});
			}
			else{
				Email.findOne({'email': packet.email}, function (err, email){
					if(err || (email && email.owner && email.owner!=packet.owner)){
						err = err || {'error': 'email already in use'};
						return res.json({"status": 0, "error": err});
					}
					else{
						if(email){
							email.owner = packet.owner;
							email.verified = true;
							email.save(function (err){
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
										else{
											user.email.add(email.id);
                      user.save(function (err){
                        if(err){
                          return res.json({"status": 0, "error": err});
                        }
                        else{
		                      pushNotification.sendNotification(user.id, {"type": "userupdate"}, req, res);
		                      AddRequests.add_hellos(user.id);                                  	
                          return res.json({"status": 1, "email": email});
                        }
                      });											
										}
									});
								}
							})
						}
						else{
							packet.verified= true;
							Email.create(packet, function (err, newEmail){
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
										else{
											user.email.add(newEmail.id);
                      user.save(function (err){
                        if(err){
                          return res.json({"status": 0, "error": err});
                        }
                        else{
		                      pushNotification.sendNotification(user.id, {"type": "userupdate"}, req, res);
		                      AddRequests.add_hellos(user.id);                                  	
                          return res.json({"status": 1, "email": newEmail});
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
		});

	}
	
};

