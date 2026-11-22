# Temuan peninjauan konsep

Catatan hasil mengulik ulang Skeleto terhadap konsep dasarnya (`CLAUDE.md` bagian 1–2). Setiap butir berisi apa yang ditemukan, letaknya, dan kenapa layak dibahas. Butir di sini **belum** keputusan; statusnya diisi setelah dibahas dengan pemilik.

Dimulai: 2026-11-21.

| No | Temuan | Status |
| --- | --- | --- |
| 1 | Ukuran inti di atas patokan | ditunda pemilik (2026-11-22); ingatkan lagi |
| 2 | Dokumen praktik di luar "hanya binding" | ditutup (2026-11-22): bagian dari tujuan |
| 3 | README memuat konsep bisnis | ditutup (2026-11-22): bagian dari tujuan |
| 4 | `Context` dan `newContext()` di API publik | diputuskan: tetap di inti, sebagai metadata; ditulis sebagai ACT-3 |
| 5 | Tujuan sebenarnya tidak tertulis di mana pun | diputuskan: 11 tujuan disetujui; ditulis di `CLAUDE.md` |
| 6 | Pembaca kodenya tetap manusia | dijawab pemilik: review dua lapis |
| 7 | Belum ada jalur resmi untuk optimisasi | diputuskan: optimisasi dipimpin manusia; ditulis di GW-13 dan ENT-7 |
| 8 | Urutan menulis kode di dalam Core tidak tertulis | diputuskan; ditulis sebagai DEV-13 (termasuk syarat kerja paralel) |
| 9 | Jumlah aturan sangat besar dibanding kodenya | dijawab pemilik: aturan dibaca per lingkup dokumen |
| 10 | Pemisahan kode infrastruktur dan kode logika tidak dinyatakan sebagai prinsip | lima poin diterima pemilik |
| 11 | B1: screen adalah petunjuk, bukan larangan | arahan pemilik; ditulis sebagai DEV-2 di `docs/` |
| 12 | `@UseCase` dan `@Gateway` sebagai jenis khusus `@Action` | selesai: diimplementasi lewat tiket 261122101201 (main `bcdb4e0`) |
| 13 | Satu dokumen per komponen, dibuat baru | selesai: `docs/` satu-satunya sumber aturan (`a7b7917`) |
| 14 | Kontrak tak tertulis antara Skeleto dan penjejak scenario-explorer | pemilik ingin diteliti lebih dalam |
| 15 | Celah di praktik transaksi dan locking, dan urusan lintas-use-case lain yang belum diatur | dicatat; dibahas lain waktu |
| 16 | Proses pengembangan ditulis berurutan, padahal penemuan berjalan bersamaan | disetujui; ditulis di `pengembangan.md`; bounded context belum diputuskan |
| 17 | Definisi Core, Supporting, Generic menurut pemilik berbeda dari yang tertulis | diputuskan; ditulis di DEV-3 dan DEV-14 |
| 18 | Aturan dependency use case dan gateway lebih ketat: use case → gateway saja, gateway → config saja | selesai: main `78d4ab8` (tiket 261122113801) |
| 19 | Hasil review independen kode dan aturan (main `78d4ab8`) | selesai: tiga tiket digabung (`299895a`, `cd2e5a3`, `a7b7917`) |

---

## 1. Ukuran inti di atas patokan

- **Fakta:** `src/` sekarang 468 baris (`scanner.ts` 186, `skeleto.ts` 124, `decorator.ts` 58, `type.ts` 51, `dependency.ts` 46, `index.ts` 3). Patokannya sekitar 400.
- **Kenapa dibahas:** patokan ini bukan batas, tetapi alasan untuk bertanya "kenapa ini harus ada di framework?". Kelebihan sekitar 17% layak ditelusuri: bagian mana yang tumbuh dan apakah semuanya memang milik framework.

## 2. Dokumen praktik di luar "hanya binding"

- **Fakta:** selain `README.md` dan `CLAUDE.md`, repo memuat `BEST_PRACTICES.md`, `TECHNICAL_PRACTICES.md`, `DEVELOPMENT_PROCESS.md`, dan `REVIEW_CHECKLIST.md`. README merujuk keempatnya. Isinya mencakup cara menyusun aplikasi (use case per berkas, aturan bisnis di entity), proses pengembangan (Core lebih dulu), serta tes arsitektur dan tes celah untuk disalin.
- **Kenapa dibahas:** prinsip lite menyatakan Skeleto tidak tahu apa pun di luar binding. Dokumen-dokumen ini tidak menambah kode, tetapi menjadikan repo framework sekaligus panduan arsitektur aplikasi dan proses kerja. Perlu diputuskan apakah semuanya memang milik repo ini atau lebih tepat dipindah ke repo atau paket terpisah.

## 3. README memuat konsep bisnis

- **Fakta:** contoh di README (pemindahan stok antargudang) memuat `BusinessError` dengan `kind` `"validation" | "not_found" | "conflict" | "tech_debt"` dan field `gap`.
- **Kenapa dibahas:** contoh yang kaya konsep aplikasi membuat pembaca bisa mengira konsep itu bagian dari Skeleto. Contoh untuk framework yang "hanya binding" mungkin cukup menunjukkan config, wrapper, dan action.

## 4. `Context` dan `newContext()` di API publik

- **Fakta:** `src/type.ts` mendefinisikan `Context` (`data`, `traceId`, `date`) dan `newContext()`, keduanya diekspor `src/index.ts`. `ActionHandler` ditetapkan sebagai `(ctx: Context, request) => Promise<response>`. README memakai keduanya.
- **Kenapa dibahas:** `traceId` dan "satu permintaan" adalah konsep eksekusi permintaan, bukan binding. Skeleto sendiri tidak pernah membuat atau membaca `Context`; ia hanya mewajibkan bentuknya lewat tipe. Ini bertentangan dengan semangat "tidak tahu apa pun tentang request". Di sisi lain, ini bagian API publik (`CLAUDE.md` bagian 5), jadi mengubahnya butuh keputusan pemilik dan merusak kode pemakai.

- **Catatan setelah membaca scenario-explorer (2026-11-21):** `Context.data` ternyata dipakai sebagai saluran antara aplikasi dan alat luar (`ctx.data.gatewayObserver`, `ctx.data.transaction`, `ctx.data.afterCommit`; lihat temuan 14). Jadi `Context` bukan sisa yang tidak sengaja. Pertanyaannya bergeser: apakah konsep ini milik inti, atau milik preset clean architecture (temuan 12).

## 5. Tujuan sebenarnya tidak tertulis di mana pun

