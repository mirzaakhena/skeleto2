# Proses pengembangan

Urutan membangun aplikasi baru di atas Skeleto, dan apa yang disepakati dengan pemilik sebelum kode ditulis.

## Kapan berlaku

Proses ini berlaku untuk **aplikasi baru, atau bagian besar baru dari aplikasi**. Tidak berlaku untuk setiap perubahan: perubahan pada aplikasi yang sudah ada dimulai dari use case yang disentuhnya.

Skeleto tidak memeriksa aturan apa pun di sini. Aturannya disepakati antara agent dan pemilik, dan hasilnya ditinggalkan agent dalam berkas yang bisa dibaca reviewer.

## Kenapa urutannya menurut area, bukan menurut screen

Aplikasi dirancang dari use case-nya, bukan dari screen-nya (UC-6 di [use-case.md](../konsep/use-case.md)). Dokumen ini menjawab pertanyaan lain: use case mana yang dibangun lebih dulu. Satu screen mencampur bagian yang sangat penting dengan bagian yang dimiliki setiap aplikasi, sehingga screen tidak bisa diurutkan. Yang bisa diurutkan hanya use case, dan area bisnis tempat use case itu berada. Karena itu urutan di bawah ini menurut area bisnis, dan yang pertama dibangun adalah **Core**.

## Gunung es

Anggap frontend sebagai puncak gunung es: bagian yang dilihat orang, dan bagian kecil dari yang dikerjakan aplikasi. Di bawah permukaan ada bagian yang lebih besar dan lebih rumit. Tidak satu pun terlihat di screen, dan semuanya harus benar supaya screen itu ada gunanya.

Ini pernyataan tentang **letak kerumitan**, bukan tentang **apa yang penting**. Frontend sama pentingnya dengan bagian lain: ia yang ditemui pengguna, dan layak mendapat perhatian yang sama. Yang lebih kecil adalah kerumitan aturannya, sehingga rancangan yang mengikuti screen ke bawah membentuk bagian yang besar menurut bagian yang kecil.

| Di bawah permukaan | Diatur oleh |
| --- | --- |
| Aturan bisnis dan invariant | ENT-1 sampai ENT-3, ENT-9 |
| Validasi dan error | CTL-2, ENT-5, CTL-3 |
| Permintaan yang datang bersamaan | UC-12, GW-6 sampai GW-8, GW-13 |
| Transaksi yang gagal di tengah | WRP-2, WRP-3, GW-5 |
| Efek yang harus menunggu commit | GW-9 sampai GW-11, WRP-4 |
| Nilai tak terduga (jam, id baru) | UC-10, GW-2 |

## Ringkasan

Pekerjaan sebelum kode bukan rangkaian tahap yang lurus. Yang terjadi adalah **putaran penemuan** yang diulang, dengan dua **gerbang keputusan** yang tetap berurutan (keputusan pemilik, 2026-11-22).

```
          ┌──────────────────────── putaran penemuan ─────────────────────────┐
          │  cerita & wawancara → kandidat istilah, entity, use case            │
          │        ↑                         ↓                                  │
          │  pertanyaan baru  ←  mockup dan peta skenario (alur, state, celah)  │
          └─────────────────────────────────────────────────────────────────────┘
                     ↓ area bisnis terlihat
          Gerbang 1: klasifikasi area (Core / Supporting / Generic), diputuskan pemilik
                     ↓
          Gerbang 2: istilah area Core disepakati di glosarium
                     ↓
          Rancangan Core dicatat → kode Core, satu area satu sesi AI → lapis berikutnya
```

| Bagian | Hasil | Aturan |
| --- | --- | --- |
| Putaran penemuan | area bisnis bisa disebut; kandidat istilah, entity, use case; mockup; peta skenario | DEV-1, DEV-2, DEV-10 |
| Gerbang 1: klasifikasi area | `docs/AREAS.md` | DEV-3 sampai DEV-5 |
| Gerbang 2: istilah | `docs/GLOSSARY.md` | DEV-6 |
| Rancangan Core | `docs/CORE.md`, `docs/scenarios/<process>.json` | DEV-7 sampai DEV-10 |
| Kode, Core lebih dulu | kode, tes, penanda utang | DEV-11 sampai DEV-14 |

Ada tiga kegiatan yang harus dibedakan:

