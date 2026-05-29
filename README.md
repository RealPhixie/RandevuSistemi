# Hastane Randevu Sistemi

Next.js, Prisma ve Neon PostgreSQL ile hazırlanmış üniversite projesidir. Hasta tarafında hastane, tıbbi birim, doktor ve saat seçilerek randevu alınır. Yönetim panelinde admin, sekreter ve doktor rolleriyle randevu süreci takip edilir.

## Özellikler

- Hastane, tıbbi birim ve doktor seçerek telefon doğrulaması ile randevu oluşturma
- Telefon doğrulaması ile alınan `randevularım` sekmesinden aktif randevuları görüntüleme ve iptal işlemini sağlama
- Demo/test amacıyla telefon doğrulama OTP kodunu ekranda gösterme
- Admin panelinde dashboard, randevu, hasta, hastane, birim, doktor, sekreter ve çalışma saati yönetimi
- Sekreter panelinde günlük randevu takibi, TC Kimlik No ile arama ve hasta geldi onayı
- Doktor panelinde yalnızca o doktora ait ve sekreter tarafından aktif gün içerisinde onaylı randevuları görüntüleme
- Doktorun kendi sekreter onaylı hastası için not eklemesi, güncellemesi ve silmesi
- Aktif doktorlar için hafta içi çalışma saatlerini otomatik oluşturma
- Randevu saatinden 15 dakika sonra gelmeyen hastaları otomatik `Gelmedi` durumuna alma

## Teknolojiler

- Next.js `16.2.6`
- React `19.2.4`
- Prisma `6.19.3`
- PostgreSQL / Neon
- NextAuth `5.0.0-beta.31`
- Tailwind CSS 4
- bcryptjs

Projede ek UI veya form kütüphanesi kullanılmamıştır.

## Kurulum

```bash
npm install
npx prisma generate
npm run dev
```

Uygulama varsayılan olarak aşağıdaki adreste çalışır:

```txt
http://localhost:3000
```

## Ortam Değişkenleri

`.env.local` dosyası oluşturup `.env.example` içindeki değerleri doldurun.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
```

Neon kullanırken `DATABASE_URL` pooled bağlantı, `DIRECT_URL` ise direct bağlantı adresi olmalıdır.

## Veritabanı

Migration uygulamak için:

```bash
npx prisma migrate deploy
```

Şemayı kontrol etmek için:

```bash
npx prisma validate
```

Demo veriler Neon üzerinde tutulur. Repo içinde geçici seed dosyası bırakılmamıştır.

Mevcut test verileri:

- Birden fazla hastane
- Hastanelere bağlı tıbbi birimler
- Birimlere bağlı doktorlar
- Aktif doktorlar için otomatik 14 günlük hafta içi randevu saatleri
- Admin, sekreter ve doktor panel kullanıcıları

## Test Hesapları

Admin hesabı:

```txt
Kullanıcı adı: admin
Şifre: TempPass123!
```

Sekreter hesabı:

```txt
Admin hesabı admin panelinden manuel oluşturulabilir, live vercel'da linkten denemek için:

Kullanıcı adı: sekreter
Şifre: TempPass123!
```

Doktor hesabı:

```txt
Admin hesabı admin panelinden manuel oluşturulabilir, live vercel'da linkten denemek için:

Kullanıcı adı: ece_polat_ecepolat
Şifre: TempPass123!
```

## Hasta Akışı

1. Ana ekranda doktor veya tıbbi birim aranır ya da hastane seçilir.
2. Hastane, tıbbi birim ve doktor seçilir.
3. Sistem uygun tarihleri ve saatleri gösterir.
4. Telefon numarası girilir.
5. OTP kodu demo/test amacıyla ekranda gösterilir.
6. Yeni hasta ise hasta bilgileri alınır.
7. Randevu detayları onaylanır.
8. Randevu oluşturulur.

`Randevularım` sekmesinde randevular yalnızca telefon doğrulamasından sonra gösterilir. Hasta, uygun şartlarda kendi gelecek randevusunu iptal edebilir.

## Yönetim Paneli

Panel girişi:

```txt
/admin
```

Roller:

- Admin: Dashboard, randevular, hastalar, hastaneler, tıbbi birimler, doktorlar, sekreterler ve çalışma saatlerini yönetir.
- Sekreter: Randevuları görür, TC Kimlik No ile arama yapar ve gelen hastayı onaylar.
- Doktor: Yalnızca kendi bugünkü onaylı randevularını görür ve hasta için doktor notu yönetir.

Admin randevular ekranında `Planlandı` durumundaki randevular için:

- `Geldi`
- `İptal Et`

işlemleri bulunur. `Geldi`, `Gelmedi` ve `İptal Edildi` gibi sonlanmış durumlarda işlem butonları pasif görünür.

Sekreterin `Onayla` işlemi hastanın geldiğini belirtir ve randevuyu `Geldi` durumuna taşır.

## Çalışma Saatleri

Sistem aktif doktorlar için bugünden itibaren 14 takvim günü boyunca hafta içi randevu saatlerini otomatik oluşturur.

Standart saatler:

```txt
09:00 - 16:30
```

Randevu saatleri 30 dakikalık aralıklarla oluşturulur. Cumartesi ve pazar günleri normal randevu günü değildir.

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
