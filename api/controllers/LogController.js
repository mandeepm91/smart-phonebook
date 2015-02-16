/**
 * LogController
 *
 * @description :: Server-side logic for managing logs
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

	store_logs: function (req, res){
		
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    sails.log.info("ip address is", ip);

		var packet = req.params.all();
		sails.log.info("ip address is", packet.phone);
		if(!packet.logs || !packet.phone){
			sails.log.error("LogController.create_multiple 1 : invalid request");
			return res.json({"status": 0, "error": "invalid request"});
		}

    if(typeof packet.logs != 'object'){
      packet.logs = JSON.parse(packet.logs);
    }

		async.each(packet.logs, function (log, callback){
      log.phone = packet.phone;
      log.timestamp = new Date(log.timestamp);
			Log.create(log, function (err, newLog){
				if(err){
          sails.log.error("Some error occured : ", err);
          callback(err);
        }
        else{
          callback();
        }
			});
		}, function (err){
				if(err){
					sails.log.error("LogController.store_logs : ", err)
					return res.json({"status": 0, "error": err});
				}
				else{
					return res.json({"status": 1});
				}
		});
	
	}
	
};

