# Utang teknis

Cara menandai, menghitung, dan melunasi pekerjaan yang belum selesai, supaya tidak ada yang diam-diam terlupa.

## Definisi

Ada tiga jenis utang, dan tidak ada jenis keempat:

| Jenis | Artinya | Yang disebutnya |
| --- | --- | --- |
| **Celah** (gap) | pertanyaan terbuka di peta skenario: kondisi yang mungkin terjadi, tetapi bisnis belum memutuskan apa yang harus terjadi | id celahnya di peta |
| **Planned** | stub yang menunggu lapis berikutnya | lapis yang melunasinya |
| **Shortcut** | jalan pintas atau versi sederhana yang disengaja | alasannya |

Kode yang sudah digantikan keputusan berikutnya adalah **usang**, dan kode usang dilarang. Ia bukan utang.

## Kenapa ada

Penanda utang yang tidak pernah dihapus menjadi janji palsu. Penanda yang ditulis sebelum keputusan berikutnya menggantikan kodenya tertinggal, dan lama-lama sebagian besar penanda tidak menggambarkan apa-apa. Tiga jenis dengan aturan masing-masing membuat penanda tetap sedikit dan benar.

## Aturan wajib

### UTG-1. Utang ditandai di kode, di baris tepat di atas yang bersangkutan, dengan salah satu dari tiga bentuk tetap, dan tidak ada penanda yang merujuk nomor tiket

| Utang | Penanda |
| --- | --- |
| Celah peta skenario | `// TechDebt <gap id>: <reason>` |
| Planned | `// TechDebt Planned <layer>: <reason>` |
| Shortcut | `// TechDebt Shortcut: <reason>` |

- `<gap id>` adalah id celah di petanya (DEV-10 di [pengembangan.md](pengembangan.md)), misalnya `stock_transfer-3`. Penandanya berada di use case yang bersangkutan, di cabang tempat celah itu tercapai.
- `<layer>` adalah lapis yang melunasi utangnya, misalnya `Notifications`. `Planned` dan `Shortcut` adalah kata khusus, supaya id celah tidak pernah tertukar dengan jenis.
- `<reason>` menyatakan dalam satu baris apa yang hilang atau disederhanakan.
- Tidak ada penanda yang menyebut tiket, issue, atau rujukan lain di luar repo. Rujukan ke tiket bertahan lebih lama dari tiketnya dan tidak berarti apa-apa bagi pembaca kode, sedangkan id celah dan lapis ada di dalam repo dan bisa diperiksa di sana.

Bentuk yang tetap bisa ditemukan dan dihitung oleh pencarian atau tes.

### UTG-2. Cabang tempat celah tercapai menolak dengan `tech_debt` yang membawa id celahnya

Use case boleh dipanggil, dan menolak dengan jujur bahwa ini utang, bukan aturan. Error-nya `BusinessError` berjenis `tech_debt` dengan field `gap` berisi id celah (ENT-5 di [entity.md](../konsep/entity.md)). Dengan begitu utangnya terhitung di dua tempat: oleh id celah saat aplikasi berjalan, dan oleh penanda di kode.

### UTG-3. Tes gagal kalau celah di peta tidak punya penanda maupun keputusan tercatat, atau kalau penanda menyebut celah yang tidak ada di peta mana pun

Tesnya adalah tes celah di `REVIEW_CHECKLIST.md`, disalin apa adanya ke akar aplikasi. Ia membaca peta di `docs/scenarios/` dan penanda UTG-1 di `src/`, lalu menyebut setiap celah atau penanda yang bermasalah. Celah ditutup oleh penanda di use case yang bersangkutan, atau oleh field `decision` di celah itu.

Pemeriksaan dua arah menjaga peta dan kode tetap seiring: celah tanpa penanda dan tanpa keputusan adalah pertanyaan yang terlupa, dan penanda untuk id yang tidak ada di peta adalah utang yang tidak bisa ditelusuri ke pertanyaan mana pun. Tes melakukannya di setiap jalan, sesuatu yang tidak bisa dilakukan review.

### UTG-4. Kode usang dihapus dalam perubahan yang menggantikannya, bersama penandanya

Kode usang tidak disimpan dengan tenggat dan tidak ditandai. Perubahan yang menggantikannya juga menghapusnya. Begitu pula penanda: ia dihapus dalam perubahan yang melunasi utangnya.

### UTG-5. Kerangka use case hanya boleh ada di area yang sedang dikerjakan

Kerangka use case, yang isinya hanya melempar "not implemented", hanya boleh ada di area bisnis yang sedang dikerjakan. Area yang tidak sedang dikerjakan tidak memuatnya. Celah bukan kerangka: celah hidup di dalam cabang sebuah use case, sebagai penanda dan penolakan `tech_debt`, bukan di badan yang kosong.

Menulis kerangka setiap use case sebelum satu pun selesai mengubur pekerjaan dalam daftar yang terlalu panjang untuk diingat, dan sebagian besar akan ditulis ulang setelah Core dikenal. Mengizinkan kerangka di satu area yang sedang dikerjakan tetap membuat area itu bisa disketsa.

## Hubungan dengan alat lain

| Alat | Yang dibacanya |
| --- | --- |
| Tes celah (`REVIEW_CHECKLIST.md`) | peta di `docs/scenarios/` dan penanda UTG-1 di `src/` |
| Penjejak scenario-explorer | penanda celah di kode (lewat pola teks yang dikonfigurasi aplikasi), dan `kind`/`gap` dari error yang dilempar |

> **Catatan.** Pola teks penanda adalah kontrak antara dokumen ini, tes celah, dan penjejak scenario-explorer, tetapi tidak tertulis sebagai kontrak di sisi Skeleto (`TEMUAN.md`, temuan 14).

## Status implementasi

Tidak ada yang diperiksa Skeleto. UTG-3 diperiksa tes salinan; aturan lain dijaga reviewer.
