# marketcrew 재시작 작업 맥락

이 저장소는 `marketcrew` 운영 연결을 보존한 채 새로 만드는 기준선이다.

## 반드시 유지할 것

- 화면 문구는 자연스러운 한국어를 우선한다.
- Vercel 프로젝트, Railway 프로젝트, GitHub 저장소 연결, 도메인 연결은 보존한다.
- `.env`, Vercel env, Railway env 값은 출력하거나 커밋하지 않는다.
- 네이버 광고, 스마트스토어, 영카트, 데이터랩 같은 외부 원장 데이터에는 쓰지 않는다.
- provider write gate는 별도 승인 전까지 닫힌 상태를 기본값으로 둔다.

## 현재 기준

- Web: `https://marketcrew.app`
- API: `https://api.marketcrew.app`
- GitHub: `https://github.com/cesign7/marketcrew`
- Vercel project: `aipressos-projects/marketcrew`
- Railway service: `marketcrew-api`

## 개발 검증 순서

1. 로컬에서 작게 수정한다.
2. `npm run typecheck`, `npm test -- --run`, `npm run build`를 확인한다.
3. `main`에 push한 뒤 Vercel/Railway 자동 배포를 확인한다.
4. `npm run smoke:prod`로 운영 연결을 확인한다.

## 초기화 백업

초기화 전 상태는 아래 원격 백업에 보존되어 있다.

- Branch: `backup/pre-reboot-20260526-102313`
- Tag: `pre-reboot-20260526-102313`

