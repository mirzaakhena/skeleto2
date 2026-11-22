# `@UseCase` dan `@Gateway` sebagai jenis bawaan

> **Sudah terealisasi di kode** (tiket 261122101201). `CLAUDE.md` bagian 4.6 dan 4.7 adalah kontraknya; dokumen ini menjelaskan alasannya.

## Definisi

`@UseCase` dan `@Gateway` adalah **dua jenis action** yang dikenal langsung oleh Skeleto; tidak ada jenis action lain. Keduanya action, jadi semua perilaku action berlaku: tahap luar sinkron, menghasilkan handler, dan dibungkus semua wrapper. Bedanya, Skeleto juga menjaga aturan dependency keduanya.

```ts
// src/usecase/stock/stock_transfer.ts (excerpt)
/**
 * Moves units of stock from one warehouse to another.
 *
 * @UseCase
 * @Transaction
 * @Audit {"level": "info"}
 */
```

## Kenapa ada

Aturan inti clean architecture yang hanya dijaga dokumen bergantung pada ketelitian reviewer, dan kode buatan AI tidak deterministik dalam mematuhi dokumen. Dengan jenis bawaan, aturan UC-4 dan GW-12 dijaga mesin: dilaporkan saat startup, sebelum berkas aplikasi diimpor, bersama kesalahan lain.

Pemilik memilih jenis bawaan, bukan preset, karena tujuan utama Skeleto adalah konsistensi (`CLAUDE.md` bagian 1.1): satu cara saja, tanpa konfigurasi tambahan. Mekanisme jenis yang umum juga butuh kode lebih banyak daripada dua jenis tetap.

## Aturan dependency

| Jenis | Boleh bergantung pada |
| --- | --- |
| `@Config` | `@Config` |
| `@Wrapper` | `@Config` |
| `@UseCase` | `@Gateway` |
| `@Gateway` | `@Config` |

Keputusan pemilik (2026-11-22, `TEMUAN.md` temuan 18): strukturnya satu garis lurus, controller -> use case -> gateway -> config. Use case hanya bergantung pada gateway dan gateway hanya pada config. Parameter bisnis sampai ke use case lewat gateway yang membacanya atau menjadi konstanta entity; kode yang dipakai bersama beberapa gateway adalah config atau fungsi biasa yang bukan komponen; gateway yang butuh waktu atau id baru menerimanya di inputnya; pengirim outbox adalah proses terpisah (controller yang memanggil use case). Urutan pembuatan: semua gateway, lalu semua use case.

## Yang masih terbuka

- **Kontrak dengan alat luar.** Bagian mana dari kebutuhan penjejak scenario-explorer yang diformalkan di Skeleto (`TEMUAN.md`, temuan 14). Penjejak itu masih membaca use case sebagai action bertanda `@UseCase` dan perlu tiket sendiri.
- **Wrapper siap pakai** (transaksi, pengamat gateway): tetap kode contoh di README, atau disediakan Skeleto.
- **Controller:** apakah Skeleto juga akan mengenalnya (belum dibahas).

`Context` tetap di inti (keputusan pemilik, 2026-11-22).

## Cara Skeleto membacanya

- Jenis dibaca dari `metadata.mainDecorator.name` (`Config`, `Wrapper`, `UseCase`, `Gateway`), tanpa field baru. Wrapper membedakan use case dari gateway lewat nama itu.
- `UseCase` dan `Gateway` tidak ada di `MARKERS` aplikasi: keduanya penanda utama.
- Ukuran inti bertambah; pemilik sudah minta diingatkan soal ukuran inti (`TEMUAN.md`, temuan 1).
