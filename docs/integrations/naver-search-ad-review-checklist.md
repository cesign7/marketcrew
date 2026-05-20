# Naver Search Ad API Review Checklist

Last verified against official docs on 2026-05-20.

## Mandatory Official Sources

- API specification: https://naver.github.io/searchad-apidoc/
- Official repository and samples: https://github.com/naver/searchad-apidoc
- Error code map: https://github.com/naver/searchad-apidoc/blob/master/NaverSA_API_Error_Code_MAP.md

## Current MVP Scope

The Search Ad integration is read-only until a write workflow is explicitly approved.

Allowed read endpoints:

- `GET /ncc/campaigns`
- `GET /ncc/adgroups`
- `GET /ncc/keywords`
- `GET /stats`
- `POST /stat-reports` for read-only StatReport job creation only
- `GET /stat-reports`
- `GET /stat-reports/{reportJobId}`
- `GET` for a same-host `downloadUrl` returned by a built StatReport job

Blocked until separately approved:

- bid changes
- keyword creation or deletion
- campaign/adgroup/ad edits
- budget changes
- any `PUT`, `PATCH`, or `DELETE` call to Naver Search Ad
- any `POST` call except the exact read-only `POST /stat-reports` job creation flow

## Review Checklist

- Confirm the endpoint path and method in the official API docs before changing code.
- Confirm query parameters are sent in the URL but excluded from the signature URI when the official sample requires signing only the path.
- Confirm headers include `Content-Type`, `X-Timestamp`, `X-API-KEY`, `X-Customer`, and `X-Signature`.
- Confirm the signature message remains `timestamp.method.uri`.
- Confirm keyword sync uses throttling or sequential requests so adgroup-level keyword calls do not burst.
- Confirm stats fallback batches `ids` and handles `1016`/`429` rate-limit style failures without write-side effects.
- Confirm StatReport sync uses only `reportTp` and `statDt`, polls bounded attempts, and does not persist raw download URLs.
- Confirm StatReport download URLs are same-host HTTPS URLs before fetching.
- Confirm stored sync failures and UI-visible errors are sanitized before display or persistence.
- Confirm tests cover the changed endpoint, normalization, error handling, and read-only safety guard.
- Confirm `npm test`, `npm run lint`, and `npm run build` pass before completion.

## Before Enabling Write APIs

- Get explicit approval for the write workflow and the exact API actions.
- Add daily/monthly spend limits and per-action guardrails.
- Add dry-run preview output that shows the exact proposed changes.
- Require approval records for medium/high-risk writes.
- Store an audit trail with actor, previous value, new value, source rule, and Naver response metadata.
- Add rollback or compensating-action guidance for each write type.
- Add tests for rejected writes, allowed writes, budget caps, and sanitized error persistence.
