# `@UseCase` dan `@Gateway` sebagai jenis bawaan

> **Seluruh dokumen ini adalah rencana dan belum terealisasi di kode.** Pemilik memutuskan (2026-11-22) bahwa `@UseCase` dan `@Gateway` menjadi bagian inti Skeleto, bukan preset terpisah (`TEMUAN.md`, temuan 12). Sampai kode dibuat, yang berlaku adalah cara sekarang yang disebut di setiap dokumen.

## Definisi

`@UseCase` dan `@Gateway` adalah **jenis khusus `@Action`** yang dikenal langsung oleh Skeleto. Keduanya action, jadi semua perilaku action berlaku: tahap luar sinkron, menghasilkan handler, dan dibungkus semua wrapper. Bedanya, Skeleto juga menjaga aturan dependency keduanya.

```ts
// Rencana, belum bisa dijalankan
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

Aturan inti clean architecture saat ini hanya dijaga dokumen dan kode salinan:

| Aturan | Dijaga oleh, sekarang |
| --- | --- |
| Use case tidak bergantung pada use case (UC-4) | tes arsitektur salinan, ditambah wrapper penjaga opsional yang baru menangkapnya setelah impor |
| Gateway tidak bergantung pada use case (GW-12) | tes arsitektur salinan |

Kode salinan bisa lupa disalin, diubah, atau tertinggal versinya. Kode buatan AI juga tidak deterministik dalam mematuhi dokumen. Dengan jenis bawaan, aturan-aturan itu dijaga mesin: dilaporkan saat startup, sebelum berkas aplikasi diimpor, bersama kesalahan lain.

Pemilik memilih jenis bawaan, bukan preset, karena tujuan utama Skeleto adalah konsistensi (`CLAUDE.md` bagian 1.1): satu cara saja, tanpa konfigurasi tambahan. Mekanisme jenis yang umum juga butuh kode lebih banyak daripada dua jenis tetap.

## Bentuk yang direncanakan

| Jenis | Boleh bergantung pada |
| --- | --- |
| `@Config` | `@Config` |
| `@Wrapper` | `@Config` |
| `@UseCase` | `@Config`, `@Gateway` |
| `@Gateway` | `@Config`, `@Gateway` |
| `@Action` | `@Config`, `@Action` (seperti sekarang; lihat pertanyaan terbuka di bawah) |

## Yang belum diputuskan

- **Dependency antara `@Action` polos dan dua jenis baru.** Bolehkah `@Action` polos bergantung pada `@Gateway` atau `@UseCase`, dan sebaliknya?
- **Kontrak dengan alat luar.** Bagian mana dari kebutuhan penjejak scenario-explorer yang diformalkan di Skeleto (`TEMUAN.md`, temuan 14). Pemilik ingin menelitinya lebih dalam: yang hanya untuk penjejak tidak dibuat di Skeleto, tetapi yang bermanfaat umum boleh diformalkan.
- **Wrapper siap pakai** (transaksi, pengamat gateway): tetap kode contoh di README, atau disediakan Skeleto.
- **Controller:** apakah Skeleto juga akan mengenalnya (belum dibahas).

`Context` tetap di inti (keputusan pemilik, 2026-11-22).

## Dampak yang harus ditangani saat dibuat

- Prinsip **"Hanya binding"** di `CLAUDE.md` bagian 2 harus ditulis ulang, karena Skeleto akan mengenal konsep use case dan gateway.
- `metadata.mainDecorator.name` akan berisi `UseCase` atau `Gateway`, bukan `Action`. Wrapper dan alat luar yang membaca nama itu ikut berubah.
- `UseCase` dan `Gateway` keluar dari `MARKERS` aplikasi.
- `CLAUDE.md` bagian 4.2, 4.4, dan 4.6, `README.md`, dan tes arsitektur di `REVIEW_CHECKLIST.md` perlu disesuaikan.
- API publik Skeleto berubah (`CLAUDE.md` bagian 5).
- Ukuran inti bertambah; pemilik sudah minta diingatkan soal ukuran inti (`TEMUAN.md`, temuan 1).
