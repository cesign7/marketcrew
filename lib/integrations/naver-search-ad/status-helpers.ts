export interface SearchAdStatusAccountLike {
  id: string;
  createdAt: Date;
}

export interface SearchAdStatusRunLike {
  accountId: string | null;
}

export function selectSearchAdStatusAccount<
  TAccount extends SearchAdStatusAccountLike,
>(
  accounts: TAccount[],
  latestRun: SearchAdStatusRunLike | null,
): TAccount | null {
  if (latestRun?.accountId) {
    const runAccount = accounts.find(
      (account) => account.id === latestRun.accountId,
    );

    if (runAccount) {
      return runAccount;
    }
  }

  return [...accounts].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )[0] ?? null;
}
