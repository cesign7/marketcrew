import bcrypt from "bcryptjs";

export async function verifyOwnerPassword(password: string) {
  const passwordHash = process.env.MARKETCREW_OWNER_PASSWORD_HASH;
  if (!passwordHash) {
    return false;
  }

  return bcrypt.compare(password, passwordHash);
}
