// last middleware of the app, it catches any error that was not handled before
// req 3.2.1 / 3.2.4: the user only gets a generic message, never the stack trace or db error
// the real error is printed in the server console so we can still debug it
function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again later.' });
}

module.exports = errorHandler;
