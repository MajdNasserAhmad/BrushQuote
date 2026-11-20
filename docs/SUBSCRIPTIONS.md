# Plans and limits

Plans are a database catalog, not hardcoded authorization in the browser. Initial limits are configurable by the service operator:

| Plan | AI/day | AI/month | New quotations/month |
| --- | ---: | ---: | ---: |
| Free | 5 | 20 | 10 |
| Starter | 20 | 200 | 100 |
| Professional | 100 | 1,000 | 1,000 |

New businesses get a 14-day Professional trial. Expiration automatically applies Free limits without deleting existing records. Periods use UTC calendar boundaries. Workspace administrators may set lower AI limits; the lower limit applies. Failed AI attempts consume request quota, while cached results do not create a request. Feature entitlement is checked before returning cached results.

Database triggers serialize reservations under the business row lock. The quotation quota applies to creation, not editing existing quotations. Model choice remains limited to server-configured text/reasoning roles and the configured vision model, with actual account availability checked before generation.

Only owners can confirm a plan-change request. It creates a pending record and does not upgrade access or authorize a charge. An operator must review and activate a plan through privileged administration. Payment checkout and automatic billing are not implemented or represented as available.

The operator should update `business_subscriptions` and the matching pending `plan_change_requests` status in one reviewed transaction. Privileged credentials must never be exposed to the dashboard. A future billing integration must authenticate its events, map customers to businesses server-side, and preserve these database authorization rules.
