# Controller

## Definisi

**Controller** adalah pintu masuk aplikasi: kode yang menerima permintaan dari luar lalu memanggil use case. Contohnya handler HTTP, job terjadwal, konsumen antrean, perintah CLI, dan tes.

Dokumen lama menyebutnya **caller**. Nama "controller" dipakai mulai 2026-11-21 (keputusan pemilik).

Controller bukan komponen Skeleto. Ia tidak berpenanda dan tidak masuk container. Ia mengambil use case dari container satu kali saat aplikasi dimulai, lalu memanggilnya sebagai fungsi biasa.

## Kenapa ada

Use case yang sama dipanggil lewat HTTP, oleh job terjadwal, dari antrean, dan oleh tes. Setiap jalur masuk punya urusannya sendiri: bentuk input yang datang, cara menjawab, kode status, pesan untuk pengguna. Controller menampung urusan itu supaya use case dan entity tidak pernah tahu siapa yang memanggil.

## Tempatnya dalam pemisahan logika dan infrastruktur

Controller adalah **infrastruktur di sisi masuk**, sedangkan gateway adalah infrastruktur di sisi keluar. Controller tidak memegang aturan bisnis. Ia memeriksa **bentuk** input, bukan **aturan** bisnisnya.

## Struktur

```ts
// main.ts (excerpt)
const stockTransfer: StockTransfer = container.get("StockTransfer")!.getInstance();
console.log(await stockTransfer(newContext(), { from: "north", to: "south", units: 3 }));
```

```ts
// main.ts (excerpt)
// The caller translates the kind of a business error into what its own users understand.
const answers = { validation: "rejected", not_found: "unknown", conflict: "refused", tech_debt: "not available yet" } satisfies Record<BusinessErrorKind, string>;
```

## Nama dan berkas

| Apa | Berkas |
| --- | --- |
| Awal aplikasi, yang menyalakan Skeleto dan menyerahkan use case ke controller | `main.ts` di akar proyek |
| Satu tes integrasi yang menyalakan Skeleto | `main.test.ts` di akar proyek |

> **Usulan, belum diputuskan pemilik.** Dokumen lama tidak mengatur nama dan letak berkas controller selain `main.ts`. Kalau aplikasi punya banyak controller (banyak rute HTTP, banyak job), perlu aturan nama dan folder sendiri, misalnya `src/controller/<channel>/<use case snake>.ts`. Karena controller bukan komponen, berkas itu boleh di dalam `src/` tanpa penanda, atau di luar `src/`.

## Aturan wajib

### CTL-1. Controller membuat context dan hanya memanggil use case, tidak pernah gateway

Controller yang memanggil gateway melewati setiap aturan bisnis dan setiap wrapper use case: tanpa transaksi, tanpa audit, tanpa pemeriksaan. Use case adalah seluruh yang ditawarkan aplikasi ke luar.

### CTL-2. Controller memeriksa bentuk input; aturan bisnis diperiksa entity

Ini dua pertanyaan berbeda. Apakah input berbentuk benar (bilangan di tempat bilangan, field wajib ada) bergantung pada cara input itu datang, dan hanya controller yang tahu. Apakah operasinya boleh (stok cukup, id tidak kosong) adalah pertanyaan bisnis, dan harus dijawab sama untuk setiap controller, jadi tempatnya di entity. Use case menerima Request yang sudah bertipe.

### CTL-3. Controller menerjemahkan error bisnis; entity dan use case tidak pernah menyebut transport

Use case yang berbicara tentang kode status hanya melayani satu jenis controller. Setiap controller mengubah jenis error ([entity.md](entity.md), ENT-5) menjadi jawabannya sendiri.

Untuk `tech_debt`, controller menjawab "belum tersedia", berbeda dari tiga jenis lainnya. Tiga jenis lainnya menyatakan aturan sudah diterapkan, dan mengulang panggilan yang sama tidak mengubah apa pun sampai input atau keadaannya berubah. `tech_debt` menyatakan operasinya akan ada setelah bisnis memutuskan. Controller tidak boleh menyajikannya sebagai kesalahan pengguna, sebagai sesuatu yang tidak ada, atau sebagai keadaan yang cukup ditunggu.

### CTL-4. Satu screen boleh memanggil banyak use case, dan satu use case boleh melayani banyak controller

Screen yang menampilkan stok dan menawarkan pemindahan butuh setidaknya dua use case, dan pemindahan juga diminta job dan tes. Memasangkan setiap screen dengan satu use case akan menduplikasi aturan per pemanggil, atau mengikat use case ke screen pertama yang membutuhkannya. Screen yang use case-nya belum semua dibangun sengaja belum lengkap, bukan rusak.

### CTL-5. Instance diambil dari container satu kali, saat aplikasi dimulai, dan hanya oleh awal aplikasi

Awal aplikasi mengambil setiap use case yang dibutuhkannya sekali, dengan tipenya, lalu menyerahkan fungsi bertipe itu ke controller. Tidak ada komponen yang membaca container, dan tidak ada yang membacanya per panggilan.

Container dicari dengan string dan mengembalikan instance tanpa tipe. Melakukannya sekali, di satu tempat, mengubah nama yang salah menjadi kegagalan saat startup, bukan di panggilan pertama yang membutuhkannya. Komponen yang membaca container akan menyembunyikan dependency yang tidak bisa dilihat atau diurutkan Skeleto.

## Aturan opsional

### CTL-6. Tampilan yang butuh data yang dikumpulkan untuk satu screen dilayani di sisi controller, atau oleh use case query tersendiri, bukan dengan mengubah use case yang sudah ada

Membengkokkan use case yang sudah ada supaya memberi satu screen data yang diinginkannya memasukkan bentuk screen ke kontrak setiap pemanggil lain (UC-6). Mengumpulkan data di sisi controller, dari use case yang sudah ada, membiarkan use case itu apa adanya. Kalau pengumpulan itu sendiri pertanyaan bisnis yang ditanyakan lebih dari satu pemanggil, ia menjadi use case query tersendiri.

## Hubungan dengan komponen lain

| Dengan | Hubungannya |
| --- | --- |
| Use case | satu-satunya yang dipanggil controller |
| Gateway | tidak pernah dipanggil langsung |
| Entity | tidak disentuh; controller menerima Response use case |
| Context | dibuat controller dengan `newContext()`, beserta apa yang mengenali panggilan, misalnya trace id |
| Container | dibaca sekali oleh awal aplikasi (CTL-5) |
| Skeleto | tidak mengenal controller |

## Status implementasi

Controller tidak bergantung pada preset. Dokumen ini belum memutuskan apakah preset kelak akan mengenal controller. Semua aturan di sini dijaga reviewer.
