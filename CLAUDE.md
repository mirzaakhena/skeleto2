# Skeleto (lite)

Dokumen ini adalah panduan dasar untuk setiap sesi AI yang mengerjakan repo ini. Baca sampai habis sebelum menulis kode.

> Nama `skeleto` adalah nama kerja. Kalau nama final ditetapkan, yang berubah hanya nama paket, nama kelas `Skeleto`, dan `SkeletoOptions`. Perilakunya tidak berubah.

## 1. Tujuan

Skeleto adalah framework TypeScript yang mengerjakan **binding otomatis** komponen berbasis fungsi (closure) lewat penanda JSDoc `@Config`, `@Wrapper`, `@UseCase`, dan `@Gateway`.

Skeleto memindai berkas TypeScript, membaca penanda dan tipe parameter setiap fungsi, mengurutkan dependency, memanggil setiap fungsi dengan dependency-nya, memasang wrapper ke setiap action (`@UseCase` dan `@Gateway` adalah dua jenis action), menjaga aturan dependency antar jenisnya, lalu menyimpan hasilnya di sebuah container.

### 1.1 Untuk apa (keputusan pemilik, 2026-11-22)

Binding adalah *cara*, bukan *tujuan*. Kode aplikasi sekarang hampir seluruhnya ditulis AI, yang tidak deterministik. Skeleto memberi kode itu **satu struktur standar yang dijaga mesin**, supaya manusia bisa mereview dengan cepat tanpa mempelajari struktur dari awal, dan supaya bisnis dibangun dari bagian yang paling penting lebih dulu. Strukturnya tidak harus yang ini; yang penting ada satu standar.

Skeleto ada untuk:

1. Merangkai kode secara otomatis (binding dengan dependency injection).
2. Menjaga kode mudah dibaca lewat struktur yang konsisten dan konsep yang teruji (clean architecture).
3. Memandu proses dan tahapan pengembangan.
4. Menunjukkan bagian mana yang layak didahulukan (Core lebih dulu).
5. Menjadi pagar otomatis bagi kode buatan AI: pelanggaran struktur ditolak mesin saat startup, tidak bergantung pada ketelitian reviewer.
6. Mempercepat review: setiap berkas punya peran yang jelas, jadi reviewer tahu harus mencari apa dan di mana.
7. Memisahkan logika dari infrastruktur, supaya aturan bisnis bisa dites tanpa database atau jaringan, dan infrastruktur bisa diganti tanpa menyentuh logika.
8. Menjadikan pekerjaan yang belum selesai terlihat: celah, stub, dan utang ditandai dan bisa dihitung.
9. Menyimpan keputusan dan bahasa bisnis di repo aplikasi, bukan di percakapan.
10. Memungkinkan frontend dan backend dikerjakan bersamaan lewat kontrak use case.
11. Membuat aplikasi bisa dibaca dan diamati alat lain (container, metadata, observer).

Hanya butir 1, 5, dan 11 yang dikerjakan kode `src/`. Sisanya dikerjakan dokumen praktik di `docs/`, satu-satunya rangkaian aturan untuk aplikasi (`docs/README.md` mengatur cara membacanya; `REVIEW_CHECKLIST.md` memuat semua aturannya untuk reviewer). Saat menimbang perubahan, ukurannya bukan hanya "apakah ini binding?", tetapi juga "apakah ini membuat struktur lebih seragam dan lebih cepat direview?".

**Lingkup:** Skeleto menangani **low level design**, yaitu struktur di dalam satu aplikasi (komponen, nama, berkas, dependency, transaksi). **High level design** (pembagian sistem, layanan, broker pesan, deployment) di luar lingkupnya.

Hasil peninjauan konsep dan keputusan pemilik yang belum masuk dokumen ada di `TEMUAN.md`.

## 2. Prinsip "lite"

