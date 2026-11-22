# `@UseCase` dan `@Gateway` sebagai jenis bawaan

> **Sudah terealisasi di kode** (tiket 261122101201). `CLAUDE.md` bagian 4.6 dan 4.7 adalah kontraknya; dokumen ini menjelaskan alasannya.

## Definisi

`@UseCase` dan `@Gateway` adalah **jenis khusus `@Action`** yang dikenal langsung oleh Skeleto. Keduanya action, jadi semua perilaku action berlaku: tahap luar sinkron, menghasilkan handler, dan dibungkus semua wrapper. Bedanya, Skeleto juga menjaga aturan dependency keduanya.

```ts
/**
 * Moves units of stock from one warehouse to another.
 *
 * @UseCase
 * @Transaction
 */
export function implStockTransfer(lockWarehouses: LockWarehouses, saveWarehouses: SaveWarehouses): StockTransfer {
```

`@Action` polos tetap ada dan boleh dipakai. Aturannya bebas: hanya aturan mekanisme Skeleto yang berlaku untuknya (lihat [action.md](action.md)).

## Kenapa ada

Sebelumnya aturan inti clean architecture hanya dijaga dokumen, kode salinan (tes arsitektur), dan wrapper penjaga opsional yang baru menangkap pelanggaran setelah berkas aplikasi diimpor. Kode salinan bisa lupa disalin, diubah, atau tertinggal versinya, dan kode buatan AI tidak deterministik dalam mematuhi dokumen. Dengan jenis bawaan, aturan UC-4 dan GW-12 dijaga mesin: dilaporkan saat startup, sebelum berkas aplikasi diimpor, bersama kesalahan lain.

Pemilik memilih jenis bawaan, bukan preset, karena tujuan utama Skeleto adalah konsistensi (`CLAUDE.md` bagian 1.1): satu cara saja, tanpa konfigurasi tambahan. Mekanisme jenis yang umum juga butuh kode lebih banyak daripada dua jenis tetap.

## Aturan dependency

| Jenis | Boleh bergantung pada |
| --- | --- |
| `@Config` | `@Config` |
| `@Wrapper` | `@Config` |
| `@UseCase` | `@Config`, `@Gateway` |
| `@Gateway` | `@Config`, `@Gateway` |
| `@Action` | `@Config`, `@Gateway`, `@UseCase`, `@Action` |

Keputusan pemilik (2026-11-22): `@UseCase` dan `@Gateway` tidak boleh bergantung pada `@Action` polos, supaya `@Action` polos tidak menjadi jembatan antar use case. Urutan pembuatan: semua gateway, lalu semua use case, lalu semua action polos.

## Yang masih terbuka

- **Kontrak dengan alat luar.** Bagian mana dari kebutuhan penjejak scenario-explorer yang diformalkan di Skeleto (`TEMUAN.md`, temuan 14). Penjejak itu masih membaca use case sebagai action bertanda `@UseCase` dan perlu tiket sendiri.
- **Wrapper siap pakai** (transaksi, pengamat gateway): tetap kode contoh di README, atau disediakan Skeleto.
- **Controller:** apakah Skeleto juga akan mengenalnya (belum dibahas).

`Context` tetap di inti (keputusan pemilik, 2026-11-22).

## Yang berubah saat dibuat

- Jenis dibaca dari `metadata.mainDecorator.name` (`UseCase`, `Gateway`, `Action`), tanpa field baru. Wrapper membedakan use case dari gateway lewat nama itu.
- `UseCase` dan `Gateway` tidak ada lagi di `MARKERS` aplikasi.
- Tes arsitektur di `REVIEW_CHECKLIST.md` tinggal satu pemeriksaan: tidak ada `@Action` polos (B5). Wrapper penjaga dihapus.
- Ukuran inti bertambah; pemilik sudah minta diingatkan soal ukuran inti (`TEMUAN.md`, temuan 1).
