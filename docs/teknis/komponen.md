# Dasar komponen

Aturan yang berlaku untuk ketiga jenis komponen Skeleto: `@Config`, `@Wrapper`, dan `@Action`. Hal yang khusus satu jenis ada di [action.md](action.md), [wrapper.md](wrapper.md), dan [config.md](config.md).

## Definisi

**Komponen** adalah deklarasi fungsi tingkat atas yang di-`export` dan JSDoc-nya memuat tepat satu penanda utama: `@Config`, `@Wrapper`, atau `@Action`.

Skeleto hanya membaca dua hal dari setiap komponen:
- **Nama komponen:** teks return type-nya, persis seperti tertulis.
- **Dependency:** teks tipe setiap parameternya, menurut urutan parameter.

Skeleto tidak pernah membuka definisi tipe. Dependency dicocokkan dengan nama komponen sebagai teks.

## Cara kerja startup, singkatnya

1. **Pindai** semua berkas `.ts` di direktori sumber sebagai teks, tanpa menjalankannya.
2. **Periksa**: dependency yang tidak ada, jenis dependency yang dilarang, dependency melingkar, penanda yang salah tulis. Semua kesalahan dilaporkan sekaligus dalam satu `Error`, **sebelum** satu pun berkas aplikasi diimpor.
3. **Buat**: impor berkas, lalu panggil setiap fungsi tepat sekali dengan dependency-nya. Urutannya semua config, lalu semua wrapper, lalu semua action.
4. **Bungkus**: setiap action dibungkus semua wrapper.
5. **Simpan** semuanya di container, dengan kunci nama komponen.

| Jenis | Boleh bergantung pada |
| --- | --- |
| `@Config` | `@Config` |
| `@Wrapper` | `@Config` |
| `@Action` | `@Config`, `@Action` |

Kontrak lengkap perilaku Skeleto ada di `CLAUDE.md` bagian 4 dan di `README.md`.

## Aturan wajib

### KOM-1. Komponen adalah fungsi yang menerima dependency-nya dan mengembalikan apa yang disediakannya

Fungsi berpenanda bekerja dua tahap. Skeleto memanggilnya sekali saat startup dengan dependency-nya, dan yang dikembalikannya adalah komponennya: handler sebuah action, fungsi pembungkus sebuah wrapper, atau nilai sebuah config. Handler dipanggil di setiap pemakaian, hanya dengan context dan input.

```ts
// src/gateway/memory/warehouse.ts (excerpt)
export function implSaveWarehouses(database: Database): SaveWarehouses {
  return async (ctx, warehouses) => {
    const transaction = database(ctx);
    // Save writes back what the store holds and never creates: a new warehouse would go through an insert, which the store can refuse.
    const missing = warehouses.find((warehouse) => !transaction.read(warehouse.id));
    if (missing) throw new BusinessError("not_found", `no warehouse ${missing.id}`);
    for (const warehouse of warehouses) transaction.write({ id: warehouse.id, units: warehouse.units });
  };
}
```

Skeleto merangkai dengan memanggil fungsi luar, dan closure menyimpan dependency-nya. Signature handler hanya berisi yang berubah per panggilan, sehingga setiap pemanggil memanggilnya dengan cara yang sama, dan tes memanggil fungsi luarnya dengan fake pilihannya.

### KOM-2. Tahap luar hanya menyimpan dependency; pekerjaan sebuah panggilan terjadi di handler

Fungsi luar sebuah action atau wrapper tidak membaca penyimpanan, tidak mengirim apa pun, dan tidak memulai apa pun. Ia boleh menyiapkan yang tidak pernah berubah antarpanggilan, misalnya konstanta atau pola yang dikompilasi. Config adalah pengecualian: membangun nilainya adalah pekerjaannya.

Tahap luar berjalan sekali saat startup, sebelum ada context. Pekerjaan di sana berjalan di luar setiap transaksi, tidak bisa melihat context pemanggil, dan berjalan lagi setiap kali startup diulang.

### KOM-3. Setiap komponen punya alias tipe bernama, dan alias itulah nama komponennya

```ts
// src/wrappers.ts (excerpt)
export type AuditWrapper = WrapperHandler;
export type TransactionWrapper = WrapperHandler;
```

Nama komponen adalah teks return type-nya. Dua komponen dengan bentuk sama, misalnya dua wrapper, akan bernama sama tanpa alias, dan itu menghentikan startup. Alias juga kontrak yang diandalkan komponen lain, terpisah dari fungsi yang memenuhinya.

