# Use case

## Definisi

**Use case** adalah satu operasi bisnis yang bisa diminta pengguna, job, atau sistem lain, misalnya "pindahkan stok". Ia punya Request (apa yang dibutuhkan operasi) dan Response (apa yang diputuskan operasi).

Use case adalah **orkestrator**: ia mengambil data lewat gateway, memanggil fungsi entity, lalu menyimpan lewat gateway. Ia sendiri tidak memegang aturan bisnis.

Secara teknis use case adalah sebuah action di Skeleto, dengan struktur kode yang sama persis dengan gateway. Yang membedakan keduanya adalah konsepnya, bukan bentuknya (lihat [action.md](../teknis/action.md), bagian "Use case dan gateway: struktur sama, konsep berbeda").

## Kenapa ada

- Use case adalah satuan yang menampung semua hal di bawah permukaan aplikasi: aturan bisnis, validasi, error, permintaan yang datang bersamaan, transaksi yang gagal di tengah, efek yang harus menunggu commit, dan nilai tak terduga. Satu screen hanya puncaknya.
- Satu use case bisa dipanggil banyak controller (HTTP, job, tes). Membangun dari use case membangun seluruh gunung es, bukan hanya puncaknya. Pemanggil kedua menemukan aplikasi sudah lengkap.
- Begitu Request dan Response sebuah use case disepakati, frontend dan backend bisa dikerjakan bersamaan: frontend memakai kontrak itu dengan data buatan, backend memakai kontrak yang sama dengan aturan sungguhan.

## Tempatnya dalam pemisahan logika dan infrastruktur

Logika di aplikasi ada dua jenis, dan use case hanya memegang satu:

| Jenis logika | Contoh | Tempat |
| --- | --- | --- |
| **Aturan bisnis** | stok tidak boleh minus; gudang tidak boleh mengirim ke dirinya sendiri | entity |
| **Keputusan alur** | gateway mana dipanggil lebih dulu; langkah mana dijalankan menurut hasil entity atau gateway | use case |

Use case tidak menyentuh I/O secara langsung dan tidak membuat nilai tak terduga sendiri. Keduanya lewat gateway.

## Struktur

```ts
// src/usecase/stock/stock_transfer.ts (excerpt)
export type StockTransferRequest = { from: string; to: string; units: number };
export type StockTransferResponse = { fromUnits: number; toUnits: number };
export type StockTransfer = ActionHandler<StockTransferRequest, StockTransferResponse>;
```

```ts
// src/usecase/stock/stock_transfer.ts (excerpt)
import type { ActionHandler } from "skeleto";
import * as Warehouse from "../../entity/warehouse.js";
import type { LockWarehouses, NotifyWarehouses, SaveWarehouses } from "../../gateway/warehouse.js";
```

```ts
// src/usecase/stock/stock_transfer.ts (excerpt)
/**
 * Moves units of stock from one warehouse to another.
 *
 * @UseCase
 * @Transaction
 * @Audit {"level": "info"}
 */
```

```ts
// src/usecase/stock/stock_transfer.ts (excerpt)
export function implStockTransfer(lockWarehouses: LockWarehouses, saveWarehouses: SaveWarehouses, notifyWarehouses: NotifyWarehouses): StockTransfer {
```

```ts
// src/usecase/stock/stock_transfer.ts (excerpt)
  return async (ctx, { from, to, units }) => {
    const [source, target] = await lockWarehouses(ctx, [from, to]);
    const moved = Warehouse.transfer(source, target, units);
    await saveWarehouses(ctx, moved);
    await notifyWarehouses(ctx, moved);
    return { fromUnits: moved[0].units, toUnits: moved[1].units };
  };
```

Use case di atas tidak memutuskan apa pun tentang stok. Yang memutuskan adalah `Warehouse.transfer`.

## Nama dan berkas

| Apa | Nama | Contoh |
| --- | --- | --- |
| Use case | `<Area><Verb>`: area bisnis, lalu operasinya | `StockTransfer` |
| Input dan output-nya | `<UseCase>Request` dan `<UseCase>Response` | `StockTransferRequest`, `StockTransferResponse` |
| Fungsinya | `impl<UseCase>` | `implStockTransfer` |
| Berkasnya | `src/usecase/<area>/<use case snake>.ts`, dengan `<area>` kata pertama namanya | `src/usecase/stock/stock_transfer.ts` |
| Tesnya | di sebelahnya, `<use case snake>.test.ts` | `src/usecase/stock/stock_transfer.test.ts` |

