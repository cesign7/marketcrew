# MarketCrew

MarketCrew는 한국어 기반 AI 마케팅 운영 시스템으로 다시 만드는 중이다.

현재 `main`은 재시작 기준선이다. 이전 MVP 구현과 운영 DB workflow 데이터는 초기화했고, 연결 자산은 유지한다.

## 유지된 연결

- Web: `https://marketcrew.app`
- API: `https://api.marketcrew.app`
- GitHub: `https://github.com/cesign7/marketcrew`
- Vercel: `aipressos-projects/marketcrew`
- Railway: `marketcrew-api`

## 로컬 명령

```bash
npm run typecheck
npm test -- --run
npm run build
npm run smoke:prod
```

## 원칙

- 화면은 한국어로 간결하게 만든다.
- 대표 로그인은 유지한다.
- 외부 광고/상품/고객 데이터 쓰기는 기본 차단한다.
- env 값은 저장소에 넣지 않는다.

