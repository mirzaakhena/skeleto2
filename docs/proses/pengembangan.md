# Proses pengembangan

Urutan membangun aplikasi baru di atas Skeleto, dan apa yang disepakati dengan pemilik sebelum kode ditulis.

## Kapan berlaku

Proses ini berlaku untuk **aplikasi baru, atau bagian besar baru dari aplikasi**. Tidak berlaku untuk setiap perubahan: perubahan pada aplikasi yang sudah ada dimulai dari use case yang disentuhnya.

Skeleto tidak memeriksa aturan apa pun di sini. Aturannya disepakati antara agent dan pemilik, dan hasilnya ditinggalkan agent dalam berkas yang bisa dibaca reviewer.

## Ringkasan

| Tahap | Hasil | Aturan |
| --- | --- | --- |
| 1. Dengarkan dan wawancarai | area bisnis bisa disebut | DEV-1, DEV-2 |
| 2. Klasifikasikan area | `docs/AREAS.md` | DEV-3 sampai DEV-5 |
| 3. Sepakati istilah | `docs/GLOSSARY.md` | DEV-6 |
| 4. Rancang Core | `docs/CORE.md`, `docs/scenarios/<proses>.json` | DEV-7 sampai DEV-10 |
| 5. Tulis kode, Core lebih dulu | kode, tes, penanda utang | DEV-11 sampai DEV-14 |

Semua berkas `docs/` di atas berada di repo **aplikasi**, bukan di repo Skeleto.

## Aturan wajib

### DEV-1. Mulai dari cerita pengguna, lalu wawancarai sampai area bisnisnya terlihat

Pengguna menceritakan apa yang mau dibangun, siapa pemakainya, dan bagaimana cara kerjanya. Agent lalu mewawancarai pengguna, dengan pertanyaan dalam bahasa bisnis, sampai **area bisnis** bisa disebut: bagian bisnis yang punya tujuan sendiri, misalnya stok, pemesanan, atau tagihan. Agent tidak mulai merancang sebelum bisa menyebutnya.

Klasifikasi (DEV-3) dan glosarium (DEV-6) hanya sebaik daftar area yang menjadi dasarnya. Agent yang merancang dari deskripsi pertama mengisi kekosongan dengan tebakan, dan tebakan yang salah tentang bisnis baru terlihat setelah banyak hal dibangun di atasnya.

### DEV-2. Screen adalah petunjuk: terima sebagai bahan, lalu gali use case-nya

Manusia hampir selalu menjelaskan kebutuhannya lewat screen: "saya ingin yang seperti ini". Itu wajar, dan bukan sesuatu yang harus ditolak. Tetapi screen hanya puncak gunung es. Di bawahnya ada bagian yang lebih besar dan lebih rumit: aturan bisnis, validasi dan error, permintaan yang datang bersamaan, transaksi yang gagal di tengah, efek yang harus menunggu commit, dan nilai tak terduga.

Dari setiap screen yang ditunjukkan, agent menggali use case di baliknya:
- apa yang **diputuskan** ketika tombol ditekan;
- apa yang bisa **gagal**, dan apa jawabannya;
- **siapa lagi** yang memanggil operasi yang sama (job, sistem lain);
- apa yang terjadi kalau dua orang melakukannya **bersamaan**.

Agent juga menjelaskan kepada pemilik, dalam bahasa awam, bahwa screen yang selesai belum berarti aplikasinya selesai. Screen yang use case-nya belum dibangun sengaja belum lengkap, bukan rusak.

Use case yang ditemukan lalu dibentuk menurut operasi bisnisnya, bukan menurut screen (UC-6 di [use-case.md](../konsep/use-case.md)). Untuk aplikasi yang sudah ada, perubahan dimulai dari use case yang disentuhnya.

> Dirumuskan ulang sesuai arahan pemilik (2026-11-21). Dokumen lama menulisnya sebagai "mulai dari daftar use case, bukan dari daftar screen", yang terbaca seperti larangan.

### DEV-3. Klasifikasikan setiap area bisnis, tidak pernah setiap use case, sebagai Core, Supporting, atau Generic, dengan tiga pertanyaan berurutan

