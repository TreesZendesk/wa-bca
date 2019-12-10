const winston = require('winston');
const LogzioWinstonTransport = require('winston-logzio');
const httpContext = require('express-http-context');
const { createLogger, format, transports } = winston;

const logzioWinstonTransport = new LogzioWinstonTransport({
  level: 'info',
  name: 'winston_logzio',
  token: 'FhBWXLLGSTKqTlZYOAjqfhigodGrBTPv',
});


const customFormat = format.printf(({ level, message, label, timestamp }) => {
  var traceId = httpContext.get("traceId")
  message = traceId ? " traceId: " + traceId + " " + message : message;
  return message;
});

const logger = winston.createLogger({
    format: customFormat,
    transports: [logzioWinstonTransport, new transports.Console()],
});

logger.log('warn', 'Just a test message');

module.exports = logger