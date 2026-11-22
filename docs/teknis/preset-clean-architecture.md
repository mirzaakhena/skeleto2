# Preset clean architecture

> **Seluruh dokumen ini adalah rencana dan belum terealisasi di kode.** Arahnya dipilih pemilik pada 2026-11-21 (`TEMUAN.md`, temuan 12). Rinciannya belum diputuskan. Sampai preset dibuat, yang berlaku adalah cara sekarang yang disebut di setiap bagian.

## Definisi

**Preset clean architecture** adalah paket bawaan tambahan di Skeleto yang memperkenalkan `@UseCase` dan `@Gateway` sebagai **jenis khusus `@Action`**, beserta aturan dependency-nya. Inti Skeleto tetap netral; preset dipasang oleh aplikasi yang memilih memakai konsep ini.

```ts
// Rencana, belum bisa dijalankan
import { Skeleto } from "skeleto";
import { cleanArchitecture } from "skeleto/clean";

await Skeleto.start("src", { ...cleanArchitecture, decorators: MARKERS });
```

## Kenapa ada

Aturan inti clean architecture saat ini hanya dijaga dokumen dan kode salinan:

| Aturan | Dijaga oleh, sekarang |
| --- | --- |
| Setiap action tepat salah satu dari use case atau gateway (ACT-1) | tes arsitektur salinan, hanya saat tes dijalankan |
| Use case tidak bergantung pada use case (UC-4) | tes arsitektur salinan; wrapper penjaga opsional yang menangkapnya setelah impor |
| Gateway tidak bergantung pada use case (GW-12) | tes arsitektur salinan |

Kode salinan bisa lupa disalin, diubah, atau tertinggal versinya. Kode buatan AI juga tidak deterministik dalam mematuhi dokumen. Dengan preset, ketiga aturan itu dijaga mesin: dilaporkan saat startup, sebelum berkas aplikasi diimpor, bersama kesalahan lain.

## Bentuk yang direncanakan

| Jenis | Turunan dari | Boleh bergantung pada |
| --- | --- | --- |
| `@UseCase` | `@Action` | `@Config`, `@Gateway` |
| `@Gateway` | `@Action` | `@Config`, `@Gateway` |

Inti menyediakan mekanisme umum untuk mendefinisikan jenis turunan dan aturan dependency-nya, misalnya:

```ts
// Rencana, belum bisa dijalankan
kinds: {
  UseCase: { is: "Action", dependsOn: ["Config", "Gateway"] },
  Gateway: { is: "Action", dependsOn: ["Config", "Gateway"] },
}
```

Preset hanyalah isi siap pakai untuk mekanisme itu.

## Yang belum diputuskan

- **Opt-in atau aktif bawaan.** Usulan: opt-in, supaya `@Action` polos tetap berjalan bagi yang tidak memakai konsep ini.
- **Isi preset.** Hanya jenis dan aturan dependency-nya, atau juga wrapper siap pakai (transaksi, pengamat gateway).
- **Bentuk paket.** Subpath di paket yang sama (`skeleto/clean`) atau paket npm terpisah. Subpath tetap memenuhi aturan "satu dependency runtime".
- **Kontrak dengan alat luar.** Usulan: preset memiliki dan mengetes seluruh kontrak yang diandalkan alat luar seperti penjejak scenario-explorer: kunci di context, bentuk `BusinessError`, dan pola penanda utang (`TEMUAN.md`, temuan 14).
- **`Context` dan `newContext()`.** Tetap di inti atau pindah ke preset (`TEMUAN.md`, temuan 4).
- **Controller.** Apakah preset juga mengenal controller (belum dibahas).

## Dampak yang harus ditangani saat dibuat

- `metadata.mainDecorator.name` akan berisi `UseCase` atau `Gateway`, bukan `Action`. Wrapper dan alat luar yang membaca nama itu ikut berubah.
- `CLAUDE.md` bagian 4.4 dan 4.6, `README.md`, contoh `MARKERS`, dan tes arsitektur di `REVIEW_CHECKLIST.md` perlu disesuaikan.
- API publik Skeleto bertambah. Ini butuh keputusan pemilik (`CLAUDE.md` bagian 5).
