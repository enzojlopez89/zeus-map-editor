import crypto from "crypto";

export type WorkspaceAccess = "edit" | "view";

export function hashWorkspaceToken(token: string): string {
  const pepper = process.env.WORKSPACE_TOKEN_PEPPER;

  if (!pepper) {
    throw new Error("Falta WORKSPACE_TOKEN_PEPPER en .env.local");
  }

  return crypto
    .createHmac("sha256", pepper)
    .update(token)
    .digest("hex");
}

export function safeCompareHashes(
  storedHash: string,
  candidateHash: string,
): boolean {
  try {
    const storedBuffer = Buffer.from(storedHash, "hex");
    const candidateBuffer = Buffer.from(candidateHash, "hex");

    if (storedBuffer.length !== candidateBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      storedBuffer,
      candidateBuffer,
    );
  } catch {
    return false;
  }
}