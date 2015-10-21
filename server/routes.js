module.exports = function (app) {
  //app.use('/login', require('./auth')); 
  
  // app.route('/:url(api|components|app|bower_components)/*')

  app.use('/login', require('./auth'));
  app.route('/app/:directory/:file') 
    .get(function (req, res) {
      res.render(req.params.directory + '/' + req.params.file);
    });
  
  app.route('/')
    .get(function (req, res) {
      res.render(app.get('appPath') + '/index.jade');
    });
};
