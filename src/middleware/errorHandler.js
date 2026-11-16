// last middleware of the app, it catches any error that was not handled before
// req 3.2.1 / 3.2.4: the user only gets a generic message, never the stack trace or db error
// the real error is printed in the server console so we can still debug it
// (in production that console log is the PM2 log on the server, readable by root only)
function errorHandler(err, req, res, next) {
  // the client sent something broken (bad JSON, a body that is too big): say so in general
  // words with a 4xx, without echoing the parser's message (SEC-05)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'The request could not be read. Please check the data and try again.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'The request is too large.' });
  }

  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again later.' });
}

module.exports = errorHandler;
