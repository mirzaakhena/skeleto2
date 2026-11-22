# Gateway

## Definisi

**Gateway** adalah jalan keluar dari proses: setiap hal yang dijangkau use case di luar dirinya. Contohnya penyimpanan (database, file), layanan pihak ketiga (HTTP keluar, pembayaran), antrean, cache, dan pembuat nilai tak terduga (jam, id baru, token acak).

Gateway terdiri dari dua bagian:
- **Kontrak**: tipe yang menyatakan apa yang dijanjikan gateway. Inilah yang dikenal use case.
- **Implementasi**: kode untuk satu teknologi yang memenuhi kontrak itu.

Secara teknis gateway adalah sebuah action di Skeleto, dengan struktur kode yang sama persis dengan use case. Yang membedakan keduanya adalah konsepnya, bukan bentuknya (lihat [action.md](../teknis/action.md), bagian "Use case dan gateway: struktur sama, konsep berbeda").

Gateway adalah jalan **keluar**. Jalan **masuk** (server HTTP yang menerima permintaan, job, konsumen antrean) bukan gateway, melainkan controller (lihat [controller.md](controller.md)).

## Kenapa ada

Antrean, cache, layanan pihak ketiga, sistem berkas, dan pembuat nilai tak terduga tidak bisa dites, diulang, atau diganti kalau dijangkau use case secara langsung. Di balik kontrak, masing-masing bisa ditukar dengan pengganti, dan use case tetap hanya mengatur alur.

## Tempatnya dalam pemisahan logika dan infrastruktur

Gateway adalah tempat **kode infrastruktur**: I/O, database, file, HTTP keluar, dan semua yang tidak deterministik.

Gateway boleh punya **logika teknis**: query, pemetaan data tersimpan ke tipe entity, penguncian, percobaan ulang, dan optimisasi. Yang tidak boleh ada di gateway adalah **aturan bisnis**.

## Struktur

Kontrak, di berkasnya sendiri:

```ts
// src/gateway/warehouse.ts (excerpt)
/**
 * Fetches the warehouses with the given ids, in that order, and keeps every other transaction from changing them until this one commits or rolls back.
 * It takes the locks sorted by id, so that two transactions locking the same warehouses never wait on each other for ever.
 * An id the store does not hold is a `not_found` error.
 */
export type LockWarehouses = ActionHandler<string[], Warehouse[]>;
```

Implementasi, satu berkas per teknologi:

```ts
// src/gateway/memory/warehouse.ts (excerpt)
/**
 * Locks and reads warehouses in the store.
 *
 * @Gateway
 */
export function implLockWarehouses(database: Database): LockWarehouses {
```

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

## Nama dan berkas

| Apa | Nama atau berkas | Contoh |
| --- | --- | --- |
| Gateway | `<Verb><Entity>`, dengan entity berbentuk jamak kalau menangani beberapa | `LockWarehouses`, `SaveWarehouses` |
| Fungsinya | `impl<Gateway>` | `implLockWarehouses` |
| Kontrak gateway satu entity | `src/gateway/<entity snake>.ts` | `src/gateway/warehouse.ts` |
| Implementasinya dalam satu teknologi | `src/gateway/<technology>/<entity snake>.ts` | `src/gateway/memory/warehouse.ts` |

Semua gateway satu teknologi untuk satu entity boleh berbagi satu berkas.

## Aturan wajib

### GW-1. Setiap gateway ditandai sebagai gateway

Gateway ditulis dengan penanda utama `@Gateway`, tanpa `@Action` di sampingnya, dan tidak didaftarkan di `MARKERS` ([use-case-gateway-bawaan.md](../teknis/use-case-gateway-bawaan.md)).

### GW-2. Semua yang di luar proses dijangkau lewat gateway, termasuk nilai tak terduga

Bukan hanya penyimpanan. Setiap nilai tak terduga punya gateway sendiri:

| Nilai tak terduga | Kontrak gateway, misalnya |
| --- | --- |
| Waktu sekarang | `Now = ActionHandler<void, Date>` |
| Id baru | `NewId = ActionHandler<void, string>` |
| Token acak | `NewToken = ActionHandler<void, string>` |
| Hash bergaram | `HashSecret = ActionHandler<string, string>` |