| Kegiatan | Bersamaan? |
| --- | --- |
| **Menemukan**: calon entity, use case, alur, celah | ya, bersamaan dan berulang |
| **Memutuskan**: kelas area, istilah resmi | tidak; lewat gerbang, dan pemilik yang memutuskan |
| **Menulis kode** | setelah gerbang, menurut DEV-13 |

Semua berkas `docs/` yang disebut di dokumen ini berada di repo **aplikasi**, bukan di repo Skeleto.

## Aturan wajib

### DEV-1. Mulai dari cerita pengguna, lalu wawancarai sampai area bisnisnya terlihat

Pengguna menceritakan apa yang mau dibangun, siapa pemakainya, dan bagaimana cara kerjanya. Agent lalu mewawancarai pengguna, dengan pertanyaan dalam bahasa bisnis, sampai **area bisnis** bisa disebut: bagian bisnis yang punya tujuan sendiri, misalnya stok, pemesanan, atau tagihan. Agent tidak mulai merancang sebelum bisa menyebutnya.

Cerita pengguna biasanya berbentuk aktivitas yang melibatkan sesuatu: "pelanggan memesan teknisi; kalau teknisi menerima, jadwalnya terkunci". Karena itu **calon entity dan calon use case ditemukan bersamaan**: kata bendanya (*pelanggan, teknisi, pesanan, jadwal*) menjadi calon entity, dan kata kerjanya (*memesan, menerima*) menjadi calon use case. Keduanya dicatat sebagai kandidat istilah, belum resmi. Celah yang muncul ("bagaimana kalau teknisi tidak menjawab?") menjadi pertanyaan wawancara berikutnya.

Klasifikasi (DEV-3) dan glosarium (DEV-6) hanya sebaik daftar area yang menjadi dasarnya. Agent yang merancang dari deskripsi pertama mengisi kekosongan dengan tebakan, dan tebakan yang salah tentang bisnis baru terlihat setelah banyak hal dibangun di atasnya.

### DEV-2. Screen adalah petunjuk: terima sebagai bahan, lalu gali use case-nya

> Dirumuskan ulang sesuai arahan pemilik (2026-11-21). Dulu B1, berbunyi "mulai dari daftar use case, bukan dari daftar screen", bertingkat **Opsional**. Di sini diletakkan sebagai **Wajib**; perubahan tingkat ini belum diputuskan pemilik.

Manusia hampir selalu menjelaskan kebutuhannya lewat screen: "saya ingin yang seperti ini". Itu wajar, dan tidak ditolak. Screen hanya puncak gunung es. Dari setiap screen yang ditunjukkan, agent menggali use case di baliknya:
- apa yang **diputuskan** ketika tombol ditekan;
- apa yang bisa **gagal**, dan apa jawabannya;
- **siapa lagi** yang memanggil operasi yang sama (job, sistem lain);
- apa yang terjadi kalau dua orang melakukannya **bersamaan**.

**Mockup** boleh dibuat untuk mempelajari alur bersama pemilik, dengan dua syarat:
- ditandai sebagai **alat belajar yang akan dibuang**, bukan sebagian aplikasi;
- setiap screen-nya digali menjadi use case seperti di atas.

Mockup dan peta skenario (DEV-10) saling melengkapi: mockup menunjukkan bentuk interaksi, peta menunjukkan state, waktu, dan celah yang tidak pernah tampak di screen.

Agent juga menjelaskan kepada pemilik, dalam bahasa awam, bahwa screen yang selesai belum berarti aplikasinya selesai. Screen yang use case-nya belum dibangun sengaja belum lengkap, bukan rusak.

### DEV-3. Klasifikasikan setiap area bisnis sebagai Core, Supporting, atau Generic

Satuan klasifikasi adalah **area bisnis**: satu set use case yang saling bergantung. Satu use case mengubah state yang menentukan use case lain bisa bergerak, sehingga semua use case dalam area Core adalah Core. Setengah area yang dibangun dalam-dalam sementara setengahnya dibiarkan sebagai stub tidak akan berjalan.

Kelasnya diukur dari **kapan bagian itu harus ada** (keputusan pemilik, 2026-11-22):

