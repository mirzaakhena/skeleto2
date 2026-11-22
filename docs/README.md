# Dokumentasi praktik Skeleto

Dokumen di folder ini disusun **per komponen**: setiap berkas membahas satu hal, mulai dari definisi, alasan keberadaannya, struktur, nama dan berkas, yang boleh dan tidak boleh, sampai hubungannya dengan komponen lain.

## Status

> **Rancangan pengganti.** Folder ini disiapkan untuk menggantikan `BEST_PRACTICES.md`, `TECHNICAL_PRACTICES.md`, dan `DEVELOPMENT_PROCESS.md` (`TEMUAN.md`, temuan 13). **Sampai pemilik memutuskan penggantiannya, ketiga dokumen lama masih berlaku**, dan tes repo (`test/readme.test.ts`) masih memeriksa contoh kodenya terhadap README. Contoh kode di folder ini disalin dari dokumen lama, tetapi belum diperiksa tes.

`REVIEW_CHECKLIST.md` tidak digantikan folder ini. Ia masih memakai nomor aturan lama; tabel pemetaan di bawah menghubungkannya.

## Tujuan

Skeleto memberi kode buatan AI satu struktur standar yang dijaga mesin, supaya manusia bisa mereview dengan cepat dan bisnis bisa dibangun dari bagian yang paling penting lebih dulu.

## Dua lapis

| Lapis | Isi | Siapa yang menjaga |
| --- | --- | --- |
| **Konsep** (arsitektur) | entity, use case, gateway, controller | dokumen, reviewer, tes salinan; dua aturan antara use case dan gateway dijaga Skeleto lewat jenis bawaan `@UseCase`, `@Gateway` |
| **Mekanisme** (Skeleto) | `@UseCase`, `@Gateway`, `@Action`, `@Wrapper`, `@Config`, container | kode Skeleto, saat startup |

Hubungan keduanya:

| Konsep | Ditulis sebagai |
| --- | --- |
| Entity | tipe biasa dan fungsi murni; bukan komponen |
| Use case | `@UseCase` |
| Gateway | `@Gateway` |
| Controller | kode biasa di luar container; bukan komponen |
| Urusan lintas-use-case (transaksi, audit) | `@Wrapper`, dipilih per action lewat penanda tambahan |
| Sumber daya (koneksi, pengaturan, logger) | `@Config` |

## Pemisahan logika dan infrastruktur

- **Entity** memegang **aturan bisnis**: perhitungan, keputusan boleh atau tidak, invariant.
- **Use case** memegang **keputusan alur**: urutan langkah dan cabang menurut hasil entity atau gateway. Ia mengorkestrasi entity dan gateway, dan tidak memegang aturan bisnis.
- **Gateway** adalah **infrastruktur di sisi keluar**: I/O, database, file, HTTP keluar, dan semua yang tidak deterministik (jam, id baru, angka acak). Ia boleh berlogika teknis, tetapi tidak berisi aturan bisnis.
- **Controller** adalah **infrastruktur di sisi masuk**: menerima permintaan, memeriksa bentuk input, memanggil use case, dan menerjemahkan error.

## Lingkup

Skeleto menangani **low level design**: struktur di dalam satu aplikasi (komponen, nama, berkas, dependency, transaksi). **High level design** (pembagian sistem, layanan, broker pesan, deployment) berada di luar dokumen ini.

## Cara mereview

Review berjalan dalam dua lapis (keputusan pemilik, 2026-11-22):

| Lapis | Pertanyaan | Ditangani oleh |
| --- | --- | --- |
| 1. Kepatuhan konsep | apakah kode mengikuti struktur: jenis komponen, dependency, nama, berkas, penanda | mesin (Skeleto, tes arsitektur) dan LLM |
| 2. Logika dan requirement | apakah kode melakukan yang diminta bisnis, dan benar | sebagian LLM, sebagian reviewer manusia |

Lapis pertama dibuat semekanis mungkin, supaya waktu manusia terpakai di lapis kedua.

Aturan dibaca **per lingkup**: reviewer yang sedang membaca use case cukup menerapkan aturan di [use-case.md](konsep/use-case.md), ditambah aturan umum di [komponen.md](teknis/komponen.md). Itulah alasan dokumen dipecah per komponen.

## Daftar dokumen

