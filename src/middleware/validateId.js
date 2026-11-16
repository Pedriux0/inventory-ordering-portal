// every :id in a url must be a plain positive whole number ("12"), anything else is "not found"
// without this, mysql quietly turns text like "1 OR 1=1" into the number 1 when comparing it
// to a numeric id column. The value was always passed safely as a ? parameter (no sql injection),
// but the request should not be treated as a valid id at all (found by the SEC-01 test)
// usage in a router: router.param('id', validateId)
function validateId(req, res, next, value) {
  if (!/^[1-9]\d{0,9}$/.test(value)) {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
}

module.exports = validateId;
