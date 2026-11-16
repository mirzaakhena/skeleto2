# Draf tiket awal

Berkas serah terima ini disiapkan dari sesi di `~/Workspace/nukitu`. Sesi di repo ini mengubah isinya menjadi tiket `kerjaan2`, lalu **menghapus berkas ini** di commit yang sama dengan pembuatan papan.

Spesifikasi lengkapnya ada di `CLAUDE.md`. Setiap tiket di bawah merujuk ke bagiannya, jadi isi tiket tidak mengulang spesifikasi.

## Keputusan terbuka (tanyakan ke pemilik sebelum membuat tiket)

1. **Nama framework.** `skeleto` adalah nama kerja, dan pemilik belum sreg dengan nama itu. Calon yang masih kosong di npm per 2026-11-16: `jahit`, `anyam`, `rangkai`. Kalau namanya berubah, tiket 1 memakai nama baru untuk paket, kelas `Skeleto`, dan `SkeletoOptions`. Setelah itu `~/Workspace/nukitu/CLAUDE.md` juga perlu disesuaikan (di luar repo ini).

## Keputusan yang sudah diambil pemilik

- Repo ini ditulis ulang dari nol. `~/Workspace/review-skeleto` hanya rujukan perilaku (lihat `CLAUDE.md` bagian 3).
- `readTypeArguments`, pembacaan payload, `returnTypeDecorator`, dan semua decorator field dihapus.
- Daftar decorator berbentuk daftar nama: `decorators: ["Logging", "Transaction"]`.
- Nama API publik dipertahankan (`CLAUDE.md` bagian 5).
- Contoh aplikasi belum dikerjakan. Fokusnya hanya inti framework.

## Keputusan dari sesi penyusun (boleh dikoreksi pemilik)

- Fungsi berpenanda utama yang tidak di-`export`, atau yang memuat lebih dari satu penanda utama, menjadi kesalahan. Di `review-skeleto` keduanya diam-diam diabaikan.
- Untuk `ordinal` yang sama, urutan wrapper stabil menurut nama wrapper.
- JSON penanda yang tidak valid selalu menjadi kesalahan, baik daftar decorator diberikan maupun tidak.

## Urutan dan ketergantungan

```
1 ──┬── 2 ──┐
    ├── 3 ──┼── 4 ── 5 ── 6
    └───────┘
```

Tiket 2 dan 3 bisa dikerjakan bersamaan setelah tiket 1.

---

## 1. Kerangka proyek dan tipe publik

**Background**
Repo ini masih kosong. Semua tiket berikutnya butuh proyek TypeScript yang bisa di-typecheck, dites, dan di-build.

**Request**
- Buat `package.json` (ESM, satu dependency runtime `ts-morph`, dev dependency `typescript`, `tsx`, `@types/node`), `tsconfig.json`, dan script sesuai `CLAUDE.md` bagian 9.
- Tulis `src/type.ts` berisi semua tipe publik, kelas `FuncInstanceMetadata`, dan `newContext()` (bagian 5).
- Tulis `src/index.ts` yang mengekspor bagian 5. `Skeleto` boleh diekspor dari stub yang melempar "not implemented" sampai tiket 5.

**Done when**
- `npm run typecheck`, `npm test`, dan `npm run build` lulus.
- `dist/` berisi `index.js` dan `index.d.ts`, dan `index.d.ts` memuat tepat tipe di bagian 5. Tidak ada `Payload`, `TypeField`, `DecoratorRule`, atau `FieldDecoratorRule`.
- Ada tes `newContext()`.
- Dependency runtime di `package.json` hanya `ts-morph`.

## 2. Pembaca penanda JSDoc

**Background**
Penanda Skeleto adalah teks di JSDoc. Pembacaannya harus tepat dan bisa diuji tanpa berkas, tanpa `ts-morph`.

**Request**
Tulis `src/decorator.ts`: fungsi murni yang menerima teks dalam blok JSDoc, lalu mengembalikan daftar penanda beserta datanya dan daftar kesalahannya. Perilaku sesuai `CLAUDE.md` bagian 4.1.

**Done when**
- Tes di `test/decorator.test.ts` mencakup:
  - penanda tanpa data;
  - data berupa teks;
  - data JSON satu baris;
  - data JSON yang dimulai di baris berikutnya;
  - data JSON beberapa baris;
  - `@` di tengah kalimat dan di alamat email yang tidak terbaca sebagai penanda;
  - tag standar yang diabaikan;
  - JSON tidak valid yang menjadi kesalahan.
- `src/decorator.ts` tidak mengimpor `ts-morph`.

