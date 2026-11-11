#!/usr/bin/env bash
# SEC-01 / SEC-02: OWASP ZAP security scan of the whole API (proposal section 4.4, tool: OWASP ZAP)
# ZAP reads docs/openapi.yaml, logs in as Admin, and attacks every endpoint and parameter with its
# SQL injection, XSS and other payloads. Reports: security/reports/zap-report.html (+ .json)
# The scan FAILS if ZAP finds any High risk problem (SQL injection and XSS are High risk).
#
# usage:  security/zap-scan.sh [api url]     (default http://localhost:3000, the api must be running
#         with the demo data loaded: npm run seed). Needs Docker.
# never point this at the live site: an active scan creates and changes a lot of data.
set -euo pipefail

TARGET="${1:-http://localhost:3000}"
HERE="$(cd "$(dirname "$0")" && pwd)"
REPORTS="$HERE/reports"
mkdir -p "$REPORTS"

# calls the api; on an error status prints the status and the answer, then stops the script
api() {
  local args=(-s -X "$1" "$TARGET$2" -H 'Content-Type: application/json' -w '\n%{http_code}')
  [ -n "${3:-}" ] && args+=(-H "Authorization: Bearer $3")
  [ -n "${4:-}" ] && args+=(-d "$4")
  local out code
  out=$(curl "${args[@]}")
  code=${out##*$'\n'}
  out=${out%$'\n'*}
  if [ "${code:0:1}" != "2" ]; then echo "api $1 $2 failed: HTTP $code $out" >&2; exit 1; fi
  printf '%s' "$out"
}
json() { node -pe "JSON.parse(require('fs').readFileSync(0)).$1"; }

# the scan runs as its OWN throwaway Admin account, so the attacks it sends to "edit my profile",
# "change role" and "deactivate" only ever change that account, never the demo accounts
echo "creating a throwaway Admin for the scan on $TARGET ..."
ADMIN_TOKEN=$(api POST /api/auth/login "" '{"email":"admin@demo.com","password":"DemoAdminPass2026"}' | json token)
STAMP=$(head -c 6 /dev/urandom | od -An -tx1 | tr -d " \n" | tr "0-9" "g-p") # letters only
SCAN_EMAIL="zap-scan-$STAMP@test.local"
SCAN_PASSWORD="ZapScan${STAMP}Pass2026" # must meet the password rules: upper, lower and a number
SCAN_ID=$(api POST /api/users "$ADMIN_TOKEN" "{\"fullName\":\"ZAP Scan\",\"email\":\"$SCAN_EMAIL\",\"password\":\"$SCAN_PASSWORD\",\"role\":\"Admin\"}" | json userId)
TOKEN=$(api POST /api/auth/login "" "{\"email\":\"$SCAN_EMAIL\",\"password\":\"$SCAN_PASSWORD\"}" | json token)
echo "scanning as user $SCAN_ID ($SCAN_EMAIL)"

# the openapi file with the address of the api being scanned, and the scan account as the user id
sed -e "s#url: http://localhost:3000#url: $TARGET#" \
    -e "/the security scan replaces this/{n;s#example: 1#example: $SCAN_ID#}" \
    "$HERE/../docs/openapi.yaml" > "$REPORTS/openapi.yaml"
chmod -R a+rwX "$REPORTS" # the ZAP container writes its reports here as its own user

# ZAP adds the Authorization header to every request it sends (replacer rule)
AUTH="-config replacer.full_list(0).description=auth -config replacer.full_list(0).enabled=true \
-config replacer.full_list(0).matchtype=REQ_HEADER -config replacer.full_list(0).matchstr=Authorization \
-config replacer.full_list(0).regex=false -config replacer.full_list(0).replacement=Bearer\ $TOKEN \
-config scanner.threadPerHost=1"
# one attack thread: with several, two attacks editing the same record at the same moment made the
# answers differ and ZAP mistook that for SQL injection (a false positive). Slower, but every
# check still runs and the result is reliable

echo "running the ZAP API scan (a few minutes) ..."
docker run --rm --network host -v "$REPORTS:/zap/wrk:rw" ghcr.io/zaproxy/zaproxy:stable \
  zap-api-scan.py -t /zap/wrk/openapi.yaml -f openapi -I \
  -J zap-report.json -r zap-report.html -z "$AUTH" > "$REPORTS/zap-output.txt" 2>&1 || true

tail -n 4 "$REPORTS/zap-output.txt"

# count the findings by risk level and fail on any High
node -e '
const report = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
const alerts = report.site.flatMap((s) => s.alerts);
const byRisk = { 3: "High", 2: "Medium", 1: "Low", 0: "Info" };
for (const level of [3, 2, 1, 0]) {
  const found = alerts.filter((a) => Number(a.riskcode) === level);
  console.log(`${byRisk[level]}: ${found.length}` + (found.length ? "  (" + found.map((a) => a.name).join("; ") + ")" : ""));
}
const high = alerts.filter((a) => Number(a.riskcode) === 3);
if (high.length) { console.error("FAIL: ZAP found High risk problems, see security/reports/zap-report.html"); process.exit(1); }
console.log("PASS: no High risk problems (no SQL injection, no XSS found)");
' "$REPORTS/zap-report.json"