### KOM-4. Setiap tipe yang dipakai sebagai dependency adalah alias bernama, tidak pernah tipe inline atau generik

Parameter ditulis `Database`, tidak pernah `(ctx: Context) => Transaction`, `Map<string, number>`, atau `winston.Logger`. Beri tipe seperti itu alias, lalu bergantung pada aliasnya.

Skeleto mencocokkan dependency sebagai teks persis seperti tertulis, sehingga `Map<string,number>` dan `Map<string, number>` adalah dua nama. Alias hanya bisa dieja satu cara, memberi KOM-6 satu kata untuk dijadikan nama parameter, dan menyebut arti dependency, bukan bentuknya.

### KOM-5. Fungsi di balik komponen dinamai `impl` diikuti nama komponennya

`implStockTransfer` mengembalikan `StockTransfer`, `implAuditWrapper` mengembalikan `AuditWrapper`, dan `implConnection` yang asinkron mengembalikan `Promise<Connection>`, yang komponennya `Connection`.

Tipe adalah kontrak dan fungsinya mengimplementasikannya. Dengan nama yang sudah tetap, tidak ada kata kerja yang perlu dipilih, dan fungsi di balik komponen mana pun dalam pesan error atau container ditemukan dari namanya saja.

### KOM-6. Parameter dependency dinamai menurut tipenya, dengan huruf pertama kecil

`lockWarehouses: LockWarehouses`, `database: Database`, `connection: Connection`. Parameter pertama handler adalah context, dinamai `ctx`. Fungsi wrapper menerima `(handler, metadata)`.

Nama parameter jadi tidak mengatakan apa pun yang tidak dikatakan tipenya, sehingga tidak pernah dipilih, tidak pernah bergeser dari tipenya, dan terbaca sama di setiap berkas.

### KOM-7. Nama komponen disusun dari kata-kata di tabel berikut, dan tidak dari yang lain

| Komponen | Nama | Contoh |
| --- | --- | --- |
| Use case | `<Area><Verb>` | `StockTransfer` |
| Input dan output-nya | `<UseCase>Request`, `<UseCase>Response` | `StockTransferRequest` |
| Gateway | `<Verb><Entity>`, entity jamak kalau menangani beberapa | `LockWarehouses` |
| Wrapper | `<Marker>Wrapper`, menurut satu penanda tambahan yang dibacanya | `AuditWrapper` |
| Config | nama dari apa yang disediakannya | `Connection`, `Database`, `Logger` |

Setiap kata ditulis dengan huruf besar di awal dan disambung tanpa pemisah: `StockTransfer`, tidak pernah `Stock_Transfer` atau `stockTransfer`. Dua orang yang menamai operasi yang sama akan sampai pada nama yang sama, sehingga nama bisa ditebak dari operasinya, dan duplikat terlihat sebagai dua fungsi yang mengembalikan tipe yang sama.

### KOM-8. Path berkas mengikuti nama isinya

`<snake>` adalah nama dengan kata-katanya ditulis huruf kecil dan disambung `_`.

| Apa | Path |
| --- | --- |
| Entity | `src/entity/<entity snake>.ts` |
| Error bisnis | `src/entity/error.ts` |
| Use case, satu per berkas | `src/usecase/<area>/<use case snake>.ts` |
| Kontrak gateway satu entity | `src/gateway/<entity snake>.ts` |
| Implementasinya dalam satu teknologi | `src/gateway/<technology>/<entity snake>.ts` |
| Semua config | `src/config.ts` |
| Semua wrapper | `src/wrappers.ts` |
| Daftar penanda yang sah | `src/markers.ts` |
| Awal aplikasi | `main.ts` di akar proyek |
| Tes use case | di sebelahnya, `<use case snake>.test.ts` |
| Satu tes integrasi | `main.test.ts` di akar proyek |

Skeleto mengabaikan path, jadi hanya aturan ini yang membuatnya bisa ditebak. Dengan aturan ini, berkas komponen mana pun, dan tes use case mana pun, ditemukan dari namanya tanpa mencari.

### KOM-9. Blok JSDoc berisi deskripsi lebih dulu, lalu penanda, satu per baris, tanpa apa pun setelah penanda selain datanya

```ts
// src/usecase/stock/stock_transfer.ts (excerpt)
/**
 * Moves units of stock from one warehouse to another.
 *
 * @Action
 * @UseCase
 * @Transaction
 * @Audit {"level": "info"}
 */
```

