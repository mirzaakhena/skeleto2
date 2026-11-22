# Review checklist

Setiap aturan di [docs/](docs/README.md), dalam satu daftar, untuk siapa pun yang mereview perubahan pada aplikasi yang dibangun di atas Skeleto: seorang manusia, atau agent yang diberi berkas ini. `docs/` adalah satu-satunya rangkaian aturan. Alasan dan kode setiap aturan ada di sana; berkas ini hanya menyebut aturan apa saja yang ada, seberapa kuat masing-masing, dan siapa yang memeriksanya. Teks setiap baris adalah judul aturannya, kata demi kata.

## Cara mereview

- Aturan **Mesin** diperiksa Skeleto saat startup dan oleh [tes celah](#tes-celah) di bawah. Nyalakan aplikasi dan jalankan tesnya; reviewer tidak memeriksanya dengan membaca.
- Aturan **Reviewer** diperiksa dengan membaca perubahan, atau, untuk aturan proses, berkas di repo. Skeleto tidak memeriksa satu pun darinya.
- Aturan **Proses** diperiksa bersama pemilik, bukan di kode: repo tidak memperlihatkannya, jadi reviewer tidak mencarinya di sana.
- Perubahan yang melanggar aturan **Wajib** selalu mendapat temuan.
- Perubahan yang menyimpang dari aturan **Opsional** mendapat temuan hanya kalau tidak menuliskan alasannya di komentar.
- Kutip aturan hanya dengan nomornya (`UC-9`, `WRP-5`, `DEV-5`). Nomor tidak pernah dipakai ulang, jadi kutipan tetap bermakna. Nomor lama (`B8`, `T11`, `P4`) dicari di tabel pemetaan di [docs/README.md](docs/README.md#pemetaan-nomor-lama-ke-nomor-baru).

## Menulis temuan

Setiap temuan menyebut satu aturan, satu tempat, dan satu perbaikan, dalam satu baris:

> `<rule> <file>:<line>: <what breaks the rule>. Fix: <the change asked for>.`

Misalnya, pada salinan contoh README tempat `implStockTransfer` juga meminta `MemoryWarehouses`, implementasi sebuah gateway:

> UC-9 src/usecase/stock/stock_transfer.ts:17: `implStockTransfer` depends on `MemoryWarehouses`, an implementation, and not on the contract type `LockWarehouses`. Fix: ask for the contract type and leave the choice of implementation to the application's start.

Barisnya adalah baris kode yang melanggar aturan. Temuan tanpa nomor aturan, tempat, atau perbaikan bukan temuan: tulis ulang sampai ketiganya ada.

## Entity

Aturan di [docs/konsep/entity.md](docs/konsep/entity.md).

| Aturan | Isinya | Tingkat | Diperiksa oleh |
| --- | --- | --- | --- |
| ENT-1 | Entity adalah tipe biasa dengan fungsi murni yang mengembalikan salinan baru | Wajib | Reviewer |
| ENT-2 | Entity baru hanya dibuat lewat `new<Entity>`, yang memegang aturan pembuatan dan nilai awalnya | Wajib | Reviewer |
| ENT-3 | Entity yang sudah ada hanya diubah lewat fungsi entity, yang memeriksa invariant-nya | Wajib | Reviewer |
| ENT-4 | Entity tidak mengimpor apa pun di luar entity | Wajib | Reviewer |
| ENT-5 | Error bisnis dibedakan menurut jenisnya: `validation`, `not_found`, `conflict`, `tech_debt` | Wajib | Reviewer |
| ENT-6 | Keadaan yang bergantung pada waktu diturunkan dari keadaan tersimpan, waktunya, dan waktu sekarang; tidak ada penjadwal yang mengubah keadaan tersimpan | Wajib | Reviewer |
| ENT-7 | Status turunan tidak pernah disimpan: simpan hasil aksi terakhir dan waktunya, lalu hitung status efektifnya dengan fungsi entity | Wajib | Reviewer |
| ENT-8 | Tes entity membandingkan objek utuh, bukan field yang dipilih | Wajib | Reviewer |
| ENT-9 | Biarkan penyimpanan ikut menjaga invariant terpenting | Opsional | Reviewer |

## Use case

Aturan di [docs/konsep/use-case.md](docs/konsep/use-case.md).

| Aturan | Isinya | Tingkat | Diperiksa oleh |
| --- | --- | --- | --- |
| UC-1 | Setiap use case ditandai sebagai use case | Wajib | Mesin: Skeleto, saat startup |
| UC-2 | Setiap use case berada di berkasnya sendiri, dinamai menurut use case itu | Wajib | Reviewer |
| UC-3 | Use case hanya mengatur alur: mengambil lewat gateway, memanggil fungsi entity, dan menyimpan lewat gateway | Wajib | Reviewer |
| UC-4 | Use case tidak pernah bergantung pada use case lain, dan hanya bergantung pada gateway | Wajib | Mesin: Skeleto, saat startup |
| UC-5 | Use case punya tipe Request dan Response sendiri dan tidak mengembalikan entity | Wajib | Reviewer |
| UC-6 | Request dan Response dinamai dan dibentuk menurut operasi bisnis, bukan menurut screen | Wajib | Reviewer |
| UC-7 | Query tidak pernah menulis: ia hanya bergantung pada gateway yang kontraknya membaca | Wajib | Reviewer |
| UC-16 | Setiap use case ditandai `@Transaction`, termasuk query | Wajib | Reviewer |
| UC-8 | Use case tidak pernah menulis literal entity | Wajib | Reviewer |
| UC-9 | Use case mengenal gateway hanya lewat tipe kontraknya | Wajib | Reviewer |
| UC-10 | Setiap nilai tak terduga diminta dari gateway sekali, di awal use case | Wajib | Reviewer |
| UC-11 | Use case meneruskan context tanpa pernah membacanya | Wajib | Reviewer |
| UC-12 | Use case yang membaca, memutuskan, lalu menulis dilindungi gateway-nya dari perubahan yang terjadi bersamaan | Wajib | Reviewer |
| UC-13 | Use case dites dengan memanggil fungsi `impl`-nya bersama fake buatan tangan yang bertipe kontrak gateway, tanpa menyalakan Skeleto dan tanpa pustaka mock | Wajib | Reviewer |
| UC-14 | Fake menetapkan setiap nilai tak terduga | Wajib | Reviewer |
| UC-15 | Setiap use case bisa dijalankan sendirian | Wajib | Reviewer |

## Gateway

Aturan di [docs/konsep/gateway.md](docs/konsep/gateway.md).

| Aturan | Isinya | Tingkat | Diperiksa oleh |
| --- | --- | --- | --- |
| GW-1 | Setiap gateway ditandai sebagai gateway | Wajib | Mesin: Skeleto, saat startup |
| GW-2 | Semua yang di luar proses dijangkau lewat gateway, termasuk nilai tak terduga | Wajib | Reviewer |
| GW-3 | Kontrak gateway dipisahkan dari implementasinya | Wajib | Reviewer |
| GW-4 | Gateway pembaca memetakan data tersimpan ke tipe tanpa menerapkan aturan bisnis: validasi saat menulis, bukan saat membaca | Wajib | Reviewer |
| GW-5 | Gateway menjangkau sumber dayanya hanya lewat fungsi dari context | Wajib | Reviewer |
| GW-6 | Perlindungan dari perubahan bersamaan milik gateway dan teknologinya, dan terlihat di kontraknya | Wajib | Reviewer |
| GW-7 | Entity yang diubah sebuah use case dikunci sekali, oleh satu gateway, dengan urutan kunci yang tetap | Wajib | Reviewer |
| GW-8 | Keunikan dijaga penyimpanan, bukan dengan memeriksa lebih dulu | Wajib | Reviewer |
| GW-9 | Tidak ada efek di luar penyimpanan transaksi yang terjadi sebelum commit | Wajib | Reviewer |
| GW-10 | Bentuk setiap efek dipilih menurut boleh tidaknya ia hilang: setelah commit kalau boleh, outbox kalau tidak boleh | Wajib | Reviewer |
| GW-11 | Penerima pesan yang dikirim lewat outbox tahan terhadap duplikat | Wajib | Reviewer |
| GW-12 | Gateway hanya bergantung pada config | Wajib | Mesin: Skeleto, saat startup |
| GW-13 | Pembaruan atomik atau optimisasi yang memindahkan aturan bisnis ke penyimpanan hanya boleh dengan alasan tertulis | Opsional | Reviewer |
| GW-14 | Selama pengembangan, gateway boleh berupa dummy, di memori atau hardcode, di balik kontrak yang sama dengan yang asli | Opsional | Reviewer |
| GW-15 | Gateway untuk menyisipkan, menyimpan, mencari satu, dan mencari banyak memakai bentuk standar | Opsional | Reviewer |

## Controller

Aturan di [docs/konsep/controller.md](docs/konsep/controller.md).

| Aturan | Isinya | Tingkat | Diperiksa oleh |
| --- | --- | --- | --- |
| CTL-1 | Controller membuat context dan hanya memanggil use case, tidak pernah gateway | Wajib | Reviewer |
| CTL-2 | Controller memeriksa bentuk input; aturan bisnis diperiksa entity | Wajib | Reviewer |
| CTL-3 | Controller menerjemahkan error bisnis; entity dan use case tidak pernah menyebut transport | Wajib | Reviewer |
| CTL-4 | Satu screen boleh memanggil banyak use case, dan satu use case boleh melayani banyak controller | Wajib | Reviewer |
| CTL-5 | Instance diambil dari container satu kali, saat aplikasi dimulai, dan hanya oleh awal aplikasi | Wajib | Reviewer |
| CTL-6 | Tampilan yang butuh data yang dikumpulkan untuk satu screen dilayani di sisi controller, atau oleh use case query tersendiri, bukan dengan mengubah use case yang sudah ada | Opsional | Reviewer |

## Komponen

Aturan di [docs/teknis/komponen.md](docs/teknis/komponen.md).

| Aturan | Isinya | Tingkat | Diperiksa oleh |
| --- | --- | --- | --- |
| KOM-1 | Komponen adalah fungsi yang menerima dependency-nya dan mengembalikan apa yang disediakannya | Wajib | Reviewer |
| KOM-2 | Tahap luar hanya menyimpan dependency; pekerjaan sebuah panggilan terjadi di handler | Wajib | Reviewer |
| KOM-3 | Setiap komponen punya alias tipe bernama, dan alias itulah nama komponennya | Wajib | Reviewer |
| KOM-4 | Setiap tipe yang dipakai sebagai dependency adalah alias bernama, tidak pernah tipe inline atau generik | Wajib | Reviewer |
| KOM-5 | Fungsi di balik komponen dinamai `impl` diikuti nama komponennya | Wajib | Reviewer |
| KOM-6 | Parameter dependency dinamai menurut tipenya, dengan huruf pertama kecil | Wajib | Reviewer |
| KOM-7 | Nama komponen disusun dari kata-kata di tabel berikut, dan tidak dari yang lain | Wajib | Reviewer |
| KOM-8 | Path berkas mengikuti nama isinya | Wajib | Reviewer |
| KOM-9 | Blok JSDoc berisi deskripsi lebih dulu, lalu penanda, satu per baris, tanpa apa pun setelah penanda selain datanya | Wajib | Reviewer |
| KOM-10 | Penanda yang sah disimpan di satu konstanta yang diekspor, dan selalu diberikan ke `Skeleto.start` | Wajib | Reviewer |
| KOM-11 | Satu tes integrasi menyalakan Skeleto dan membuktikan aplikasinya bisa menyala | Wajib | Reviewer |
| KOM-12 | Berkas tes dan berkas hasil generator dikecualikan dari pemindaian | Wajib | Reviewer |

## Action

Aturan di [docs/teknis/action.md](docs/teknis/action.md).

| Aturan | Isinya | Tingkat | Diperiksa oleh |
| --- | --- | --- | --- |
| ACT-2 | Handler hanya menerima context dan input; semua yang lain datang sebagai dependency | Wajib | Reviewer |
| ACT-3 | Context adalah metadata untuk infrastruktur; data bisnis tidak pernah dititipkan di context | Wajib | Reviewer |

## Wrapper

Aturan di [docs/teknis/wrapper.md](docs/teknis/wrapper.md).

| Aturan | Isinya | Tingkat | Diperiksa oleh |
| --- | --- | --- | --- |
| WRP-1 | Satu wrapper per penanda yang dibacanya, dinamai menurut penanda itu, dan langkah pertamanya mengembalikan handler apa adanya kalau penandanya tidak ada | Wajib | Reviewer |
| WRP-2 | Wrapper transaksi membuka transaksi dan menyimpannya di context | Wajib | Reviewer |
| WRP-3 | Transaksi yang sudah ada di context diikuti, tidak pernah digandakan | Wajib | Reviewer |
| WRP-4 | Wrapper transaksi menjalankan efek yang diantrekan hanya setelah commit berhasil | Wajib | Reviewer |
| WRP-5 | Urutan lapisan wrapper adalah urutan penulisannya | Wajib | Mesin: Skeleto, saat startup |
| WRP-7 | Wrapper yang urutannya penting ditulis di satu berkas | Wajib | Reviewer |
| WRP-6 | Wrapper pengamat gateway menyerahkan setiap panggilan gateway ke pengamat di context, dan meneruskan panggilannya kalau tidak ada pengamat | Opsional | Reviewer |

## Config

Aturan di [docs/teknis/config.md](docs/teknis/config.md).

| Aturan | Isinya | Tingkat | Diperiksa oleh |
| --- | --- | --- | --- |
| CFG-1 | Config asinkron memasang batas waktunya sendiri | Wajib | Reviewer |
| CFG-2 | Sumber daya yang harus dipakai di dalam transaksi diserahkan sebagai fungsi dari context, bukan sebagai koneksi | Wajib | Reviewer |
| CFG-3 | Membangun nilai adalah pekerjaan config; config tidak menjalankan pekerjaan per permintaan | Wajib | Reviewer |

## Pengembangan

Aturan di [docs/proses/pengembangan.md](docs/proses/pengembangan.md).

| Aturan | Isinya | Tingkat | Diperiksa oleh |
| --- | --- | --- | --- |
| DEV-1 | Mulai dari cerita pengguna, lalu wawancarai sampai area bisnisnya terlihat | Wajib | Proses |
| DEV-2 | Screen adalah petunjuk: terima sebagai bahan, lalu gali use case-nya | Wajib | Proses |
| DEV-3 | Klasifikasikan setiap area bisnis sebagai Core, Supporting, atau Generic | Wajib | Proses |
| DEV-4 | Pemilik yang memutuskan klasifikasi; agent hanya mengusulkan beserta alasannya | Wajib | Proses |
| DEV-5 | Catat klasifikasi di `docs/AREAS.md` | Wajib | Reviewer: `docs/AREAS.md` ada, dan setiap barisnya punya kelas, alasan, dan keputusan |
| DEV-6 | Sepakati istilah bisnis di `docs/GLOSSARY.md` sebelum entity atau use case mana pun dinamai | Wajib | Reviewer: `docs/GLOSSARY.md` ada, dan memuat setiap nama entity dan nama area bisnis |
| DEV-7 | Rancang hanya area Core lebih dulu: use case-nya, entity dasarnya, dan alurnya | Wajib | Proses |
| DEV-8 | Kebutuhan Core dari area lain ditangani dengan salah satu dari tiga cara, dan setiap cara dicatat | Wajib | Proses |
| DEV-9 | Catat hasil rancangan Core di `docs/CORE.md` | Wajib | Reviewer: `docs/CORE.md` ada, dan memuat use case, entity, gateway, keputusan, stub, anggapan, dan penyederhanaan area Core |
| DEV-10 | Tulis alur setiap proses bisnis sebagai satu peta skenario di `docs/scenarios/<process>.json` | Wajib | Reviewer: satu berkas untuk setiap proses bisnis, masing-masing dengan array `gaps` berisi `{id, question}` yang id-nya `<process>-<n>` dan unik di semua berkas |
| DEV-11 | Tulis kode hanya setelah kedua gerbang dan rancangan Core, dan tulis Core lebih dulu, sampai tuntas, sebelum lapis lain | Wajib | Proses |
| DEV-12 | Bangun area Supporting dan Generic hanya sejauh yang dibutuhkan utang Core yang tercatat | Wajib | Proses |
| DEV-13 | Di dalam satu area, kerja berputar satu use case setiap kali, dan satu area dikerjakan satu sesi AI | Wajib | Proses |
| DEV-14 | Kerangka Core dan Core selesai | Wajib | Reviewer: setiap celah di peta punya penanda di kode atau field `decision`, dan setiap cabang punya tes |

## Utang teknis

Aturan di [docs/proses/utang-teknis.md](docs/proses/utang-teknis.md).

| Aturan | Isinya | Tingkat | Diperiksa oleh |
| --- | --- | --- | --- |
| UTG-1 | Utang ditandai di kode, di baris tepat di atas yang bersangkutan, dengan salah satu dari tiga bentuk tetap, dan tidak ada penanda yang merujuk nomor tiket | Wajib | Reviewer: setiap penanda berbentuk salah satu dari tiga bentuk tetap, dan tidak ada yang menyebut tiket |
| UTG-2 | Cabang tempat celah tercapai menolak dengan `tech_debt` yang membawa id celahnya | Wajib | Reviewer |
| UTG-3 | Tes gagal kalau celah di peta tidak punya penanda maupun keputusan tercatat, atau kalau penanda menyebut celah yang tidak ada di peta mana pun | Wajib | Mesin: tes celah |
| UTG-4 | Kode usang dihapus dalam perubahan yang menggantikannya, bersama penandanya | Wajib | Reviewer: tidak ada kode usang yang tersisa, dan tidak ada penanda yang utangnya sudah lunas |
| UTG-5 | Kerangka use case hanya boleh ada di area yang sedang dikerjakan | Wajib | Reviewer: tidak ada area di luar yang sedang dikerjakan yang memuat use case yang hanya melempar "not implemented" |

## Tes celah

Celah di peta skenario (DEV-10) ditutup oleh penanda di kode (UTG-1) atau keputusan yang tercatat (DEV-14). Skeleto tidak tahu apa pun tentang peta atau utang, jadi tes ini hanya membaca berkas: ia tidak menyalakan aplikasi. Salin apa adanya ke akar aplikasi, di samping `main.test.ts` (KOM-11).

Tes ini gagal, dengan menyebut setiap celah atau penanda yang bermasalah:

- kalau celah di peta di `docs/scenarios/` tidak punya penanda `// TechDebt <gap id>: <reason>` di `src/` maupun field `decision` (UTG-3);
- kalau penanda seperti itu menyebut id yang tidak ada di peta mana pun. Penanda `Planned` dan `Shortcut` bukan tentang celah, dan dibiarkan.

```ts
// gaps.test.ts
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

type Gap = { id: string; decision?: string };

/** Every gap of every map under `docs/scenarios`. An application without one has no gaps. */
function readGaps(): Gap[] {
  if (!existsSync("docs/scenarios")) return [];
  return readdirSync("docs/scenarios")
    .filter((file) => file.endsWith(".json"))
    .flatMap((file) => (JSON.parse(readFileSync(`docs/scenarios/${file}`, "utf8")) as { gaps?: Gap[] }).gaps ?? []);
}

/** The gap ids named by the markers of `src`, each with the file that holds it: `// TechDebt <gap id>: <reason>` (UTG-1). */
function readMarkedIds(): Map<string, string> {
  const marked = new Map<string, string>();
  for (const file of readdirSync("src", { recursive: true, encoding: "utf8" }).filter((name) => name.endsWith(".ts"))) {
    for (const [, id] of readFileSync(`src/${file}`, "utf8").matchAll(/^\s*\/\/ TechDebt (?!Planned |Shortcut:)(\S+): /gm)) marked.set(id ?? "", `src/${file}`);
  }
  return marked;
}

test("UTG-3: every gap has a marker or a recorded decision", () => {
  const marked = readMarkedIds();
  const open = readGaps().filter((gap) => !marked.has(gap.id) && !gap.decision).map((gap) => gap.id);
  assert.deepEqual(open, []);
});

test("UTG-3: every marker names a gap that is on a map", () => {
  const ids = new Set(readGaps().map((gap) => gap.id));
  const unknown = [...readMarkedIds()].filter(([id]) => !ids.has(id)).map(([id, file]) => `${id} in ${file}`);
  assert.deepEqual(unknown, []);
});
```

Jalankan dari akar aplikasi, sebagai `tsx --test gaps.test.ts`: path yang dibacanya relatif terhadap folder tempat ia dijalankan.
