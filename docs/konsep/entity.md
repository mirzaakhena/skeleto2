# Entity

## Definisi

**Entity** adalah objek bisnis, misalnya gudang (`Warehouse`), beserta aturan yang berlaku padanya: apa yang dibutuhkan untuk membuatnya, perubahan apa yang boleh, dan keadaan apa yang tidak boleh terjadi (invariant).

Entity bukan komponen Skeleto. Ia tidak berpenanda, tidak masuk container, dan tidak dirangkai. Ia hanya tipe biasa dan fungsi murni yang diimpor langsung oleh use case.

## Kenapa ada

Aturan bisnis yang ditulis di use case hanya dipatuhi use case itu. Use case berikutnya yang menyentuh entity yang sama bisa lupa aturannya, dan keduanya jadi tidak sepakat. Kalau aturan disimpan di entity, aturan itu berlaku di mana pun entity berubah dan cukup dites sekali, tanpa gateway.

Entity adalah bagian aplikasi yang paling stabil dan paling layak dites sendirian. Karena itu ia tidak boleh bergantung pada apa pun yang teknis.

## Tempatnya dalam pemisahan logika dan infrastruktur

Entity berisi **aturan bisnis**: perhitungan, keputusan "boleh atau tidak", dan invariant. Ia tidak menyentuh I/O dan tidak membaca nilai tak terduga (jam, angka acak). Semua yang ia butuhkan datang sebagai argumen.

## Struktur

```ts
// src/entity/warehouse.ts (excerpt)
export type Warehouse = { readonly id: string; readonly units: number };
```

```ts
// src/entity/warehouse.ts (excerpt)
/** The only way to bring a new warehouse into being: it needs an id, and it starts empty. */
export function newWarehouse(id: string): Warehouse {
  if (id === "") throw new BusinessError("validation", "a warehouse needs an id");
  return { id, units: 0 };
}
```

```ts
// src/entity/warehouse.ts (excerpt)
export function transfer(from: Warehouse, to: Warehouse, units: number): [Warehouse, Warehouse] {
  if (from.id === to.id) throw new BusinessError("validation", `warehouse ${from.id} cannot send stock to itself`);
  if (!Number.isInteger(units) || units <= 0) throw new BusinessError("validation", `cannot move ${units} units`);
  if (from.units < units) throw new BusinessError("conflict", `warehouse ${from.id} holds ${from.units} units, not ${units}`);
  return [{ ...from, units: from.units - units }, { ...to, units: to.units + units }];
}
```

Use case mengimpor berkas entity sebagai namespace (`import * as Warehouse from "../../entity/warehouse.js"`, lalu `Warehouse.transfer(...)`). Dengan begitu fungsinya mudah ditemukan seperti method: ketik `Warehouse.` dan editor menampilkan daftarnya.

## Nama dan berkas

| Apa | Nama | Berkas |
| --- | --- | --- |
| Entity | kata dari glosarium bisnis (`docs/GLOSSARY.md` aplikasi), satu kata atau lebih dengan huruf besar di awal setiap kata | `src/entity/<entity snake>.ts`, misalnya `src/entity/warehouse.ts` |
| Fungsi pembuat | `new<Entity>` | berkas entity-nya |
| Fungsi perubahan | kata kerja bisnis (`transfer`, `receive`) | berkas entity-nya |
| Error bisnis | `BusinessError`, `BusinessErrorKind` | `src/entity/error.ts` |

`<snake>` adalah nama dengan kata-katanya ditulis huruf kecil dan disambung `_`.

## Aturan wajib

### ENT-1. Entity adalah tipe biasa dengan fungsi murni yang mengembalikan salinan baru

- Data dari penyimpanan atau dari controller sudah berupa objek biasa. Tipe biasa menerimanya apa adanya; class mengharuskan setiap gateway mengubahnya menjadi instance lebih dulu.
- Perubahan yang mengembalikan salinan baru membiarkan keadaan lama utuh. Kalau penyimpanan gagal dan transaksi dibatalkan, entity yang dipegang sebelum perubahan masih sama dengan yang tersimpan.
- Fungsi murni dites hanya dengan input dan output: tanpa gateway, tanpa container, tanpa pengganti apa pun.

