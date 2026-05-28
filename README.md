# Hastane Randevu Sistemi

Next.js 16, Prisma ve Neon PostgreSQL ile hazırlanmış üniversite projesi.
Hasta tarafında hastane, tıbbi birim, doktor ve saat seçilerek randevu alınır.
Panel tarafında admin, sekreter ve doktor rolleriyle randevu süreci yönetilir.

## Teknolojiler

- Next.js `16.2.6`
- React `19.2.4`
- Prisma `6.19.3`
- PostgreSQL / Neon
- NextAuth `5.0.0-beta.31`
- Tailwind CSS 4
- bcryptjs

Ek UI veya form kütüphanesi kullanılmaz.

## Kurulum

```bash
npm install
npx prisma generate
npm run dev
```

Uygulama varsayılan olarak:

```txt
http://localhost:3000
```

adresinde çalışır.

## Ortam Değişkenleri

`.env.local` dosyası oluşturup `.env.example` içindeki anahtarları doldurun.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
SHOW_OTP_ON_SCREEN="false"
```

Neon için `DATABASE_URL` pooled, `DIRECT_URL` direct bağlantı adresi olmalıdır.

Vercel test ortamında OTP kodunu ekranda göstermek için Environment Variables
alanına `SHOW_OTP_ON_SCREEN=true` ekleyin. Canlı test bitince bu değeri kaldırın
veya `false` yapın.

## Veritabanı

Migration uygulamak için:

```bash
npx prisma migrate deploy
```

Şema doğrulama:

```bash
npx prisma validate
```

Demo veriler Neon üzerinde tutulur. Repo içinde geçici seed dosyası bırakılmadı.

Mevcut test verileri:

- Birden fazla hastane
- Hastanelere bağlı tıbbi birimler
- Birimlere bağlı doktorlar
- Aktif doktorlar için otomatik 14 günlük hafta içi randevu saatleri
- Admin kullanıcı
- Doktor panel kullanıcıları

Admin giriş bilgisi:

```txt
Kullanıcı adı: admin
Şifre: Admin123!
```

Migrasyondan gelen doktor kullanıcılarının geçici şifresi:

```txt
TempPass123!
```

## Hasta Akışı

1. Ana ekranda doktor/birim aranır veya hastane seçilir.
2. Hastane, tıbbi birim ve doktor seçilir.
3. Sistem uygun ilk günü ve saatleri gösterir.
4. Telefon numarası girilir.
5. Geliştirme ortamında doğrulama kodu ekranda gösterilir.
6. Yeni hasta ise hasta bilgileri alınır.
7. Randevu detayları onaylanır.
8. Randevu oluşturulur.

`Randevularım` sekmesinde randevular yalnızca telefon doğrulamasından sonra gösterilir.

## Panel Akışı

Panel girişi:

```txt
/admin
```

Roller:

- Admin: Dashboard, randevular, hastaneler, tıbbi birimler, doktorlar ve çalışma saatleri.
- Sekreter: Randevuları görür, TC Kimlik No ile arar ve gelen hastayı onaylar.
- Doktor: Yalnızca kendi bugünkü onaylı randevularını görür ve hasta için doktor notu kaydeder.

Admin tarafından yönetilen alanlar:

- Randevular
- Hastaneler
- Tıbbi birimler
- Doktorlar
- Çalışma saatleri

Randevular ekranında işlem olarak yalnızca:

- `Geldi`
- `İptal Et`

bulunur. Randevu saatinden 15 dakika sonra hâlâ `Geldi` yapılmamış randevular otomatik `Gelmedi` durumuna alınır.

Sekreterin `Onayla` işlemi hastanın geldiğini belirtir ve randevuyu `Geldi` durumuna taşır.

## Çalışma Saatleri

Sistem aktif doktorlar için bugünden itibaren 14 takvim günü boyunca hafta içi randevu saatlerini otomatik oluşturur.

Standart saatler:

```txt
09:00 - 16:30
```

30 dakikalık aralıklarla oluşturulur. Cumartesi ve pazar günleri normal randevu günü değildir.

Admin `Çalışma Saatleri` ekranından doktor izni için:

- Tüm günü randevuya kapatabilir.
- Seçili saatleri randevuya kapatabilir.
- Kapalı saatleri tekrar aktif edebilir.

Dolu randevu saatleri izin işlemiyle değiştirilmez.

## Kontrol Komutları

```bash
npm run lint
npm run build
npx prisma validate
```

Prisma şeması değiştiyse:

```bash
npx prisma generate
npx prisma migrate deploy
```