Cara memecah nama menjadi nama berkas:
1. Pisahkan nama sebelum setiap huruf besar: `StockTransfer` menjadi `Stock`, `Transfer`.
2. Tulis huruf kecil, sambung dengan `_`, tambahkan `.ts`: `stock_transfer.ts`.
3. Singkatan ditulis sebagai kata (`SendSmsCode`, bukan `SendSMSCode`), sehingga menjadi `send_sms_code.ts`.

Aturan nama umum (alias tipe, nama parameter) ada di [komponen.md](../teknis/komponen.md).

## Aturan wajib

### UC-1. Setiap use case ditandai sebagai use case

Use case ditulis dengan penanda utama `@UseCase`, tanpa penanda utama lain di sampingnya, dan tidak didaftarkan di `MARKERS`: ia penanda utama, bukan penanda tambahan ([use-case-gateway-bawaan.md](../teknis/use-case-gateway-bawaan.md)). Hanya ada dua jenis action, jadi setiap action aplikasi adalah use case atau gateway.

Use case dan gateway jangan pernah dibedakan dari namanya (`...Gateway`, `Find...`) atau dari letak berkasnya. Nama dan folder adalah kebiasaan yang bisa bergeser, sedangkan penanda utama adalah data yang diperiksa Skeleto dan dibaca wrapper.

### UC-2. Setiap use case berada di berkasnya sendiri, dinamai menurut use case itu

Tidak ada yang bisa memastikan di mana operasi "sederhana" berakhir dan operasi "rumit" dimulai. Aturan tanpa pengecualian diterapkan sama oleh semua orang, dan use case yang tumbuh tidak perlu dipindah. Satu berkas per use case juga membuat daftar berkas menjadi daftar apa yang bisa dilakukan aplikasi. Aturan ini juga berlaku untuk operasi create, read, update, delete biasa: `UserCreate`, `UserGet`, `UserList` masing-masing punya berkas sendiri di `usecase/user/`.

### UC-3. Use case hanya mengatur alur: mengambil lewat gateway, memanggil fungsi entity, dan menyimpan lewat gateway

Aturan bisnis yang ditulis di use case hanya dipatuhi use case itu (lihat [entity.md](entity.md)). Use case boleh berisi keputusan alur, tidak boleh berisi aturan bisnis.

### UC-4. Use case tidak pernah bergantung pada use case lain, dan hanya bergantung pada gateway

Use case adalah satu operasi bisnis dengan transaksinya sendiri, audit-nya sendiri, dan error-nya sendiri. Memanggil use case lain menyeret semua itu, menyatukan dua operasi yang berubah karena alasan berbeda, dan lama-lama membentuk rantai yang tidak bisa diikuti. Kalau dua use case berbagi satu langkah, aturan bersamanya masuk fungsi entity dan akses bersamanya masuk gateway.

Skeleto menolak pelanggaran ini saat startup, sebelum berkas aplikasi diimpor, bersama kesalahan lain dan dengan pesan yang menyebut kedua use case. Use case juga tidak boleh bergantung pada config. Strukturnya satu garis lurus: controller -> use case -> gateway -> config. Akibatnya, parameter bisnis (batas, tarif, feature flag) sampai ke use case lewat gateway yang membacanya, atau menjadi konstanta entity, tidak pernah lewat config.

### UC-5. Use case punya tipe Request dan Response sendiri dan tidak mengembalikan entity

Entity adalah bentuk internal bisnis dan berubah ketika aturan berubah. Use case yang mengembalikannya menyerahkan bentuk itu ke setiap pemanggil, sehingga perubahan internal merusak pemanggil, dan field yang tidak boleh dilihat pemanggil ikut terkirim.

### UC-6. Request dan Response dinamai dan dibentuk menurut operasi bisnis, bukan menurut screen

Request atau Response yang dibentuk menurut screen berubah ketika screen berubah, dan setiap pemanggil lain ikut menanggungnya. Field yang ada hanya karena satu screen menampilkannya (label, kolom yang sudah diformat, penanda bagian halaman yang dibuka) adalah urusan screen dan berada di sisi controller. Request berisi apa yang dibutuhkan operasi, dan Response berisi apa yang diputuskan operasi.

### UC-7. Query tidak pernah menulis: ia hanya bergantung pada gateway yang kontraknya membaca