Satuan klasifikasi adalah **area bisnis**, tidak pernah use case, karena use case dalam satu area saling bergantung. Setengah area yang dibangun dalam-dalam sementara setengahnya dibiarkan sebagai stub tidak akan berjalan.

Tiga pertanyaan, ditanyakan berurutan, dan jawaban "ya" pertama yang menentukan:
1. Kalau bagian ini salah, apakah bisnis kehilangan alasan keberadaannya? Maka ia **Core**: alasan bisnis ini ada, dan pembedanya.
2. Apakah ia khas bisnis ini, dan dibutuhkan? Maka ia **Supporting**: bukan pembeda, tetapi tidak ada yang punya persis sama.
3. Selain itu ia **Generic**: yang dimiliki hampir setiap aplikasi, misalnya login, notifikasi, unggah berkas, atau integrasi pembayaran.

Pertanyaan yang ditanyakan dengan cara sama setiap kali memberi jawaban sama kepada dua agent berbeda.

### DEV-4. Pemilik yang memutuskan klasifikasi; agent hanya mengusulkan beserta alasannya

Agent mengusulkan kelas untuk setiap area dan menjelaskan alasannya menurut tiga pertanyaan DEV-3. Ia tidak menganggap usulannya disetujui. Pemilik menerima atau mengubahnya, dan jawaban pemilik adalah klasifikasinya. Apa yang membedakan sebuah bisnis hanya diketahui pemiliknya.

### DEV-5. Catat klasifikasi di `docs/AREAS.md`

| Area | Class | Reason | Decision |
| --- | --- | --- | --- |
| Stock | Core | The business is moving stock between places without losing track of it | Accepted, owner, 2026-02-03 |
| Notifications | Generic | Every application tells its users something | Accepted, owner, 2026-02-03 |

- `Class` salah satu dari `Core`, `Supporting`, atau `Generic`.
- `Reason` jawaban atas tiga pertanyaan DEV-3, dalam satu baris.
- `Decision` menyebut pemilik dan tanggal keputusannya, serta apakah pemilik menerima atau mengubah usulannya.

Klasifikasi yang hanya hidup di percakapan hilang bersama percakapannya. Nama dan letak berkasnya tetap, supaya planner, reviewer, atau pemeriksaan mesin menemukannya tanpa diberi tahu.

### DEV-6. Sepakati istilah bisnis di `docs/GLOSSARY.md` sebelum entity atau use case mana pun dinamai

Ini yang disebut Domain-Driven Design sebagai **ubiquitous language**: satu kata untuk satu hal, dipakai pemilik, di kode, dan di percakapan.

| Term | Meaning |
| --- | --- |
| Warehouse | A place where stock is kept, with a name and a count of units for each product |
| Stock | The units of one product that a warehouse holds |

- **Setiap nama entity dan setiap nama area bisnis ada di glosarium**, beserta artinya.
- Kata yang punya dua arti di bisnis mendapat satu istilah untuk setiap arti, dengan kata-kata pemilik, sebelum salah satunya dipakai.
- Glosarium diubah ketika bahasanya berubah, dan nama di kode ikut diubah.

Entity atau use case yang dinamai sebelum istilahnya disepakati membawa tebakan agent, dan tebakan itu menyebar ke setiap berkas yang memakai namanya.

### DEV-7. Rancang hanya area Core lebih dulu: use case-nya, entity dasarnya, dan alurnya

Untuk area Core, dan hanya untuk itu, agent menyusun use case, entity dasar, dan alur di antaranya, dengan kata-kata glosarium. Area Supporting dan Generic **tidak dimulai sebelum dibutuhkan**.

Ini mungkin karena use case mengenal gateway hanya lewat kontraknya (UC-9): Core bisa dirancang, dibangun, dan dites sementara apa yang ada di balik gateway belum diputuskan.

### DEV-8. Kebutuhan Core dari area lain ditangani dengan salah satu dari tiga cara, dan setiap cara dicatat