- **Binding, ditambah satu struktur action.** Selain binding, Skeleto hanya mengenal dua jenis action (use case dan gateway) dan menjaga aturan dependency di antaranya (4.6), karena tujuannya satu struktur standar yang dijaga mesin (1.1). Skeleto tidak tahu apa pun tentang HTTP, controller, request, response, validasi, OpenAPI, database, atau logging. Kalau sebuah fitur butuh pengetahuan tentang salah satu hal itu, fitur itu **bukan** milik Skeleto.
- **Tidak membaca isi tipe.** Skeleto hanya membaca *nama* return type dan *nama* tipe parameter. Ia tidak pernah membuka definisi tipe, tidak membaca field, dan tidak membaca decorator di field.
- **Satu dependency runtime saja: `ts-morph`.**
- **Kode inti kecil.** Patokannya sekitar 400 baris di `src/` (di luar tes). Angka ini panduan untuk menjaga inti tetap kecil, bukan batas yang menghentikan perubahan; ia hanya alasan untuk bertanya. Setiap tambahan harus bisa menjawab "kenapa ini harus ada di framework, bukan di aplikasi?".
- **Gagal lebih awal dan sekaligus.** Semua kesalahan pemakaian dilaporkan saat startup, **sebelum** satu pun berkas aplikasi diimpor, dan dilaporkan sekaligus, tidak satu per satu.

## 3. Fitur yang dibuang

Fitur berikut sengaja dibuang dan tidak boleh muncul lagi:

| Dibuang | Alasan |
| --- | --- |
| `{"readTypeArguments": true}` dan seluruh pembacaan payload (`request`, `response`, `Payload`, `TypeField`) | membuat usecase memuat konsep controller |
| `returnTypeDecorator` | hanya hidup di dalam pembacaan payload |
| Decorator field: `requestFields`, `responseFields`, `fieldDecorators`, `FieldDecoratorRule` | sama |
| `requiresTypeArguments` dan `validate` di aturan decorator | sama; daftar decorator cukup daftar nama |
| `printToLog` dan kode warna ANSI | kode mati |
| Jest | diganti `node:test` + `tsx` |
| `@Action` polos sebagai penanda | action tanpa aturan melewati semua aturan use case dan gateway; setiap action adalah `@UseCase` atau `@Gateway` |

## 4. Kontrak perilaku

Inilah spesifikasi yang harus dipenuhi. Setiap butir di sini harus punya tes.

### 4.1 Penanda (JSDoc decorator)

- Penanda adalah baris di dalam blok JSDoc yang **diawali** `@Nama` (boleh didahului spasi dan `*`). `@` di tengah kalimat atau di alamat email **bukan** penanda.
- Teks setelah nama sampai penanda berikutnya (boleh berlanjut ke baris-baris di bawahnya) adalah **data** penanda.
- Data yang diawali `{` dibaca sebagai JSON. Data lain disimpan sebagai teks yang sudah di-trim. Tanpa data, nilainya `undefined`.
- JSON yang tidak valid adalah **kesalahan** (bukan peringatan).
- Tag JSDoc standar (`@param`, `@returns`, `@deprecated`, `@example`, `@see`, `@throws`, `@todo`, dan sejenisnya) bukan penanda Skeleto dan diabaikan. Aturannya (keputusan pemilik): tag yang **diawali huruf kecil** adalah tag standar; penanda Skeleto diawali huruf besar. Satu pengecualian ada di 4.5: dengan `decorators` diberikan, tag berhuruf kecil yang sama dengan penanda kalau huruf besar-kecil tidak dibedakan adalah kesalahan.
- Aturan penempatan: penanda ditulis **setelah** deskripsi, satu per baris, tanpa teks selain datanya. Karena data berjalan sampai penanda berikutnya, kalimat sesudah penanda menjadi datanya: setelah penanda utama itu menghentikan startup, setelah penanda tambahan ia diam-diam menjadi datanya. Baris di dalam isi `@example` yang diawali penanda utama dibaca sebagai penanda sungguhan dan menjadikan fungsinya komponen. Aturan ini tidak dijaga kode; README menyebutnya.

