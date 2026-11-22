# Wrapper

## Definisi

**Wrapper** adalah komponen Skeleto yang menghasilkan fungsi pembungkus: `(handler, metadata) => handler`. Fungsi itu menerima handler sebuah action beserta metadata-nya, lalu mengembalikan handler yang dipakai sebagai gantinya.

```ts
export type WrapperHandler = (actionHandler: ActionHandler, functionMetadata: FuncMetadata) => ActionHandler;
```

Wrapper ditandai `@Wrapper`, boleh dengan data `{"ordinal": <bilangan bulat>}`.

## Kenapa ada

Ada urusan yang berlaku untuk banyak action sekaligus: transaksi, audit, logging, pengukuran waktu, pengamatan oleh alat luar. Kalau ditulis di setiap action, urusan itu bisa lupa dipasang di salah satunya. Skeleto menawarkan **setiap** action ke **setiap** wrapper, sehingga urusan lintas-action ditulis sekali, di satu tempat.

## Tempatnya dalam pemisahan logika dan infrastruktur

Wrapper adalah infrastruktur lintas-action. Ia tidak memegang aturan bisnis dan tidak tahu isi Request atau Response.

## Perilaku yang dijamin Skeleto

- Wrapper hanya boleh bergantung pada `@Config`.
- Semua wrapper dibuat sebelum action pertama dibuat.
- Setiap action dibungkus **semua** wrapper. Wrapper yang mengembalikan `handler` apa adanya berarti tidak membungkus.
- Urutannya menurut `ordinal` (tanpa `ordinal` dianggap `0`): **angka lebih besar menjadi lapisan lebih luar**. Untuk `ordinal` yang sama, nama wrapper yang lebih akhir menurut urutan teks menjadi lapisan lebih luar.
- Fungsi wrapper, dan setiap pembungkusan, harus menghasilkan fungsi. Hasil lain menghentikan startup dengan pesan yang menyebut wrapper dan action yang sedang dibungkus.

## Struktur

```ts
// src/wrappers.ts (excerpt)
/** @Wrapper {"ordinal": 10} */
export function implAuditWrapper(logger: Logger): AuditWrapper {
  return (handler, metadata) => {
    // Only what is marked @Audit: the gateways a use case calls are details of it.
    if (!marked(metadata, "Audit")) return handler;
```

## Nama dan berkas

| Apa | Nama atau berkas | Contoh |
| --- | --- | --- |
| Wrapper | `<Marker>Wrapper`, menurut satu penanda tambahan yang dibacanya | `AuditWrapper`, `TransactionWrapper` |
| Fungsinya | `impl<Wrapper>` | `implAuditWrapper` |
| Berkas | semua wrapper di `src/wrappers.ts` | |

## Aturan wajib

### WRP-1. Satu wrapper per penanda, dinamai menurut penanda itu, dan langkah pertamanya mengembalikan handler apa adanya kalau penandanya tidak ada

Skeleto menawarkan setiap action ke setiap wrapper. Mengembalikan handler itu sendiri tidak menambahkan apa pun ke action yang tidak berpenanda, bahkan satu panggilan fungsi pun tidak. Dengan satu wrapper per penanda, arti sebuah penanda ditulis di satu tempat, dan menghapus penanda dari sebuah action menghapus tepat perilaku itu.

Penanda utama (`@UseCase`, `@Gateway`) bukan penanda tambahan: wrapper yang perlu membedakan keduanya membaca `metadata.mainDecorator.name`, tanpa penanda tambahan.

### WRP-2. Wrapper transaksi membuka transaksi dan menyimpannya di context

```ts
// src/wrappers.ts (excerpt)
      const transaction = connection.begin();
      const afterCommit: (() => void | Promise<void>)[] = [];
      ctx.data.transaction = transaction;
      ctx.data.afterCommit = afterCommit;
```

Ia commit ketika handler selesai, rollback ketika handler melempar error, dan menghapus kedua kunci dari context dalam kedua keadaan itu.

Transaksi milik satu panggilan, dan context satu-satunya yang ikut bersama panggilan melewati setiap action yang dicapainya. Use case cukup menulis `@Transaction`; ia tidak pernah memulai, commit, atau meneruskan transaksi sendiri.

### WRP-3. Transaksi yang sudah ada di context diikuti, tidak pernah digandakan

```ts
// src/wrappers.ts (excerpt)
      // Already inside a transaction: join it rather than open a second one.
      if (ctx.data.transaction) return handler(ctx, input);
```

Action ber-`@Transaction` yang dipanggil action lain di dalam transaksinya harus ikut serta. Transaksi kedua akan commit setengah bagiannya sendiri, sehingga kegagalan transaksi luar meninggalkan setengah perubahan tersimpan, dan ia akan menunggu kunci yang dipegang transaksi luar.

### WRP-4. Wrapper transaksi menjalankan efek yang diantrekan hanya setelah commit berhasil

```ts
// src/wrappers.ts (excerpt)
      let result;
      try {
        result = await handler(ctx, input);
        transaction.commit();
        logger("commit");
      } catch (error) {
        transaction.rollback();
        logger("rollback");
        throw error;
      } finally {
        delete ctx.data.transaction;
        delete ctx.data.afterCommit;
      }
      // Effects run only once the change is stored; on a rollback they are dropped with the rest of the context.
      for (const effect of afterCommit) await effect();
      return result;
```

Keluaran contoh di README menunjukkannya: `stock changed: north 7, south 3` muncul setelah `commit`, dan pemindahan yang di-rollback tidak melaporkan apa pun.

