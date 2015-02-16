/**
 * RequestEmailController
 *
 * @description :: Server-side logic for managing requestemails
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

	create:  function (req, res){

		var packet = req.params.all();
    packet.code = IdGenerator.generate(6);

		RequestEmail.create(packet, function (err, request){
			if(err){
				sails.log.error("RequestEmailController.create :  ", err);
				return res.json({"status": 0, error: err});
			}
			else{
				sails.log.info("RequestEmailController.create :  successfully created request ", request );
				Mailer.sendVerificationCode(packet.email, packet.code);
				return res.json({'status': 1, 'request': request});
			}
		});
	
	}

};

