# Skeleto (lite)

Dokumen ini adalah panduan dasar untuk setiap sesi AI yang mengerjakan repo ini. Baca sampai habis sebelum menulis kode.

> Nama `skeleto` adalah nama kerja. Kalau nama final ditetapkan, yang berubah hanya nama paket, nama kelas `Skeleto`, dan `SkeletoOptions`. Perilakunya tidak berubah.

## 1. Tujuan

Skeleto adalah framework TypeScript yang **hanya** mengerjakan satu hal: **binding otomatis** komponen berbasis fungsi (closure) lewat penanda JSDoc `@Config`, `@Wrapper`, dan `@Action`.

Skeleto memindai berkas TypeScript, membaca penanda dan tipe parameter setiap fungsi, mengurutkan dependency, memanggil setiap fungsi dengan dependency-nya, memasang wrapper ke setiap action, lalu menyimpan hasilnya di sebuah container.

Pemakai utamanya adalah proyek `~/Workspace/nukitu`. Convention proyek itu (`~/Workspace/nukitu/CLAUDE.md`) menjelaskan cara aplikasi memakai Skeleto. Bacalah bagian 3 dan 10 di sana untuk memahami konteksnya.

## 2. Prinsip "lite"

- **Hanya binding.** Skeleto tidak tahu apa pun tentang HTTP, controller, request, response, validasi, OpenAPI, database, atau logging. Kalau sebuah fitur butuh pengetahuan tentang salah satu hal itu, fitur itu **bukan** milik Skeleto.
- **Tidak membaca isi tipe.** Skeleto hanya membaca *nama* return type dan *nama* tipe parameter. Ia tidak pernah membuka definisi tipe, tidak membaca field, dan tidak membaca decorator di field.
- **Satu dependency runtime saja: `ts-morph`.**
- **Kode inti kecil.** Targetnya di bawah 400 baris di `src/` (di luar tes). Setiap tambahan harus bisa menjawab "kenapa ini harus ada di framework, bukan di aplikasi?".
- **Gagal lebih awal dan sekaligus.** Semua kesalahan pemakaian dilaporkan saat startup, **sebelum** satu pun berkas aplikasi diimpor, dan dilaporkan sekaligus, tidak satu per satu.

## 3. Aturan menulis ulang

Repo ini adalah **tulis ulang**, bukan perbaikan, dari `~/Workspace/review-skeleto`.

- `review-skeleto` hanya **rujukan perilaku**. Bacalah untuk memahami apa yang dilakukan, lalu tulis ulang dari nol mengikuti dokumen ini.
- **Jangan menyalin** kode, struktur berkas, nama fungsi internal, atau tes dari sana.
- **Jangan mengubah** apa pun di `review-skeleto`.
- Kalau perilaku di `review-skeleto` berbeda dari dokumen ini, **dokumen ini yang benar**.

Yang sengaja **dibuang** dari `review-skeleto` dan tidak boleh muncul lagi:

| Dibuang | Alasan |
| --- | --- |
| `{"readTypeArguments": true}` dan seluruh pembacaan payload (`request`, `response`, `Payload`, `TypeField`) | membuat usecase memuat konsep controller |
| `returnTypeDecorator` | hanya hidup di dalam pembacaan payload |
| Decorator field: `requestFields`, `responseFields`, `fieldDecorators`, `FieldDecoratorRule` | sama |
| `requiresTypeArguments` dan `validate` di aturan decorator | sama; daftar decorator cukup daftar nama |
| `printToLog` dan kode warna ANSI | kode mati |
| Jest | diganti `node:test` + `tsx` |

## 4. Kontrak perilaku

Inilah spesifikasi yang harus dipenuhi. Setiap butir di sini harus punya tes.

### 4.1 Penanda (JSDoc decorator)

- Penanda adalah baris di dalam blok JSDoc yang **diawali** `@Nama` (boleh didahului spasi dan `*`). `@` di tengah kalimat atau di alamat email **bukan** penanda.
- Teks setelah nama sampai penanda berikutnya (boleh berlanjut ke baris-baris di bawahnya) adalah **data** penanda.
- Data yang diawali `{` dibaca sebagai JSON. Data lain disimpan sebagai teks yang sudah di-trim. Tanpa data, nilainya `undefined`.
- JSON yang tidak valid adalah **kesalahan** (bukan peringatan).
- Tag JSDoc standar (`@param`, `@returns`, `@deprecated`, `@example`, `@see`, `@throws`, `@todo`, dan sejenisnya) bukan penanda Skeleto dan diabaikan.

### 4.2 Fungsi yang dipindai

