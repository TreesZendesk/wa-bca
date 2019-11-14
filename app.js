var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var proxy = require('express-http-proxy');
var proxyNew = require('http-proxy-middleware');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var jendekRouter = require('./routes/jendek');
var proxyRouter = require('./routes/jendek');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/jendek', jendekRouter);
app.use('/wacoreproxy', proxy('192.168.29.189:9001')); 
app.use('/cifherokuproxy/:appname', proxy(req => req.params["appname"] + ".herokuapp.com", {https: true}))
app.use('/cifngrokproxy/:appname', proxy(req => req.params["appname"] + ".ngrok.io", {https: true}))
app.use('/example', proxyNew({ target: 'https://example.org', changeOrigin: true }));
app.use('/wacoreproxyv2', proxyNew({ target: 'http://192.168.29.189:9001', changeOrigin: true }));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
