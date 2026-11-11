// req 3.1.2: protection against Cross-Site Scripting (XSS) through input sanitization
// every text value in a request body has its HTML tags removed BEFORE it is validated or saved,
// so something like <script>alert(1)</script> can never be stored and later shown to someone.
// (React also escapes everything it shows, so this is a second layer of protection.)
//
// - <script> and <style> blocks are removed together with what is inside them
// - any other tag is removed but its text is kept: "<b>Desk</b> lamp" -> "Desk lamp"
// - a lone "<" that is not a tag is kept, so "size < 10" still works
// - passwords are never changed (they are hashed, never shown, and may contain any character)

const BLOCK_TAGS = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const ANY_TAG = /<\/?[a-z!][^>]*>/gi;

function stripTags(text) {
  return text.replace(BLOCK_TAGS, '').replace(ANY_TAG, '');
}

function sanitizeValue(value, key) {
  if (typeof value === 'string') {
    return /password/i.test(key) ? value : stripTags(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, key));
  }
  if (value && typeof value === 'object') {
    const clean = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      clean[childKey] = sanitizeValue(childValue, childKey);
    }
    return clean;
  }
  return value; // numbers, booleans, null stay as they are
}

function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body, '');
  }
  next();
}

module.exports = { sanitizeBody, stripTags };