- Skeleto memindai semua berkas `**/*.ts` di direktori yang diberikan, kecuali yang dikecualikan oleh daftar pengecualian.
- **Daftar pengecualian** berasal dari `SkeletoOptions.exclude`. Kalau opsi itu tidak diberikan, yang berlaku adalah konstanta `DEFAULT_EXCLUDE`: `node_modules`, `*.d.ts`, `*.test.ts`, `*.spec.ts`.
- Daftar yang diberikan **menggantikan** daftar bawaan, bukan menambahnya. Daftar kosong berarti semua berkas dipindai. Untuk menambah butir sendiri, tulis `[...DEFAULT_EXCLUDE, "generated"]`.
- Butir tanpa `*` adalah nama folder atau nama berkas, di kedalaman berapa pun (`node_modules`, `legacy.ts`). Folder yang dikecualikan tidak dimasuki sama sekali.
- Butir yang diawali `*` dicocokkan dengan **akhiran nama berkas** (`*.d.ts`), dan tidak pernah dengan nama folder.
- Perbandingannya persis (huruf besar dan kecil dibedakan) dan hanya terhadap nama **di bawah** direktori yang dipindai. Direktori yang diberikan ke `Skeleto.start` selalu dipindai, walaupun path-nya sendiri memuat nama yang dikecualikan.
- Direktori yang semua berkas `.ts`-nya dikecualikan dilaporkan sama seperti direktori tanpa berkas `.ts` (4.8).
- Sebuah fungsi menjadi komponen kalau ia **deklarasi fungsi tingkat atas** dan JSDoc-nya memuat tepat satu penanda utama: `@Config`, `@Wrapper`, atau `@Action`.
- Kesalahan:
  - fungsi berpenanda utama yang tidak di-`export`;
  - fungsi berpenanda utama tanpa anotasi return type;
  - fungsi dengan lebih dari satu penanda utama;
  - parameter tanpa anotasi tipe;
  - dua fungsi yang mengembalikan nama tipe yang sama;
  - butir `exclude` yang tidak bisa dinyatakan aturan di atas: memuat pemisah path (`generated/models`), memuat `*` selain di karakter pertama (`foo*`, `*.test.*`, `**/x`), hanya `*`, atau string kosong. Pesannya menyebut butir itu.

### 4.3 Nama dan dependency

- **Nama komponen** adalah teks anotasi return type-nya, persis seperti tertulis (`SaveUser`, `winston.Logger`).
- **Dependency** adalah teks anotasi tipe setiap parameter, sesuai urutan parameter.
- Dependency dicocokkan dengan nama komponen. Dependency yang tidak ada adalah kesalahan.

### 4.4 Data penanda utama

| Penanda | Data yang sah |
| --- | --- |
| `@Config` | tidak ada |
| `@Action` | tidak ada |
| `@Wrapper` | tidak ada, atau `{"ordinal": <bilangan bulat>}` |

Data lain adalah kesalahan. Dengan begitu sisa `{"readTypeArguments": true}` dari kode lama menghentikan startup.

### 4.5 Penanda tambahan dan daftar decorator

- Penanda selain penanda utama dan tag standar adalah **penanda tambahan** (`@Logging`, `@Transaction`). Nama dan datanya disimpan di `additionalDecorators`, sesuai urutan tulisannya.
- `SkeletoOptions.decorators` adalah daftar nama penanda tambahan yang sah, misalnya `["Logging", "Transaction"]`.
- Kalau daftar itu diberikan, penanda tambahan yang tidak ada di dalamnya adalah kesalahan, misalnya `@Transction`.
- Kalau daftar itu tidak diberikan, semua penanda tambahan diterima.

### 4.6 Aturan jenis dependency

| Komponen | Boleh bergantung pada |
| --- | --- |
| `@Config` | `@Config` |
| `@Wrapper` | `@Config` |
| `@Action` | `@Config`, `@Action` |

- Pelanggaran adalah kesalahan.
- Dependency melingkar adalah kesalahan, dan pesannya menampilkan jalur siklusnya (`A -> B -> A`).

### 4.7 Instansiasi

- Urutannya: semua `@Config`, lalu semua `@Wrapper`, lalu semua `@Action`. Di dalam setiap kelompok, dependency selalu dibuat lebih dulu.
- Setiap fungsi dipanggil **tepat satu kali**, dengan dependency sesuai urutan parameternya.
- Hasil `@Action` dibungkus oleh **semua** `@Wrapper`. Wrapper dipanggil sebagai `wrapper(handler, metadata)` dan hasilnya menggantikan handler.
- Urutan pembungkusan menurut `ordinal` (tanpa `ordinal` dianggap `0`): **angka lebih besar menjadi lapisan lebih luar**. Untuk `ordinal` yang sama, urutannya stabil menurut nama wrapper.
- Wrapper yang mengembalikan `handler` apa adanya berarti tidak membungkus.
- Action yang disuntikkan ke action lain adalah versi yang **sudah** dibungkus.

