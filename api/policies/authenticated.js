/**
 * authenticated
 *
 */
module.exports = function(req, res, next) {

  // User is allowed, proceed to the next policy, 
  // or if this is the last policy, the controller
  if (req.user && req.user.active) {
    return next();
  }

  // User is not allowed
  // (default res.forbidden() behavior can be overridden in `config/403.js`)
  sails.log.error("authenticated failed");  
  return res.forbidden('You are not permitted to perform this action.');
};
