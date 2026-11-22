# Action

## Definisi

**Action** adalah komponen Skeleto yang menghasilkan sebuah **handler**: fungsi asinkron `(ctx, request) => Promise<response>` yang dipanggil di setiap pemakaian.

```ts
// src/type.ts (excerpt)
export type ActionHandler<REQUEST = any, RESPONSE = any> = (ctx: Context, request: REQUEST) => Promise<RESPONSE>;
```

Action ditandai `@UseCase` atau `@Gateway`. Keduanya adalah jenis action, dan hanya action yang dibungkus wrapper.

## Kenapa ada

Action adalah mekanisme umum untuk "sesuatu yang dipanggil per permintaan". Skeleto mengenal dua jenis action, dan jenisnya dibaca dari nama penanda utama di metadata ([use-case-gateway-bawaan.md](use-case-gateway-bawaan.md)):

| Konsep | Ditulis sebagai |
| --- | --- |
| Use case | `@UseCase` |
| Gateway | `@Gateway` |

Setiap action aplikasi adalah salah satu dari keduanya, sehingga tidak ada action yang lolos dari aturan dependency use case dan gateway.

## Use case dan gateway: struktur sama, konsep berbeda

Kode use case dan kode gateway hampir tidak bisa dibedakan dari bentuknya. Keduanya action, jadi bentuknya sama; hanya penanda utamanya yang berbeda:

Use case:

```ts
// src/usecase/stock/stock_transfer.ts (excerpt)
export type StockTransfer = ActionHandler<StockTransferRequest, StockTransferResponse>;
```

```ts
// src/usecase/stock/stock_transfer.ts (excerpt)
export function implStockTransfer(lockWarehouses: LockWarehouses, saveWarehouses: SaveWarehouses, notifyWarehouses: NotifyWarehouses): StockTransfer {
```

Gateway:

```ts
// src/gateway/warehouse.ts (excerpt)
export type LockWarehouses = ActionHandler<string[], Warehouse[]>;
```

```ts
// src/gateway/memory/warehouse.ts (excerpt)
export function implLockWarehouses(database: Database): LockWarehouses {
```

**Yang sama (struktur):**
- tipe kontraknya alias dari `ActionHandler<Input, Output>`;
- fungsinya `impl<Nama>`, menerima dependency, dan mengembalikan handler `async (ctx, input) => output`;
- dibuat sekali oleh Skeleto, disimpan di container, dan dibungkus semua wrapper;
- dites dengan memanggil `impl`-nya langsung.

**Yang berbeda (konsep):**

| | Use case | Gateway |
| --- | --- | --- |
| Perannya | mengatur alur satu operasi bisnis | menjangkau dunia luar dan yang tidak deterministik |
| Isinya | keputusan alur | kode infrastruktur dan logika teknis |
| Dipanggil oleh | controller | use case |
| Boleh bergantung pada | gateway | config |
| Tidak boleh bergantung pada | config, use case lain | gateway lain, use case |
| Kontraknya | Request dan Response sendiri, di berkas use case-nya | di berkas kontrak tersendiri, terpisah dari implementasinya |
| Implementasinya | satu | bisa beberapa, satu per teknologi (asli, dummy) |
| Nama | `<Area><Verb>` (`StockTransfer`) | `<Verb><Entity>` (`LockWarehouses`) |
| Berkas | satu per berkas, `src/usecase/<area>/` | boleh dikelompokkan, `src/gateway/<technology>/` |
| Transaksi | menyatakannya dengan `@Transaction` | bekerja di dalam transaksi yang dibawa context |
| Dites dengan | fake gateway buatan tangan | tes teknologinya sendiri, atau digantikan dummy |

**Akibatnya:** karena bentuknya sama, baik Skeleto maupun reviewer tidak bisa membedakan keduanya dari strukturnya. Satu-satunya pembeda yang bisa diandalkan adalah **penanda utamanya**, bukan nama atau folder (UC-1, GW-1). Itu alasan `@UseCase` dan `@Gateway` menjadi jenis bawaan ([use-case-gateway-bawaan.md](use-case-gateway-bawaan.md)): perbedaan konsep di tabel di atas dijaga mesin, bukan hanya oleh mata reviewer.

## Perilaku yang dijamin Skeleto