- **Fakta:** pemilik menyatakan (2026-11-21) bahwa tujuan Skeleto adalah **konsistensi struktur kode**: karena kode ditulis AI yang tidak deterministik, harus ada satu struktur pegangan standar supaya developer bisa mereview dengan cepat tanpa mempelajari struktur dari awal. Strukturnya tidak harus yang ini; yang penting ada satu standar. Tujuan ini tidak tercantum di `CLAUDE.md` maupun `README.md`. `CLAUDE.md` bagian 1 hanya menjelaskan *apa* yang dikerjakan (binding), bukan *untuk apa*.
- **Kenapa dibahas:** setiap sesi AI membaca `CLAUDE.md` dan mengambil keputusan dari sana. Tanpa tujuan tertulis, AI menilai setiap perubahan dengan ukuran "apakah ini binding?", bukan "apakah ini membuat struktur lebih seragam dan mudah direview?". Kemungkinan inilah sumber arah pengembangan yang terasa melenceng.
- **Daftar tujuan (disusun bersama pemilik, 2026-11-21, belum final):**
  1. Merangkai kode secara otomatis (binding dengan dependency injection).
  2. Menjaga kode mudah dibaca lewat struktur yang konsisten dan konsep yang teruji (clean architecture).
  3. Memandu proses dan tahapan pengembangan.
  4. Menunjukkan bagian mana yang layak didahulukan (Core lebih dulu).
  5. Menjadi pagar otomatis bagi kode buatan AI: pelanggaran struktur ditolak mesin saat startup, bukan bergantung pada ketelitian reviewer.
  6. Mempercepat review: setiap berkas punya peran yang jelas, jadi reviewer tahu harus mencari apa dan di mana.
  7. Memisahkan logika dari infrastruktur, supaya aturan bisnis bisa dites tanpa database atau jaringan, dan infrastruktur bisa diganti tanpa menyentuh logika.
  8. Menjadikan pekerjaan yang belum selesai terlihat: celah, stub, dan utang ditandai dan bisa dihitung.
  9. Menyimpan keputusan dan bahasa bisnis di repo (`AREAS.md`, `GLOSSARY.md`, `CORE.md`), bukan di percakapan.
  10. Memungkinkan frontend dan backend dikerjakan bersamaan lewat kontrak use case.
  11. Membuat aplikasi bisa dibaca dan diamati alat lain (container, metadata, observer).
- **Akibat bagi temuan 2 dan 3:** dengan tujuan ini, dokumen praktik dan contoh README bisa jadi bukan penyimpangan, melainkan bagian terpenting, karena merekalah yang mendefinisikan struktur standarnya. Yang perlu diputuskan bukan "buang atau tidak", tetapi di mana batasnya: aturan mana yang dijaga **mesin** (kode Skeleto, gagal saat startup) dan mana yang hanya **tulisan** (dokumen, dijaga reviewer).

## 6. Pembaca kodenya tetap manusia

- **Fakta:** pemilik menyatakan (2026-11-21) bahwa Skeleto lahir dari clean architecture untuk menyeragamkan kode tim. Struktur itu terlalu rumit bagi pemula, tetapi sekarang penulisnya AI, sehingga biaya belajar dianggap hilang.
- **Kenapa dibahas:** biaya belajar penulis memang hilang, tetapi **reviewer tetap manusia**. Clean architecture menghasilkan lebih banyak berkas dan lapisan per fitur, dan setiap berkas tambahan harus dibaca reviewer. Biayanya berpindah dari *menulis* ke *membaca*. Struktur standar ini perlu dinilai juga dari sisi reviewer: berapa banyak yang harus dibaca untuk satu fitur, dan apakah polanya bisa dikenali sekilas.

## 7. Belum ada jalur resmi untuk optimisasi

- **Fakta:** pemilik menghindari premature optimization: yang penting logikanya benar, optimisasi belakangan, misalnya satu gateway dengan satu query gabungan menggantikan bolak-balik use case dan gateway. Dokumen praktik tidak memuat kata "optimization" atau "performance" sama sekali. Satu aturan malah secara tegas menutup satu jenis optimisasi: `BEST_PRACTICES.md` B37 menyatakan query yang menyaring status turunan "does not add a status column to answer the query faster".
- **Kenapa dibahas:** menunda optimisasi itu tepat. Masalahnya, saat optimisasi akhirnya dibutuhkan, tidak ada aturan tentang **bentuk** kode yang dioptimasi. AI akan mengarang bentuknya sendiri, dan setiap optimisasi menjadi pengecualian yang berbeda. Akibatnya konsistensi, yaitu tujuan utamanya (temuan 5), justru rusak di bagian yang paling perlu direview dengan teliti. Perlu ada aturan seperti "optimisasi dilakukan di dalam gateway, kontrak tetap sama, dan diberi tanda X", supaya kode yang sudah dioptimasi pun tetap berpola.

## 8. Urutan menulis kode di dalam Core tidak tertulis

- **Fakta:** `DEVELOPMENT_PROCESS.md` mengatur urutan proses dengan rinci (P1–P14: wawancara, `AREAS.md`, `GLOSSARY.md`, `CORE.md`, scenario map, lalu kode). Untuk kodenya sendiri, P8 hanya menulis "its entities, its use cases and their tests". Urutan yang lebih rinci (entity → kontrak gateway → use case + tes dengan fake → dummy gateway → wrapper dan config → start dan tes integrasi) hanya bisa **disimpulkan** dari aturan B dan T yang tersebar, tidak tertulis sebagai urutan.
- **Kenapa dibahas:** tujuan utamanya konsistensi (temuan 5). Kalau urutan menulis kode tidak tertulis, dua sesi AI bisa memulai dari ujung yang berbeda, misalnya satu dari gateway dan satu dari use case. Hasil akhirnya mungkin sama bentuknya, tetapi riwayat perubahan dan potongan yang direview akan berbeda.

- **Usulan urutan (dibahas 2026-11-21, belum diputuskan):** rancang dari atas, bangun dari bawah, satu use case setiap kali:
  1. tulis **kontrak use case** (Request, Response, kontrak gateway yang dibutuhkan) dan sketsa alurnya, dari scenario map;
  2. tulis **fungsi entity** yang dibutuhkan alur itu, beserta tesnya;
  3. tulis **`impl` use case** beserta tesnya dengan fake.

  Alasannya: use case menunjukkan aturan entity mana yang benar-benar dibutuhkan, sehingga tidak ada fungsi entity yang dibuat "untuk jaga-jaga". Entity tetap ditulis sebelum `impl` use case karena use case memanggilnya. Ini sedikit berbeda dari P8 ("its entities, its use cases and their tests"), yang terbaca seperti semua entity lebih dulu.

## 9. Jumlah aturan sangat besar dibanding kodenya

- **Fakta:** ada 78 aturan bernomor (B 37, T 27, P 14) dalam sekitar 1.150 baris dokumen praktik, ditambah `REVIEW_CHECKLIST.md` (255 baris). Kode framework-nya 468 baris. `DEVELOPMENT_PROCESS.md` mewajibkan enam artefak dokumen di repo aplikasi (`AREAS.md`, `GLOSSARY.md`, `CORE.md`, `docs/scenarios/*.json`, penanda utang T25, tes celah T27) sebelum dan selama menulis kode.
- **Kenapa dibahas:** bagi AI, jumlah ini bukan masalah. Bagi reviewer manusia (temuan 6), 78 aturan terlalu banyak untuk diingat saat mereview. Kalau reviewer tidak bisa memegang standarnya di kepala, review cepat (tujuan temuan 5) tidak tercapai. Perlu dipilah: aturan mana yang inti (sedikit, dihafal reviewer), mana yang bisa dijaga mesin (tes arsitektur, Skeleto), dan mana yang cukup menjadi rujukan.

## 10. Pemisahan kode infrastruktur dan kode logika tidak dinyatakan sebagai prinsip

