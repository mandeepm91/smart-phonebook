/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes map URLs to views and controllers.
 *
 * If Sails receives a URL that doesn't match any of the routes below,
 * it will check for matching files (images, scripts, stylesheets, etc.)
 * in your assets directory.  e.g. `http://localhost:1337/images/foo.jpg`
 * might match an image file: `/assets/images/foo.jpg`
 *
 * Finally, if those don't match either, the default 404 handler is triggered.
 * See `config/404.js` to adjust your app's 404 logic.
 *
 * Note: Sails doesn't ACTUALLY serve stuff from `assets`-- the default Gruntfile in Sails copies
 * flat files from `assets` to `.tmp/public`.  This allows you to do things like compile LESS or
 * CoffeeScript for the front-end.
 *
 * For more information on routes, check out:
 * http://links.sailsjs.org/docs/config/routes
 */

module.exports.routes = {


  // Make the view located at `views/homepage.ejs` (or `views/homepage.jade`, etc. depending on your
  // default view engine) your home page.
  //
  // (Alternatively, remove this and add an `index.html` file in your `assets` directory)
  '/': {
    view: 'homepage'
  },


  // Log each request
  '/*': function (req, res, next) {
    sails.log.info("Routes :", req.method, req.url, req.headers['x-forwarded-for'] || req.connection.remoteAddress);
    next();
  },

  'get /invite/:id': 'RequestController.download',

  'get /status': 'RequestController.check_status',

  'post /clear_db':   'UserController.clear_db',

  'get /api/handle': 'UserController.find_handle',

  'post /api/user/store_contacts/:id': 'UserController.store_contacts',
  'post /api/user/find_unknown':   'UserController.find_unknown',

  'get /dummy': 'UserController.dummy',

  'get /api/user/fetch_contacts/:userId': 'UserController.fetch_contacts',

  'get /api/user/dpfile':                'UserController.dpFile',
  'post /api/user/dpupload':             'UserController.dpUpload',
  'get /api/user/dp':                    'UserController.dp',
  'delete /api/user/email/:id':          'UserController.unlink_email',
  'delete /api/user/phone/:id':          'UserController.unlink_phone',

  'post /contact/add_via_handle':      'ContactController.add_via_handle',
  'post /contact/add_90s_style':       'ContactController.add_90s_style',
  'post /contact/request_update':      'ContactController.request_update',
  'post /contact/allow_add':           'ContactController.allow_add',
  'post /contact/dont_allow':          'ContactController.dont_allow',
  'post /contact/dont_use/:id':          'ContactController.dont_use',
  'post /contacts/remove_contact/:id':     'ContactController.remove_contact',

  'post /api/log/store_logs':            'LogController.store_logs',

  'post /dummy1' : 'RequestController.dummy1'

  // Custom routes here...


  // If a request to a URL doesn't match any of the custom routes above,
  // it is matched against Sails route blueprints.  See `config/blueprints.js`
  // for configuration options and examples.

};
