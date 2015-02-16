/**
 * Mailer Service
 * Uses Mandrill Service : https://github.com/jimrubenstein/node-mandrill
 */


var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill( require("../../config/keys").mandrill.key );

var _ = require("lodash");

// Base Message
var message = {
  "html": "",
  "text": "",
  "subject": "",
  "from_email": "no-reply@hellos.com",
  "from_name": "Hellos",
  "to": [],
  "headers": { "Reply-To": "no-reply@hellos.com" },
  "important": false,
  "track_opens": null,
  "track_clicks": null,
  "auto_text": null,
  "auto_html": null,
  "inline_css": null,
  "url_strip_qs": null,
  "preserve_recipients": null,
  "view_content_link": null,
  "tracking_domain": null,
  "signing_domain": null,
  "return_path_domain": null,
  "merge": true,
  "global_merge_vars": [],
  "merge_vars": [],
  "tags": [ "Welcome Email" ],
  "metadata": { "website": "www.hellos.com" },
  "recipient_metadata": [],
  "attachments": [],
  "images": []
};

module.exports = {

  sendWelcomeEmail: function (user) {

    this.sendMail({
      to: {
        "email": user.primary_email.email,
        "name": user.name,
        "type": "to"
      },
      subject: "Welcome to Hellos!",
      text: "",
      html:
          "<div>Ahoy! " + user.name + "</div><br />"
        + "<div>Welcome to Hellos!!!</div> <br />"
    });

  },

  sendVerificationCode: function(email, code){

    this.sendMail({
      to: {
        "email": email,
        "name": "",
        "type": "to"
      },
      subject: "Your verification code!",
      text: "",
      html:
          "<div>Ahoy!<br />"
        + "<div>Here is your verification code "+ code +"</div> <br />"
    });

  },



  sendPwdResetMail: function (user, resetLink) {

    this.sendMail({
      to: {
        "email": user.email,
        "name": user.displayName,
        "type": "to"
      },
      subject: "Reset Password for your Thirstt Account",
      text: "Hi "
        + user.username
        + "! You have requested for resetting your pasword. Please click on the link to proceed: "
        + resetLink,
      html: ""
    });

  },


  sendInviteAcceptMail: function (sendTo, recipientName, registerLink) {

    this.sendMail({
      to: {
        "email": sendTo,
        "name": recipientName,
        "type": "to"
      },
      subject: "Invite Request Accepted at Thirstt",
      text: "",
      html:
          "<div>Ahoy! " + recipientName + "</div><br />"
        + "<div>Scott Belsky, Co-Founder of Behance says</div>"
        + "<blockquote>\"Its not about ideas. Its about making ideas happen\"</blockquote><br />"
        + "<div>Follow the link below and lets make it happen - make it big.</div>"
        + "<div> " + registerLink + " </div><br />"
        + "<div>Thirstty Team!</div>"
  });

},


  sendMail: function (mailOpts) {

    var messageToSend = _.cloneDeep(message);
    messageToSend.html = mailOpts.html;
    messageToSend.text = mailOpts.text;
    messageToSend.subject = mailOpts.subject;
    messageToSend.to.push(mailOpts.to);

    mandrill_client.messages.send(
      {"message": messageToSend, "async": true, "ip_pool": "Main Pool", "send_at": ""},
      function successCallback(result) {
        sails.log.info('Email sent to ', result);
      },
      function errorCallback(e) {
        sails.log.error('A mandrill error occurred: ' + e.name + ' - ' + e.message);
      }
    );

  }

};