# MarketCrew Reboot Design

## 목표

기존 MVP 구현을 지우고, 연결이 살아 있는 빈 운영실에서 다시 시작한다.

## 첫 기준선

- 대표 로그인
- 운영 상태 화면
- API health
- Vercel에서 Railway API로 이어지는 bridge
- Railway Postgres 연결 확인
- provider env 존재 여부 확인

## 제외

- 기존 캐릭터 데스크
- 기존 결재/실행/성과 카드
- 기존 workflow 데이터
- 외부 provider write

## 다음 설계 후보

1. 브랜드/채널 데이터 수집 구조 재정의
2. 검색광고 키워드 규칙 엔진 재설계
3. LLM 판단 근거 패킷 재설계
4. 대표 승인과 실행 게이트 재설계

