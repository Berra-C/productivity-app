# Productivity PWA — özel hesap + bulut senkronizasyonu

Bu sürüm, mevcut local-first uygulamaya e-posta/telefon gerektirmeyen özel bir hesap sistemi ekler.

## Kullanıcı girişi
Her hesap üç bilgi ile açılır:

- sistemin rastgele ürettiği kullanıcı adı (`NOVA-4821` gibi),
- iki kelimelik "sihirli kelime" (`atlas-pusula` gibi),
- 6 haneli erişim kodu.

Sihirli kelime ve kod veritabanında düz metin tutulmaz. Edge Function bunları PBKDF2-SHA256 (210.000 iterasyon + kullanıcıya özel salt) ile doğrular. Başarısız girişler IP + kullanıcı adı düzeyinde rate-limit edilir.

## Çok cihazlı senkronizasyon
Uygulama local-first kalır:

1. Yerel veri `localStorage + IndexedDB` içinde anında kaydedilir.
2. Giriş yapılmışsa değişiklikler yaklaşık 1.4 sn debounce ile buluta gönderilir.
3. Uygulama yeniden görünür olduğunda / internet geri geldiğinde bulut kontrol edilir.
4. Server-side `revision` optimistic locking ile aynı anda iki cihazın körlemesine birbirini ezmesi engellenir.
5. Çakışmada task/event/session kayıtları ID üzerinden birleştirilir.
6. Canlı timer başka cihaza devam eden timer olarak taşınmaz; geçmiş süreler senkronize edilir.

## Dosyalar

- `index.html` — ana uygulama
- `admin.html` — hesap yönetim ekranı
- `assets/js/cloud-config.js` — tarayıcıda bulunmasına izin verilen public Supabase bilgileri
- `assets/js/cloud-sync.js` — login, cihazlar ve senkronizasyon
- `assets/js/admin.js` — kullanıcı oluşturma / sıfırlama / devre dışı bırakma
- `supabase/migrations/001_cloud_accounts.sql` — veritabanı şeması
- `supabase/functions/app-api/index.ts` — güvenli API
- `supabase/config.toml` — Edge Function JWT gateway ayarı

## Supabase kurulumu

### 1. Proje oluştur
Supabase'te boş bir proje oluştur.

### 2. SQL migration'ı çalıştır
Dashboard > SQL Editor içinde `supabase/migrations/001_cloud_accounts.sql` dosyasını çalıştır.

Tablolar RLS ile korunur ve browser'a doğrudan policy verilmez. Kullanıcı verilerine yalnızca Edge Function erişir.

### 3. Edge Function'ı deploy et
Supabase CLI ile proje klasöründe:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy app-api
```

`supabase/config.toml` içinde `app-api` için `verify_jwt = false` vardır; bu gereklidir çünkü bu uygulama Supabase Auth JWT yerine kendi opaque session token'ını doğrular.

### 4. Yönetici secret'ı belirle
Uzun ve rastgele bir değer üret ve Supabase secret olarak ekle:

```bash
supabase secrets set APP_ADMIN_SECRET="UZUN_RASTGELE_BIR_DEGER"
```

`SUPABASE_URL` ve server secret/service-role bilgileri hosted Edge Function ortamında Supabase tarafından sağlanır. Service/secret key frontend'e konmaz.

### 5. Frontend'i bağla
`assets/js/cloud-config.js` içinde iki public alanı doldur:

```js
window.CLOUD_CONFIG = {
  supabaseUrl: 'https://PROJECT_REF.supabase.co',
  anonKey: 'PUBLISHABLE_OR_ANON_KEY',
  functionName: 'app-api'
};
```

Buradaki key public/publishable key olabilir. Service role/secret key kesinlikle kullanma.

### 6. Kullanıcı oluştur
Siteyi deploy ettikten sonra `/admin.html` adresini aç.

- `APP_ADMIN_SECRET` değerini gir.
- `+ Yeni Kullanıcı Oluştur` seç.
- Sistem kullanıcı adı + sihirli kelime + 6 haneli kod üretir.
- Sihirli kelime ve kod sadece bu işlem sonucunda açık metin gösterilir.

Kullanıcı bilgilerini kaybederse "Bilgileri Sıfırla" ile yeni sihirli kelime + kod üretilir ve eski cihaz oturumları iptal edilir.

## Güvenlik notları

- `APP_ADMIN_SECRET` sadece Supabase secret olarak tutulur; source code'a yazılmaz.
- DB tablolarına anon/authenticated RLS policy verilmez.
- Session token'ın kendisi DB'de tutulmaz, SHA-256 hash'i tutulur.
- Oturumlar varsayılan 90 gün geçerlidir.
- 6 haneli kod tek başına kimlik doğrulamaz; kullanıcı adı + sihirli kelime + kod birlikte gerekir.
- 5 başarısız denemeden sonra kısa bekleme, 10 başarısız denemeden sonra 5 dakika kilit uygulanır.
- Hesap devre dışı bırakıldığında aktif oturumlar revoke edilir.
- “Diğer cihazlardan çıkış yap” mevcut cihaz dışındaki session'ları revoke eder.

## Bağlantı için benden gerekenler

Kod tamamen hazır; gerçek Supabase projesine bağlamak için yalnızca şu iki public değeri `cloud-config.js` içine yerleştirmek gerekir:

1. Supabase Project URL
2. Publishable key (veya legacy anon public key)

`APP_ADMIN_SECRET` değerini bana göndermen gerekmez; onu doğrudan Supabase secrets içine girmen daha güvenlidir.
