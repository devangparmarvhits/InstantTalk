const logger = require('../utils/logger');

const errorMiddleware = (err, req, res, next) => {
  logger.error(err.stack || err.message);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};

module.exports = errorMiddleware;
