// small helpers used by the Artillery scenarios (perf/*.yml)

// ids come from environment variables as text ("5"); the api only accepts real numbers,
// so they are copied into the scenario as numbers. A template that is exactly "{{ name }}"
// keeps the value's type, so the JSON sent is { "productId": 5 }, not "5"
function setup(context, events, done) {
  context.vars.productId = Number(process.env.PERF_PRODUCT_ID);
  context.vars.supplierId = Number(process.env.PERF_SUPPLIER_ID);
  context.vars.startedAt = Date.now();
  done();
}

// PERF-01: each user keeps working until 60 seconds have passed since they arrived
function keepGoing(context, next) {
  next(Date.now() - context.vars.startedAt < 60 * 1000);
}

module.exports = { setup, keepGoing };