| Kelas | Artinya | Contoh |
| --- | --- | --- |
| **Core** | area yang mewujudkan tujuan utama aplikasi dibuat. Kalau tujuan itu belum tercapai, Core belum selesai. | alur aplikasi, state utama, peran pengguna yang terlibat |
| **Supporting** | kemampuan yang dibutuhkan Core, tetapi versi aslinya bisa menunggu. Selama menunggu, ia berupa stub, dummy, atau versi sederhana (DEV-8), dan dicatat sebagai utang Planned. | algoritma perhitungan biaya, geolokasi yang menentukan alur |
| **Generic** | kemampuan yang dianggap sudah ada dan tidak perlu diputuskan bersama pemilik; biasanya diambil dari pustaka atau layanan luar ("dianggap sudah ada" di DEV-8). | registrasi, login |

Supporting bisa sangat penting bagi bisnis (cara menghitung harga sering justru pembedanya). Ia Supporting bukan karena kurang penting, tetapi karena bisa **digantikan sementara** sampai Core selesai.

**Kualitas bukan kelas.** Query yang optimal dan keamanan bukan area. Optimisasi dipimpin manusia (GW-13 di [gateway.md](../konsep/gateway.md)). Identitas dan otorisasi belum punya aturan (`TEMUAN.md`, temuan 15).

Dengan ukuran yang sama setiap kali, dua agent berbeda memberi jawaban yang sama.

> Definisi lama (dulu P2) mengikuti subdomain DDD: Core "kalau salah, bisnis kehilangan alasan keberadaannya", Supporting "khas bisnis ini tetapi bukan pembeda", Generic "dimiliki hampir setiap aplikasi". Diganti atas keputusan pemilik (`TEMUAN.md`, temuan 17).

### DEV-4. Pemilik yang memutuskan klasifikasi; agent hanya mengusulkan beserta alasannya

Agent mengusulkan kelas untuk setiap area dan menjelaskan alasannya menurut DEV-3. Ia tidak menganggap usulannya disetujui. Pemilik menerima atau mengubahnya, dan jawaban pemilik adalah klasifikasinya.

Apa yang menjadi tujuan sebuah bisnis hanya diketahui pemiliknya. Kelas yang salah mengirim pekerjaan terdalam ke bagian aplikasi yang salah, dan biayanya baru terlihat belakangan.

### DEV-5. Catat klasifikasi di `docs/AREAS.md`

| Area | Class | Reason | Decision |
| --- | --- | --- | --- |
| Stock | Core | The business is moving stock between places without losing track of it | Accepted, owner, 2026-02-03 |
| Notifications | Generic | Every application tells its users something | Accepted, owner, 2026-02-03 |

- `Class` salah satu dari `Core`, `Supporting`, atau `Generic`.
- `Reason` alasannya menurut DEV-3, dalam satu baris.
- `Decision` menyebut pemilik dan tanggal keputusannya, serta apakah pemilik menerima atau mengubah usulannya.

Nama dan letak berkasnya tetap, supaya planner, reviewer, atau pemeriksaan mesin menemukannya tanpa diberi tahu. Planner atau reviewer membacanya untuk mengurutkan dan menimbang pekerjaan, tanpa harus tahu arti Core.

Klasifikasi yang hanya hidup di percakapan hilang bersama percakapannya. Berkas di repo dibaca siapa pun yang merencanakan atau mereview berikutnya, dan keputusan pemilik di dalamnya adalah satu hal yang tidak boleh direka ulang dari ingatan.

### DEV-6. Sepakati istilah bisnis di `docs/GLOSSARY.md` sebelum entity atau use case mana pun dinamai

Glosarium adalah bentuk tertulis dari **ubiquitous language** dalam Domain-Driven Design: satu bahasa yang dipakai sama oleh pemilik, di kode, dan di percakapan.

| Term | Meaning |
| --- | --- |
| Warehouse | A place where stock is kept, with a name and a count of units for each product |
| Stock | The units of one product that a warehouse holds |

- **Setiap nama entity dan setiap nama area bisnis ada di glosarium**, beserta artinya. Entity atau area yang tidak ada di glosarium belum disepakati.
- Kata yang punya dua arti di bisnis mendapat satu istilah untuk setiap arti, dengan kata-kata pemilik, sebelum salah satunya dipakai.
- Glosarium diubah ketika bahasanya berubah, dan nama di kode ikut diubah.

