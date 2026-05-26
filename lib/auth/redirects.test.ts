import { describe, expect, it } from "vitest";
import {
  getPostLoginRedirect,
  getRoleLandingPath,
  getSafeCallbackPath,
} from "@/lib/auth/redirects";

describe("getRoleLandingPath", () => {
  it("sends guests to public jobs first", () => {
    expect(getRoleLandingPath("guest")).toBe("/jobs");
  });

  it("sends admins and students to dashboard", () => {
    expect(getRoleLandingPath("admin")).toBe("/dashboard");
    expect(getRoleLandingPath("student")).toBe("/dashboard");
  });
});

describe("getSafeCallbackPath", () => {
  it("keeps internal callback paths", () => {
    expect(getSafeCallbackPath("/reviews?tab=recent#top")).toBe("/reviews?tab=recent#top");
  });

  it("rejects external and auth callback URLs", () => {
    expect(getSafeCallbackPath("https://evil.example/dashboard")).toBeNull();
    expect(getSafeCallbackPath("//evil.example/dashboard")).toBeNull();
    expect(getSafeCallbackPath("/login")).toBeNull();
    expect(getSafeCallbackPath("/api/auth/signin")).toBeNull();
    expect(getSafeCallbackPath("/auth/after-login")).toBeNull();
  });
});

describe("getPostLoginRedirect", () => {
  it("sends signed-out users to login", () => {
    expect(getPostLoginRedirect(null)).toBe("/login");
  });

  it("uses role landing when callback is missing or unsafe", () => {
    expect(getPostLoginRedirect({ role: "guest" })).toBe("/jobs");
    expect(getPostLoginRedirect({ role: "admin" }, "https://evil.example")).toBe("/dashboard");
    expect(getPostLoginRedirect({ role: "student" }, "/auth/after-login")).toBe("/dashboard");
  });

  it("keeps safe callback paths for protected-page login flows", () => {
    expect(getPostLoginRedirect({ role: "student" }, "/studies")).toBe("/studies");
    expect(getPostLoginRedirect({ role: "guest" }, "/jobs")).toBe("/jobs");
  });
});