### 4.2 Fungsi yang dipindai

- Skeleto memindai semua berkas `**/*.ts` di direktori yang diberikan, kecuali yang dikecualikan oleh daftar pengecualian.
- **Daftar pengecualian** berasal dari `SkeletoOptions.exclude`. Kalau opsi itu tidak diberikan, yang berlaku adalah konstanta `DEFAULT_EXCLUDE`: `node_modules`, `*.d.ts`, `*.test.ts`, `*.spec.ts`.
- Daftar yang diberikan **menggantikan** daftar bawaan, bukan menambahnya. Daftar kosong berarti semua berkas dipindai. Untuk menambah butir sendiri, tulis `[...DEFAULT_EXCLUDE, "generated"]`.
- Butir tanpa `*` adalah nama folder atau nama berkas, di kedalaman berapa pun (`node_modules`, `legacy.ts`). Folder yang dikecualikan tidak dimasuki sama sekali.
- Butir yang diawali `*` dicocokkan dengan **akhiran nama berkas** (`*.d.ts`), dan tidak pernah dengan nama folder.
- Perbandingannya persis (huruf besar dan kecil dibedakan) dan hanya terhadap nama **di bawah** direktori yang dipindai. Direktori yang diberikan ke `Skeleto.start` selalu dipindai, walaupun path-nya sendiri memuat nama yang dikecualikan.
- Direktori yang semua berkas `.ts`-nya dikecualikan dilaporkan sama seperti direktori tanpa berkas `.ts` (4.8).
- Sebuah fungsi menjadi komponen kalau ia **deklarasi fungsi tingkat atas** dan JSDoc-nya memuat tepat satu penanda utama: `@Config`, `@Wrapper`, `@UseCase`, atau `@Gateway`. Fungsi dengan lebih dari satu penanda utama (juga `@UseCase` bersama `@Gateway`) adalah kesalahan. `@Action` bukan penanda lagi (keputusan pemilik, 2026-11-22): fungsi yang bertanda `@Action`, dengan atau tanpa `decorators`, dan juga di samping penanda utama lain, adalah kesalahan satu baris per fungsi yang menyebut fungsi, berkas, dan saran memakai `@UseCase` atau `@Gateway`; dengan `decorators`, `@action` berhuruf kecil mendapat saran yang sama, dan `@Action` di konstanta, namespace, atau method dilaporkan seperti penanda utama lain yang salah tempat. Tes: `test/scanner.test.ts` (bagian "the removed @Action marker") dan `test/skeleto.test.ts` (`@Action` berhenti sebelum impor).
- Kesalahan:
  - fungsi berpenanda utama yang tidak di-`export`;
  - fungsi berpenanda utama tanpa anotasi return type;
  - fungsi dengan lebih dari satu penanda utama;
  - parameter tanpa anotasi tipe;
  - dua fungsi yang mengembalikan nama tipe yang sama;
  - fungsi berpenanda utama yang diekspor lewat daftar ekspor (`export { implX }`) dan bukan `export function implX`: hanya bentuk kedua yang dihitung, satu cara saja (keputusan pemilik, 2026-11-22); pesannya menyebut fungsinya dan meminta `export function` (tes di `test/scanner.test.ts`);
  - fungsi berpenanda utama yang ditulis dengan `declare` (tidak punya isi untuk dipanggil): dilaporkan sebelum berkas mana pun diimpor, menyebut fungsinya (tes di `test/scanner.test.ts` dan `test/skeleto.test.ts`);
  - butir `exclude` yang tidak bisa dinyatakan aturan di atas: memuat pemisah path (`generated/models`), memuat `*` selain di karakter pertama (`foo*`, `*.test.*`, `**/x`), hanya `*`, atau string kosong. Pesannya menyebut butir itu.