Entity atau use case yang dinamai sebelum istilahnya disepakati membawa tebakan agent, dan tebakan itu menyebar ke setiap berkas yang memakai namanya. Mengganti nama belakangan lebih mahal daripada sepakat lebih dulu, dan dua nama untuk satu hal menjadi dua entity.

> **Belum diputuskan pemilik.** Dalam DDD, ubiquitous language berlaku di dalam satu **bounded context**, dan kata yang sama boleh berarti lain di context lain. Aturan di atas ("satu kata untuk satu hal") berlaku untuk seluruh aplikasi, lebih ketat dari DDD (`TEMUAN.md`, temuan 16).

### DEV-7. Rancang hanya area Core lebih dulu: use case-nya, entity dasarnya, dan alurnya

Untuk area Core, dan hanya untuk itu, agent menyusun use case, entity dasar, dan alur di antaranya, dengan kata-kata glosarium. Area Supporting dan Generic **tidak dimulai sebelum dibutuhkan**.

Ini mungkin karena use case mengenal gateway hanya lewat kontraknya (UC-9): Core bisa dirancang, dibangun, dan dites sementara apa yang ada di balik gateway belum diputuskan.

Core adalah tempat bisnis berdiri, jadi ia mendapat pemikiran terbanyak dan pertama. Merancang sisanya dalam putaran yang sama menghabiskan tenaga untuk bagian yang dimiliki setiap aplikasi, dan yang bisa berubah setelah Core dikenal.

### DEV-8. Kebutuhan Core dari area lain ditangani dengan salah satu dari tiga cara, dan setiap cara dicatat

| Cara | Artinya | Yang dicatat |
| --- | --- | --- |
| **Stub** | pengganti palsu di balik kontrak gateway; area aslinya dibangun belakangan oleh lapis berikutnya, yang melunasi utangnya | kontrak gateway, apa yang dilakukan stub sebagai pengganti, dan lapis mana yang menggantinya |
| **Dianggap sudah ada** | layanan luar atau pustaka menyediakannya, aplikasi hanya memanggilnya | apa yang dianggap dilakukannya, siapa penyedianya, dan apa yang tidak bisa berjalan tanpanya |
| **Disederhanakan** | versi minimal yang benar-benar berjalan, bukan palsu | apa yang dilakukan dan ditinggalkan versi itu, dan apa yang akan membuatnya tumbuh |

Pemilik menyetujui caranya, dan keputusannya dicatat bersamanya, di samping use case Core yang membutuhkannya. Stub yang meninggalkan utang diberi penanda (lihat [utang-teknis.md](utang-teknis.md)).

Use case Core yang diam-diam bergantung pada sesuatu yang belum dibangun akan salah atau macet. Menyebut caranya membuat ketergantungan itu terlihat, dan menuliskannya membuat pembaca berikutnya bisa membedakan stub yang menunggu lapisnya dari bagian yang terlupa.

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

Nama dan letak berkasnya tetap, supaya reviewer atau pemeriksaan mesin menemukannya tanpa diberi tahu.

Hasil rancangan Core adalah hal terpanjang yang disepakati dengan pemilik, dan kode ditulis darinya. Kalau hanya ada di percakapan, ia hilang, dan stub serta penyederhanaan di dalamnya terlupa. Begitulah bagian yang menunggu lapisnya menjadi bagian yang tidak diketahui siapa pun belum selesai.

### DEV-10. Tulis alur setiap proses bisnis sebagai satu peta skenario di `docs/scenarios/<process>.json`

`<process>` adalah nama proses dalam snake_case, misalnya `stock_transfer`, dan sekaligus nama berkas petanya. Peta menggambarkan:
- **state**-nya, situasi yang bisa dialami proses;
- **pilihan** setiap aktor di setiap state, dan state yang dituju setiap pilihan;
- **batas waktu**-nya, apa yang terjadi ketika waktu berlalu dan tidak ada yang bertindak;
- **celah**-nya, pertanyaan tentang proses yang belum dijawab pemilik, masing-masing dengan id tetap.

