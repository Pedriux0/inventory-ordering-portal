// req 3.4.1 (many users at the same time, no data loss)
// when two transactions touch the same rows at the same moment, the database may cancel one
// of them with a temporary conflict: a deadlock, "record has changed since last read"
// (MariaDB 11 snapshot isolation) or a lock wait timeout. The database has already undone
// everything that attempt did, so it is safe to simply run it again - which is what the
// database's own error message says to do ("try restarting transaction").
// Found by the OWASP ZAP scan, which sends many requests in parallel.

const TEMPORARY_CONFLICTS = new Set(['ER_LOCK_DEADLOCK', 'ER_CHECKREAD', 'ER_LOCK_WAIT_TIMEOUT']);

function isTemporaryConflict(err) {
  return Boolean(err && TEMPORARY_CONFLICTS.has(err.code));
}

// runs task(); on a temporary conflict waits a little and runs it again (up to `attempts` times)
// any other error (wrong data, not enough stock, ...) is thrown straight away, never retried
async function retryOnConflict(task, attempts = 5) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await task();
    } catch (err) {
      if (!isTemporaryConflict(err) || attempt >= attempts) throw err;
      // a short random wait, so the two colliding requests dont collide again
      await new Promise((resolve) => setTimeout(resolve, 15 * attempt + Math.random() * 35));
    }
  }
}

module.exports = { retryOnConflict, isTemporaryConflict };