- Fungsi tingkat atas tanpa penanda utama, dan penanda utama di tempat lain (konstanta, fungsi di dalam namespace, method), dibiarkan tanpa pesan **kecuali** kalau `SkeletoOptions.decorators` diberikan. Dengan daftar itu, kesalahan penanda yang salah tulis atau salah tempat dilaporkan (4.5).

### 4.3 Nama dan dependency

- **Nama komponen** adalah teks anotasi return type-nya, persis seperti tertulis (`SaveUser`, `winston.Logger`).
- Pengecualian satu-satunya: `@Config` yang return type-nya tertulis `Promise<X>` adalah **config asinkron**, dan nama komponennya `X`, bukan `Promise<X>`. Yang dibaca tetap hanya teks anotasinya: hanya tulisan `Promise<...>` dengan tepat satu argumen yang dibuka, dan hanya satu lapis. Alias dari promise, `PromiseLike<X>`, atau `Promise<X> | undefined` tetap bernama seperti tertulis dan tidak ditunggu.
- Karena namanya sama, config yang mengembalikan `X` dan config yang mengembalikan `Promise<X>` adalah dua fungsi yang mengembalikan nama tipe yang sama (kesalahan 4.2).
- `@Wrapper`, `@UseCase`, dan `@Gateway` selalu sinkron. Return type `Promise<...>` pada semuanya adalah kesalahan yang menyebut nama fungsinya, dilaporkan bersama kesalahan lain sebelum ada berkas yang diimpor. Komponen yang bergantung padanya tidak dilaporkan lagi sebagai dependency yang tidak ada.
- **Dependency** adalah teks anotasi tipe setiap parameter, sesuai urutan parameter. Parameter `this` (`this: void`) hanya mengetik penerima, bukan argumen: ia bukan dependency dan tidak menggeser yang lain (tes di `test/scanner.test.ts` dan `test/skeleto.test.ts`).
- Dependency dicocokkan dengan nama komponen. Dependency yang tidak ada adalah kesalahan.
- Dependency yang tidak ada dilaporkan **satu kali** untuk setiap pasangan komponen dan nama dependency, walaupun nama itu tertulis di dua parameter. Dua komponen yang kehilangan dependency yang sama masing-masing mendapat satu baris.

### 4.4 Data penanda utama

| Penanda | Data yang sah |
| --- | --- |
| `@Config`, `@Wrapper` | tidak ada |
| `@UseCase`, `@Gateway` | tidak ada |

Data lain adalah kesalahan, satu pesan untuk semua jenis data: `@Wrapper {"order": 10}` sama salahnya dengan `@Config {}`. Dengan begitu sisa `{"readTypeArguments": true}` dari kode lama menghentikan startup.

### 4.5 Penanda tambahan dan daftar decorator

- Penanda selain penanda utama dan tag standar adalah **penanda tambahan** (`@Logging`, `@Transaction`). Nama dan datanya disimpan di `additionalDecorators`, sesuai urutan tulisannya.
- `SkeletoOptions.decorators` adalah daftar nama penanda tambahan yang sah, misalnya `["Logging", "Transaction"]`. Butir yang tidak diawali huruf besar atau memuat `@` (`"logging"`, `"@Logging"`) tidak akan pernah cocok dengan penanda mana pun: itu kesalahan opsi yang menyebut butirnya dan menyarankan tulisan yang benar, dilaporkan bersama kesalahan lain sebelum berkas diimpor; butir itu lalu dibuang dari daftar (tes di `test/skeleto.test.ts`).
- Kalau daftar itu diberikan, penanda tambahan yang tidak ada di dalamnya adalah kesalahan, misalnya `@Transction`.
- Kalau daftar itu diberikan, tiga hal berikut juga kesalahan, dilaporkan bersama kesalahan lain sebelum berkas aplikasi diimpor. Setiap pesannya menyebut nama fungsi atau konstanta, berkasnya, dan penandanya:
  - blok JSDoc fungsi tingkat atas yang memuat penanda (diawali huruf besar) tetapi tanpa penanda utama. Ini mencakup penanda utama yang salah tulis (`@Wraper`, `@Gatway`, `@Usecases`) dan penanda tambahan tanpa penanda utama;
  - tag berhuruf kecil di fungsi tingkat atas mana pun, komponen atau bukan, yang sama dengan penanda utama atau penanda yang sah kalau huruf besar dan kecil tidak dibedakan (`@transaction`, `@usecase`, `@wrapper`), juga kalau bloknya tidak memuat penanda sama sekali. Tag berhuruf kecil lain (`@param`, `@returns`, `@defaultValue`) tetap diabaikan;
  - penanda utama di blok JSDoc konstanta tingkat atas yang di-`export`, fungsi di dalam namespace, atau method class (static atau bukan; pesannya menyebut `Kelas.method`). Pesannya menyatakan bahwa hanya deklarasi fungsi tingkat atas yang bisa menjadi komponen.