Yang ditetapkan aturan ini hanya celah. Peta punya array `gaps` di tingkat atas, dan setiap celah adalah objek dengan:
- `id`: `<process>-<n>`, dengan `<process>` nama berkas peta dan `<n>` sebuah bilangan, misalnya `stock_transfer-3`. Id unik di semua peta aplikasi dan tidak pernah dipakai ulang, bahkan setelah celahnya ditutup;
- `question`: pertanyaan terbukanya, dengan kata-kata glosarium;
- `decision`: hanya setelah pemilik menjawab, jawabannya beserta tanggal.

| Field di `gaps` | Nilai |
| --- | --- |
| `id` | `stock_transfer-3` |
| `question` | What happens to a transfer that nobody receives within three days? |
| `decision` | tidak ada sampai pemilik menjawab |

Cara menulis state, pilihan, dan batas waktu mengikuti skema **scenario-explorer** (repo `~/Workspace/scenario-explorer`), alat untuk menulis, menjelajah, dan memeriksa peta. Aturan ini tidak menetapkannya sendiri. Id celah ditetapkan di sini karena pemeriksaan berikutnya, dan penanda utang di kode, harus menemukannya di satu tempat: array `gaps` sebuah berkas di bawah `docs/scenarios/`.

Agent tidak boleh mengarang aturan bisnis. Kondisi yang hanya diduga ditulis sebagai celah, bukan sebagai cabang.

Alur yang ditulis sebagai prosa menyembunyikan lubangnya: state tanpa jalan keluar, pilihan tanpa aturan, penantian tanpa batas. Menulis setiap state, pilihan, dan batas secara terpisah membuat yang hilang terlihat, dan id yang tidak pernah berubah membuat kode dan review bisa menunjuk ke celah itu dengan tepat.

### DEV-11. Tulis kode hanya setelah kedua gerbang dan rancangan Core, dan tulis Core lebih dulu, sampai tuntas, sebelum lapis lain

Tidak ada kode sebelum area bisnis diklasifikasi dan diputuskan (DEV-3 sampai DEV-5), istilah disepakati (DEV-6), dan Core dirancang dengan setiap ketergantungan ke area lain sudah ditangani dan hasilnya dicatat (DEV-7 sampai DEV-10). Mockup di DEV-2 bukan kode aplikasi. Lalu Core dibangun lebih dulu, sampai tuntas: entity-nya, use case-nya, dan tesnya, sampai berjalan.

Kode yang ditulis sebelum kesepakatan ditulis berdasarkan tebakan, dan harus dibongkar ketika tebakannya salah. Membangun Core lebih dulu membuat bagian tempat bisnis berdiri menjadi bagian yang paling teruji, dan sisanya dibangun di atas sesuatu yang berjalan.

### DEV-12. Bangun area Supporting dan Generic hanya sejauh yang dibutuhkan utang Core yang tercatat

Urutan lapisnya: Core lebih dulu, lalu area Supporting dan Generic. Area Supporting atau Generic dibangun hanya sejauh yang dibutuhkan utang yang dicatat Core, tidak lebih. Setelah Core selesai (DEV-14), daftar utangnya menjadi backlog lapis berikutnya.

Apa pun yang dibutuhkan use case Core dari area lain menjadi stub, anggapan, atau versi sederhana. Jadi utangnya direncanakan, bukan kegagalan: memang begitulah urutan ini bekerja. Membangun area Supporting atau Generic melebihi yang dipakai Core berarti menulis kode sebelum dibutuhkan, dan kode itu yang pertama diganti ketika Core dikenal.

### DEV-13. Di dalam satu area, kerja berputar satu use case setiap kali, dan satu area dikerjakan satu sesi AI

Keputusan pemilik (2026-11-22). Untuk setiap use case di area yang sedang dikerjakan:
1. **Use case:** kontraknya (Request, Response, kontrak gateway yang dibutuhkan) dan alurnya, dari peta skenario.
2. **Entity:** fungsi entity yang ditemukan dari alur itu, beserta tesnya.
3. **Gateway dummy** (GW-14) di balik kontrak gateway yang belum punya implementasi asli.
4. **`impl` use case** beserta tesnya dengan fake.

Lalu use case berikutnya di area yang sama, dengan putaran yang sama. Setelah area punya beberapa use case: config dan wrapper yang dibutuhkan, awal aplikasi (`main.ts`) dan satu tes integrasi (KOM-11), dan penanda utang untuk setiap celah dan stub ([utang-teknis.md](utang-teknis.md)).