| Dokumen | Isi |
| --- | --- |
| [konsep/entity.md](konsep/entity.md) | objek bisnis dan aturannya; error bisnis |
| [konsep/use-case.md](konsep/use-case.md) | operasi bisnis dan orkestrasinya; tes use case |
| [konsep/gateway.md](konsep/gateway.md) | jalan keluar; perubahan bersamaan; efek di luar penyimpanan |
| [konsep/controller.md](konsep/controller.md) | jalan masuk; penerjemahan error; container |
| [teknis/komponen.md](teknis/komponen.md) | aturan yang berlaku untuk semua komponen: dua tahap, nama, berkas, penanda, tes integrasi |
| [teknis/action.md](teknis/action.md) | `@Action`, `@UseCase`, `@Gateway` dan context |
| [teknis/wrapper.md](teknis/wrapper.md) | `@Wrapper`; transaksi; pengamat gateway |
| [teknis/config.md](teknis/config.md) | `@Config`; config asinkron |
| [teknis/use-case-gateway-bawaan.md](teknis/use-case-gateway-bawaan.md) | `@UseCase` dan `@Gateway` sebagai jenis bawaan Skeleto |
| [proses/pengembangan.md](proses/pengembangan.md) | urutan membangun aplikasi baru, Core lebih dulu |
| [proses/utang-teknis.md](proses/utang-teknis.md) | celah, stub, jalan pintas, dan kode usang |

## Cara membaca aturan

Setiap aturan punya nomor dengan awalan dokumennya (`ENT-1`, `UC-3`, `GW-6`, ...). Nomor tidak pernah dipakai ulang.

| Tingkat | Artinya |
| --- | --- |
| **Wajib** | kode yang melanggarnya salah, atau akan salah setelah perubahan berikutnya; review meminta perbaikan |
| **Opsional** | anjuran; kode yang menyimpang menuliskan alasannya |

Selain itu ada dua tanda di dalam teks:

| Tanda | Artinya |
| --- | --- |
| **Rencana, belum terealisasi di kode** | menggambarkan bentuk yang dituju; bagian "yang berlaku sekarang" di sebelahnya adalah yang harus dipakai hari ini |
| **Usulan, belum diputuskan pemilik** | belum berlaku; dicatat supaya bisa diputuskan |

## Pemetaan nomor lama ke nomor baru

| Lama | Baru | | Lama | Baru | | Lama | Baru |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B1 | DEV-2 (tingkat berubah, lihat DEV-2) | | T1 | KOM-1 | | P1 | DEV-1 |
| B2 | UC-6 | | T2 | KOM-2, CFG-3 | | P2 | DEV-3 |
| B3 | CTL-4 | | T3 | KOM-3 | | P3 | DEV-4 |
| B4 | CTL-6 | | T4 | KOM-4 | | P4 | DEV-5 |
| B5 | UC-1, GW-1, ACT-1 | | T5 | KOM-5 | | P5 | DEV-6 |
| B6 | UC-2 | | T6 | KOM-6 | | P6 | DEV-7 |
| B7 | UC-3 | | T7 | KOM-7 | | P7 | DEV-8 |
| B8 | UC-4, GW-12 | | T8 | KOM-8 | | P8 | DEV-11 |
| B9 | UC-5 | | T9 | KOM-9 | | P9 | DEV-9 |
| B10 | UC-7 | | T10 | KOM-10 | | P10 | DEV-10 |
| B11 | ENT-1 | | T11 | WRP-1 | | P11 | DEV-12 |
| B12 | ENT-2 | | T12 | WRP-2 | | P12 | DEV-14 |
| B13 | ENT-3 | | T13 | GW-5, CFG-2 | | P13 | UTG-4 |
| B14 | UC-8 | | T14 | WRP-3 | | P14 | UTG-5 |
| B15 | GW-4 | | T15 | WRP-4, GW-10 | | | |
| B16 | ENT-9 | | T16 | CFG-1 | | | |
| B17 | ENT-4 | | T17 | CTL-5 | | | |
| B18 | UC-9 | | T18 | UC-13 | | | |
| B19 | GW-3 | | T19 | UC-14 | | | |
| B20 | GW-15 | | T20 | ENT-8 | | | |
| B21 | GW-2 | | T21 | KOM-11 | | | |
| B22 | UC-10, GW-2 | | T22 | KOM-12 | | | |
| B23 | UC-11, ACT-3, tabel context di action.md | | T23 | GW-14 | | | |
| B24 | CTL-2 | | T24 | UC-15 | | | |
| B25 | ENT-5, CTL-3, UTG-2 | | T25 | UTG-1 | | | |
| B26 | CTL-3 | | T26 | WRP-6 | | | |
| B27 | CTL-1 | | T27 | UTG-3 | | | |
| B28 | UC-12, GW-6 | | | | | | |
| B29 | GW-6 | | | | | | |
| B30 | GW-7 | | | | | | |
| B31 | GW-8 | | | | | | |
| B32 | GW-13 | | | | | | |
| B33 | GW-9 | | | | | | |
| B34 | GW-10 | | | | | | |
| B35 | GW-11 | | | | | | |
| B36 | ENT-6 | | | | | | |
| B37 | ENT-7 | | | | | | |

Aturan yang dirumuskan baru dari isi lama: CFG-3 (bagian pengecualian T2), GW-12 (bagian B8, sebelumnya hanya diperiksa tes arsitektur), dan UTG-2 (bagian B25). Aturan yang tidak punya padanan lama: ACT-2, ACT-3 (keputusan pemilik tentang context), dan rencana WRP-5. DEV-13 menuliskan keputusan pemilik tentang urutan kerja di dalam satu area.
