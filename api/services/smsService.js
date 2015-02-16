

var exotel = require('exotel')({
  id   : 'freelance', // exotel id,
  token: 'fb86868f79393364734222040810b02d7692c73f'// exotel token
});

module.exports = {
  
  send_sms: function(smsObj){

    exotel.sendSMS(smsObj.to, smsObj.body, function (err, message) {
      if(err){
        sails.log.error(err);
        return;
      }
      else{
        sails.log.info("Sent SMS ", message);
      }
    });    

  },


  check_sms: function(req, res){

    exotel.checkSMS("3a02f366d2c6326d6aa4e9e9050fa8ef", function (err, result){
      if(err){
        sails.log.error(err);
      }
      else{
        sails.log.info(result);
        return res.json(result);
      }
    });

  }

};