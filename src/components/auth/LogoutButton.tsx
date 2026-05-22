import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button className="secondary-button" type="submit">
        <LogOut size={16} aria-hidden="true" />
        로그아웃
      </button>
    </form>
  );
}