### 4.8 Startup dan container

- `Skeleto.start(directory = "src", options?)` mengembalikan `Promise<Skeleto>`.
- Satu instance per direktori (dibandingkan setelah path di-resolve). Pemanggilan bersamaan untuk direktori yang sama mendapat instance yang sama.
- Startup yang gagal tidak diingat: pemanggilan berikutnya memindai ulang.
- Direktori tanpa berkas `.ts` adalah kesalahan.
- Semua kesalahan di 4.1 sampai 4.6 dikumpulkan dan dilempar sebagai **satu** `Error`, sebelum berkas aplikasi mana pun diimpor. Setiap baris pesannya menyebut nama fungsi atau nama tipe yang bermasalah.
- `getContainer()` mengembalikan `Map<string, FuncInstanceMetadata>`, berisi **semua** komponen (`@Config`, `@Wrapper`, `@Action`) dengan kunci nama komponen.

## 5. API publik

Inilah seluruh yang diekspor dari `src/index.ts`. Nama-nama ini dipakai oleh `~/Workspace/nukitu/CLAUDE.md`, jadi jangan diganti tanpa keputusan pemilik.

```typescript
export type Context = {
  data: Record<string, any>;
  traceId: string;
  date: Date;
};

export type ActionHandler<REQUEST = any, RESPONSE = any> = (ctx: Context, request: REQUEST) => Promise<RESPONSE>;

export type Decorator = { name: string; data: any };

export type FuncMetadata = {
  name: string;                         // nama komponen = nama return type
  dependencies: string[];               // nama tipe parameter, sesuai urutan
  mainDecorator: Decorator;             // { name: "Config" | "Wrapper" | "Action", data }
  additionalDecorators: Decorator[];    // mis. [{ name: "Transaction", data: undefined }]
};

export type WrapperHandler = (actionHandler: ActionHandler, functionMetadata: FuncMetadata) => ActionHandler;

export type SkeletoOptions = {
  decorators?: string[];
  exclude?: readonly string[];          // menggantikan DEFAULT_EXCLUDE (4.2)
};

export const DEFAULT_EXCLUDE: readonly string[]; // ["node_modules", "*.d.ts", "*.test.ts", "*.spec.ts"]

export class FuncInstanceMetadata {
  getInstance(): any;
  getMetadata(): FuncMetadata;
}

export class Skeleto {
  static start(directory?: string, options?: SkeletoOptions): Promise<Skeleto>;
  getContainer(): Map<string, FuncInstanceMetadata>;
}

export function newContext(): Context; // { data: {}, traceId: "", date: new Date() }
```

Yang dipakai `nukitu` saat ini: `Skeleto.start`, `getContainer()`, `FuncInstanceMetadata.getInstance()`, `FuncMetadata.name`, `FuncMetadata.additionalDecorators`, `SkeletoOptions`, `ActionHandler`, `Context`, `WrapperHandler`, dan `newContext`. `exclude` dan `DEFAULT_EXCLUDE` ada supaya berkas tes, berkas `.d.ts`, dan `node_modules` tidak ikut terpindai. `getMetadata()` tidak dipakai `nukitu`, tetapi dipertahankan karena murah dan berguna untuk menelusuri isi container.

## 6. Struktur repo

```
src/
  index.ts             ekspor publik (bagian 5), tanpa logika
  type.ts              tipe publik dan newContext
  decorator.ts         pembaca penanda JSDoc (4.1); fungsi murni, tanpa ts-morph
  dependency.ts        pengurut dependency (4.6 siklus, 4.7 urutan); fungsi murni, tanpa ts-morph
  scanner.ts           pemindai berkas dengan ts-morph (4.2 sampai 4.5); tidak mengimpor berkas aplikasi
  skeleto.ts           kelas Skeleto: startup, aturan jenis, instansiasi, wrapper, container (4.6 sampai 4.8)
test/
  decorator.test.ts
  dependency.test.ts
  scanner.test.ts
  skeleto.test.ts
  fixture.ts           pembuat direktori fixture sementara
```

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
- Ada tes yang membuktikan urutan wrapper menurut `ordinal`.

## 9. Perintah

| Perintah | Isi |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | `tsx --test test/*.test.ts` |
| `npm run build` | menghasilkan `dist/` berisi `.js` dan `.d.ts` |

Sebelum menyatakan selesai, ketiganya harus lulus.