### ENT-2. Entity baru hanya dibuat lewat `new<Entity>`, yang memegang aturan pembuatan dan nilai awalnya

Aturan untuk sesuatu yang belum ada (apa yang dibutuhkan, dimulai dengan nilai apa) harus berada di satu tempat. Dengan satu fungsi pembuat, hanya ada satu jawaban untuk "seperti apa gudang baru", dan tidak ada pemanggil yang bisa membuat entity yang melewati aturan.

"Dibuat" artinya dibuat oleh bisnis untuk pertama kali. Membaca gudang yang sudah tersimpan bukan membuat, dan tidak lewat `newWarehouse` (lihat GW-4 di [gateway.md](gateway.md)).

### ENT-3. Entity yang sudah ada hanya diubah lewat fungsi entity, yang memeriksa invariant-nya

Invariant (stok tidak pernah di bawah nol, gudang tidak pernah mengirim ke dirinya sendiri) hanya terjaga kalau setiap perubahan lewat kode yang memeriksanya. Fungsi perubahan mengembalikan salinan yang sudah diubah secara langsung, tidak lewat `new<Entity>`, karena nilai awal hanya untuk entity baru.

### ENT-4. Entity tidak mengimpor apa pun di luar entity

```ts
// src/entity/warehouse.ts (excerpt)
import { BusinessError } from "./error.js";
```

Entity yang mengimpor gateway, config, atau Skeleto mengikat aturan bisnis ke sebuah teknologi, dan tidak bisa lagi dites hanya dengan input dan output.

### ENT-5. Error bisnis dibedakan menurut jenisnya: `validation`, `not_found`, `conflict`, `tech_debt`

Controller harus bisa membedakan "input kamu melanggar aturan", "itu tidak ada", "keadaan sekarang tidak mengizinkan", dan "bisnis belum memutuskan apa yang harus terjadi", supaya bisa menjawab dengan tepat. Jenis error melakukannya tanpa controller membaca pesan, dan tanpa bisnis tahu apa pun tentang controller.

| Jenis | Arti | Contoh |
| --- | --- | --- |
| `validation` | input melanggar aturan | pemindahan nol unit, atau unit negatif |
| `not_found` | yang disebut input tidak ada | pemindahan dari id gudang yang tidak tersimpan |
| `conflict` | input benar, tetapi keadaan sekarang tidak mengizinkan | memindahkan 50 unit dari gudang yang berisi 3 |
| `tech_debt` | kondisinya mungkin terjadi, tetapi bisnis belum memutuskan apa yang harus terjadi | pemindahan antargudang beda negara, yang perlakuan bea dan pajaknya belum diputuskan |

Batas `tech_debt`:
- Jangan dipakai untuk aturan yang melarang. Kalau bisnis sudah memutuskan operasinya ditolak, penolakannya `validation`, `not_found`, atau `conflict`.
- Jangan dipakai untuk menghindari memilih di antara tiga jenis lainnya. `tech_debt` untuk keputusan yang belum dibuat, bukan keputusan yang belum ditulis.
- Penolakan `tech_debt` yang berasal dari celah peta skenario membawa id celahnya di field tersendiri (`gap`), bukan di dalam pesan. Field ini hanya diisi untuk jenis ini, jadi tetap ada satu tipe error dan satu pemeriksaan `instanceof`. Lihat [utang-teknis.md](../proses/utang-teknis.md).

```ts
// src/entity/error.ts (excerpt)
export type BusinessErrorKind = "validation" | "not_found" | "conflict" | "tech_debt";
```

```ts
// src/entity/error.ts (excerpt)
  readonly gap?: string;

  constructor(kind: BusinessErrorKind, message: string, gap?: string) {
    super(message);
    this.name = "BusinessError";
    this.kind = kind;
    if (gap !== undefined) this.gap = gap;
  }
```

Cara controller menerjemahkan setiap jenis ada di [controller.md](controller.md) (CTL-3).

### ENT-6. Keadaan yang bergantung pada waktu diturunkan dari keadaan tersimpan, waktunya, dan waktu sekarang; tidak ada penjadwal yang mengubah keadaan tersimpan

