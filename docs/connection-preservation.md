# MarketCrew 연결 보존 기록

초기화일: 2026-05-26

## 보존한 연결

| 구분 | 값 |
|---|---|
| Web domain | `marketcrew.app`, `www.marketcrew.app` |
| API domain | `api.marketcrew.app` |
| GitHub repository | `cesign7/marketcrew` |
| Vercel project | `aipressos-projects/marketcrew` |
| Railway project | `marketcrew` |
| Railway service | `marketcrew-api` |
| Railway database | 기존 Postgres service |

## Vercel env key

- `MARKETCREW_AUTH_SECRET`
- `MARKETCREW_OWNER_PASSWORD_HASH`
- `MARKETCREW_BACKEND_API_URL`
- `MARKETCREW_BACKEND_API_TOKEN`
- `MARKETCREW_BACKEND_API_TIMEOUT_MS`

## Railway env key

값은 기록하지 않는다. key만 보존한다.

- `MARKETCREW_BACKEND_MODE`
- `MARKETCREW_API_TOKEN`
- `MARKETCREW_REPOSITORY_MODE`
- `DATABASE_URL`
- `MARKETCREW_DATABASE_URL`
- `NAVER_SEARCH_AD_ACCESS_LICENSE`
- `NAVER_SEARCH_AD_SECRET_KEY`
- `NAVER_SEARCH_AD_CUSTOMER_ID`
- `NAVER_SEARCH_AD_BASE_URL`
- `NAVER_COMMERCE_CLIENT_ID`
- `NAVER_COMMERCE_CLIENT_SECRET`
- `NAVER_COMMERCE_API_BASE_URL`
- `NAVER_COMMERCE_TARGET_BRANDS`
- `NAVER_DATALAB_CLIENT_ID`
- `NAVER_DATALAB_CLIENT_SECRET`
- `YOUNGCART_BRIDGE_URL`
- `YOUNGCART_BRIDGE_TOKEN`
- `AI_AGENT_PROVIDER`
- `AI_AGENT_MODEL`
- `AI_LLM_PROVIDER`
- `AI_LLM_MODEL_DEFAULT`
- `GEMINI_API_KEY`
- `EXTERNAL_WRITE_ENABLED`
- `SEARCH_AD_WRITE_ENABLED`

## 복구 지점

- Branch: `backup/pre-reboot-20260526-102313`
- Tag: `pre-reboot-20260526-102313`
- DB JSON backup: `.marketcrew/backups/workflow-state-pre-reboot-20260526-102313.json`

