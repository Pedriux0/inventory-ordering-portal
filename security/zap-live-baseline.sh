#!/usr/bin/env bash
# OWASP ZAP *baseline* (passive) scan of the LIVE site (SEC-01 / SEC-02 evidence on production)
#
# PASSIVE ONLY: ZAP browses the site like a visitor (spider, at most 1 minute) and only LOOKS at
# the answers (headers, cookies, error pages, leaked info). It sends NO attack payloads and
# creates nothing, so it is safe on the live server. The full attack scan (SQL injection, XSS
# payloads on every endpoint) is security/zap-scan.sh and only runs on a throwaway copy.
#
# usage: security/zap-live-baseline.sh [url]   (default https://inventoryorderingportal.cloud)
# report: security/reports/zap-live-report.html . Fails on any High risk finding.
set -euo pipefail

TARGET="${1:-https://inventoryorderingportal.cloud}"
HERE="$(cd "$(dirname "$0")" && pwd)"
REPORTS="$HERE/reports"
mkdir -p "$REPORTS"
chmod -R a+rwX "$REPORTS" # the ZAP container writes its reports here as its own user

echo "passive ZAP baseline scan of $TARGET (about 2 minutes) ..."
docker run --rm -v "$REPORTS:/zap/wrk:rw" ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t "$TARGET" -m 1 -I \
  -J zap-live-report.json -r zap-live-report.html > "$REPORTS/zap-live-output.txt" 2>&1 || true

tail -n 3 "$REPORTS/zap-live-output.txt"

# count the findings by risk level and fail on any High
node -e '
const report = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
const alerts = report.site.flatMap((s) => s.alerts);
const byRisk = { 3: "High", 2: "Medium", 1: "Low", 0: "Info" };
for (const level of [3, 2, 1, 0]) {
  const found = alerts.filter((a) => Number(a.riskcode) === level);
  console.log(`${byRisk[level]}: ${found.length}` + (found.length ? "  (" + found.map((a) => a.name).join("; ") + ")" : ""));
}
if (alerts.some((a) => Number(a.riskcode) === 3)) { console.error("FAIL: High risk problems on the live site, see security/reports/zap-live-report.html"); process.exit(1); }
console.log("PASS: no High risk problems on the live site");
' "$REPORTS/zap-live-report.json"
