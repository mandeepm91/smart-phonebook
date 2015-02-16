// Location: /config/passport.js
var passport    = require('passport')
// ,
//   LocalStrategy = require('passport-local').Strategy,
//   bcrypt = require('bcrypt');

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findOneById(id, function (err, user) {
    if (!user){
      done(err, false);
    }
    else{
      done(err, user);
    }
  });
});

// passport.use( new LocalStrategy(
//     { usernameField: 'email', passwordField: 'password' },
//     function (email, password, done) {
//       User.findOne({'email': email}).exec(function (error, user) {
//         if (error || !user){
//           error = error || "No User found!!";
//           sails.log.error(error);
//           return done(error, null);
//         }
//         else {
//           bcrypt.compare(password, user.password, function (error, res) {
//             if (error || !res) { return done("Authentication Failed!!", null); }
//             else { return done(null, user); }
//           });
//         }
//       });
//     }
// ));

module.exports = {
 express: {
    customMiddleware: function(app){
      console.log('express midleware for passport');
      app.use(passport.initialize());
      app.use(passport.session());
    }
  }
};