| Cara | Artinya | Yang dicatat |
| --- | --- | --- |
| **Stub** | pengganti palsu di balik kontrak gateway; area aslinya dibangun belakangan oleh lapis berikutnya | kontrak gateway, apa yang dilakukan stub sebagai pengganti, dan lapis mana yang menggantinya |
| **Dianggap sudah ada** | layanan luar atau pustaka menyediakannya, aplikasi hanya memanggilnya | apa yang dianggap dilakukannya, siapa penyedianya, dan apa yang tidak bisa berjalan tanpanya |
| **Disederhanakan** | versi minimal yang benar-benar berjalan, bukan palsu | apa yang dilakukan dan ditinggalkan versi itu, dan apa yang akan membuatnya tumbuh |

Pemilik menyetujui caranya, dan keputusannya dicatat bersamanya. Stub yang meninggalkan utang diberi penanda (lihat [utang-teknis.md](utang-teknis.md)).

### DEV-9. Catat hasil rancangan Core di `docs/CORE.md`

Untuk setiap area Core:
- **use case**-nya, masing-masing satu atau dua baris, dengan kata-kata glosarium;
- **entity dasar**-nya, beserta kegunaannya;
- **gateway**-nya, masing-masing dengan apa yang dijanjikan kontraknya, bukan cara kerja di baliknya;
- **keputusan pemilik** yang membentuk semua itu, beserta tanggalnya;
- setiap **stub, anggapan, dan penyederhanaan** dari DEV-8, di samping use case yang membutuhkannya.

| Area | Kind | Name | What it says | Decision |
| --- | --- | --- | --- | --- |
| Stock | Use case | Transfer stock | Moves units of a product from one warehouse to another, and refuses when the source holds too few | Accepted, owner, 2026-02-10 |
| Stock | Entity | Warehouse | Holds a count of units for each product | Accepted, owner, 2026-02-10 |
| Stock | Gateway | Save warehouses | Stores the given warehouses whole, and reports a failure | Accepted, owner, 2026-02-10 |
| Stock | Stub | Notify the owner of a transfer | Writes nothing; the notifications layer is to send a message | Accepted, owner, 2026-02-10 |

### DEV-10. Tulis alur setiap proses bisnis sebagai satu peta skenario di `docs/scenarios/<process>.json`

`<process>` adalah nama prosesnya dalam snake_case, misalnya `stock_transfer`. Peta menggambarkan:
- **state**-nya, situasi yang bisa dialami proses;
- **pilihan** setiap aktor di setiap state, dan state yang dituju setiap pilihan;
- **batas waktu**-nya, apa yang terjadi ketika waktu berlalu dan tidak ada yang bertindak;
- **celah**-nya, pertanyaan tentang proses yang belum dijawab pemilik, masing-masing dengan id tetap.

Yang ditetapkan aturan hanya celah. Peta punya array `gaps` di tingkat atas, dan setiap celah adalah objek dengan:
- `id`: `<process>-<n>`, misalnya `stock_transfer-3`. Id unik di semua peta aplikasi dan tidak pernah dipakai ulang, bahkan setelah celahnya ditutup;
- `question`: pertanyaan terbukanya, dengan kata-kata glosarium;
- `decision`: hanya setelah pemilik menjawab, jawabannya beserta tanggal.

Alur yang ditulis sebagai prosa menyembunyikan lubangnya: state tanpa jalan keluar, pilihan tanpa aturan, penantian tanpa batas. Menulis setiap state, pilihan, dan batas secara terpisah membuat yang hilang terlihat.

Alat untuk menulis dan menjelajah peta ini adalah **scenario-explorer** (repo `~/Workspace/scenario-explorer`). Aturannya: agent tidak boleh mengarang aturan bisnis. Kondisi yang hanya diduga ditulis sebagai `celah`, bukan sebagai cabang.

### DEV-11. Tulis kode hanya setelah DEV-1 sampai DEV-10, dan tulis Core lebih dulu, sampai tuntas, sebelum lapis lain

Tidak ada kode sebelum area bisnis diklasifikasi dan diputuskan, glosarium disepakati, dan Core dirancang dengan setiap ketergantungan ke area lain sudah ditangani dan hasilnya dicatat. Lalu Core dibangun lebih dulu, sampai tuntas: entity-nya, use case-nya, dan tesnya, sampai berjalan.

Kode yang ditulis sebelum kesepakatan ditulis berdasarkan tebakan, dan harus dibongkar ketika tebakannya salah. Membangun Core lebih dulu membuat bagian tempat bisnis berdiri menjadi bagian yang paling teruji.