- Kalau daftar itu tidak diberikan, semua penanda tambahan diterima, dan ketiga hal di atas dibiarkan tanpa pesan: wrapper bertanda `@Wraper` dilewati dan startup tetap berhasil.
- Yang tidak diperiksa, dengan atau tanpa daftar: penanda di komentar biasa (`//`, `/* */`) dan penanda di overload signature.

### 4.6 Aturan jenis dependency

| Komponen | Boleh bergantung pada |
| --- | --- |
| `@Config` | `@Config` |
| `@Wrapper` | `@Config` |
| `@Gateway` | `@Config` |
| `@UseCase` | `@Gateway` |

- Pelanggaran adalah kesalahan, dan pesannya menyebut kedua komponen dan jenisnya. Strukturnya satu garis lurus, controller -> use case -> gateway -> config, yang bisa dicek reviewer sekilas: use case hanya bergantung pada gateway (tidak pernah pada config atau use case), gateway hanya bergantung pada config (tidak pernah pada gateway lain atau use case) (keputusan pemilik, 2026-11-22). Aturan yang lebih ketat, use case tanpa config dan gateway tanpa gateway lain, juga keputusan pemilik (2026-11-22, `TEMUAN.md` temuan 18); tiap pelanggarannya punya tes di `test/skeleto.test.ts`.
- Jenis ditentukan oleh nama penanda utama di metadata (`mainDecorator.name`: `Config`, `Wrapper`, `UseCase`, `Gateway`); tidak ada field baru. Wrapper membedakan use case dari gateway lewat nama itu, tanpa penanda tambahan.
- Dependency melingkar adalah kesalahan, dan pesannya menampilkan jalur siklusnya (`A -> B -> A`).

### 4.7 Instansiasi

