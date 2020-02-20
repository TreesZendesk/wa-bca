const winston = require('winston');
require('winston-daily-rotate-file');
const LogzioWinstonTransport = require('winston-logzio');
const httpContext = require('express-http-context');
const { createLogger, format, transports } = winston;

const logzioWinstonTransport = new LogzioWinstonTransport({
  level: 'info',
  name: 'winston_logzio',
  token: 'FhBWXLLGSTKqTlZYOAjqfhigodGrBTPv',
});

const DailyRotateFileTransport = new (winston.transports.DailyRotateFile)({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '7d',
  json: false
  }
);

const addTraceId = format((info, opts) => {
  var traceId = httpContext.get("traceId")
  info.traceId = traceId
  return info;
});

const customFormat = format.printf(({ level, message, label, timestamp, opts}) => {
  var traceId = httpContext.get("traceId")
  message = traceId ? timestamp + " " + level + " traceId: " + traceId + " " + message : message;
  return message;
});

const config = {
  format: format.combine(
    format.simple(),
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),    
    addTraceId(),
    customFormat
  ),
  transports: [logzioWinstonTransport, new transports.Console()],
}

const logger = winston.createLogger(config);

logger.log('warn', 'Just a test message');

module.exports = logger