Use case memintanya sekali, di awal (UC-10).

### GW-3. Kontrak gateway dipisahkan dari implementasinya

Kontrak adalah yang diandalkan use case (UC-9) dan yang dibaca reviewer untuk tahu apa yang dijanjikan gateway: apa yang dibaca atau ditulis, apa yang dijaganya dari perubahan bersamaan (GW-6), dan error apa yang diberikannya. Di berkas sendiri, kontrak bertahan lebih lama dari implementasi mana pun, dan dua implementasi satu kontrak bisa hidup berdampingan.

### GW-4. Gateway pembaca memetakan data tersimpan ke tipe tanpa menerapkan aturan bisnis: validasi saat menulis, bukan saat membaca

Aturan berubah, dan data yang tersimpan dengan aturan lama harus tetap bisa dibaca setelah aturannya diperketat. Gateway yang memeriksa aturan terkini saat membaca akan menolak gudang yang sah ketika ditulis, dan bisnis tidak bisa lagi melihatnya, apalagi memperbaikinya. Yang tersimpan sudah diperiksa saat ditulis (ENT-2, ENT-3).

```ts
// src/gateway/memory/warehouse.ts (excerpt)
      if (!record) throw new BusinessError("not_found", `no warehouse ${id}`);
      // Stored data is mapped to the type and nothing more: it was checked when it was written.
      return { id: record.id, units: record.units };
```

Literal ini boleh: ini gateway yang memetakan data tersimpan, bukan use case yang membuat entity (UC-8).

### GW-5. Gateway menjangkau sumber dayanya hanya lewat fungsi dari context

Gateway tidak bergantung pada koneksi. Ia bergantung pada config yang, jika diberi context, menyerahkan transaksi yang dibawa context, dan gagal kalau tidak ada.

```ts
// src/gateway/memory/warehouse.ts (excerpt)
    const transaction = database(ctx);
```

Gateway yang memegang koneksi bisa membaca atau menulis di samping transaksi use case-nya, dan tidak ada yang menunjukkannya sampai dua panggilan saling mengganggu. Lewat context, ia tidak bisa melewati transaksi, dan use case yang lupa `@Transaction` gagal di panggilan gateway pertamanya. Config-nya ada di [config.md](../teknis/config.md) (CFG-2).

### GW-6. Perlindungan dari perubahan bersamaan milik gateway dan teknologinya, dan terlihat di kontraknya

**Transaksi saja tidak memberi perlindungan ini.** Transaksi membuat perubahan semua-atau-tidak-sama-sekali dan menyembunyikannya dari yang lain sampai commit. Ia tidak mencegah dua transaksi membaca keadaan yang sama, masing-masing memutuskan berdasarkan itu, lalu keduanya commit. Kebanyakan penyimpanan, secara bawaan, membiarkan setiap transaksi melihat apa yang sudah di-commit saat ia membaca, dan tidak melihat apa pun yang belum di-commit transaksi lain; tidak ada yang melihat keputusan pihak lain. Masalahnya punya dua bentuk.

**Cek-lalu-sisip.** Use case membuat gudang `east` hanya kalau belum ada.

| Langkah | Permintaan A | Permintaan B |
| --- | --- | --- |
| 1 | mulai transaksi | mulai transaksi |
| 2 | mencari `east`: tidak ada | |
| 3 | | mencari `east`: tidak ada, karena A belum commit |
| 4 | menyisipkan `east` | |
| 5 | | menyisipkan `east` |
| 6 | commit | |
| 7 | | commit: sekarang ada dua gudang `east` |

Setiap pemeriksaan benar saat dibuat. Tidak ada yang bisa dikunci, karena yang diperiksa keduanya belum ada.

**Baca-ubah-simpan.** Gudang `north` berisi 10 unit, dan dua pemindahan 6 unit dimulai bersamaan. Aturannya: stok tidak pernah di bawah nol.

