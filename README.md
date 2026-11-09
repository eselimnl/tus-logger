# TUS Takip

TUS 2027 (29 Mart 2027) için konu, tekrar ve soru takip uygulaması. Mobil öncelikli PWA.
Next.js 16 + Supabase (Postgres + Auth) + Vercel.

## Ne yapar
- **Bugün**: sabah 2 + akşam 2 konu önerir (son 6 TUS'taki soru ortalamasına göre, dersler arası dağıtarak). "Değiştir" ile elle seçersin. Zamanı gelen tekrarlar (çalışmadan 1., 7., 30. gün sonra) altta listelenir.
- **Konular**: 137 konu, ders filtresi, arama, power / ders sırası, durum noktaları.
- **Konu detayı**: Çalışma, 1./2./3. tekrar, Soru 1, Soru 2 kutuları (tarihli, geri alınabilir) ve not.
- **İlerleme**: ders bazlı ilerleme, power ağırlıklı sınav kapsamı, son 8 haftanın yeni konu grafiği.

Power = konunun son 6 TUS'taki ortalama soru sayısı (Yüksek ≥ 3, Orta ≥ 1.5). Kaynak: tuskocu.com.

## Kurulum

### 1. Supabase
1. supabase.com'da yeni proje aç.
2. **SQL Editor**'a sırayla yapıştırıp çalıştır:
   `supabase/migrations/0001_init.sql`, sonra `supabase/migrations/0002_seed_topics.sql` (137 konu).
3. Kayıt, doğrulama ve şifre sıfırlama e-postaları için aşağıdaki **"Kayıt ve şifre sıfırlama kurulumu"** bölümünü uygula.
4. İlk hesabını uygulamadaki **Hesap oluştur** ekranından aç (ya da **Authentication → Users → Add user** ile ekle, "Auto Confirm User" işaretli olsun).
5. **Project Settings → API**: `Project URL` ve `anon public` anahtarını not al.

### 2. Vercel
1. Bu klasörü bir GitHub deposuna it, Vercel'de "Import Project" ile bağla.
2. Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy et.

### 3. Telefonda
Vercel adresini aç, giriş yap. iPhone: Safari → Paylaş → Ana Ekrana Ekle. Android: Chrome → Uygulamayı yükle.

## Kayıt ve şifre sıfırlama kurulumu

Uygulamada herkes e-postayla hesap açabilir (`/kayit`), şifresini unutan sıfırlayabilir (`/sifremi-unuttum`),
giriş yapmış kullanıcı **Hesap** sekmesinden şifresini değiştirip çıkış yapabilir. Her kullanıcının ilerlemesi
satır bazlı güvenlikle (RLS) yalnızca ona görünür. Bunun çalışması için Supabase tarafında şunlar gerekir:

1. **Kendi SMTP'ni bağla** (Authentication → Emails → SMTP Settings → Enable custom SMTP). Supabase'in
   yerleşik e-posta servisi üretim için değildir: yalnızca proje ekibindeki adreslere gönderir ve saatte 2
   e-postayla sınırlıdır, yani başka kullanıcılara hiçbir e-posta gitmez. Resend, Brevo, Postmark, Amazon SES
   gibi bir sağlayıcıdan sunucu, port, kullanıcı adı, şifre ve gönderen adresi gir.
2. **Authentication → Sign In / Providers → Email**: "Allow new users to sign up" **açık**, "Confirm email"
   **açık**, "Minimum password length" **8**.
3. **Authentication → URL Configuration**: *Site URL* = Vercel adresin (örn. `https://tus-logger.vercel.app`).
   *Redirect URLs* listesine aynı adresi `/**` ile ekle.
4. **Authentication → Email Templates**: iki şablonda da varsayılan `{{ .ConfirmationURL }}` bağlantısını
   aşağıdakilerle değiştir.
   - **Confirm signup**: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/`
   - **Reset password**: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/sifre-yenile`

   Örnek gövde: `<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/sifre-yenile">Şifreni sıfırla</a></p>`
5. Denemek için: farklı bir e-postayla kayıt ol, gelen bağlantıya tıkla, çıkış yap, "Şifremi unuttum" ile
   sıfırla.

Notlar:
- Hesap silme henüz yok (Supabase'de yönetici anahtarı gerektirir). Gerekirse kullanıcıyı **Authentication →
  Users** ekranından silebilirsin, ilerleme verisi de birlikte silinir.
- Açık kayıtta bot kaydı olabilir. Gerekirse Authentication → Attack Protection'dan CAPTCHA aç, ayrıca
  Authentication → Rate Limits sınırlarına bak.
- Kayıtlı e-posta adresleri kişisel veridir. Başkalarına açacaksan kısa bir gizlilik notu eklemeyi düşün.

## Yerel çalıştırma
```bash
cp .env.example .env.local   # değerleri doldur
npm install
npm run dev
npm test                     # öneri mantığı testleri
```

## Notlar
- `anon` anahtarı tarayıcıda görünür, sorun değil: tüm tablolarda satır bazlı güvenlik (RLS) açık, veriye yalnızca giriş yapmış kullanıcı kendi satırlarıyla erişir. `service_role` anahtarını asla Vercel'e koyma.
- SQL Editor yerine CLI ile seed için: `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed`.
- Veri `data/tus_konular.json` dosyasında. Yeni TUS (2026 Ağustos) sayfaya eklendiğinde dosyayı güncelleyip seed'i yeniden çalıştırabilirsin.
- Tekrar aralıkları `lib/recommend.ts` içinde `DEFAULT_INTERVALS` (1, 7, 30 gün).