- Urutannya: semua `@Config`, lalu semua `@Wrapper`, lalu semua `@Gateway`, lalu semua `@UseCase`. Di dalam setiap kelompok, dependency selalu dibuat lebih dulu.
- Setiap fungsi dipanggil **tepat satu kali**, dengan dependency sesuai urutan parameternya.
- Hasil config asinkron (4.3) **ditunggu** sebelum komponen berikutnya dibuat. Yang disimpan di container dan disuntikkan ke setiap komponen yang bergantung padanya adalah nilai jadinya, instance yang sama untuk semuanya, bukan promise. Config asinkron ditunggu satu per satu menurut urutan pembuatan, tidak berbarengan (tes di `test/skeleto.test.ts`).
- Startup **tidak memasang batas waktu**: ia menunggu selama config itu menunggu. Batas waktu adalah urusan config itu sendiri (keputusan pemilik, 2026-11-16).
- Config asinkron yang gagal (promise-nya ditolak) menghentikan startup sama seperti config yang melempar error: pesannya menyebut nama komponen dan fungsinya, error aslinya menjadi `cause`, komponen sesudahnya tidak dibuat, dan startup berikutnya memindai ulang.
- Hasil komponen lain disimpan apa adanya dan tidak pernah ditunggu.
- Hasil `@UseCase` dan `@Gateway` dibungkus oleh **semua** `@Wrapper`. Wrapper dipanggil sebagai `wrapper(handler, metadata)` dan hasilnya menggantikan handler.
- Urutan pembungkusan adalah urutan penulisan, seperti kulit bawang: wrapper yang ditulis **pertama** menjadi lapisan **terdalam** (dipasang paling dulu), yang ditulis terakhir menjadi lapisan **terluar** dan berjalan paling dulu saat dipanggil. Antarberkas, urutannya mengikuti urutan pemindaian: berkas menurut urutan path, fungsi menurut urutan tulisnya. Path dibandingkan dengan `/` sebagai pemisah di semua sistem operasi (di Windows `\\` terurut lain daripada `/`), jadi `a/b.ts` terurut sebelum `a0.ts` (tes di `test/skeleto.test.ts`). Tidak ada aturan teknis tentang berkas tempat wrapper ditulis; satu berkas `src/wrappers.ts` hanya bawaan opsional di dokumen praktik (keputusan pemilik, 2026-11-22). Wrapper tetap dibuat menurut urutan dependency; hanya pelapisannya yang mengikuti urutan penulisan.
- Wrapper yang mengembalikan `handler` apa adanya berarti tidak membungkus.
- Fungsi `@UseCase`, `@Gateway`, fungsi `@Wrapper`, dan **setiap** pembungkusan harus menghasilkan fungsi. Hasil lain (`undefined`, objek, promise) menghentikan startup sama seperti komponen yang melempar error, dan startup berikutnya memindai ulang. Pesannya menyebut yang bersalah: action (dari jenis apa pun) dan fungsinya, atau wrapper dan fungsinya; untuk pembungkusan, wrapper dan fungsinya beserta action yang sedang dibungkus. Hasil `@Config` tidak diperiksa.
- Action (dari jenis apa pun) yang disuntikkan ke komponen lain adalah versi yang **sudah** dibungkus.

### 4.8 Startup dan container

- `Skeleto.start(directory = "src", options?)` mengembalikan `Promise<Skeleto>`.
- Satu instance per direktori (dibandingkan setelah path di-resolve). Pemanggilan bersamaan untuk direktori yang sama mendapat instance yang sama.
- Startup yang gagal tidak diingat: pemanggilan berikutnya memindai ulang. Startup yang gagal juga **tidak membatalkan** config yang sudah dibuat: config itu tetap hidup, dan startup berikutnya membuatnya lagi, sehingga loop percobaan ulang bisa membocorkan koneksi. Ini dicatat di README, bukan dicegah kode.
- Direktori tanpa berkas `.ts` adalah kesalahan. Direktori yang punya berkas `.ts` tetapi tidak satu pun komponen juga kesalahan, dilaporkan dengan cara yang sama.
- `SkeletoOptions.decorators` dan `SkeletoOptions.exclude`, kalau diberikan, harus berupa daftar teks. Nilai lain (teks, `null`, bilangan, daftar yang memuat sesuatu selain teks) adalah kesalahan yang menyebut nama opsinya dan nilai yang diterima, diperiksa sebelum pemindaian dan dilaporkan dalam `Error` yang sama dengan kesalahan lain. Opsi yang salah lalu dianggap tidak diberikan, supaya pemindaian tetap menemukan kesalahan lain. Opsi yang tidak diberikan atau `undefined` bukan kesalahan.
- Semua kesalahan di 4.1 sampai 4.6 dikumpulkan dan dilempar sebagai **satu** `Error`, sebelum berkas aplikasi mana pun diimpor. Setiap baris pesannya menyebut nama fungsi atau nama tipe yang bermasalah.
- Batas "sebelum diimpor": hanya kesalahan yang bisa dilihat dari teks sumber yang dilaporkan sebelum impor. Yang baru terlihat saat impor (kesalahan sintaks, berkas yang melempar error di tingkat modul) muncul sebagai error impor, setelah config yang lebih dulu dibuat; Node juga menyimpan modul yang gagal dimuat sampai proses berhenti.
- Nama tipe dicocokkan sebagai teks persis seperti tertulis: `Map<string,number>` dan `Map<string, number>` adalah dua nama berbeda.
- `getContainer()` mengembalikan `Map<string, FuncInstanceMetadata>`, berisi **semua** komponen (`@Config`, `@Wrapper`, `@UseCase`, `@Gateway`) dengan kunci nama komponen.