| Langkah | Pemindahan A | Pemindahan B |
| --- | --- | --- |
| 1 | mulai, membaca `north`: 10 | |
| 2 | | mulai, membaca `north`: 10, karena A belum commit |
| 3 | memeriksa 10 ≥ 6: boleh, menghitung 4 | |
| 4 | | memeriksa 10 ≥ 6: boleh, menghitung 4 |
| 5 | menyimpan `north`: 4, commit | |
| 6 | | menyimpan `north`: 4, commit |

Dua belas unit keluar dari gudang yang berisi sepuluh, dan penyimpanan menunjukkan 4: perubahan satu pemindahan hilang, dan aturannya dilanggar tanpa satu pun pemindahan melihatnya.

Perlindungannya harus mencegah B memutuskan berdasarkan apa yang akan diubah A: B menunggu A, atau tulisan B gagal karena tulisan A lebih dulu. Dalam contoh, `LockWarehouses` membuat B menunggu di langkah 2 sampai A commit; B lalu membaca 4 dan ditolak dengan error `conflict`. Caranya bergantung pada teknologi:

| Penyimpanan | Mekanisme, misalnya |
| --- | --- |
| Database | constraint keunikan (GW-8); kunci yang diambil saat membaca dan dipegang sampai transaksi selesai; versi yang dibaca bersama entity dan diperiksa saat menyimpan |
| Layanan pihak ketiga | permintaan bersyarat: ubah hanya kalau sumber dayanya masih berversi yang dibaca |
| Cache | compare-and-set: tulis hanya kalau nilainya masih yang dibaca |
| Antrean | idempotency key di setiap pesan, sehingga pesan yang diproses dua kali hanya mengubah sekali |

Versi yang diperiksa saat menyimpan mengubah perubahan yang hilang menjadi error `conflict` untuk penyimpanan yang datang belakangan, dan pemanggilnya boleh mengulang dari awal.

Ditulis di kontrak, perlindungannya bisa dilihat reviewer dan wajib dipertahankan implementasi kedua. Gateway yang kontraknya tidak menyebut apa pun tentang perubahan bersamaan tidak memberi perlindungan, apa pun yang kebetulan dilakukan implementasinya.

### GW-7. Entity yang diubah sebuah use case dikunci sekali, oleh satu gateway, dengan urutan kunci yang tetap

Dua pemindahan antara dua gudang yang sama, satu ke setiap arah, yang masing-masing mengunci satu gudang lalu menunggu gudang lainnya, akan saling menunggu selamanya. Satu panggilan gateway untuk semuanya, dengan urutan yang tidak bergantung pada permintaan (misalnya diurutkan menurut id), membuat setiap transaksi mengambil kunci dengan cara yang sama.

Mengunci lagi apa yang sudah dipegang transaksi yang sama tidak boleh, apa pun penyimpanannya. Kunci yang tidak re-entrant menunggu dirinya sendiri dan transaksinya macet. Kunci yang re-entrant membiarkannya lewat, tetapi menyembunyikan pengambilan kedua dan pengambilan itu di luar urutan tetap.

### GW-8. Keunikan dijaga penyimpanan, bukan dengan memeriksa lebih dulu

Pemeriksaan sebelum menyisipkan adalah cek-lalu-sisip (GW-6), dan hanya benar pada saat pemeriksaan itu dibuat. Hanya penyimpanan yang melihat setiap penyisipan, jadi hanya constraint keunikan di penyimpanan yang bertahan. Gateway Insert mengubah penolakan penyimpanan menjadi error bisnis `conflict`, dan kontraknya menyatakannya. Pemeriksaan lebih dulu tetap boleh untuk pesan yang lebih ramah, selama constraint-nya yang diandalkan.

### GW-9. Tidak ada efek di luar penyimpanan transaksi yang terjadi sebelum commit

**Efek** adalah apa pun yang dilakukan di luar penyimpanan tempat transaksi berjalan: email, pesan di antrean, panggilan ke pihak ketiga, entri cache yang dihapus. Sebelum commit, perubahannya masih bisa dibatalkan, dan efek tidak bisa dibatalkan bersama transaksi. Email bisa mengonfirmasi pemindahan yang gagal, atau sistem lain mengambil stok yang tidak pernah berpindah.

