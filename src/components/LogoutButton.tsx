export function LogoutButton() {
  return (
    <form action="/api/auth/logout" className="logout-form" method="post">
      <button className="button" type="submit">
        로그아웃
      </button>
    </form>
  );
}
