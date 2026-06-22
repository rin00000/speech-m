import { describe, expect, it } from "vitest";
import {
  getNextAuthSessionCookieNamesToClear,
  isNextAuthSessionCookieName,
} from "./session-cookies";

describe("NextAuth session cookie helpers", () => {
  it("matches development, secure production, and chunked session cookies", () => {
    expect(isNextAuthSessionCookieName("next-auth.session-token")).toBe(true);
    expect(isNextAuthSessionCookieName("__Secure-next-auth.session-token")).toBe(true);
    expect(isNextAuthSessionCookieName("next-auth.session-token.0")).toBe(true);
    expect(isNextAuthSessionCookieName("__Secure-next-auth.session-token.1")).toBe(true);
    expect(isNextAuthSessionCookieName("next-auth.callback-url")).toBe(false);
  });

  it("returns base names plus present chunks for cleanup", () => {
    expect(
      getNextAuthSessionCookieNamesToClear([
        "next-auth.session-token.0",
        "next-auth.session-token.1",
        "__Secure-next-auth.session-token.0",
        "next-auth.csrf-token",
      ])
    ).toEqual([
      "__Secure-next-auth.session-token",
      "__Secure-next-auth.session-token.0",
      "next-auth.session-token",
      "next-auth.session-token.0",
      "next-auth.session-token.1",
    ]);
  });
});
