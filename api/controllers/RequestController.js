/**
 * RequestController
 *
 * @description :: Server-side logic for managing requests
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */
var DOWNLOAD_PATH = process.env.HOME + "/vault/Hellos.apk" ;


var phoneUtil = require('libphonenumber').phoneUtil;

module.exports = {

	create:  function (req, res){

		var packet = req.params.all();
    packet.code = IdGenerator.generate(6);

    sails.log.debug("RequestController");

		if ( !packet.iso || !packet.imei || !packet.number ){
			sails.log.error("RequestController.create : Invalid request");
			return res.json({"status": 0, "error": "Invalid request"});
		}

		var phoneProto = phoneUtil.parse(packet.number, packet.iso);

		packet.isd = phoneProto["values_"]["1"];
		packet.intl = phoneUtil.format(phoneProto, 1);

		Request.create(packet, function (err, request){
			if(err){
				sails.log.error("RequestController.create :  ", err);
				return res.json({"status": 0, error: err});
			}
			else{
				sails.log.info("RequestController.create :  successfully created request ", request );
        var smsObj = {
          'to': request.intl,
          'body': 'Your verification code is ' + request.code
        }
        // smsService.send_sms(smsObj);
        req.session.requested = true;
				return res.json({'status': 1, 'request': request});
			}
		});

	},


  check_status: function(req, res){
    smsService.check_sms(req, res); 
  },  

	dummy1: function(req, res){
		var packet = req.params.all();
		sails.log.debug(req.params, req.body);
		req.body.handle = 'maddy';
		sails.log.debug(req.body);
		sails.controllers.request.dummy2(req, res);
	},

	dummy2: function(req, res){
		return res.json(req.body);
	},

	download: function(req, res){
	  var packet = req.params.all();
		if(!packet.id){
			return res.json({"status": 0, "error": "Invalid request"});
		}
		User.findOne({'id': packet.id}, function (err, user){
			if(err || !user){
				return res.json({"status": 0, "error": err});	
			}
			else if(!user.downloads || !user.active){
				return res.json({"status": 0, "error": "Download link expired"});
			}
			else{
				user.downloads -= 1;
				user.save( function (err){
					if(err){
						return res.json({"status": 0, "error": err});
					}
					else{
            var messageData ={
              'type': 'download',
              'id': user.id,
              'count': user.downloads
            }
            pushNotification.sendNewAddRequest(messageData, user.reg_id, "download");
						return res.download(DOWNLOAD_PATH, DOWNLOAD_PATH);
					}
				});
			}
		});
	}


};