- **Pernyataan pemilik (2026-11-21):** kode infrastruktur (I/O, database, file, HTTP) hidup di gateway; kode logika (algoritma, perhitungan, keputusan) hidup di use case dan entity; use case adalah orkestrator entity dan gateway.
- **Fakta:** isinya tersebar di beberapa aturan (B7 use case hanya mengatur alur, B21 semua yang di luar proses lewat gateway, B22 nilai tak terduga lewat gateway, B15 gateway baca tanpa aturan bisnis, B17 entity tidak mengimpor apa pun di luar entity). Kata "infrastructure" hanya muncul sekali (B36), dan kata "logic" tidak muncul. Tidak ada satu kalimat prinsip yang menjadi induk aturan-aturan itu.
- **Yang belum tercakup atau berbeda dari pernyataan pemilik:**
  1. **Logika di use case.** Dokumen (B7) lebih ketat: aturan bisnis hanya di entity, dan use case "decides nothing". Perlu dibedakan **aturan bisnis** (entity) dari **keputusan alur** (use case: urutan langkah, cabang menurut hasil entity atau gateway).
  2. **Nilai tak terduga** (jam, id baru, angka acak) bukan I/O, tetapi tetap harus lewat gateway (B22). Batasnya lebih tepat disebut "tidak deterministik", bukan "I/O".
  3. **HTTP masuk bukan gateway.** Gateway adalah jalan *keluar* (memanggil sesuatu). Server HTTP, job, dan CLI adalah *caller* (B27): membuat context, memeriksa bentuk input (B24), menerjemahkan error (B26), dan memanggil use case.
  4. **Gateway boleh berlogika teknis.** Contohnya pemetaan data, query, penguncian (B29), dan optimisasi (temuan 7). Yang dilarang hanya aturan bisnis.
  5. **Wrapper dan config tidak disebut.** Infrastruktur lintas-action (transaksi, logging) hidup di wrapper, dan sumber daya (koneksi, pengaturan) hidup di config.
- **Tanggapan pemilik (2026-11-21):** kelima poin diterima. Rumusan prinsip yang pertama diusulkan mencampur konsep (gateway, use case, entity) dengan mekanisme Skeleto (action, wrapper, config). Rumusan dua lapis:
  - **Lapis konsep (arsitektur):** *caller* adalah pintu masuk; *use case* mengatur alur; *entity* memegang aturan bisnis; *gateway* menjangkau dunia luar dan semua yang tidak deterministik. Urusan lintas-use-case (transaksi, logging) dan sumber daya (koneksi, pengaturan) adalah infrastruktur di luar keempatnya.
  - **Lapis mekanisme (Skeleto):** use case dan gateway ditulis sebagai `@Action`; urusan lintas-use-case sebagai `@Wrapper`; sumber daya sebagai `@Config`; entity dan caller bukan komponen.

## 11. B1: screen adalah petunjuk, bukan larangan

- **Pernyataan pemilik (2026-11-21):** isi B1 benar, tetapi manusia hampir selalu menjelaskan kebutuhannya lewat screen ("saya ingin yang seperti ini"). Banyak orang awam juga berpikir "kalau screennya selesai, aplikasinya selesai". Screen hanya memberi petunjuk.
- **Fakta:** B1 berbunyi "Start from the list of use cases, not from the list of screens" (Optional). Penjelasan gunung es di bagian "Built from use cases" sudah ada, tetapi ditujukan kepada agent dan pembaca teknis.
- **Usulan:** B1 dirumuskan sebagai **petunjuk kerja**: terima screen sebagai bahan, gali use case dari setiap screen (apa yang diputuskan, apa yang bisa gagal, siapa lagi yang memanggil), lalu tunjukkan kepada pemilik bahwa screen hanya puncak gunung es. Perlu juga penjelasan untuk orang awam (bukan untuk agent) bahwa screen yang selesai belum berarti aplikasi selesai.

## 12. `@UseCase` dan `@Gateway` sebagai jenis khusus `@Action`

- **Usulan pemilik (2026-11-21):** `@UseCase` dan `@Gateway` menjadi jenis khusus `@Action`, sehingga tidak perlu menulis `@Action` bersama `@UseCase` atau `@Gateway` (B5). `@Action` tetap ada untuk yang tidak memakai konsep use case dan gateway.
- **Fakta:** sekarang Skeleto hanya mengenal tiga penanda utama, `ALLOWED_DEPENDENCIES` di `src/skeleto.ts` berisi tiga jenis itu, dan `BEST_PRACTICES.md` menyatakan Skeleto tidak tahu apa pun tentang use case dan gateway. B8 (use case tidak bergantung pada use case) dan B18 hanya dijaga dokumen dan tes arsitektur salinan.
- **Tanggapan:** idenya bagus, karena aturan yang sekarang hanya tertulis bisa dijaga mesin: use case tidak boleh bergantung pada use case (B8), gateway tidak boleh bergantung pada use case, dan setiap action harus salah satu dari dua (B5). Ada dua cara:
  1. **Ditanam di Skeleto** (`@UseCase` dan `@Gateway` menjadi penanda utama bawaan). Paling sederhana dipakai, tetapi memasukkan konsep clean architecture ke inti dan melanggar prinsip "tidak tahu use case" yang tertulis.
  2. **Didefinisikan aplikasi lewat opsi**, misalnya `kinds: { UseCase: { is: "Action", dependsOn: ["Config", "Gateway"] }, Gateway: { is: "Action", dependsOn: ["Config", "Gateway"] } }`. Inti tetap netral, aturan dependency bisa dipilih aplikasi, dan konsep clean architecture menjadi preset yang ditulis di dokumen. Biayanya, inti bertambah besar dan API publik berubah.
- **Fakta tambahan (diperiksa 2026-11-21):** di `src/` tidak ada satu baris pun yang menyebut `UseCase` atau `Gateway`. Bagi Skeleto keduanya hanya penanda tambahan biasa di `additionalDecorators`. Semua "logika" untuk keduanya ada di sisi aplikasi, sebagai kode yang **disalin** oleh setiap aplikasi:
  - `REVIEW_CHECKLIST.md`, bagian "The architecture test": tes yang menyalakan Skeleto lalu memeriksa container untuk B5 (tepat satu dari `@UseCase`/`@Gateway`), B8 (use case tidak bergantung pada use case), dan gateway yang tidak boleh bergantung pada use case. Tes ini hanya berjalan saat tes dijalankan.
  - `REVIEW_CHECKLIST.md`: `implUseCaseWrapper` (Optional), sebuah wrapper yang menghentikan startup kalau B8 dilanggar. Ini memakai wrapper sebagai alat validasi. Akibatnya pelanggaran baru ketahuan **setelah** berkas aplikasi diimpor dan config dibuat, bertentangan dengan semangat "gagal sebelum impor". Cara ini juga bergantung pada urutan pembuatan internal Skeleto.
  - README: `implGatewayWrapper` membaca penanda `@Gateway` untuk observer.
  - `test/readme.test.ts` menguji semua salinan di atas.
