# Config

## Definisi

**Config** adalah komponen Skeleto yang menyediakan **sumber daya**: pengaturan, koneksi, klien, logger, atau fungsi yang menyerahkan transaksi dari context. Ditandai `@Config`.

Nilai config bisa apa saja. Hasilnya tidak diperiksa Skeleto dan disimpan apa adanya, kecuali config asinkron (di bawah).

## Kenapa ada

Sumber daya dibuat sekali saat startup dan dipakai bersama oleh banyak komponen. Dengan config, cara membuatnya ditulis di satu tempat, dan setiap komponen yang membutuhkannya cukup menulis tipenya sebagai parameter.

## Tempatnya dalam pemisahan logika dan infrastruktur

Config adalah infrastruktur yang menyediakan sumber daya untuk gateway dan wrapper. Ia tidak memegang aturan bisnis.

## Perilaku yang dijamin Skeleto

- Config hanya boleh bergantung pada config lain.
- Semua config dibuat lebih dulu, sebelum wrapper dan action.
- **Config asinkron:** config yang return type-nya tertulis `Promise<X>` bernama `X`. Hasilnya ditunggu sebelum komponen berikutnya dibuat, dan yang disimpan serta disuntikkan adalah nilai jadinya, instance yang sama untuk semua. Config asinkron ditunggu satu per satu, tidak berbarengan.
- Startup **tidak memasang batas waktu** untuk config asinkron.
- Config yang gagal (melempar error atau promise-nya ditolak) menghentikan startup. Config yang sudah dibuat sebelumnya **tidak dibatalkan**, dan startup berikutnya membuatnya lagi. Loop percobaan ulang bisa membocorkan koneksi.

## Struktur

```ts
// src/config.ts (excerpt)
/** @Config */
export async function implConnection(): Promise<Connection> {
```

```ts
// src/config.ts (excerpt)
/** @Config */
export function implDatabase(): Database {
  return (ctx) => {
    if (!ctx.data.transaction) throw new Error("no transaction is open: the use case needs @Transaction");
    return ctx.data.transaction;
  };
}
```

## Nama dan berkas

| Apa | Nama atau berkas | Contoh |
| --- | --- | --- |
| Config | nama dari apa yang disediakannya | `Connection`, `Database`, `Logger` |
| Fungsinya | `impl<Config>` | `implConnection` |
| Berkas | semua config di `src/config.ts` | |

## Aturan wajib

### CFG-1. Config asinkron memasang batas waktunya sendiri

Startup menunggu config asinkron selama yang dibutuhkan dan tidak memasang batas waktu sendiri, sehingga koneksi yang tidak pernah terbuka membuat `Skeleto.start` menggantung selamanya. Config-lah yang tahu berapa lama menunggu itu wajar, biasanya batas waktu koneksi klien yang dibuatnya.

### CFG-2. Sumber daya yang harus dipakai di dalam transaksi diserahkan sebagai fungsi dari context, bukan sebagai koneksi

Config `Database` di atas tidak menyerahkan koneksi. Ia menyerahkan fungsi yang, jika diberi context, mengembalikan transaksi yang dibawa context, dan gagal kalau tidak ada. Gateway bergantung pada `Database`, bukan pada `Connection` (GW-5 di [gateway.md](../konsep/gateway.md)). Dengan begitu gateway tidak bisa bekerja di luar transaksi use case-nya, dan use case yang lupa `@Transaction` gagal di panggilan gateway pertamanya.

### CFG-3. Membangun nilai adalah pekerjaan config; config tidak menjalankan pekerjaan per permintaan

Config adalah pengecualian KOM-2 ([komponen.md](komponen.md)): ia boleh membuka koneksi atau membaca pengaturan saat startup. Tetapi apa pun yang berlangsung per permintaan, misalnya membaca transaksi dari context, terjadi di fungsi yang dikembalikannya, seperti `implDatabase` di atas, bukan saat startup.

## Hubungan dengan komponen lain

| Dengan | Hubungannya |
| --- | --- |
| Config lain | boleh menjadi dependency |
| Wrapper | bergantung pada config (misalnya `TransactionWrapper` pada `Connection`) |
| Gateway | bergantung pada config untuk sumber dayanya |
| Use case | boleh bergantung pada config, tetapi biasanya tidak perlu |

## Status implementasi

Semua yang ada di dokumen ini terealisasi. Config tidak bergantung pada rencana jenis bawaan.