Query adalah use case yang tidak mengubah keadaan. Use case yang menulis lewat gateway penulis bukan query, dan yang menyebut dirinya query tidak boleh bergantung pada gateway yang kontraknya menulis. Kontrak gateway menyatakan apakah ia membaca atau menulis (GW-3), jadi reviewer cukup membaca parameter dan kontraknya untuk yakin bahwa query tidak berefek. Pembaca bisa mempercayai bahwa memanggil query aman diulang dan tidak meninggalkan perubahan setengah jalan.

### UC-16. Setiap use case ditandai `@Transaction`, termasuk query

Gateway menjangkau sumber dayanya hanya lewat transaksi yang dibawa context, dan gagal kalau tidak ada (GW-5, CFG-2). Use case tanpa `@Transaction` gagal di panggilan gateway pertamanya, query sekalipun. Satu aturan tanpa pengecualian juga menghindarkan reviewer dari menimbang "apakah use case ini cukup sederhana untuk tanpa transaksi". Bahwa query tidak menulis dijaga UC-7 lewat kontrak gateway-nya, bukan lewat ada tidaknya `@Transaction`.

### UC-8. Use case tidak pernah menulis literal entity

Literal objek entity di use case adalah entity baru atau yang diubah tanpa lewat `new<Entity>` (ENT-2) maupun fungsi entity (ENT-3), sehingga melewati semua aturan. Use case mendapat entity dari gateway dan dari fungsi entity, bukan dari tempat lain.

### UC-9. Use case mengenal gateway hanya lewat tipe kontraknya

Use case yang mengimpor implementasi gateway bergantung pada teknologinya, sehingga mengganti penyimpanan, atau memakai pengganti untuk tes, berarti mengubah use case. Dengan `import type`, kontrak adalah satu-satunya yang ia tahu, dan Skeleto memberinya implementasi mana pun yang mengembalikan tipe itu.

### UC-10. Setiap nilai tak terduga diminta dari gateway sekali, di awal use case

Waktu sekarang, id baru, token acak, dan hash bergaram berbeda di setiap panggilan. Use case yang membuatnya sendiri tidak bisa dites dengan hasil pasti, dan use case yang meminta dua kali bisa mendapat dua "sekarang" yang berbeda dalam satu operasi. Diminta sekali di awal lalu diberikan ke fungsi entity sebagai nilai biasa, nilai-nilai itu membuat setiap fungsi sesudahnya deterministik. Gateway-nya dijelaskan di [gateway.md](gateway.md) (GW-2). Gateway lain yang butuh nilai itu menerimanya di inputnya, karena gateway tidak boleh memanggil gateway lain (GW-12).

### UC-11. Use case meneruskan context tanpa pernah membacanya

Context membawa kebutuhan lapis teknis (transaksi yang terbuka, efek yang menunggu commit, trace id), bukan input bisnis. Use case yang membacanya bergantung pada wrapper mana yang berjalan, dan pada data yang tidak dinyatakan tipe Request-nya. Semua yang dibutuhkan bisnis datang lewat Request atau dari gateway, dan tidak ada data bisnis yang dititipkan di context (ACT-3). Siapa boleh memakai context dan untuk apa ada di [action.md](../teknis/action.md).

### UC-12. Use case yang membaca, memutuskan, lalu menulis dilindungi gateway-nya dari perubahan yang terjadi bersamaan

Keputusan hanya sebaik data yang menjadi dasarnya. Kalau permintaan lain mengubah data itu di antara baca dan tulis, keputusannya salah. Transaksi saja tidak memberi perlindungan ini. Mekanismenya milik gateway, dan contoh kedua bentuk masalahnya (cek-lalu-sisip dan baca-ubah-simpan) ada di [gateway.md](gateway.md) (GW-6 sampai GW-8).

### UC-13. Use case dites dengan memanggil fungsi `impl`-nya bersama fake buatan tangan yang bertipe kontrak gateway, tanpa menyalakan Skeleto dan tanpa pustaka mock