Data penanda berjalan sampai penanda berikutnya, sehingga kalimat setelah penanda menjadi datanya. Setelah `@Action`, itu menghentikan startup. Setelah penanda tambahan, itu diam-diam mengubah apa yang dibaca wrapper.

### KOM-10. Penanda yang sah disimpan di satu konstanta yang diekspor, dan selalu diberikan ke `Skeleto.start`

```ts
// src/markers.ts (excerpt)
/** The additional markers this application allows. Startup refuses any other, so a misspelt marker cannot pass unnoticed. */
export const MARKERS = ["UseCase", "Gateway", "Transaction", "Audit"];
```

```ts
// main.ts (excerpt)
const skeleto = await Skeleto.start("src", { decorators: MARKERS });
```

Tanpa `decorators`, `@Transction` yang salah tulis diterima dan use case diam-diam berjalan tanpa transaksi, dan penanda utama yang salah tulis diam-diam membuang komponennya. Dengan daftar, keduanya menghentikan startup. Satu konstanta berarti awal aplikasi, tesnya, dan wrapper-nya membaca daftar yang sama.

> **Rencana preset, belum terealisasi di kode.** Dengan preset clean architecture, `UseCase` dan `Gateway` tidak lagi menjadi penanda tambahan di `MARKERS`, melainkan jenis yang disediakan preset.

### KOM-11. Satu tes integrasi menyalakan Skeleto dan membuktikan aplikasinya bisa menyala

```ts
// main.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { Skeleto } from "skeleto";
import { MARKERS } from "./src/markers.js";

test("the application starts, and its use cases are in the container", async () => {
  const container = (await Skeleto.start("src", { decorators: MARKERS })).getContainer();
  assert.equal(typeof container.get("StockTransfer")?.getInstance(), "function");
});
```

Tes use case tidak pernah menyalakan Skeleto, sehingga dependency yang hilang, siklus, penanda salah tulis, atau alias yang dieja dua cara baru terlihat saat aplikasi di-deploy. Startup melaporkan semua kesalahan itu sekaligus, jadi satu tes yang menyalakannya sudah cukup.

### KOM-12. Berkas tes dan berkas hasil generator dikecualikan dari pemindaian

Berkas tes bernama `*.test.ts` sudah dikecualikan oleh `DEFAULT_EXCLUDE`. Folder kode hasil generator ditambahkan ke daftar, tidak menggantikannya: `Skeleto.start("src", { decorators: MARKERS, exclude: [...DEFAULT_EXCLUDE, "generated"] })`.

Skeleto mengimpor setiap berkas yang dipindainya. Berkas tes yang diimpor saat startup akan menjalankan tesnya di dalam aplikasi, dan fungsi berpenanda di fake atau kode hasil generator akan menjadi komponen atau bentrok nama dengan yang asli.

## Yang boleh diandalkan alat di luar aplikasi

Alat yang membaca atau memeriksa aplikasi dari luar (tes arsitektur, tes celah, penjejak scenario-explorer) boleh mengandalkan hal berikut, setelah `Skeleto.start` dengan `MARKERS` aplikasi:

- `getContainer()` mendaftar setiap komponen dengan namanya.
- `getMetadata()` sebuah komponen memberi `dependencies` (nama komponen yang dimintanya, menurut urutan parameter) dan `additionalDecorators` (penanda tambahan beserta datanya).
- Nama komponen adalah nama tipenya, sehingga alat menemukan tipe sebuah komponen dari namanya.
- Use case dibedakan dari gateway lewat penandanya, dan wrapper dinamai menurut penanda yang dibacanya.
- Alat yang mengamati sebuah jalan menemukan pengamatnya di `ctx.data.gatewayObserver`, kalau aplikasi punya wrapper pengamat gateway ([wrapper.md](wrapper.md), WRP-6).

> **Usulan, belum diputuskan pemilik.** Penjejak scenario-explorer ternyata mengandalkan lebih dari daftar di atas: `ctx.data.transaction` dan `ctx.data.afterCommit` dari wrapper transaksi, bentuk `BusinessError` (`name`, `kind`, `gap`), pola teks penanda utang, dan alias `type X = ActionHandler<Input, Output>` yang dibaca isinya. Kontrak itu sekarang tersebar dan sebagian tidak tertulis di sisi Skeleto. Usulannya: kalau preset clean architecture dibuat, preset itulah yang memiliki dan mengetes seluruh kontrak ini (lihat [preset-clean-architecture.md](preset-clean-architecture.md)).