Use case menunjukkan aturan entity mana yang benar-benar dibutuhkan, sehingga tidak ada fungsi entity yang dibuat "untuk jaga-jaga". Entity tetap ditulis sebelum `impl` use case karena use case memanggilnya, dan reviewer bisa memeriksa aturan bisnis terpisah dari alurnya.

**Satu area, satu sesi AI.** Satu area idealnya dikerjakan oleh satu sesi AI dari awal sampai kerangkanya berjalan. Dua sesi pasti bisa memutuskan hal berbeda tentang entity, nama, atau alur yang sama, dan konflik itu tidak perlu terjadi.

**Kerja paralel** boleh, tetapi harus dipertimbangkan sangat matang sebelum dimulai. Ia baru layak ketika sebagian besar entity sudah terbentuk dan use case Core sudah selesai. Yang paling cocok dikerjakan paralel adalah area Supporting dan Generic, masing-masing oleh sesinya sendiri.

### DEV-14. Kerangka Core dan Core selesai

Ada dua tingkat (keputusan pemilik, 2026-11-22).

**Kerangka Core berjalan** ketika alur aplikasi, state utama, dan peran pengguna yang terlibat sudah ada di kode, skenario positif berjalan, dan beberapa contoh skenario negatif juga berjalan. Pada tingkat ini aplikasi sudah punya kerangka dasarnya.

**Core selesai** ketika tujuan utama aplikasi tercapai, yaitu ketika keduanya terpenuhi:
- setiap langkah jalur utama dan setiap cabang di peta skenarionya punya tes;
- setiap celah di peta itu punya penanda di use case yang bersangkutan, atau keputusan pemilik yang tercatat (field `decision` di celah itu).

Apakah gateway-nya sudah asli bukan bagian dari syarat ini: selama pengembangan, gateway boleh tetap dummy di memori. Dummy yang menggantikan lapis berikutnya adalah utang Planned dan diberi penanda. Dummy yang hanya ada supaya Core bisa dikembangkan dan dites tidak diberi penanda.

"Selesai" harus bisa diperiksa reviewer terhadap berkas. Peta dengan tes untuk setiap cabangnya menunjukkan alurnya berjalan, dan penanda atau keputusan untuk setiap celah menunjukkan setiap pertanyaan terbuka sudah dibiarkan sebagai utang yang terlihat atau sudah dijawab. Mensyaratkan gateway asli akan menghentikan Core pada lapis yang justru dibangun setelahnya.

Penjejak use case di scenario-explorer membantu membuktikannya: ia menjalankan pilihan peta yang bertautan ke use case dan menghitung mana yang jalan, mana yang tidak cocok, dan celah mana yang sudah punya penanda.

## Yang bisa diperiksa reviewer

Sebagian besar proses ini disepakati di percakapan dan tidak terlihat di repo. Yang terlihat, dan harus diperiksa reviewer dengan membaca (`REVIEW_CHECKLIST.md` menyebut yang mana):
- `docs/AREAS.md` dan `docs/GLOSSARY.md` ada, dengan nama dan di tempat ini (DEV-5, DEV-6);
- setiap baris `docs/AREAS.md` punya salah satu dari tiga kelas, alasan, dan keputusan (DEV-5);
- setiap nama entity dan nama area bisnis ada di `docs/GLOSSARY.md` (DEV-6);
- `docs/CORE.md` ada dan memuat use case, entity, gateway, keputusan, serta setiap stub, anggapan, dan penyederhanaan area Core (DEV-9);
- setiap proses bisnis punya berkas di `docs/scenarios/`, masing-masing dengan array `gaps` yang id-nya berbentuk `<process>-<n>` dan unik di semua berkas (DEV-10);
- syarat Core selesai (DEV-14), dan aturan utang di [utang-teknis.md](utang-teknis.md): setiap celah punya penanda atau keputusan, tidak ada penanda untuk celah yang tidak ada, tidak ada kode usang, dan tidak ada kerangka use case di area yang tidak sedang dikerjakan.

Aturan lainnya diperiksa bersama pemilik, bukan di kode: wawancara, klasifikasi sebagai keputusan pemilik, penanganan kebutuhan Core, urutan kerja termasuk urutan lapisnya (DEV-12), dan satu area satu sesi AI (DEV-13).