Gateway mengantrekan efeknya di `ctx.data.afterCommit` (GW-10 di [gateway.md](../konsep/gateway.md)). Efek yang dikirim sebelum commit tidak bisa ditarik kembali ketika transaksinya kemudian di-rollback. Bentuk ini bisa kehilangan efek; untuk efek yang tidak boleh hilang, pakai outbox.

## Aturan opsional

### WRP-5. Urutan lapisan wrapper adalah urutan penulisannya

> **Rencana, belum terealisasi di kode** (arahan pemilik, 2026-11-22). Pemilik ingin membuang `ordinal` dan memakai urutan penulisan sebagai urutan resmi lapisan, seperti kulit bawang.
>
> **Yang berlaku sekarang:** urutan ditentukan `ordinal`; angka lebih besar menjadi lapisan lebih luar. Dalam contoh, `AuditWrapper` (ordinal 10) berada di luar `TransactionWrapper` (ordinal 0), dan wrapper pengamat gateway (ordinal -10) berada di dalam keduanya.

Rencananya:
- Semua wrapper wajib berada di satu berkas, `src/wrappers.ts` (KOM-8). Wrapper di berkas lain menjadi kesalahan saat startup, karena urutan antarberkas bergantung pada nama berkas dan itu rapuh.
- Arahnya belum final. Pemilik condong: wrapper yang ditulis **pertama** adalah lapisan **terdalam**, dipasang paling dulu, sehingga berkas dibaca dari inti ke luar. Pada saat dipanggil, urutannya terbalik: lapisan terluar, yang ditulis terakhir, berjalan paling dulu.
- `{"ordinal": ...}` dihapus dari kontrak `@Wrapper`. Ini perubahan API (`CLAUDE.md` bagian 4.4 dan 4.7, README, dan tes).

### WRP-6. Wrapper pengamat gateway menyerahkan setiap panggilan gateway ke pengamat di context, dan meneruskan panggilannya kalau tidak ada pengamat

```ts
// src/wrappers.ts (excerpt)
export type GatewayObserver = (call: { gateway: string; input: unknown; proceed: () => Promise<unknown> }) => Promise<unknown>;
```

```ts
// src/wrappers.ts (excerpt)
/**
 * Optional: only an application that lets a tool outside it observe a run needs this wrapper.
 * It is the innermost wrapper, so what it reports is the gateway call itself, without the transaction or the audit around it.
 *
 * @Wrapper {"ordinal": -10}
 */
export function implGatewayWrapper(): GatewayWrapper {
  return (handler, metadata) => {
    if (metadata.mainDecorator.name !== "Gateway") return handler;
    return (ctx, input) => {
      const observer: GatewayObserver | undefined = ctx.data.gatewayObserver;
      // Nobody observes: the call goes through untouched.
      if (!observer) return handler(ctx, input);
      return observer({ gateway: metadata.name, input, proceed: () => handler(ctx, input) }) as ReturnType<typeof handler>;
    };
  };
}
```

Wrapper ini hanya dibutuhkan aplikasi yang membiarkan alat luar (misalnya penjejak scenario-explorer) mengamati sebuah jalan. Pengamat dibaca di `ctx.data.gatewayObserver`, satu-satunya kunci yang dilihat alat seperti itu. Pengamat menerima nama gateway, input-nya, dan `proceed`, lalu mengembalikan apa yang diterima pemanggil gateway. Ia memanggil `proceed()` paling banyak sekali dan mengembalikan hasilnya, atau menjawab panggilan itu sendiri tanpa memanggil `proceed()`. Yang kedua hanya boleh dilakukan alat yang menjalankan aplikasi untuk dilihat, tidak pernah di produksi. Pengamat boleh mengukur waktu panggilan atau melihat apa yang kembali. Wrapper ini memakai `ordinal` terendah, sehingga menjadi lapisan terdalam dan melaporkan panggilan gateway itu sendiri, tanpa transaksi atau audit di sekitarnya.

Alat yang menggambar atau mengukur sebuah jalan perlu melihat setiap panggilan yang keluar dari use case, dan gateway-lah panggilan-panggilan itu. Satu wrapper pada nama penanda utamanya (`Gateway`) menemukan semuanya tanpa mengubah gateway atau use case mana pun. Kesepakatan tentang kunci, signature, dan letaknya di antara wrapper membuat satu alat bisa membaca aplikasi mana pun.

## Yang bukan tugas wrapper

Wrapper bukan alat validasi struktur. Aturan antara use case dan gateway dijaga Skeleto sendiri saat startup, sebelum berkas aplikasi diimpor (lihat [use-case-gateway-bawaan.md](use-case-gateway-bawaan.md)), jadi tidak ada wrapper penjaga.

## Hubungan dengan komponen lain

| Dengan | Hubungannya |
| --- | --- |
| Config | satu-satunya dependency yang boleh |
| Action | membungkus semua jenis action (use case, gateway, action polos); memilih yang dibungkus lewat penanda tambahan di `metadata.additionalDecorators`, atau lewat jenisnya di `metadata.mainDecorator.name` |
| Wrapper lain | tidak bergantung padanya; urutan antarwrapper ditentukan `ordinal` |
| Context | menambah dan menghapus yang dikelolanya |

## Status implementasi

| Bagian | Status |
| --- | --- |
| `@Wrapper`, `ordinal`, dan pembungkusan | terealisasi |
| Wrapper transaksi, audit, pengamat gateway | kode contoh di `README.md`, disalin setiap aplikasi |
| Wrapper siap pakai dari Skeleto | belum diputuskan (`TEMUAN.md`, temuan 12) |
