var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var morgan = require('morgan');
var proxy = require('express-http-proxy');
var proxyNew = require('http-proxy-middleware');
var uuid = require('node-uuid');
var httpContext = require('express-http-context');

var logger = require('./config/winston')
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var jendekRouter = require('./routes/jendek');
var proxyRouter = require('./routes/proxy');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// app.use(morgan('dev'));
app.use(morgan(":remote-addr :remote-user :method :url HTTP/:http-version :status :res[content-length] - :response-time ms :referrer :user-agent ", { 
  stream: { write: message => logger.info(message.trim()) },
  skip: (req, res) => req.originalUrl.startsWith("/jendek/integration/pull")
}))
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(httpContext.middleware);
app.use((req, res, next) => {
  httpContext.set('traceId', req.body.request_unique_identifier || uuid.v4())
  next()
});
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/jendek', jendekRouter);
app.use('/proxy', proxyRouter);
app.use('/mock', express.static(path.join(__dirname, 'public')))
app.use('/wacoreproxy', proxy('192.168.29.189:9001')); 
app.use('/wacoreproxygetimage', proxy('192.168.29.191:9010')); 
app.use('/wacoreproxyv2', proxyNew({ target: 'http://192.168.29.189:9001', changeOrigin: false }));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  console.log(req.headers)
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  logger.error(err.stack)
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
