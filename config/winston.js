const winston = require('winston');
const LogzioWinstonTransport = require('winston-logzio');
const { createLogger, format, transports } = winston;

const logzioWinstonTransport = new LogzioWinstonTransport({
  level: 'info',
  name: 'winston_logzio',
  token: 'FhBWXLLGSTKqTlZYOAjqfhigodGrBTPv',
});


const logger = winston.createLogger({
    format: format.simple(),
    transports: [logzioWinstonTransport],
});

logger.log('warn', 'Just a test message');

module.exports = logger