### DEV-12. Bangun area Supporting dan Generic hanya sejauh yang dibutuhkan utang Core yang tercatat

Urutan lapisnya: Core lebih dulu, lalu area Supporting dan Generic. Area Supporting atau Generic dibangun hanya sejauh yang dibutuhkan utang yang dicatat Core, tidak lebih. Setelah Core selesai (DEV-14), daftar utangnya menjadi backlog lapis berikutnya.

### DEV-13. Urutan menulis kode di dalam Core: rancang dari atas, bangun dari bawah, satu use case setiap kali

> **Usulan, belum diputuskan pemilik** (`TEMUAN.md`, temuan 8). Dokumen lama hanya menulis "entity-nya, use case-nya, dan tesnya", yang terbaca seperti semua entity dibuat lebih dulu.

Untuk setiap use case:
1. **Kontrak use case:** Request, Response, kontrak gateway yang dibutuhkan, dan sketsa alurnya, dari peta skenario. Masih berupa tipe, belum ada logika.
2. **Entity:** fungsi entity yang dibutuhkan alur itu, beserta tesnya.
3. **`impl` use case:** beserta tesnya dengan fake.
4. **Gateway dummy** (GW-14) kalau implementasi aslinya belum ada.

Setelah Core punya beberapa use case:

5. **Config dan wrapper** yang dibutuhkan (transaksi, audit).
6. **Awal aplikasi** (`main.ts`) dan satu tes integrasi (KOM-11).
7. **Penanda utang** untuk setiap celah dan stub (lihat [utang-teknis.md](utang-teknis.md)).

Alasannya: use case menunjukkan aturan entity mana yang benar-benar dibutuhkan, sehingga tidak ada fungsi entity yang dibuat "untuk jaga-jaga". Entity tetap ditulis sebelum `impl` use case karena use case memanggilnya. Dengan memisahkan keduanya, reviewer bisa memeriksa aturan bisnis terpisah dari alurnya.

### DEV-14. Area Core selesai ketika setiap langkah jalur utama dan setiap cabang peta skenarionya punya tes, dan setiap celah punya penanda atau keputusan tercatat

Area Core selesai ketika keduanya terpenuhi:
- setiap langkah jalur utama dan setiap cabang di peta skenarionya punya tes;
- setiap celah di peta itu punya penanda di use case yang bersangkutan, atau keputusan pemilik yang tercatat (field `decision` di celah itu).

Apakah gateway-nya sudah asli bukan bagian dari syarat ini: selama pengembangan, gateway boleh tetap dummy di memori.

"Selesai" harus bisa diperiksa reviewer terhadap berkas. Penjejak use case di scenario-explorer membantu membuktikannya: ia menjalankan pilihan peta yang bertautan ke use case dan menghitung mana yang jalan, mana yang tidak cocok, dan celah mana yang sudah punya penanda.

## Yang bisa diperiksa reviewer

Sebagian besar proses ini disepakati di percakapan dan tidak terlihat di repo. Yang terlihat, dan harus diperiksa reviewer:
- `docs/AREAS.md` dan `docs/GLOSSARY.md` ada, dengan nama dan di tempat ini (DEV-5, DEV-6);
- setiap baris `docs/AREAS.md` punya salah satu dari tiga kelas, alasan, dan keputusan (DEV-5);
- setiap nama entity dan nama area bisnis ada di `docs/GLOSSARY.md` (DEV-6);
- `docs/CORE.md` ada dan memuat use case, entity, gateway, keputusan, serta setiap stub, anggapan, dan penyederhanaan area Core (DEV-9);
- setiap proses bisnis punya berkas di `docs/scenarios/`, masing-masing dengan array `gaps` yang id-nya berbentuk `<process>-<n>` dan unik di semua berkas (DEV-10);
- syarat selesai DEV-14, dan aturan utang di [utang-teknis.md](utang-teknis.md).

Aturan lainnya diperiksa bersama pemilik, bukan di kode: wawancara, klasifikasi sebagai keputusan pemilik, penanganan kebutuhan Core, dan urutan kerjanya.