### GW-10. Bentuk setiap efek dipilih menurut boleh tidaknya ia hilang: setelah commit kalau boleh, outbox kalau tidak boleh

| Efek | Boleh sesekali hilang? | Bentuk |
| --- | --- | --- |
| Email notifikasi, entri cache yang dihapus | ya | setelah commit |
| Event pembayaran, stok yang disinkronkan ke sistem lain | tidak | outbox |

**Setelah commit.** Gateway mengantrekan efeknya di context, dan efek itu berjalan setelah commit berhasil. Kalau rollback, efeknya dibuang. Yang menjalankan antreannya adalah wrapper transaksi (lihat [wrapper.md](../teknis/wrapper.md)).

```ts
// src/gateway/log/warehouse.ts (excerpt)
    // A change that may still be rolled back must not be announced: the line waits for the commit.
    ctx.data.afterCommit.push(() => logger(line));
```

Bentuk ini bisa kehilangan efek: kalau proses berhenti di antara commit dan efek, atau efeknya sendiri gagal, perubahannya tersimpan dan efeknya tidak pernah terjadi.

**Outbox.** Pesan tidak dikirim use case sama sekali:
1. Gateway use case menulis pesan sebagai rekaman di penyimpanan yang sama, dalam transaksi yang sama dengan perubahan yang dilaporkannya.
2. Transaksi commit: perubahan dan pesan tersimpan bersama, atau tidak sama sekali.
3. Proses lain membaca pesan tersimpan yang belum terkirim, lalu mengirim masing-masing.
4. Pesan baru ditandai terkirim setelah penerima menerimanya.

Kalau proses pengirim berhenti di antara langkah 3 dan 4, pesannya dikirim lagi ketika proses menyala kembali. Tidak ada yang hilang, tetapi pesan bisa tiba dua kali.

### GW-11. Penerima pesan yang dikirim lewat outbox tahan terhadap duplikat

Outbox menjamin setiap pesan terkirim setidaknya sekali, bukan tepat sekali. Penerima yang bertindak dua kali atas pesan yang sama membayar dua kali atau memindahkan stok dua kali. Setiap pesan membawa kuncinya sendiri, dan penerima mengabaikan kunci yang sudah pernah diprosesnya.

### GW-12. Gateway tidak pernah bergantung pada use case

Gateway boleh dibangun dari gateway lain, tetapi tidak dari use case. Gateway dipanggil dari dalam use case, sehingga use case di belakang gateway berarti use case yang dipanggil use case lain (UC-4).

Skeleto menolak pelanggaran ini saat startup, sebelum berkas aplikasi diimpor. Gateway juga tidak boleh bergantung pada `@Action` polos.

## Aturan opsional

### GW-13. Pembaruan atomik atau optimisasi yang memindahkan aturan bisnis ke penyimpanan hanya boleh dengan alasan tertulis

Satu pembaruan bersyarat, misalnya "ambil 6 unit dari `north` hanya kalau isinya setidaknya 6", aman dari perubahan bersamaan dan tidak butuh kunci. Tetapi aturan "stok tidak pernah di bawah nol" kemudian hidup di penyimpanan, bukan di entity, dan UC-3 serta ENT-3 tidak lagi berlaku untuknya: fungsi entity dilewati, dan aturannya ada dua kali. Kalau kecepatannya sepadan, tulis alasannya di samping gateway, dan pertahankan aturan entity sebagai yang dideskripsikan tes.

**Optimisasi dipimpin manusia** (keputusan pemilik, 2026-11-22). Optimisasi tidak diserahkan langsung kepada AI: perkaranya besar, tidak punya pola khusus, dan harus melibatkan manusia. Yang berlaku:
- logika benar lebih dulu; optimisasi belakangan, tidak dini;
- AI boleh **menunjukkan** kandidat optimisasi beserta alasannya, tetapi tidak mengoptimasi tanpa keputusan pemilik;
- optimisasi yang diputuskan menuliskan alasannya di samping kodenya, dan aturan bisnis yang ikut terbawa ke penyimpanan tetap dipertahankan di entity dan dites di sana.

