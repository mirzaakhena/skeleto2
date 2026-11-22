---
name: skeleto
description: Membangun, mengubah, atau mereview aplikasi TypeScript di atas Skeleto, framework binding yang merangkai fungsi bertanda JSDoc @Config, @Wrapper, @UseCase, dan @Gateway. Pakai saat pengguna ingin memulai aplikasi baru dengan Skeleto dari sebuah cerita, sedang mewawancarai atau merancang area bisnis, use case, entity, gateway, glosarium, atau peta skenario untuk aplikasi Skeleto, menulis atau mengubah kode di repo yang memakai paket `skeleto`, atau mereview perubahan di repo seperti itu.
---

# Skeleto

Skeleto memberi kode buatan AI **satu struktur standar yang dijaga mesin**, supaya manusia bisa mereview dengan cepat dan bisnis dibangun dari bagian yang paling penting lebih dulu. Skill ini pintu masuknya. Aturannya tidak ditulis di sini: semuanya ada di `docs/`, dan berkas di folder ini menautkan ke sana.

| Berkas di folder skill ini | Isinya |
| --- | --- |
| [docs/README.md](docs/README.md) | peta dokumen aturan; baca lebih dulu |
| [docs/](docs/) | **satu-satunya rangkaian aturan** untuk aplikasi; setiap aturan bernomor (`DEV-1`, `UC-9`, `GW-6`, ...) |
| [REVIEW_CHECKLIST.md](REVIEW_CHECKLIST.md) | semua aturan dalam satu daftar, tingkatnya, siapa yang memeriksanya, dan tes celah untuk disalin |
| [README.md](README.md) | API Skeleto dan **satu-satunya contoh lengkap yang bisa dijalankan** (bagian *Example*) |
| [scripts/install.sh](scripts/install.sh) | memasang paket Skeleto ke aplikasi |

Kalau isi skill ini berbeda dengan `docs/`, yang berlaku `docs/`.

## Tentukan dulu situasinya

| Situasi | Mulai dari |
| --- | --- |
| Aplikasi baru, atau bagian besar baru | [docs/proses/pengembangan.md](docs/proses/pengembangan.md), dari DEV-1. **Belum ada kode** sampai kedua gerbang dan rancangan Core selesai (DEV-11). |
| Mengubah aplikasi yang sudah ada | use case yang disentuh perubahan itu; baca aturan sesuai lingkup di tabel berikut |
| Mereview perubahan | [REVIEW_CHECKLIST.md](REVIEW_CHECKLIST.md): cara mereview dan format temuan ada di bagian atasnya |

## Apa yang dibaca untuk apa

Aturan dibaca **per lingkup**: yang menulis use case membaca aturan use case, ditambah aturan umum di `komponen.md`. Tidak perlu membaca semuanya sekaligus.

| Sedang mengerjakan | Baca |
| --- | --- |
| Wawancara, klasifikasi area, glosarium, rancangan Core, peta skenario, urutan kerja | [docs/proses/pengembangan.md](docs/proses/pengembangan.md) |
| Objek bisnis, aturannya, error bisnis | [docs/konsep/entity.md](docs/konsep/entity.md) |
| Operasi bisnis dan tesnya | [docs/konsep/use-case.md](docs/konsep/use-case.md), [docs/teknis/action.md](docs/teknis/action.md) |
| Database, layanan luar, jam, id baru, perubahan bersamaan | [docs/konsep/gateway.md](docs/konsep/gateway.md), [docs/teknis/action.md](docs/teknis/action.md) |
| HTTP, CLI, job: jalan masuk ke use case | [docs/konsep/controller.md](docs/konsep/controller.md) |
| Nama, berkas, penanda, tes integrasi (berlaku untuk semua komponen) | [docs/teknis/komponen.md](docs/teknis/komponen.md) |
| Transaksi, audit, pengamat: urusan lintas use case | [docs/teknis/wrapper.md](docs/teknis/wrapper.md) |
| Koneksi, pengaturan, logger | [docs/teknis/config.md](docs/teknis/config.md) |
| Kenapa use case dan gateway adalah jenis bawaan | [docs/teknis/use-case-gateway-bawaan.md](docs/teknis/use-case-gateway-bawaan.md) |
| Celah, stub, jalan pintas, kode usang | [docs/proses/utang-teknis.md](docs/proses/utang-teknis.md) |

## Yang tidak boleh dilupakan

Ringkasan ini hanya pengingat; aturannya, alasannya, dan contohnya ada di dokumen yang disebut.

- **Pemilik yang memutuskan.** Agent mengusulkan; klasifikasi area, istilah, dan rancangan Core baru berlaku setelah pemilik menerimanya, dan keputusannya dicatat di berkas, bukan di percakapan (DEV-4, DEV-5, DEV-9).
- **Jangan mengarang aturan bisnis.** Kondisi yang belum dijawab pemilik ditulis sebagai **celah** di peta skenario dan menjadi pertanyaan wawancara berikutnya, bukan cabang tebakan (DEV-10).
- **Screen hanya petunjuk.** Terima screen dan mockup sebagai bahan, lalu gali use case di baliknya (DEV-2).
- **Core lebih dulu, satu use case setiap kali** (DEV-7, DEV-11, DEV-13). Area lain hanya sejauh dibutuhkan utang Core yang tercatat (DEV-12).
- **Satu garis lurus:** controller -> use case -> gateway -> config. Use case hanya bergantung pada gateway, gateway hanya pada config. Skeleto menolak yang lain saat startup.
- **Berkas di repo aplikasi**, dengan nama dan letak tetap: `docs/AREAS.md`, `docs/GLOSSARY.md`, `docs/CORE.md`, `docs/scenarios/<process>.json`.
- **Ikuti contoh di [README.md](README.md)** untuk bentuk berkas, nama (`impl<Nama>`), letak (`src/entity/`, `src/gateway/`, `src/usecase/<area>/`, `src/wrappers.ts`, `main.ts`), dan tes (`main.test.ts`, tes celah dari REVIEW_CHECKLIST.md).
- **Kutip aturan dengan nomornya** saat menjelaskan keputusan kepada pemilik atau menulis temuan review.

## Memasang Skeleto ke aplikasi

Jalankan dari akar repo aplikasi, setelah rancangan Core disepakati (DEV-11):

```sh
sh ~/.claude/skills/skeleto/scripts/install.sh
```

Skrip itu membangun Skeleto dari repo tempat skill ini berada, mengemasnya ke `vendor/skeleto-<versi>.tgz`, memasangnya, lalu memasang `tsx`, `typescript`, dan `@types/node` sebagai devDependency. Aplikasi dijalankan dengan `tsx`, karena Skeleto memindai berkas `.ts` apa adanya (README, bagian *Runtime*). Pakai TypeScript `strict`, ESM, dan `module`/`moduleResolution` `NodeNext`, seperti contoh di README.

## Sebelum menyatakan selesai

- Aplikasi menyala: `Skeleto.start` melaporkan semua kesalahan struktur sekaligus, sebelum berkas aplikasi diimpor. Kesalahan itu diperbaiki, bukan diakali.
- Tes lulus, termasuk tes integrasi (KOM-11) dan tes celah (REVIEW_CHECKLIST.md, bagian *Tes celah*).
- Setiap celah dan stub yang ditinggalkan punya penanda utang ([docs/proses/utang-teknis.md](docs/proses/utang-teknis.md)).
