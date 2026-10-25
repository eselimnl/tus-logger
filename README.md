# TUS Takip

TUS 2027 (21 Mart 2027) için konu, tekrar ve soru takip uygulaması. Mobil öncelikli PWA.
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
3. **Authentication → Sign In / Providers → Email**: "Allow new users to sign up" seçeneğini **kapat**.
4. **Authentication → Users → Add user**: kendi e-postan ve şifrenle kullanıcı oluştur ("Auto Confirm User" işaretli olsun).
5. **Project Settings → API**: `Project URL` ve `anon public` anahtarını not al.

### 2. Vercel
1. Bu klasörü bir GitHub deposuna it, Vercel'de "Import Project" ile bağla.
2. Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy et.

### 3. Telefonda
Vercel adresini aç, giriş yap. iPhone: Safari → Paylaş → Ana Ekrana Ekle. Android: Chrome → Uygulamayı yükle.

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