### GW-14. Selama pengembangan, gateway boleh berupa dummy, di memori atau hardcode, di balik kontrak yang sama dengan yang asli

Gateway dummy adalah komponen sungguhan: ia berpenanda gateway, mengembalikan tipe kontraknya, dan dinyalakan Skeleto seperti yang lain. Ia menyimpan datanya di memori atau hardcode, dan diganti implementasi asli ketika lapis di belakangnya dibangun. Fake di tes use case (UC-13) adalah hal lain: ditulis tangan di dalam tes dan tidak pernah dinyalakan Skeleto.

Pengembangan Core lebih dulu (lihat [pengembangan.md](../proses/pengembangan.md)) membangun use case sebelum penyimpanan dan layanan yang dibutuhkannya. Dummy di balik kontrak final membuat aplikasi bisa menyala dan berjalan sekarang, use case ditulis terhadap kontrak yang akan dipertahankannya, dan mengganti dummy tidak mengubah use case mana pun. Tanpa dummy, Core harus menunggu lapis yang justru bergantung padanya. Dummy yang menggantikan lapis yang akan dibangun kemudian adalah utang terencana dan diberi penanda (lihat [utang-teknis.md](../proses/utang-teknis.md)).

### GW-15. Gateway untuk menyisipkan, menyimpan, mencari satu, dan mencari banyak memakai bentuk standar

Empat operasi yang sama muncul untuk hampir setiap entity. Kalau bentuknya selalu sama, pembaca mengenalinya sekilas, dan use case tahu seperti apa entity yang tidak ada tanpa membaca gateway-nya.

| Operasi | Kontrak | Perilaku |
| --- | --- | --- |
| Insert | `InsertWarehouses = ActionHandler<Warehouse[], void>` | menambah entity baru dalam transaksi yang terbuka; error `conflict` untuk seluruh panggilan kalau penyimpanan sudah punya salah satu id-nya (GW-8); tidak mengembalikan apa pun |
| Save | `SaveWarehouses = ActionHandler<Warehouse[], void>` | menulis kembali entity yang sudah ada di penyimpanan, dalam transaksi yang terbuka; tidak pernah membuat: entity yang tidak ada adalah error `not_found` |
| Find one | `FindWarehouse = ActionHandler<string, Warehouse \| undefined>` | `undefined` kalau tidak ada; use case yang memutuskan apakah itu error `not_found` |
| Find many | `FindWarehouses = ActionHandler<WarehouseQuery, Warehouse[]>`, dengan query berisi filter dan batas | daftar kosong kalau tidak ada; selalu dibatasi |

Entity baru dari `new<Entity>` selalu lewat Insert, tidak pernah lewat Save. Save yang juga membuat akan diam-diam menimpa entity ber-id sama yang lebih dulu disimpan permintaan lain. Gateway yang menjaga dari perubahan bersamaan, seperti `LockWarehouses`, sengaja menyimpang dari bentuk ini dan menyatakannya di nama dan kontraknya.

## Hubungan dengan komponen lain

| Dengan | Hubungannya |
| --- | --- |
| Use case | dipanggil olehnya; use case hanya mengenal kontraknya |
| Gateway lain | boleh bergantung padanya |
| Use case sebagai dependency | tidak pernah (GW-12) |
| Entity | membaca dan menyimpan entity; tidak menerapkan aturan bisnis |
| Config | bergantung padanya untuk sumber daya (koneksi lewat context, logger) |
| Context | membaca apa yang dipasang wrapper (transaksi), dan mengantrekan efek setelah commit |
| Controller | tidak pernah memanggil gateway secara langsung (CTL-1) |

## Status implementasi

| Bagian | Status |
| --- | --- |
| `@Gateway` sebagai jenis bawaan | terealisasi |
| Penolakan gateway yang bergantung pada use case, saat startup | terealisasi, dijaga Skeleto |
| Optimisasi | dipimpin manusia (keputusan pemilik) |
| Aturan lain di dokumen ini | dijaga reviewer |