Job yang menulis ulang keadaan tersimpan ketika waktu berlalu membuat keadaannya salah di antara dua jalannya job, butuh tempat kedua untuk aturan bisnis, dan tidak bisa dites tanpa menunggu. Keadaan yang dihitung dari yang tersimpan dan jam selalu benar, tidak butuh job latar, dan dites dengan jam yang ditetapkan.

- Contoh: pemindahan dikirim dan harus diterima dalam 48 jam. Yang disimpan adalah aksi terakhirnya, "dikirim", dan kapan itu terjadi. Apakah ia "terlambat" adalah fungsi entity: `transferStatus(transfer, now)`.
- Waktu sekarang datang dari gateway jam, diminta sekali di awal use case (UC-10), lalu diberikan ke fungsi entity. Fungsi entity tidak pernah membaca jam sendiri.
- Penjadwal hanya boleh sebagai infrastruktur, misalnya untuk mengingatkan orang tentang pemindahan yang terlambat. Ia memulai use case lewat controller seperti pemanggil lain dan tidak memegang aturan bisnis.

### ENT-7. Status turunan tidak pernah disimpan: simpan hasil aksi terakhir dan waktunya, lalu hitung status efektifnya dengan fungsi entity

Status tersimpan yang sebenarnya bisa dihitung adalah salinan kedua dari kebenaran. Ia bergeser dari data asalnya, dan siapa pun yang lupa memperbaruinya membuat aplikasi bertentangan dengan dirinya sendiri.

- Contoh: simpan bahwa pemindahan dikirim dan kapan; jangan simpan field "status: terlambat".
- Status yang tidak bisa dihasilkan dari fakta tersimpan, misalnya yang dipilih seseorang, bukan status turunan dan boleh disimpan.
- Query yang harus menyaring menurut status turunan meminta fakta tersimpan yang dibutuhkan (misalnya waktu pengiriman) dari gateway, lalu menerapkan fungsi entity pada baris yang didapat.

- Query itu tidak menambah kolom status supaya lebih cepat. Pengecualiannya hanya optimisasi yang diputuskan pemilik (GW-13 di [gateway.md](gateway.md)): optimisasi dipimpin manusia, tidak dilakukan AI sendiri.

### ENT-8. Tes entity membandingkan objek utuh, bukan field yang dipilih

Objek yang dikembalikan `new<Entity>` atau fungsi entity dibandingkan utuh dengan objek yang diharapkan (`assert.deepEqual`). Pemeriksaan satu field tetap lulus ketika field lain salah atau ada field yang tidak sengaja bertambah. Tes yang hanya membaca `.units` sebuah gudang membiarkan `id`-nya tidak diperiksa.

## Aturan opsional

### ENT-9. Biarkan penyimpanan ikut menjaga invariant terpenting

Constraint di penyimpanan (nilai tidak boleh negatif, id harus unik) menangkap yang lolos dari kode: skrip yang dijalankan manual, bug, atau versi lama yang masih berjalan. Constraint ini mencerminkan aturan yang sudah dipegang entity; ia tidak pernah menggantikannya, dan pemeriksaan entity tetap yang memberi error bisnis yang jelas. Tidak semua penyimpanan bisa menyatakan setiap aturan, jadi ini dipilih per invariant.

## Hubungan dengan komponen lain

| Dengan | Hubungannya |
| --- | --- |
| Use case | memanggil `new<Entity>` dan fungsi entity; tidak pernah menulis literal entity sendiri (UC-8) |
| Gateway | membaca dan menyimpan entity; gateway pembaca memetakan data tersimpan ke tipe entity tanpa aturan bisnis (GW-4) |
| Controller | tidak pernah menyentuh entity secara langsung; menerima Response use case |
| Context | entity tidak pernah menerima context |
| Skeleto | tidak mengenal entity sama sekali |

## Status implementasi

Tidak ada yang bergantung pada jenis bawaan `@UseCase` dan `@Gateway` (lihat [use-case-gateway-bawaan.md](../teknis/use-case-gateway-bawaan.md)). Semua aturan di sini dijaga reviewer, bukan mesin.
