import { redirect } from "next/navigation";
import { isAuthConfigured, isAuthRequired, sanitizeNextPath } from "@/lib/auth/session";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (!isAuthRequired()) {
    redirect("/operations");
  }

  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next);
  const configured = isAuthConfigured();
  const hasError = params.error === "1";

  return (
    <main className="login-shell">
      <section className="login-panel" aria-labelledby="login-title">
        <span className="eyebrow">마켓크루 업무실</span>
        <h1 id="login-title">대표 로그인</h1>
        <p>공개 도메인에서는 대표 비밀번호 확인 후 업무실을 열람합니다.</p>

        {!configured ? (
          <div className="login-alert" role="alert">
            로그인 환경변수가 아직 설정되지 않았습니다.
          </div>
        ) : null}

        {hasError ? (
          <div className="login-alert" role="alert">
            비밀번호가 맞지 않습니다.
          </div>
        ) : null}

        <form action="/api/auth/login" className="login-form" method="post">
          <input name="next" type="hidden" value={nextPath} />
          <label htmlFor="owner-password">비밀번호</label>
          <input
            autoComplete="current-password"
            autoFocus
            disabled={!configured}
            id="owner-password"
            name="password"
            placeholder="대표 비밀번호"
            required
            type="password"
          />
          <button className="primary-button" disabled={!configured} type="submit">
            들어가기
          </button>
        </form>
      </section>
    </main>
  );
}