- **Akibat:** aturan inti clean architecture dijaga oleh kode salinan yang bisa lupa disalin, diubah, atau tertinggal versinya. Ini memperkuat alasan usulan pemilik: kalau Skeleto mengenal jenisnya (cara 1 atau 2), ketiga pemeriksaan itu berpindah ke inti dan dilaporkan sebelum impor bersama kesalahan lain.
- **Arah pemilik (2026-11-21):** `@UseCase` dan `@Gateway` diperkenalkan langsung di Skeleto sebagai **paket bawaan tambahan**. Ini jalan tengah antara cara 1 dan 2: inti tetap netral dengan mekanisme umum (cara 2), dan Skeleto ikut mengirim satu preset siap pakai untuk clean architecture, misalnya `import { cleanArchitecture } from "skeleto/clean"` lalu `Skeleto.start("src", { ...cleanArchitecture })`. Yang perlu diputuskan nanti:
  - preset ini **opt-in** (harus dipasang) atau aktif bawaan. Usulan: opt-in, supaya `@Action` polos tetap berjalan untuk yang tidak memakai konsep ini;
  - isi preset: hanya jenis dan aturan dependency-nya (B5, B8, gateway tidak bergantung pada use case), atau juga wrapper siap pakai (transaksi, observer gateway);
  - bentuknya: subpath export di paket yang sama (`skeleto/clean`) atau paket npm terpisah. Subpath tetap memenuhi aturan "satu dependency runtime".
- **Dampak yang perlu diperiksa:** `mainDecorator.name` akan berisi `UseCase` atau `Gateway`, bukan `Action`, sehingga wrapper dan alat luar yang membaca nama itu ikut berubah. `CLAUDE.md` bagian 4.4 dan 4.6, README, B5, dan tes arsitektur di `REVIEW_CHECKLIST.md` perlu disesuaikan.

## 13. Satu dokumen per komponen, dibuat baru

- **Pernyataan pemilik (2026-11-21):** `BEST_PRACTICES.md` mencampur banyak konsep, Mandatory dan Optional, serta semua komponen dalam satu dokumen. Lebih baik satu berkas per komponen (misalnya gateway), yang membahas definisi, alasan keberadaannya, struktur, konvensi nama komponen, nama berkas, yang boleh dan tidak boleh, dan hubungannya dengan komponen lain.
- **Fakta:** nomor aturan (`B5`, `T25`, `P13`, ...) dirujuk di `DEVELOPMENT_PROCESS.md`, `TECHNICAL_PRACTICES.md`, `REVIEW_CHECKLIST.md`, `test/readme.test.ts`, dan banyak tiket `.kerjaan2/`. Karena itu pemilik memilih membuat dokumen baru daripada mengubah yang ada.
- **Catatan:** saat dokumen baru dibuat, perlu diputuskan nasib dokumen lama (dibekukan, diberi tanda usang, atau dipetakan nomor lama ke bagian baru). Kalau tidak, akan ada dua sumber aturan, dan AI bisa memakai yang mana saja. Itu bertentangan dengan tujuan konsistensi.
- **Status:** ditunda atas keputusan pemilik; dicatat dulu.
- **Pembaruan (2026-11-21):** atas permintaan pemilik, rancangan pengganti dibuat di `docs/` (bahasa Indonesia; konsep, teknis, proses; dengan tabel pemetaan nomor lama ke baru di `docs/README.md`). Dokumen lama tidak diubah dan masih berlaku sampai pemilik memutuskan. Rencana preset ditulis sebagai konsep dan ditandai "belum terealisasi"; temuan yang belum diputuskan ditandai "usulan". Contoh kode di `docs/` belum diperiksa tes seperti contoh di dokumen lama.
- **Catatan untuk temuan 9:** jumlah aturan bernomor naik dari 78 menjadi 87. Sebagian besar karena satu aturan lama dipecah ke dua dokumen (misalnya B5 menjadi UC-1, GW-1, ACT-1), dan sebagian karena aturan yang sebelumnya hanya ada di tes (GW-12) atau aturan usulan baru (WRP-5, DEV-13). Per dokumen, reviewer hanya perlu memegang 2 sampai 15 aturan.

## 14. Kontrak tak tertulis antara Skeleto dan penjejak scenario-explorer

- **Fakta:** repo `~/Workspace/scenario-explorer` berisi dua bagian:
  - **Engine peta skenario** (`engine/`, `schema/`, `bin/`, skill `scenario-explorer`). Peta interaktif satu proses bisnis: state, pilihan per aktor, waktu, dan celah (`pos`, `cabang`, `celah`, `ditunda`). Tanpa dependency dan tidak tahu Skeleto. Inilah alat untuk P10 (`docs/scenarios/<proses>.json`, array `gaps`).
  - **Penjejak use case** (`tracer/`, sekitar 1.800 baris TypeScript). Menjalankan use case sungguhan dari container Skeleto, menggambar diagram urutan (input, panggilan gateway, begin/commit/rollback, efek setelah commit, output atau error), merekam dan memutar ulang jawaban gateway, dan menjalankan pilihan peta yang bertautan ke use case untuk menghitung cakupan (dekat dengan definisi "selesai" P12). Ia memakai Skeleto (`vendor/skeleto-0.1.0.tgz`, peer `>=0.1.0`) dan ts-morph.
- **Hubungannya:** peta menunjukkan apa yang *seharusnya* terjadi; penjejak menunjukkan apa yang *benar-benar* terjadi di kode Skeleto. Bersama Skeleto, keduanya membentuk rangkaian: rancang proses (peta) → tulis kode (Skeleto) → buktikan kode sesuai peta (penjejak).
- **Masalah:** `TECHNICAL_PRACTICES.md`, bagian "What a tool outside the application may rely on", menjamin hanya container, metadata, nama komponen, penanda `@UseCase`/`@Gateway`, dan `ctx.data.gatewayObserver`, lalu menyatakan "A tool takes nothing else from the application". Penjejak ternyata bergantung pada lebih banyak hal:
  - `ctx.data.transaction` (dengan `commit()`/`rollback()`) dan `ctx.data.afterCommit` dari wrapper transaksi;
  - bentuk `BusinessError` (`name`, `kind`, `gap`) dan jenisnya;
  - pola teks penanda utang T25 di kode;
  - alias tipe `type X = ActionHandler<Input, Output>`, yang dibaca isinya dengan ts-morph;
  - wrapper pengamat T26 yang disalin aplikasi.
- **Kenapa dibahas:** kontrak ini tersebar di tiga tempat (dokumen Skeleto, README penjejak, kode salinan aplikasi), dan sebagian tidak tertulis di sisi Skeleto. Perubahan kecil di dokumen Skeleto, misalnya nama field di context, bisa merusak penjejak tanpa ada tes yang gagal di repo Skeleto. Ini juga menjelaskan asal temuan 3 dan 4: `BusinessError`, `kind`/`gap`, dan `Context` ada karena dibutuhkan rangkaian alat ini. Kalau preset clean architecture jadi dibuat (temuan 12), kontrak ini sebaiknya dimiliki preset itu: satu tempat, tertulis, dan dites.

## 15. Celah di praktik transaksi dan locking, dan urusan lintas-use-case lain yang belum diatur

