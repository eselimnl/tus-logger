export const MIN_PASSWORD = 8;

/** Yönlendirme hedefi yalnızca site içi bir yol olabilir (açık yönlendirme koruması). */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}

export function passwordError(password: string, again?: string): string | null {
  if (password.length < MIN_PASSWORD) return `Şifre en az ${MIN_PASSWORD} karakter olmalı.`;
  if (again !== undefined && password !== again) return "Şifreler aynı değil.";
  return null;
}

/** Supabase Auth hatasını kullanıcıya gösterilecek Türkçe mesaja çevirir. */
export function authErrorMessage(error: { code?: string; message?: string }): string {
  switch (error.code) {
    case "invalid_credentials":
      return "E-posta veya şifre hatalı.";
    case "email_not_confirmed":
      return "E-postanı henüz doğrulamadın. Gelen kutundaki bağlantıya tıkla.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.";
    case "weak_password":
      return "Bu şifre çok zayıf. Daha uzun veya daha karmaşık bir şifre dene.";
    case "same_password":
      return "Yeni şifre eskisiyle aynı olamaz.";
    case "email_address_invalid":
      return "Bu e-posta adresi geçerli görünmüyor.";
    case "signup_disabled":
      return "Yeni kayıtlar şu an kapalı.";
    default:
      break;
  }
  const m = (error.message ?? "").toLowerCase();
  if (m.includes("invalid login")) return "E-posta veya şifre hatalı.";
  if (m.includes("not confirmed")) return "E-postanı henüz doğrulamadın. Gelen kutundaki bağlantıya tıkla.";
  if (m.includes("rate limit")) return "Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.";
  return "Bir sorun oluştu. Biraz sonra tekrar dene.";
}
