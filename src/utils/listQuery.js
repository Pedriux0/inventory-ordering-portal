// shared rules for search and pagination on lists (reqs 2.6.1 - 2.6.4)

const DEFAULT_PAGE_SIZE = 25; // req 2.6.4: default page size of 25 records
const MAX_PAGE_SIZE = 100;

// reads ?page= and ?limit= from the url
// no page and no limit = the whole list (the order / receipt forms need every product)
// returns { paged: false } or { paged: true, page, limit, offset } or { error }
function parsePaging(query) {
  if (query.page === undefined && query.limit === undefined) return { paged: false };

  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? DEFAULT_PAGE_SIZE : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) {
    return { error: 'page must be a whole number, 1 or more' };
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    return { error: `limit must be a whole number from 1 to ${MAX_PAGE_SIZE}` };
  }
  return { paged: true, page, limit, offset: (page - 1) * limit };
}

// the search text as typed, trimmed; too long or not text = treated as "no search"
function readSearch(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 100);
}

// LIKE treats % and _ as wildcards, so a search for "50%" would match everything
// escaping them makes the search find exactly what the user typed (still sent as a ? value)
function escapeLike(text) {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// "#12" or "12" -> 12 (a record id), anything else -> null
function readId(text) {
  const match = /^#?(\d{1,9})$/.exec(text);
  return match ? Number(match[1]) : null;
}

// "2026-10-01" -> true only for a real calendar date
function isIsoDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

module.exports = { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, parsePaging, readSearch, escapeLike, readId, isIsoDate };