- **Fakta:** inti Skeleto tidak menangani transaksi maupun locking sama sekali (tidak ada kode tentang keduanya di `src/`). Transaksi ditangani wrapper contoh (WRP-2 sampai WRP-4, dulu T12–T15). Locking adalah tanggung jawab gateway (GW-6 sampai GW-8 dan GW-13, dulu B28–B32). Contoh README memakai kunci di memori yang tidak re-entrant, diambil terurut menurut id, yang di database setara `SELECT ... FOR UPDATE`.
- **Yang belum diatur di praktik transaksi dan locking:**
  1. **Percobaan ulang setelah `conflict` atau deadlock.** Dulu B29 hanya menyebut "its caller may retry from the start". Tidak ditetapkan siapa yang mengulang (controller atau wrapper), berapa kali, dan untuk use case apa saja.
  2. **Batas waktu kunci dan transaksi.** Kunci yang menunggu tanpa batas membuat permintaan menggantung. Hanya config asinkron saat startup yang diatur batas waktunya (CFG-1).
  3. **Pilihan antara kunci pesimis dan versi (optimis).** Keduanya disebut sebagai contoh, tetapi tidak ada panduan kapan memakai yang mana.
  4. **Tingkat isolasi transaksi** tidak disebut.
  5. **Panggilan lambat di dalam transaksi.** Efek luar sudah diatur (setelah commit atau outbox), tetapi membaca layanan luar yang lambat sambil memegang kunci belum diatur.
  6. **Lebih dari satu proses.** Kunci di memori hanya berlaku di satu proses. Dokumen tidak menyatakan bahwa kunci harus milik penyimpanan bersama ketika aplikasi berjalan di beberapa instance.
- **Urusan lain yang belum diatur sama sekali:**
  1. **Identitas dan otorisasi.** Tidak ada aturan di mana "siapa pengguna ini" disimpan dan siapa yang memeriksa haknya. UC-11 melarang use case membaca context, jadi identitas harus datang lewat Request atau gateway, tetapi itu tidak tertulis. Aturan hak ("hanya pemilik gudang boleh memindahkan stok") adalah aturan bisnis, jadi seharusnya di entity.
  2. **Idempotensi permintaan masuk.** GW-11 hanya mengatur penerima pesan outbox. Permintaan ganda dari controller (tombol ditekan dua kali, retry HTTP) belum diatur.
  3. **Batas waktu dan percobaan ulang panggilan keluar** (HTTP ke pihak ketiga) di gateway.
  4. **Error program** (bukan `BusinessError`): bagaimana controller menjawab dan mencatatnya.
  5. **Siklus hidup sumber daya.** Skeleto tidak punya mekanisme shutdown, sehingga config yang membuka koneksi tidak pernah ditutup secara teratur. README hanya memperingatkan kebocoran saat startup diulang.
  6. **Proses bisnis yang melewati beberapa use case** (saga, kompensasi ketika langkah berikutnya gagal). UC-4 melarang use case memanggil use case, tetapi tidak ada panduan pengganti.
  7. **Observabilitas.** Audit dan pengamat gateway ada sebagai contoh, tetapi logging, trace id (field `traceId` di context), dan metrik belum punya aturan.
  8. **Cache dan invalidasinya.** Disebut sebagai efek setelah commit, tetapi cara membaca dari cache tidak diatur.
  9. **Event-driven (dibahas 2026-11-22).** Yang sudah ada: menerbitkan event adalah efek lewat gateway, setelah commit atau lewat outbox (GW-9, GW-10), dan penerima tahan duplikat (GW-11). Yang belum diatur: nama gateway penerbit dan isi event (usulan: dinamai menurut fakta bisnis, misalnya `PublishStockTransferred`, bukan menurut pendengarnya seperti `NotifyEmailService`); bahwa konsumen event di dalam aplikasi yang sama adalah **controller** yang memanggil use case; dan larangan bus event di dalam proses yang membuat gateway memanggil use case lain secara langsung, karena itu menyembunyikan pelanggaran UC-4 dan GW-12.
- **Kenapa dibahas:** setiap hal yang tidak diatur akan dikarang AI dengan bentuk yang berbeda-beda, dan itu bertentangan dengan tujuan konsistensi (temuan 5). Tidak semuanya harus diatur sekarang. Usulan prioritas: identitas dan otorisasi, idempotensi permintaan masuk, percobaan ulang setelah `conflict`, dan error program, karena keempatnya muncul di hampir setiap aplikasi.

## 16. Proses pengembangan ditulis berurutan, padahal penemuan berjalan bersamaan

- **Pernyataan pemilik (2026-11-22):** cerita pengguna biasanya berupa aktivitas yang melibatkan entitas ("aplikasi yang bisa begini dan begitu, kalau dia begini maka kita begitu"). Karena itu use case dan entity bisa diidentifikasi bersamaan sejak awal. Lalu prioritas disusun (Core, Supporting, Generic), alur ditentukan (boleh dengan mockup aplikasi yang hanya untuk mempelajari alur), dan semua itu dilakukan bersamaan.
- **Fakta:** `docs/proses/pengembangan.md` (dan `DEVELOPMENT_PROCESS.md` lama) menulis lima tahap berurutan, dan DEV-11 melarang kode sebelum DEV-1 sampai DEV-10 selesai. Mockup tidak disebut sama sekali.
- **Tanggapan:**
  1. **Bedakan menemukan, memutuskan, dan menulis kode.** *Menemukan* (calon entity dari kata benda, calon use case dari kata kerja, calon alur, calon celah) memang berjalan bersamaan dan berulang. *Memutuskan* tetap punya gerbang: klasifikasi diputuskan pemilik sebelum perancangan mendalam, dan istilah disepakati sebelum dipakai sebagai nama di kode. *Menulis kode* mengikuti DEV-13.
  2. **Klasifikasi tetap per area, bukan per use case** (DEV-3). Use case dalam satu area saling bergantung. Prioritas *di dalam* area Core bisa diurutkan menurut alur: jalur utama lebih dulu, lalu cabang.
  3. **Mockup cocok dengan DEV-2** (screen sebagai petunjuk), dengan dua syarat: ditandai sebagai alat belajar yang akan dibuang, dan setiap screen-nya digali menjadi use case. Risikonya adalah pemilik mengira "screen sudah ada, berarti aplikasi hampir selesai". Peta skenario adalah "mockup alur" tanpa screen; keduanya saling melengkapi: mockup untuk *bentuk interaksi*, peta untuk *state, waktu, dan celah*.
  4. **Usulan perubahan dokumen:** tahap 1–4 ditulis sebagai satu **putaran penemuan** yang diulang (wawancara → kandidat glosarium, entity, use case → mockup/peta → pertanyaan baru → wawancara), dengan dua **gerbang keputusan** yang tetap berurutan: klasifikasi area (DEV-4) dan kesepakatan istilah (DEV-6).
- **Catatan istilah:** glosarium adalah bentuk tertulis dari **ubiquitous language** DDD. Area bisnis dan kelas Core/Supporting/Generic sesuai dengan **subdomain** DDD (core, supporting, generic subdomain). Dokumen belum menyebut **bounded context**: dalam DDD, ubiquitous language berlaku di dalam satu bounded context, dan kata yang sama boleh berarti berbeda di context lain. Aturan DEV-6 "satu kata untuk satu hal" sekarang berlaku untuk seluruh aplikasi.

## 17. Definisi Core, Supporting, Generic menurut pemilik berbeda dari yang tertulis