## 5. API publik

Seluruh API publik adalah yang diekspor `src/index.ts`; definisinya ada di `src/type.ts` dan `src/skeleto.ts`. Nama-nama ini adalah kontrak bagi setiap pemakai paket, jadi mengubah, mengganti nama, atau menghapusnya merusak kode mereka; jangan diubah tanpa keputusan pemilik.

`exclude` dan `DEFAULT_EXCLUDE` ada supaya berkas tes, berkas `.d.ts`, dan `node_modules` tidak ikut terpindai. `getMetadata()` dipertahankan karena murah dan berguna untuk menelusuri isi container.

## 6. Struktur repo

Letak berkas terlihat dari `src/` dan `test/`. Yang tidak terlihat dari kode:

- Hanya `scanner.ts` yang mengimpor `ts-morph`.
- `decorator.ts` dan `dependency.ts` adalah fungsi murni dan diuji tanpa berkas.
- `scanner.ts` mengembalikan daftar metadata beserta letak fungsinya (path berkas dan nama fungsi), dan **tidak** mengimpor berkas aplikasi.
- `skeleto.ts` yang mengimpor berkas aplikasi, dengan `import()` dinamis, setelah semua pemeriksaan lolos.

## 7. Gaya kode

- TypeScript `strict`, ESM (`"type": "module"`, `module` dan `moduleResolution` `NodeNext`). Impor relatif selalu berakhiran `.js`.
- `type`, bukan `interface`. Union string, bukan `enum`.
- Fungsi bernama memakai `function`. Arrow function hanya untuk callback.
- Class hanya `Skeleto` dan `FuncInstanceMetadata`, karena keduanya bagian API publik. Selain itu tidak ada class, termasuk untuk pengurut dependency.
- Tidak ada `default export`. Tidak ada `console.log` di `src/`.
- Lebar baris sekitar 180 karakter, dua spasi, titik koma, kutip ganda.
- Identifier, komentar kode, pesan error, dan nama tes dalam bahasa Inggris. Dokumen untuk AI (berkas ini) dalam bahasa Indonesia. `README.md` dalam bahasa Inggris karena untuk publik.
- Komentar menjelaskan **alasan**, bukan mengulang kode.

## 8. Testing

- `node:test` dan `node:assert/strict`, dijalankan dengan `tsx --test`.
- Tes pemindai dan startup menulis fixture ke direktori sementara (`mkdtemp`), satu direktori per kasus, dan menghapusnya setelah selesai.
- Setiap butir di bagian 4 punya minimal satu tes. Tes kesalahan memeriksa bahwa pesannya menyebut nama fungsi atau tipe yang bermasalah.
- Ada tes yang membuktikan startup gagal **sebelum** berkas aplikasi diimpor: berkas fixture berisi `throw` di tingkat modul, dan errornya tetap error validasi, bukan error dari `throw` itu.
- Ada tes yang membuktikan urutan wrapper menurut urutan penulisan, dalam satu berkas dan antarberkas.

## 9. Perintah

Sebelum menyatakan selesai, `npm run typecheck`, `npm test`, dan `npm run build` (skrip di `package.json`) harus lulus.
