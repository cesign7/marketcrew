# MarketCrew API

Railway에서 실행하는 MarketCrew 백엔드 API입니다.

## 역할

- Railway Postgres와 가까운 곳에서 `workflow_records`를 읽습니다.
- 읽은 workflow state를 짧게 캐시해서 Vercel 화면 전환 때 DB 연결 비용을 줄입니다.
- Vercel 프론트는 `MARKETCREW_BACKEND_API_URL`이 있으면 이 API를 먼저 사용하고, 실패하면 기존 DB 직접 읽기로 돌아갑니다.

## 필수 환경 변수

| 이름 | 설명 |
| --- | --- |
| `DATABASE_URL` 또는 `MARKETCREW_DATABASE_URL` | Railway Postgres 내부 접속 URL |
| `MARKETCREW_API_TOKEN` | Vercel 서버가 호출할 때 쓰는 Bearer 토큰 |
| `MARKETCREW_API_CACHE_TTL_MS` | workflow state 캐시 TTL, 기본 60000 |

## 엔드포인트

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/health` | API와 DB 연결 상태 확인 |
| `GET` | `/api/workflow-state` | workflow state와 컬렉션별 건수 조회 |
| `POST` | `/api/cache/clear` | 캐시 초기화 |