- **Yang tertulis** (DEV-3, dulu P2, mengikuti subdomain DDD), diukur dari **pentingnya bagi bisnis**:
  - Core: kalau salah, bisnis kehilangan alasan keberadaannya; pembeda bisnis.
  - Supporting: khas bisnis ini dan dibutuhkan, tetapi bukan pembeda.
  - Generic: dimiliki hampir setiap aplikasi (login, notifikasi, unggah berkas, pembayaran).
- **Menurut pemilik (2026-11-22)**, diukur dari **kapan harus ada**:
  - Core: tujuan utama aplikasi dibuat; kalau tujuan itu belum tercapai, Core belum selesai. Contoh: alur aplikasi, state utama, peran pengguna yang terlibat, skenario positif lebih dulu lalu beberapa contoh skenario negatif, sehingga aplikasi punya kerangka dasar.
  - Supporting: sebenarnya bagian dari Core, tetapi bisa ditunda atau diganti data dummy sampai Core selesai. Contoh: algoritma perhitungan biaya, geolokasi yang menentukan alur.
  - Generic: tidak perlu disebut bahwa ia harus ada, karena sudah umum dan selayaknya ada. Contoh: registrasi, login, query yang optimal, hal-hal keamanan.
- **Pemilik juga menegaskan:** satu area adalah satu set use case yang saling bergantung (satu use case mengubah state yang menentukan use case lain bisa bergerak), dan semuanya Core.
- **Perbedaan yang perlu diputuskan:**
  1. **Supporting.** Di DDD, supporting adalah subdomain tersendiri. Menurut pemilik, supporting adalah *bagian dari Core yang bisa ditunda*. Ini lebih dekat ke tiga cara di DEV-8 (stub, disederhanakan) daripada ke klasifikasi area. Contohnya, "algoritma perhitungan biaya" di DDD sering justru Core, karena harga bisa jadi pembeda.
  2. **Satuan klasifikasi.** Kalau Supporting adalah bagian dari Core, yang diklasifikasi bukan lagi hanya area, tetapi juga kemampuan di dalam area. Ini perlu dirumuskan supaya tidak bertentangan dengan "yang diklasifikasi adalah area" (DEV-3) yang baru disetujui pemilik.
  3. **Generic mencampur area dan kualitas.** Registrasi dan login adalah area. "Query yang optimal" dan "keamanan" adalah kualitas atau urusan lintas-use-case, bukan area. Keduanya punya tempat lain: optimisasi di jalur gateway (GW-13), keamanan di aturan identitas dan otorisasi (temuan 15).
  4. **Definisi selesai.** Menurut pemilik, kerangka Core cukup dengan skenario positif dan contoh skenario negatif. DEV-14 lebih ketat: setiap cabang peta punya tes dan setiap celah punya penanda atau keputusan.
- **Keputusan pemilik (2026-11-22): usulan di bawah diterima.** `docs/proses/pengembangan.md` (DEV-3, DEV-14) belum diubah.
- **Usulan:** pakai definisi pemilik sebagai dasar karena lebih praktis untuk menentukan urutan kerja, dengan rumusan:
  - **Core**: area yang mewujudkan tujuan utama aplikasi. Selesai ketika tujuan itu tercapai.
  - **Supporting**: kemampuan yang dibutuhkan Core, tetapi versi aslinya bisa menunggu. Selama menunggu, ia berupa stub, dummy, atau versi sederhana (DEV-8), dan dicatat sebagai utang Planned.
  - **Generic**: kemampuan yang dianggap sudah ada dan tidak perlu diputuskan bersama pemilik. Biasanya diambil dari pustaka atau layanan luar ("dianggap sudah ada" di DEV-8).
  - Kualitas (optimisasi, keamanan) dikeluarkan dari klasifikasi dan diatur di tempatnya sendiri.
  - "Selesai" dua tingkat: **kerangka Core** (jalur utama dan contoh skenario negatif berjalan) dan **Core selesai** (DEV-14).

---

## Jawaban pemilik, 2026-11-22

- **#1:** diabaikan dulu; optimasi ukuran kode nanti. Pemilik minta diingatkan lagi.
- **#2, #3:** ditutup. Dokumen praktik dan contoh bisnis di README adalah bagian dari tujuan (#5), bukan penyimpangan.
- **#4:** `Context` tetap di inti. Context adalah **metadata** yang boleh dipakai infrastruktur, bukan bagian proses bisnis: data bisnis tidak boleh dititipkan di context. Sebelumnya hanya tertulis sebagian (B23/UC-11: "carries what the technical level needs, not business input"; use case tidak membacanya); larangan menitipkan data bisnis belum tertulis tegas.
- **#5:** 11 tujuan disetujui. `CLAUDE.md` diperbarui.
- **#6:** review dua lapis: (1) **kepatuhan konsep**, bisa ditangani mesin dan LLM; (2) **logika dan requirement**, sebagian oleh LLM dan sebagian oleh reviewer manusia. Ini menjawab temuan 6: struktur dibuat semekanis mungkin supaya waktu manusia hanya untuk lapis kedua.
- **#7:** optimisasi tidak boleh diserahkan langsung ke AI. Prosesnya melibatkan manusia, perkaranya besar, dan tidak punya pola khusus. Usulan "jalur resmi optimisasi" (GW-13) diganti: AI boleh menunjukkan kandidat, tetapi tidak mengoptimasi tanpa keputusan pemilik.
- **#8:** urutan awal adalah mengidentifikasi Core. Di dalam satu area, kerja berputar: use case → entity → dummy gateway, lalu use case berikutnya di area yang sama. Satu area idealnya dikerjakan **satu sesi AI**, karena dua sesi bisa memutuskan hal berbeda dan menimbulkan konflik yang tidak perlu.
- **#9:** aturan dibaca per lingkup: reviewer yang membaca use case menerapkan aturan use case saja. Inilah alasan `docs/` dipecah per komponen.
- **#12:** pemilik condong menjadikan `@UseCase` dan `@Gateway` bagian inti framework, bukan preset. Belum final.
- **#13:** pemilik minta dicek apakah `docs/` sudah mencakup seluruh isi tiga dokumen lama.
- **#14:** pemilik ingin meneliti lebih dalam apa yang dibutuhkan penjejak. Skeleto sebagai *penyedia informasi*: hal yang hanya untuk penjejak tidak dibuat di Skeleto, tetapi yang bermanfaat umum boleh diformalkan.
- **#15:** tetap dicatat, dibahas lain waktu.
- **#16:** disetujui.
- **WRP-5:** pemilik ingin membuang `ordinal` dan memakai urutan penulisan sebagai urutan resmi lapisan wrapper. Belum diputuskan.
- **Lingkup:** pemilik melihat Skeleto menangani **low level design** (struktur di dalam satu aplikasi), bukan high level design.

## Hasil pemeriksaan cakupan `docs/` (#13), 2026-11-22

Semua aturan bernomor sudah ada di `docs/`. Yang hilang terutama penjelasan "kenapa" dan contoh kerja:

- **Bagian tanpa nomor:** paragraf "gunung es soal letak kerumitan, bukan soal penting tidaknya" (frontend sama penting), tabel "Under the waterline / Covered by", dan argumen "screen tidak bisa diurutkan, hanya use case dan area" (pembuka `pengembangan.md`).
- **Tingkat berubah tanpa tanda:** B1 dulu Opsional, DEV-2 diletakkan di aturan wajib.
- **Konkurensi (GW-6):** penjelasan isolasi bawaan penyimpanan, "tidak ada yang bisa dikunci karena barangnya belum ada", cara `LockWarehouses` membuat B menunggu lalu kena `conflict`, dan pemeriksaan versi yang mengubah perubahan hilang menjadi `conflict` yang bisa diulang.
- **Detail teknis:** KOM-8 (nama teknologi dalam bentuk `<snake>`), KOM-10 (daftar minimal `UseCase`, `Gateway`, `Transaction`), KOM-11 (memakai `MARKERS` yang sama), UC-13 (tes kedua, kasus `conflict`), UC-7 (gateway pembaca di luar transaksi), GW-15 (alasan bentuk standar), WRP-4 (keluaran README), WRP-6 (alasan dan "boleh mengukur waktu panggilan"), komponen.md ("alat tidak mengambil apa pun selain itu, dan membaca container sekali").
- **Proses:** sebagian besar alasan P3–P7, P9, P11; P10 (cara menulis state bebas, alasan id celah tetap, contoh tabel celah, `<process>` = nama berkas peta); P12 (dummy untuk pengembangan tidak diberi penanda; alasannya); P14 ("area itu tetap boleh disketsa"); penunjuk ke `REVIEW_CHECKLIST.md` di bagian reviewer.
- **Kontradiksi baru:** DEV-10 menyebut scenario-explorer membaca peta, padahal aturan lama menyatakan bagian state dan pilihan "hanya dibaca manusia".
- **Kesalahan tabel pemetaan:** catatan di bawah tabel `docs/README.md` menyebut CFG-3 dan GW-12 tanpa padanan lama, padahal tabel memetakan T2 → CFG-3 dan B8 → GW-12.

## Jawaban pemilik dan pembaruan `docs/`, 2026-11-22 (lanjutan)

- **#12:** `@Action` polos tetap boleh dipakai, dan aturannya bebas. `docs/teknis/preset-clean-architecture.md` diganti menjadi `docs/teknis/use-case-gateway-bawaan.md`. ACT-1 dirumuskan ulang; tambahan "yang sebenarnya use case atau gateway tetap ditandai begitu" ditandai usulan. Prinsip "Hanya binding" di `CLAUDE.md` belum ditulis ulang; itu dilakukan saat jenis bawaan diimplementasi.
- **WRP-5:** pemilik condong wrapper yang ditulis pertama menjadi lapisan terdalam (kulit bawang, dipasang dari dalam). Ditulis sebagai rencana dengan syarat semua wrapper di satu berkas; arahnya belum final.
- **#8, kerja paralel:** boleh, tetapi dipertimbangkan sangat matang; baru layak setelah sebagian besar entity terbentuk dan use case Core selesai, terutama untuk Supporting dan Generic.
- **Pembaruan `docs/`:** kekurangan dari pemeriksaan #13 diisi; keputusan #4 (ACT-3), #6 dan #9 (bagian "Cara mereview" di `docs/README.md`), #7, #8, #16, #17, dan lingkup LLD ditulis. Perubahan tingkat B1 → DEV-2 (Opsional → Wajib) ditandai belum diputuskan. Catatan tabel pemetaan diperbaiki.

## Keputusan pemilik untuk implementasi, 2026-11-22

- **Dependency `@Action` polos:** boleh bergantung pada semua jenis action (`@Action`, `@UseCase`, `@Gateway`), selain `@Config`. Belum diputuskan: apakah `@UseCase` dan `@Gateway` boleh bergantung pada `@Action` polos. Risikonya: `@Action` polos bisa menjadi perantara use case → use case.
- **Urutan wrapper:** `ordinal` dibuang. Wrapper yang ditulis pertama di `src/wrappers.ts` menjadi lapisan **terdalam**.
- **Wrapper di luar satu berkas:** kesalahan saat startup.
- **Cara kerja:** lewat papan kerjaan2.
- **Dampak di luar repo:** penjejak scenario-explorer mencari use case dengan `mainDecorator.name === "Action"` dan wrapper contohnya memakai `{"ordinal": -10}`; keduanya rusak setelah perubahan ini.
- **Jawaban lanjutan (2026-11-22):** use case dan gateway tidak boleh bergantung pada `@Action` polos. Jenis dibaca dari nama penanda utama di metadata. Action dibuat dalam tiga kelompok: gateway, lalu use case, lalu `@Action` polos. Tidak ada pemakai lama, jadi tidak perlu kompatibilitas mundur. Tes arsitektur salinan diciutkan menjadi satu pemeriksaan (tidak ada `@Action` polos), dan wrapper penjaga dihapus.
- **Aturan satu berkas dibatalkan:** pemilik: "Tidak ada aturan khusus secara teknis untuk meletakkan disatu berkas baik itu untuk wrapper, config, action bahkan usecase dan gateway. semua tergantung oleh scanner." Urutan wrapper mengikuti urutan pemindai (berkas menurut path, fungsi menurut tulisan). Satu berkas wrapper hanya default opsional di dokumen praktik. `@Wrapper` tidak menerima data apa pun, dengan pesan yang sama seperti `@Config` dan `@Action`.

## Hasil implementasi, 2026-11-22

- **Tiket 261122101201** (`@UseCase`/`@Gateway` bawaan) digabung di `bcdb4e0`, lulus di putaran 2. Putaran 1 dikembalikan karena `docs/` masih mengajarkan cara lama.
- **Tiket 261122101202** (urutan wrapper menurut tulisan, tanpa `ordinal`) digabung di `6c05558`, lulus di putaran 1. Ini menutup WRP-5: arah "ditulis pertama = terdalam" kini berlaku, tanpa aturan satu berkas.
- **Pengingat #1:** `src/` sekarang 479 baris.
- **Tindak lanjut untuk temuan 14 (penjejak scenario-explorer):** penjejak kini rusak. Ia mencari use case dengan `mainDecorator.name === "Action"` ditambah penanda `UseCase` (seharusnya `mainDecorator.name === "UseCase"`), dan wrapper contohnya memakai `{"ordinal": -10}` yang kini menghentikan startup ("takes no data"); wrapper pengamat harus ditulis pertama supaya menjadi lapisan terdalam. Dikerjakan di repo scenario-explorer nanti (keputusan pemilik).

## 18. Aturan dependency use case dan gateway lebih ketat

- **Pernyataan pemilik (2026-11-22):** `@UseCase` hanya boleh bergantung pada `@Gateway`, bukan pada `@Config`. `@Gateway` hanya boleh bergantung pada `@Config`, bukan pada `@Gateway`.
- **Yang berlaku sekarang** (baru diimplementasi lewat tiket 261122101201): use case → config, gateway; gateway → config, gateway. GW-12 dan B8 lama juga menyatakan "gateway boleh dibangun dari gateway lain".
- **Tanggapan:** setuju. Hasilnya graf berlapis yang paling sederhana: controller → use case → gateway → config. Setiap jenis hanya punya satu jenis di bawahnya, dan reviewer bisa memeriksanya sekilas.
- **Concern yang perlu diputuskan:**
  1. **Parameter bisnis** (batas unit, persentase biaya, feature flag) tidak bisa lagi dibaca use case dari config. Jalannya lewat gateway (misalnya `GetTransferPolicy`), atau sebagai konstanta di entity. Ini sejalan dengan "semua di luar proses lewat gateway", tetapi perlu ditulis.
  2. **Kode bersama antargateway** (klien HTTP, pemetaan) tidak bisa lagi lewat gateway lain. Jalannya lewat config (klien), atau fungsi biasa yang bukan komponen.
  3. **Gateway yang butuh nilai tak terduga** (jam, id) untuk menulis rekaman tidak bisa memanggil gateway `Now`/`NewId`. Use case memintanya sekali di awal lalu memberikannya lewat input (sudah begitu menurut UC-10).
  4. **Gateway tak langsung di penjejak scenario-explorer** (contoh: gateway outbox yang memanggil gateway pembayaran setelah commit) tidak lagi mungkin; fiturnya menjadi usang. Pengirim outbox adalah proses lain (controller → use case → gateway), jadi kebutuhannya tetap terpenuhi.
  5. **`@Action` polos** tetap boleh bergantung pada semua jenis action. Belum jelas apakah ia juga boleh bergantung pada config saja (sekarang boleh).