- `@UseCase` hanya boleh bergantung pada `@Gateway`, dan `@Gateway` hanya pada `@Config`: strukturnya satu garis lurus, controller -> use case -> gateway -> config. Dependency lain menghentikan startup, dengan pesan yang menyebut kedua komponen.
- Urutan pembuatan: semua gateway, lalu semua use case.
- Action selalu sinkron di tahap luarnya: return type `Promise<...>` pada fungsi `@UseCase` dan `@Gateway` adalah kesalahan.
- Fungsi action harus mengembalikan fungsi. Hasil lain (`undefined`, objek, promise) menghentikan startup dengan pesan yang menyebut action dan fungsinya.
- Hasil action dibungkus **semua** wrapper. Action yang disuntikkan ke action lain adalah versi yang **sudah** dibungkus.

## Context

Parameter pertama setiap handler adalah context (`ctx`). Context berjalan bersama satu panggilan melewati setiap action yang dicapainya.

```ts
// src/type.ts (excerpt)
export type Context = {
  data: Record<string, any>;
  traceId: string;
  date: Date;
};
```

| Siapa | Memakai context untuk |
| --- | --- |
| Controller | membuatnya dengan `newContext()`, dan mengisi apa yang mengenali panggilan, misalnya trace id |
| Wrapper | menambah dan menghapus apa yang dikelolanya, misalnya transaksi yang terbuka |
| Gateway | membaca apa yang dipasang wrapper untuknya (transaksi tempat ia bekerja), dan mengantrekan efek untuk dijalankan wrapper setelah commit |
| Use case | meneruskannya ke setiap gateway yang dipanggilnya, tanpa membacanya |
| Entity | tidak ada: entity tidak pernah menerima context |

`date` di context menyatakan kapan context dibuat, untuk penelusuran. Waktu bisnis datang dari gateway (GW-2 di [gateway.md](../konsep/gateway.md)).

`Context` dan `newContext()` tetap di inti Skeleto (keputusan pemilik, 2026-11-22), walaupun Skeleto sendiri tidak pernah membuat atau membacanya. Keduanya dibutuhkan wrapper, gateway, dan alat luar. Aturan pemakaiannya ada di ACT-3.

## Nama dan berkas

Action mengikuti aturan umum di [komponen.md](komponen.md). Nama dan berkas use case dan gateway ada di dokumen konsepnya masing-masing.

## Aturan wajib

### ACT-1. Setiap action adalah use case atau gateway: operasi bisnis ditulis sebagai use case dan jalan keluar sebagai gateway

Operasi bisnis ditandai `@UseCase` dan jalan keluar ditandai `@Gateway`. Action yang keduanya sekaligus melanggar UC-4 atau GW-12.

Skeleto sendiri yang menjaganya saat startup (keputusan pemilik, 2026-11-22): hanya ada dua jenis action, sehingga tidak ada action yang bisa menjadi jembatan diam-diam dari satu use case ke use case lain dan lolos dari aturan use case dan gateway.

### ACT-2. Handler hanya menerima context dan input; semua yang lain datang sebagai dependency

Lihat KOM-1 dan KOM-2 di [komponen.md](komponen.md). Handler yang membaca sesuatu di luar context, input, dan dependency-nya, misalnya variabel global atau container, menyembunyikan dependency yang tidak bisa dilihat atau diurutkan Skeleto.

### ACT-3. Context adalah metadata untuk infrastruktur; data bisnis tidak pernah dititipkan di context

Context membawa apa yang dibutuhkan lapis teknis: transaksi yang terbuka, efek yang menunggu commit, trace id, pengamat. Ia bukan bagian dari proses bisnis. Data bisnis (id pengguna yang dipakai aturan, isi pesanan, hasil perhitungan) selalu lewat Request, Response, atau gateway, tidak pernah lewat `ctx.data`.

Data bisnis di context adalah input yang tidak dinyatakan tipe mana pun. Ia membuat use case bergantung pada wrapper mana yang berjalan, tidak bisa dites hanya dengan Request dan fake, dan tidak terlihat di kontrak oleh reviewer. Yang membaca context hanya wrapper dan gateway, untuk keperluan teknis (UC-11).

## Hubungan dengan komponen lain

| Dengan | Hubungannya |
| --- | --- |
| Config | hanya gateway yang bergantung padanya (dan wrapper, serta config lain); use case tidak |
| Action lain | boleh menjadi dependency menurut tabel di atas; yang disuntikkan versi yang sudah dibungkus. Skeleto menolak use case yang bergantung pada config atau use case, dan gateway yang bergantung pada gateway lain atau use case |
| Wrapper | membungkus setiap action; tidak boleh menjadi dependency action |

## Status implementasi

| Bagian | Status |
| --- | --- |
| `@UseCase` dan `@Gateway` sebagai jenis bawaan, dan aturan dependency antar jenis action | terealisasi |
