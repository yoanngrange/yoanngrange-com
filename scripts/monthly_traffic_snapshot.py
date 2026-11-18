#!/usr/bin/env python3
"""Fetch one calendar month of Cloudflare Web Analytics page views and visits (plus the
month before, for comparison) for every site in SITES, and print it as JSON.

Runs from GitHub Actions on the 1st of each month. The workflow stores the
output on the `traffic-data` branch (not served by GitHub Pages), where the
claude.ai "Monthly website sync check" routine reads it: that routine's cloud
environment cannot call the Cloudflare GraphQL API itself.

A failing site is recorded as {"error": "..."} instead of failing the run, so
the monthly email can say what went wrong.
"""
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timezone

CF_API_TOKEN = os.environ["CF_API_TOKEN"]
CF_ACCOUNT_ID = os.environ.get("CF_ACCOUNT_ID", "153303233ced3d9f02ed7d8345a10ed9")
MONTH_OVERRIDE = os.environ.get("MONTH", "").strip()  # optional YYYY-MM

SITES = {
    "yoanngrange.com": "b96f4dda85a64d35a027162c97bac98d",
    "vraieforet.com": "713c41bd67324620a620e8bb6ee612b7",
    "simplekatorza.com": "0f653fa4e543488c97757842c7603797",
    "fournyl.com": "f37503946b204b62aff148564c878521",
}

QUERY = """
query($accountTag: string!, $siteTag: string!, $start: string!, $end: string!) {
  viewer {
    accounts(filter: {accountTag: $accountTag}) {
      rumPageloadEventsAdaptiveGroups(
        limit: 1
        filter: {siteTag: $siteTag, datetime_geq: $start, datetime_leq: $end}
      ) {
        count
        sum { visits }
      }
    }
  }
}
"""


def previous_month(d):
    return date(d.year - 1, 12, 1) if d.month == 1 else date(d.year, d.month - 1, 1)


def month_bounds(first):
    nxt = date(first.year + 1, 1, 1) if first.month == 12 else date(first.year, first.month + 1, 1)
    last = date.fromordinal(nxt.toordinal() - 1)
    return f"{first.isoformat()}T00:00:00Z", f"{last.isoformat()}T23:59:59Z"


def traffic(site_tag, first):
    """Return (pageviews, visits) for the calendar month starting at `first`."""
    start, end = month_bounds(first)
    body = json.dumps({
        "query": QUERY,
        "variables": {"accountTag": CF_ACCOUNT_ID, "siteTag": site_tag, "start": start, "end": end},
    }).encode()
    req = urllib.request.Request(
        "https://api.cloudflare.com/client/v4/graphql",
        data=body,
        headers={"Authorization": f"Bearer {CF_API_TOKEN}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
    if data.get("errors"):
        raise RuntimeError(f"GraphQL error: {data['errors'][0].get('message', data['errors'])}")
    accounts = data["data"]["viewer"]["accounts"]
    if not accounts:
        raise RuntimeError("account not found")
    groups = accounts[0]["rumPageloadEventsAdaptiveGroups"]
    if not groups:
        return 0, 0
    return groups[0]["count"], (groups[0].get("sum") or {}).get("visits") or 0


def main():
    if MONTH_OVERRIDE:
        year, month = MONTH_OVERRIDE.split("-")
        target = date(int(year), int(month), 1)
    else:
        target = previous_month(datetime.now(timezone.utc).date().replace(day=1))
    before = previous_month(target)

    sites = {}
    for name, tag in SITES.items():
        try:
            pv, visits = traffic(tag, target)
            prev_pv, prev_visits = traffic(tag, before)
            sites[name] = {
                "pageviews": pv,
                "visits": visits,
                "previous_pageviews": prev_pv,
                "previous_visits": prev_visits,
            }
        except urllib.error.HTTPError as e:
            sites[name] = {"error": f"HTTP {e.code}"}
        except Exception as e:  # network, schema or GraphQL error: record it, keep going
            sites[name] = {"error": str(e)[:200]}

    json.dump({
        "month": target.strftime("%Y-%m"),
        "previous_month": before.strftime("%Y-%m"),
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sites": sites,
    }, sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