- **Dampak:** `CLAUDE.md` 4.6, README (kalimat aturan dan contoh; contoh sekarang sudah patuh: use case hanya ke gateway, gateway hanya ke config), dokumen GW-12, UC, dan tabel di `docs/teknis/use-case-gateway-bawaan.md`, serta tesnya.

## 19. Hasil review independen kode dan aturan (main `78d4ab8`), 2026-11-22

Reviewer independen (tidak membaca `TEMUAN.md` dan papan) memeriksa `src/`, tes, `CLAUDE.md`, README, `docs/`, dokumen lama, dan `REVIEW_CHECKLIST.md`. Dasar: 354 tes lulus, typecheck bersih. Temuan 1 dan 3 juga dicek ulang dengan membaca kode.

**Bug (semua direproduksi reviewer):**
1. Entri huruf kecil di `decorators` (misalnya `"logging"`) tidak pernah bisa dipenuhi: `@logging` ditolak dengan saran "write @logging", dan `@Logging` ditolak karena tidak ada di daftar. Isi daftar tidak divalidasi (`src/scanner.ts` sekitar baris 112, `src/skeleto.ts` `listOption`).
2. `export declare function` lolos pemindaian, lalu gagal setelah impor ("create is not a function"), padahal terlihat dari teks sumber (melanggar `CLAUDE.md` 4.8).
3. Fungsi yang diekspor lewat `export { implX }` ditolak sebagai "not exported by name" (`src/scanner.ts` sekitar baris 136); dengan `export { implX as other }` nama impornya juga salah.
4. Parameter `this:` dihitung sebagai dependency, sehingga urutan argumen bergeser.

**Celah kontrak:**
5. "Config asinkron ditunggu satu per satu, tidak berbarengan" (`CLAUDE.md` 4.7) tidak punya tes; `Promise.all` atas config yang saling bebas akan tetap lulus.

**Kontradiksi:**
6. `CLAUDE.md` 4.2 menyebut method sebagai tempat salah yang dilaporkan bila `decorators` diberikan, tetapi 4.5 dan kode hanya memeriksa konstanta yang diekspor dan fungsi di namespace. Penanda di method statis dan di blok JSDoc yang lebih atas dilewati diam-diam.
7. B10/UC-7 ("query tanpa `@Transaction`") bertentangan dengan T13/GW-5 (`Database` melempar error tanpa transaksi): menurut contoh, setiap query juga harus ber-`@Transaction`.
8. Dokumen mana yang berlaku ambigu: `CLAUDE.md` menyebut `docs/` lebih dulu, `docs/README.md` menyatakan dokumen lama masih berlaku; tingkat B1 (Opsional) dan DEV-2 (Wajib) berbeda; `REVIEW_CHECKLIST.md` hanya memakai nomor lama dan belum memuat aturan gateway → config saja.
9. Status WRP-5 tidak konsisten: "rencana" di `docs/README.md`, "terealisasi" di `docs/teknis/wrapper.md`, dan diletakkan di aturan opsional padahal ia perilaku mesin.
10. `GatewayWrapper` melanggar T7/T11 (wrapper dinamai menurut penanda tambahan yang dibacanya), karena kini ia membaca nama penanda utama.

**Concern desain:**
11. Lapisan wrapper bergantung pada urutan path berkas. Memindah atau mengganti nama berkas wrapper bisa diam-diam menukar transaksi dan audit. Di Windows pemisah path `\` mengurutkan berbeda dari `/` (belum dijalankan di Windows).
12. B5 ("tidak ada `@Action` polos") masih dijaga tes salinan yang menyalakan seluruh aplikasi, membaca container (bertentangan dengan T17), dan menjadi tes start kedua (bertentangan dengan T21). Belum dijaga mesin.

**Kesimpulan reviewer:** inti kode kecil, koheren, dan teruji untuk sebagian besar `CLAUDE.md` bagian 4; aturan dependency use case/gateway konsisten di semua dokumen. Bagian yang lemah adalah dokumen aturan: dua set aturan hidup bersamaan, checklist belum memuat aturan baru, dan beberapa aturan "mesin" masih bergantung pada tes salinan.

**Keputusan pemilik atas temuan 19 (2026-11-22):**
- Bug 1–4 dan celah tes 5 diperbaiki dalam satu tiket (261122135601), beserta penanda di method (kontradiksi 6) dan pemisah path `/` di semua OS (dari concern 11). Hanya `export function implX` yang dihitung diekspor; daftar export ditolak dengan pesan jelas.
- Concern 12: `@Action` polos ditolak mesin lewat opsi `Skeleto.start`, dan tes arsitektur salinan dihapus (261122135602).
- Kontradiksi 8: `docs/` menjadi satu-satunya sumber aturan, dan tiga dokumen lama dipensiunkan (261122135603), bersama kontradiksi 7 (semua use case ber-`@Transaction`, termasuk query), 9 (status WRP-5), 10 (aturan nama wrapper), dan penegasan concern 11 di dokumen (wrapper yang urutannya penting ditaruh di satu berkas).
- Urutan kerja: 261122135601, lalu 261122135602, lalu 261122135603.
- **Perubahan keputusan (2026-11-22):** setelah dibahas kenapa `@Action` polos ada, pemilik memutuskan: "Ya sudah, hapus saja `@Action`." Tidak ada opsi start. Penanda utama tinggal `@Config`, `@Wrapper`, `@UseCase`, `@Gateway`; setiap action adalah use case atau gateway. Tiket 261122135602 ditulis ulang ("Remove the plain @Action marker").

## Hasil tiket dari temuan 19, 2026-11-22

- 261122135601 (bug ekspor, penanda, parameter; tes config satu per satu; pemisah path `/`) digabung di `299895a`.
- 261122135602 (`@Action` dihapus; penanda utama tinggal `@Config`, `@Wrapper`, `@UseCase`, `@Gateway`) digabung di `cd2e5a3`.
- 261122135603 (`docs/` satu-satunya sumber aturan; tiga dokumen lama menjadi penunjuk; `REVIEW_CHECKLIST.md` berbahasa Indonesia dengan nomor baru; UC-16 semua use case ber-`@Transaction`; WRP-5 wajib, WRP-7 baru) digabung di `a7b7917`. Ini menutup temuan 13.
- Pengingat #1: `src/` sekarang 510 baris.