```ts
// src/usecase/stock/stock_transfer.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { newContext } from "skeleto";
import type { Warehouse } from "../../entity/warehouse.js";
import type { LockWarehouses, NotifyWarehouses, SaveWarehouses } from "../../gateway/warehouse.js";
import { implStockTransfer } from "./stock_transfer.js";

/** Fakes of the three gateways. What the store holds is fixed here, and what the use case saves and reports is recorded. */
function fakeGateways(stored: Warehouse[]) {
  const saved: Warehouse[][] = [];
  const notified: Warehouse[][] = [];
  const lockWarehouses: LockWarehouses = async (ctx, ids) => ids.map((id) => stored.find((warehouse) => warehouse.id === id)!);
  const saveWarehouses: SaveWarehouses = async (ctx, warehouses) => {
    saved.push(warehouses);
  };
  const notifyWarehouses: NotifyWarehouses = async (ctx, warehouses) => {
    notified.push(warehouses);
  };
  return { stockTransfer: implStockTransfer(lockWarehouses, saveWarehouses, notifyWarehouses), saved, notified };
}

test("a transfer saves and reports both warehouses, and answers with what they hold", async () => {
  const { stockTransfer, saved, notified } = fakeGateways([{ id: "north", units: 10 }, { id: "south", units: 0 }]);

  const response = await stockTransfer(newContext(), { from: "north", to: "south", units: 3 });

  assert.deepEqual(response, { fromUnits: 7, toUnits: 3 });
  const moved = [{ id: "north", units: 7 }, { id: "south", units: 3 }];
  assert.deepEqual(saved, [moved]);
  assert.deepEqual(notified, [moved]);
});

test("a transfer beyond the stock is a conflict, and saves and reports nothing", async () => {
  const { stockTransfer, saved, notified } = fakeGateways([{ id: "north", units: 10 }, { id: "south", units: 3 }]);

  await assert.rejects(stockTransfer(newContext(), { from: "south", to: "north", units: 50 }), { kind: "conflict", message: "warehouse south holds 3 units, not 50" });

  assert.deepEqual(saved, []);
  assert.deepEqual(notified, []);
});
```

Karena komponen ditulis dua tahap (lihat [komponen.md](../teknis/komponen.md)), use case adalah fungsi biasa dari gateway-nya, sehingga tes membuatnya langsung. Fake yang bertipe kontrak diperiksa compiler: ketika kontrak berubah, fake berhenti dikompilasi alih-alih diam-diam lulus, dan itu tidak bisa dijanjikan pustaka mock. Ditulis tangan, fake tetap semudah use case untuk dibaca. Tes membandingkan objek utuh, sama seperti ENT-8.

### UC-14. Fake menetapkan setiap nilai tak terduga

Isi penyimpanan, waktu sekarang, id yang dibuat, token acak: tes menentukan semuanya lewat fake gateway-nya, dan tidak pernah membaca jam atau sumber acak sendiri. Tes yang inputnya berubah dari jalan ke jalan tidak bisa menyatakan output yang diharapkan secara persis.

### UC-15. Setiap use case bisa dijalankan sendirian

Use case mendapat data yang dibutuhkannya dari tesnya (lewat fake) atau dari gateway dummy (GW-14). Ia tidak pernah butuh use case lain dijalankan lebih dulu untuk menyiapkan data. Use case yang baru jalan setelah use case lain menyembunyikan ketergantungan yang tidak dinyatakan kontrak mana pun, dan tidak bisa dicoba, dites, atau diubah sendirian. Use case yang berjalan sendiri bisa dipahami dari gateway-nya saja, dan tes yang gagal menunjuk ke use case itu, bukan ke use case yang seharusnya berjalan sebelumnya.

## Hubungan dengan komponen lain

| Dengan | Hubungannya |
| --- | --- |
| Entity | memanggil `new<Entity>` dan fungsi entity; tidak menulis aturan bisnis sendiri |
| Gateway | bergantung padanya lewat tipe kontrak; meneruskan context ke setiap panggilan |
| Use case lain | tidak pernah |
| Controller | dipanggil olehnya; tidak tahu siapa yang memanggil |
| Config | tidak pernah: sumber daya dipakai gateway, dan parameter bisnis datang lewat gateway yang membacanya atau menjadi konstanta entity |
| Wrapper | dibungkus semua wrapper; penanda tambahan (`@Transaction`, `@Audit`) memilih wrapper mana yang bekerja |

## Status implementasi

| Bagian | Status |
| --- | --- |
| `@UseCase` sebagai jenis bawaan | terealisasi |
| Penolakan use case yang bergantung pada use case, saat startup | terealisasi, dijaga Skeleto |
| Aturan lain di dokumen ini | dijaga reviewer |
