import { describe, expect, it } from "vitest";
import { authErrorMessage, MIN_PASSWORD, passwordError, safeNext } from "./auth";

describe("safeNext", () => {
  it("site içi yollara izin verir", () => {
    expect(safeNext("/sifre-yenile")).toBe("/sifre-yenile");
    expect(safeNext("/konular?x=1")).toBe("/konular?x=1");
    expect(safeNext("/")).toBe("/");
  });

  it("dış adreslere ve hileli biçimlere izin vermez", () => {
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext("javascript:alert(1)")).toBe("/");
    expect(safeNext("evil")).toBe("/");
    expect(safeNext(null)).toBe("/");
    expect(safeNext("")).toBe("/");
  });

  it("varsayılanı değiştirilebilir", () => {
    expect(safeNext("http://x", "/login")).toBe("/login");
  });
});

describe("passwordError", () => {
  it("kısa şifreyi reddeder", () => {
    expect(passwordError("a".repeat(MIN_PASSWORD - 1))).toMatch(/en az/);
    expect(passwordError("a".repeat(MIN_PASSWORD))).toBeNull();
  });

  it("tekrar eşleşmezse reddeder", () => {
    expect(passwordError("abcdefgh", "abcdefgi")).toBe("Şifreler aynı değil.");
    expect(passwordError("abcdefgh", "abcdefgh")).toBeNull();
  });
});

describe("authErrorMessage", () => {
  it("bilinen kodları Türkçeye çevirir", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).toBe("E-posta veya şifre hatalı.");
    expect(authErrorMessage({ code: "email_not_confirmed" })).toMatch(/doğrulamadın/);
    expect(authErrorMessage({ code: "over_email_send_rate_limit" })).toMatch(/bekleyip/);
    expect(authErrorMessage({ code: "same_password" })).toMatch(/eskisiyle/);
  });

  it("kod yoksa mesajdan çıkarım yapar, bilinmeyeni genel mesaja düşürür", () => {
    expect(authErrorMessage({ message: "Invalid login credentials" })).toBe("E-posta veya şifre hatalı.");
    expect(authErrorMessage({ message: "something odd" })).toMatch(/Bir sorun oluştu/);
    expect(authErrorMessage({})).toMatch(/Bir sorun oluştu/);
  });
});
