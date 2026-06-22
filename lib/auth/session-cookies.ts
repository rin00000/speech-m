/**
 * Utilities for matching all NextAuth JWT session cookie variants, including
 * development, secure production, and chunked cookie names.
 */
export const NEXTAUTH_SESSION_COOKIE_PREFIXES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
] as const;

export function isNextAuthSessionCookieName(name: string) {
  return NEXTAUTH_SESSION_COOKIE_PREFIXES.some(
    (prefix) => name === prefix || name.startsWith(`${prefix}.`)
  );
}

export function getNextAuthSessionCookieNamesToClear(cookieNames: Iterable<string>) {
  const names = new Set<string>(NEXTAUTH_SESSION_COOKIE_PREFIXES);
  for (const name of cookieNames) {
    if (isNextAuthSessionCookieName(name)) {
      names.add(name);
    }
  }
  return [...names].sort();
}
