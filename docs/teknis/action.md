# Action

## Definisi

**Action** adalah komponen Skeleto yang menghasilkan sebuah **handler**: fungsi asinkron `(ctx, request) => Promise<response>` yang dipanggil di setiap pemakaian.

```ts
export type ActionHandler<REQUEST = any, RESPONSE = any> = (ctx: Context, request: REQUEST) => Promise<RESPONSE>;
```

Action ditandai `@Action`. Ia adalah satu-satunya jenis komponen yang dibungkus wrapper.

## Kenapa ada

Action adalah mekanisme umum untuk "sesuatu yang dipanggil per permintaan". Sekarang Skeleto tidak tahu apakah sebuah action itu use case, gateway, atau hal lain; pembedanya hanya penanda tambahan. Pemilik memutuskan `@UseCase` dan `@Gateway` kelak menjadi jenis bawaan ([use-case-gateway-bawaan.md](use-case-gateway-bawaan.md)):

| Konsep | Ditulis sekarang | Dengan jenis bawaan (rencana) |
| --- | --- | --- |
| Use case | `@Action` + `@UseCase` | `@UseCase` |
| Gateway | `@Action` + `@Gateway` | `@Gateway` |
| Action polos, tanpa konsep clean architecture | `@Action` | `@Action` |

`@Action` polos tetap ada dan boleh dipakai, dengan aturan yang bebas (keputusan pemilik, 2026-11-22).

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

**Akibatnya:** karena bentuknya sama, baik Skeleto maupun reviewer tidak bisa membedakan keduanya dari strukturnya. Satu-satunya pembeda yang bisa diandalkan adalah **penandanya**, bukan nama atau folder (UC-1, GW-1). Ini juga alasan utama rencana jenis bawaan ([use-case-gateway-bawaan.md](use-case-gateway-bawaan.md)): kalau Skeleto mengenal `@UseCase` dan `@Gateway` sebagai jenis, perbedaan konsep di tabel di atas bisa dijaga mesin, bukan hanya oleh mata reviewer.

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

`Context` dan `newContext()` tetap di inti Skeleto (keputusan pemilik, 2026-11-22), walaupun Skeleto sendiri tidak pernah membuat atau membacanya. Keduanya dibutuhkan wrapper, gateway, dan alat luar. Aturan pemakaiannya ada di ACT-3.

## Nama dan berkas

Action mengikuti aturan umum di [komponen.md](komponen.md). Nama dan berkas use case dan gateway ada di dokumen konsepnya masing-masing.

## Aturan wajib

### ACT-1. Operasi bisnis ditulis sebagai use case dan jalan keluar sebagai gateway; `@Action` polos untuk yang bukan keduanya

`@Action` polos boleh dipakai, dan aturan konsep (UC-, GW-) tidak berlaku untuknya: hanya aturan mekanisme Skeleto dan aturan umum di [komponen.md](komponen.md). Tetapi sesuatu yang sebenarnya operasi bisnis atau jalan keluar tetap ditandai sebagai use case atau gateway. Action yang keduanya sekaligus melanggar UC-4 atau GW-12.

> **Usulan, belum diputuskan pemilik.** Kalimat "tetap ditandai sebagai use case atau gateway" adalah tambahan. Tanpanya, use case bisa ditulis sebagai `@Action` polos untuk menghindari aturan use case, dan hanya reviewer yang bisa melihatnya.
>
> **Yang berlaku sekarang:** tes arsitektur di `REVIEW_CHECKLIST.md` (dulu B5) masih menolak action yang tidak bertanda `@UseCase` atau `@Gateway`. Dengan keputusan pemilik ini, tes itu perlu dilonggarkan.

### ACT-2. Handler hanya menerima context dan input; semua yang lain datang sebagai dependency

Lihat KOM-1 dan KOM-2 di [komponen.md](komponen.md). Handler yang membaca sesuatu di luar context, input, dan dependency-nya, misalnya variabel global atau container, menyembunyikan dependency yang tidak bisa dilihat atau diurutkan Skeleto.

### ACT-3. Context adalah metadata untuk infrastruktur; data bisnis tidak pernah dititipkan di context

Context membawa apa yang dibutuhkan lapis teknis: transaksi yang terbuka, efek yang menunggu commit, trace id, pengamat. Ia bukan bagian dari proses bisnis. Data bisnis (id pengguna yang dipakai aturan, isi pesanan, hasil perhitungan) selalu lewat Request, Response, atau gateway, tidak pernah lewat `ctx.data`.

Data bisnis di context adalah input yang tidak dinyatakan tipe mana pun. Ia membuat use case bergantung pada wrapper mana yang berjalan, tidak bisa dites hanya dengan Request dan fake, dan tidak terlihat di kontrak oleh reviewer. Yang membaca context hanya wrapper dan gateway, untuk keperluan teknis (UC-11).

> Ditegaskan sesuai keputusan pemilik (2026-11-22). Dokumen lama hanya menyebut bahwa context "carries what the technical level needs, not business input".

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
| `@UseCase` dan `@Gateway` sebagai jenis bawaan | rencana, belum terealisasi |
