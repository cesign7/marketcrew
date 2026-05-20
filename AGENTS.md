<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Naver Search Ad API Rule

For any change touching `lib/integrations/naver-search-ad/**`, `app/settings/search-ad/**`, Search Ad Prisma sync/snapshot schema, or Search Ad environment/configuration:

1. Check the official Naver Search Ad API documentation before coding or reviewing:
   - https://naver.github.io/searchad-apidoc/
   - https://github.com/naver/searchad-apidoc
2. Verify the current endpoint method, path, query semantics, authentication signature, headers, and throttling behavior against the official docs or official samples.
3. Keep the MVP Search Ad integration read-only. Do not add Naver Search Ad `POST`, `PUT`, `PATCH`, or `DELETE` calls unless the user explicitly approves that write workflow in the same turn.
4. Confirm the code redacts API keys, signatures, secret keys, customer IDs, request bodies, and response details that may contain credentials.
5. Run relevant integration tests and a build before claiming completion. Run `npx prisma validate` too when Search Ad schema or Prisma mapping changes.
6. Update `docs/integrations/naver-search-ad-review-checklist.md` when the integration scope changes.
