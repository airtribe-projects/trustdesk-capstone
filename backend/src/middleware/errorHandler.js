function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    message: statusCode === 500 ? "Internal server error" : error.message,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
