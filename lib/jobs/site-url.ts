/**
 * Public origin for absolute URLs (OG crawlers, Naver share `url` param).
 * Prefer `NEXT_PUBLIC_APP_URL` in all environments.
 */
export const getPublicSiteOrigin = (): string => {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }

  if (process.env.NODE_ENV === "development") return "http://localhost:3000";

  return "";
};