## 3. Pengurut dependency

**Background**
Komponen harus dibuat setelah dependency-nya, dan siklus harus ditolak dengan pesan yang menunjukkan jalurnya.

**Request**
Tulis `src/dependency.ts`: fungsi murni (bukan class) yang menerima daftar `{ name, dependencies }` dan mengembalikan urutan nama dengan dependency lebih dulu. Ia melempar error untuk dependency yang tidak ada dan untuk siklus (`CLAUDE.md` bagian 4.3 dan 4.6).

**Done when**
- Tes di `test/dependency.test.ts` mencakup:
  - tanpa dependency;
  - rantai lurus;
  - graf bercabang;
  - dependency yang tidak ada (pesan menyebut nama komponen dan nama dependency-nya);
  - siklus dua dan tiga komponen (pesan memuat jalur `A -> B -> A`);
  - siklus pada diri sendiri.
- Untuk masukan yang sama, urutan hasilnya selalu sama.
- `src/dependency.ts` tidak mengimpor `ts-morph`.

## 4. Pemindai

**Background**
Pemindai membaca berkas aplikasi dengan `ts-morph` dan menghasilkan metadata setiap komponen, **tanpa** mengimpor berkas aplikasi.

**Request**
Tulis `src/scanner.ts` sesuai `CLAUDE.md` bagian 4.2 sampai 4.5. Pakai `src/decorator.ts` untuk membaca penanda. Hasilnya berupa daftar `FuncMetadata` beserta path berkas dan nama fungsinya, ditambah daftar semua kesalahan (tidak berhenti di kesalahan pertama).

**Done when**
- Tes di `test/scanner.test.ts`, dengan fixture di direktori sementara, mencakup setiap kesalahan di bagian 4.2, 4.4, dan 4.5, serta kasus sahnya:
  - nama komponen dari return type, termasuk nama bertitik seperti `winston.Logger`;
  - dependency sesuai urutan parameter;
  - `additionalDecorators` sesuai urutan tulisan;
  - daftar decorator yang diberikan dan yang tidak.
- Satu fixture dengan beberapa kesalahan menghasilkan semua kesalahannya sekaligus.
- Fixture berisi `throw` di tingkat modul tidak memicu `throw` itu.
- Hanya `src/scanner.ts` yang mengimpor `ts-morph`.

## 5. Startup, instansiasi, dan container

**Background**
Ini bagian yang menyatukan semuanya: `Skeleto.start()` memindai, memeriksa, lalu membuat setiap komponen dan memasang wrapper.

**Request**
Tulis `src/skeleto.ts` sesuai `CLAUDE.md` bagian 4.6 sampai 4.8, memakai `scanner.ts` dan `dependency.ts`. Ganti stub dari tiket 1.

**Done when**
- Tes di `test/skeleto.test.ts`, dengan fixture di direktori sementara, mencakup:
  - setiap pelanggaran aturan jenis dependency;
  - siklus lintas jenis;
  - urutan instansiasi Config, Wrapper, Action;
  - setiap fungsi dipanggil tepat satu kali;
  - urutan wrapper menurut `ordinal`, termasuk `ordinal` yang sama;
  - wrapper yang tidak membungkus;
  - action yang disuntikkan ke action lain sudah dibungkus;
  - container berisi semua jenis komponen;
  - satu instance per direktori, termasuk pemanggilan bersamaan;
  - startup ulang setelah gagal;
  - direktori tanpa berkas `.ts`.
- Kesalahan pemindai dan kesalahan aturan jenis dilaporkan bersama dalam satu `Error`, sebelum berkas aplikasi mana pun diimpor (dibuktikan dengan fixture berisi `throw` di tingkat modul).
- Jumlah baris `src/` di luar tes di bawah 400.

## 6. README

**Background**
Paket ini akan dipakai dari proyek lain dan mungkin dipublikasikan.

**Request**
Tulis `README.md` (bahasa Inggris) yang singkat:
- apa yang dilakukan Skeleto dan apa yang sengaja tidak dilakukannya (`CLAUDE.md` bagian 2);
- contoh `@Config`, `@Action`, dan `@Wrapper` dengan `ordinal`;
- penanda tambahan dan daftar decorator;
- `Skeleto.start` dan `getContainer`;
- aturan jenis dependency.

Tidak ada contoh controller, request, atau response.

**Done when**
- Setiap contoh kode di README disalin ke satu fixture tes dan lulus startup.
- README tidak menyebut `readTypeArguments`, `@Controller`, `@RequestPart`, atau payload.
