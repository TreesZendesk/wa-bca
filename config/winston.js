const winston = require('winston');
const LogzioWinstonTransport = require('winston-logzio');
const httpContext = require('express-http-context');
const { createLogger, format, transports } = winston;

const logzioWinstonTransport = new LogzioWinstonTransport({
  level: 'info',
  name: 'winston_logzio',
  token: 'FhBWXLLGSTKqTlZYOAjqfhigodGrBTPv',
});

const addTraceId = format((info, opts) => {
  var traceId = httpContext.get("traceId")
  info.traceId = traceId
  return info;
});

const customFormat = format.printf(({ level, message, label, timestamp, opts}) => {
  var traceId = httpContext.get("traceId")
  message = traceId ? " traceId: " + traceId + " " + message : "HALLO" + message;
  return message;
});

const config = {
  format: format.combine(
    format.simple(),
    addTraceId(),
    customFormat
  ),
  transports: [new transports.Console()],
}

const logger = winston.createLogger(config);

logger.log('warn', 'Just a test message');

module.exports = logger