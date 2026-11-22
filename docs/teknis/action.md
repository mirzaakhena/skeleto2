# Action

## Definisi

**Action** adalah komponen Skeleto yang menghasilkan sebuah **handler**: fungsi asinkron `(ctx, request) => Promise<response>` yang dipanggil di setiap pemakaian.

```ts
export type ActionHandler<REQUEST = any, RESPONSE = any> = (ctx: Context, request: REQUEST) => Promise<RESPONSE>;
```

Action ditandai `@Action`. Ia adalah satu-satunya jenis komponen yang dibungkus wrapper.

## Kenapa ada

Action adalah mekanisme umum untuk "sesuatu yang dipanggil per permintaan". Skeleto sengaja tidak tahu apakah sebuah action itu use case, gateway, atau hal lain. Pembedanya adalah urusan konsep, bukan mekanisme:

| Konsep | Ditulis sebagai action, sekarang | Dengan preset (rencana) |
| --- | --- | --- |
| Use case | `@Action` + `@UseCase` | `@UseCase` |
| Gateway | `@Action` + `@Gateway` | `@Gateway` |
| Action polos, tanpa konsep clean architecture | `@Action` | `@Action` |

`@Action` polos tetap ada untuk aplikasi yang tidak memakai konsep use case dan gateway.

## Use case dan gateway: struktur sama, konsep berbeda

Kode use case dan kode gateway hampir tidak bisa dibedakan dari bentuknya. Keduanya action, jadi keduanya ditulis dengan cara yang sama:

```ts
// Use case
export type StockTransfer = ActionHandler<StockTransferRequest, StockTransferResponse>;
export function implStockTransfer(lockWarehouses: LockWarehouses, saveWarehouses: SaveWarehouses, notifyWarehouses: NotifyWarehouses): StockTransfer {
  return async (ctx, { from, to, units }) => { /* ... */ };
}

// Gateway
export type LockWarehouses = ActionHandler<string[], Warehouse[]>;
export function implLockWarehouses(database: Database): LockWarehouses {
  return async (ctx, ids) => { /* ... */ };
}
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
| Dipanggil oleh | controller | use case, atau gateway lain |
| Boleh bergantung pada | gateway, config | gateway, config |
| Tidak boleh bergantung pada | use case lain | use case |
| Kontraknya | Request dan Response sendiri, di berkas use case-nya | di berkas kontrak tersendiri, terpisah dari implementasinya |
| Implementasinya | satu | bisa beberapa, satu per teknologi (asli, dummy) |
| Nama | `<Area><Verb>` (`StockTransfer`) | `<Verb><Entity>` (`LockWarehouses`) |
| Berkas | satu per berkas, `src/usecase/<area>/` | boleh dikelompokkan, `src/gateway/<technology>/` |
| Transaksi | menyatakannya dengan `@Transaction` | bekerja di dalam transaksi yang dibawa context |
| Dites dengan | fake gateway buatan tangan | tes teknologinya sendiri, atau digantikan dummy |

**Akibatnya:** karena bentuknya sama, baik Skeleto maupun reviewer tidak bisa membedakan keduanya dari strukturnya. Satu-satunya pembeda yang bisa diandalkan adalah **penandanya**, bukan nama atau folder (UC-1, GW-1). Ini juga alasan utama rencana preset ([preset-clean-architecture.md](preset-clean-architecture.md)): kalau Skeleto mengenal `@UseCase` dan `@Gateway` sebagai jenis, perbedaan konsep di tabel di atas bisa dijaga mesin, bukan hanya oleh mata reviewer.

## Perilaku yang dijamin Skeleto

- Action boleh bergantung pada `@Config` dan `@Action`. Dependency lain menghentikan startup.
- Action selalu sinkron di tahap luarnya: return type `Promise<...>` pada fungsi `@Action` adalah kesalahan.
- Fungsi action harus mengembalikan fungsi. Hasil lain (`undefined`, objek, promise) menghentikan startup dengan pesan yang menyebut action dan fungsinya.
- Hasil action dibungkus **semua** wrapper. Action yang disuntikkan ke action lain adalah versi yang **sudah** dibungkus.

## Context

Parameter pertama setiap handler adalah context (`ctx`). Context berjalan bersama satu panggilan melewati setiap action yang dicapainya.

```ts
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

> **Catatan.** `Context` dan `newContext()` adalah bagian API publik Skeleto, padahal Skeleto sendiri tidak pernah membuat atau membacanya. Keduanya ada karena dibutuhkan wrapper, gateway, dan alat luar. Apakah konsep ini tetap di inti atau pindah ke preset belum diputuskan (`TEMUAN.md`, temuan 4).

## Nama dan berkas

Action mengikuti aturan umum di [komponen.md](komponen.md). Nama dan berkas use case dan gateway ada di dokumen konsepnya masing-masing.

## Aturan wajib

### ACT-1. Di aplikasi yang memakai clean architecture, setiap action tepat salah satu dari use case atau gateway

Action yang bukan keduanya tidak punya tempat dalam pemisahan logika dan infrastruktur, dan reviewer tidak tahu aturan mana yang berlaku untuknya. Action yang keduanya sekaligus melanggar UC-4 atau GW-12.

> **Rencana preset, belum terealisasi di kode.** Dengan preset, aturan ini berbentuk "di aplikasi yang memasang preset, `@Action` polos adalah kesalahan", dan diperiksa saat startup. **Sekarang** hanya tes arsitektur salinan dari `REVIEW_CHECKLIST.md` yang memeriksanya. Skeleto sendiri tidak bisa melihat penanda yang terlupa: baginya action tanpa penanda tambahan sama sahnya dengan action lain.

### ACT-2. Handler hanya menerima context dan input; semua yang lain datang sebagai dependency

Lihat KOM-1 dan KOM-2 di [komponen.md](komponen.md). Handler yang membaca sesuatu di luar context, input, dan dependency-nya, misalnya variabel global atau container, menyembunyikan dependency yang tidak bisa dilihat atau diurutkan Skeleto.

## Hubungan dengan komponen lain

| Dengan | Hubungannya |
| --- | --- |
| Config | boleh menjadi dependency |
| Action lain | boleh menjadi dependency; yang disuntikkan versi yang sudah dibungkus. Batasnya diatur konsep: use case tidak bergantung pada use case, gateway tidak bergantung pada use case |
| Wrapper | membungkus setiap action; tidak boleh menjadi dependency action |

## Status implementasi

| Bagian | Status |
| --- | --- |
| `@Action`, perilaku dan pemeriksaannya | terealisasi |
| `@UseCase` dan `@Gateway` sebagai jenis khusus `@Action` | rencana preset, belum terealisasi |
