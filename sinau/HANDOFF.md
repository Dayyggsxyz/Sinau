# HANDOFF untuk coding agent berikutnya

Jangan bangun ulang dari awal. Frontend sudah lengkap; yang tersisa adalah backend (database, verifikasi login, proxy AI) dan pengujian.

## Prinsip yang harus dijaga

1. **Jujur soal status fitur.** Jika sebuah fitur memakai data contoh atau belum terhubung, beri label (`DemoNotice`, badge "Contoh"). Jangan klaim fitur berfungsi jika bergantung pada konfigurasi yang belum diisi.
2. **Akses data lewat `src/services/` dan `LibraryContext`.** Halaman jangan fetch langsung.
3. **Warna lewat token** di `src/index.css`. Jangan hardcode hex di komponen. Tema gelap lewat kelas `.dark`.
4. **Variabel `VITE_*` terlihat di browser.** API key AI di `.env.local` hanya cocok untuk pengembangan. Untuk produksi, arahkan `VITE_AI_BASE_URL` ke proxy backend yang menyimpan key.

## Status per fitur

| Fitur | Status |
|---|---|
| Routing, layout responsif, tema terang/gelap/sistem | Nyata |
| Login Google (Google Identity Services) | Nyata jika `VITE_GOOGLE_CLIENT_ID` diisi. Tanpa `VITE_API_BASE_URL`, token hanya didekode di browser dan **tidak diverifikasi tanda tangannya** |
| Tombol "Lanjutkan tanpa akun" | Nyata, bisa dimatikan dengan `VITE_ALLOW_GUEST=false` |
| Sesi login | Lokal (localStorage, 7 hari). Belum ada sesi server |
| Unggah dan ekstraksi teks PDF/DOCX/PPTX/TXT | Nyata, di browser (pdfjs-dist, mammoth, jszip). PDF scan tanpa teks ditolak, OCR belum ada |
| Rangkuman, bagian, dan istilah dari file | Nyata jika AI dikonfigurasi. Tanpa AI, materi dibuat dari pembagian teks sederhana |
| Flashcard dan quiz dari materi pengguna | Nyata jika AI dikonfigurasi (`GeneratePanel`, tombol di detail materi) |
| Sistem kartu interaktif (mode Latihan / Ujian) | Nyata, dihitung di browser. `lib/quizSession.ts` menyimpan aturan sesi murni (mudah diuji) |
| AI Tutor | Nyata jika AI dikonfigurasi (konteks = isi materi terpilih). Tanpa AI, jawaban contoh berbasis kata kunci |
| Statistik dashboard (streak, menit belajar, rata-rata quiz, kartu dikuasai) | Nyata, dihitung dari aktivitas di browser ini |
| Penyimpanan | **Lokal per akun** di localStorage (~5 MB). Tidak tersinkron antar perangkat |
| Materi, flashcard, dan quiz bawaan | Data contoh (`src/data/`), bisa disembunyikan di Pengaturan |
| Backend, database, penyimpanan file permanen | **Belum ada** |

## Konfigurasi (`.env.local`, lihat `.env.example`)

`VITE_GOOGLE_CLIENT_ID`, `VITE_ALLOW_GUEST`, `VITE_API_BASE_URL`, `VITE_AI_PROVIDER` (`mock` | `anthropic` | `openai`), `VITE_AI_API_KEY`, `VITE_AI_MODEL`, `VITE_AI_BASE_URL`, `VITE_MAX_UPLOAD_MB`.

Provider `openai` memakai format chat completions, jadi bisa dipakai untuk layanan kompatibel (OpenRouter, Groq, dll.) lewat `VITE_AI_BASE_URL`. Provider `anthropic` memakai header `anthropic-dangerous-direct-browser-access` karena dipanggil dari browser.

## Endpoint AI saat ini

`.env.local` memakai endpoint kompatibel OpenAI `https://ai.zelai.qzz.io/v1` (model `gemini-1.5-pro-free`, tanpa API key). Saat `npm run dev`, panggilan lewat proxy Vite `/ai-proxy` (lihat `vite.config.ts`) agar tidak terkena CORS. Build produksi tidak punya proxy itu: arahkan `VITE_AI_BASE_URL` ke URL langsung jika server mengizinkan CORS, atau ke proxy backend milikmu. Layanan ini pihak ketiga, jadi teks materi yang dikirim ke AI keluar dari browser.

## Sistem kartu interaktif

Satu mesin kartu dipakai ulang oleh flashcard dan quiz.

- `lib/quizSession.ts`: state sesi murni (tanpa React) — `createSession`, `applyAnswer`, `goto`, `sessionResult`, `optionShortcut`. Aturan mode ada di sini, jadi bisa diuji tanpa DOM.
- Mode `latihan`: jawaban langsung dikunci, benar/salah dan pembahasan tampil seketika, beruntun benar dilacak. Mode `ujian`: jawaban bebas diubah, dinilai di akhir. Mode default tersimpan di `settings.studyMode`.
- `components/study/`: `CardFrame` (permukaan kartu + cincin status), `FlipCard` (flashcard 3D), `QuizCard` (soal + opsi + pembahasan), `useCardKeys` (pintasan bersama).
- Pintasan: panah kiri/kanan pindah kartu, spasi membalik flashcard, angka/huruf 1–4 memilih opsi, 1–3 menandai pemahaman setelah kartu dibalik.

## Peta kode

- `services/auth.service.ts`: muat skrip Google, render tombol, dekode/tukar credential, sesi lokal. Jika `VITE_API_BASE_URL` diisi, credential dikirim ke `POST {url}/auth/google` (respons `{ user: { id, email, name, picture } }`).
- `context/AuthContext.tsx`, `components/layout/RequireAuth.tsx`, `pages/Auth/LoginPage.tsx`.
- `main.tsx`: `setStorageScope(user.id)` memisahkan data lokal per akun; `key` pada Fragment me-reset state saat akun berganti.
- `services/llm.ts`: satu fungsi `chat()` untuk semua provider + `parseJsonReply`.
- `services/ai.service.ts`: `askTutor`, `structureMaterial`, `generateFlashcards`, `generateQuiz`. Output AI divalidasi sebelum dipakai.
- `services/extract.ts` dan `services/documents.service.ts`: ekstraksi teks dan pembuatan `Material`.
- `context/LibraryContext.tsx`: materi/flashcard/quiz pengguna + data contoh, progres baca. Semua halaman membaca dari sini.
- `lib/activity.ts` dan `hooks/useStudyTracker.ts`: pelacakan menit belajar (tab aktif, interval 15 detik).

## Langkah berikutnya yang disarankan

1. `npm install`, lalu `npm run typecheck` dan `npm run build`. Perbaiki error tipe jika ada: kode ini belum pernah dikompilasi penuh.
2. Isi `.env.local`, coba login Google, unggah satu file, lalu uji pembuatan rangkuman/flashcard/quiz.
3. Backend: verifikasi token Google di server (`/auth/google`), sesi cookie httpOnly, database untuk materi/progres/skor, penyimpanan file.
4. Proxy AI di server (key tidak di browser, batas pemakaian per pengguna), lalu arahkan `VITE_AI_BASE_URL` ke sana. Untuk materi panjang, pertimbangkan pemotongan/RAG; saat ini teks dipotong ke 24.000 karakter per permintaan.
5. Pindahkan penyimpanan lokal ke database lewat `LibraryContext` dan `services/storage.ts`. Kuota localStorage kecil: materi besar akan memicu banner "penyimpanan penuh".
6. OCR untuk PDF scan, tes aksesibilitas (keyboard, pembaca layar), dan tes mobile.

## Konvensi

- Teks UI berbahasa Indonesia, kalimat biasa, tombol berisi kata kerja jelas.
- Route: `/masuk`, `/`, `/materi`, `/materi/:id`, `/flashcard?deck=:materialId`, `/quiz`, `/quiz/:quizId`, `/tutor?materi=:materialId`, `/pengaturan`.
- Alias impor `@/` menunjuk ke `src/`.
- Motif buku tulis (`.ruled`, `.margin-line`) hanya untuk sapaan dashboard, kartu belajar (flashcard & quiz), layar hasil quiz, dan panel login. Jangan disebar ke komponen lain.
- Warna selalu lewat token di `src/index.css`. Elevasi lewat token `--shadow-*`; komponen `Card` punya prop `elevation` (`flat` | `raised` | `floating`).
- Umpan balik singkat (berhasil/gagal) pakai `useToast()` dari `components/ui/Toast.tsx`, bukan alert bawaan.

## Pembaruan terbaru (belum dikompilasi di lingkungan penulis)

Dibuat tanpa `node_modules` dan tanpa jaringan, jadi SEBELUM apa pun jalankan: `npm install`, `npm run typecheck`, `npm run build`, lalu perbaiki error tipe yang muncul. Hanya logika murni yang sudah diuji di Node (chunking, mesin Runner, diagram, rumus).

- Dokumen panjang: `lib/chunking.ts`, `structureMaterial` per potongan + `Material.coverage`, halaman sumber di tiap bagian, progres upload nyata per bagian.
- Soal/flashcard: batch lintas bagian, dedup, jumlah 10/20/30/40 + kesulitan, peringatan bila kurang.
- Catatan belajar 6 mode + pilih bagian: `components/material/NotesPanel.tsx`, `generateNotes`.
- Markdown aman tanpa dependensi: `components/ui/Markdown.tsx` (tabel, daftar bersarang, kode, rumus sederhana via `lib/formula.ts`, diagram alur "A -> B" via `lib/diagram.ts`).
- Tutor: tombol hentikan, coba lagi, konteks relevan untuk materi panjang; `llm.ts` punya timeout 2 menit, pembatalan, retry 429/5xx.
- Desain: token baru terang/gelap (`index.css`), font sistem, motif buku tulis dihapus, flashcard baru (tinggi mengikuti isi, geser di layar sentuh, acak, mulai ulang).
- Data contoh dihapus dari pustaka (`data/` hanya menyisakan saran prompt tutor). Penyimpanan sudah per-pengguna lewat `storage.ts`.
- Sinau Runner: `lib/runnerPool.ts`, `lib/runnerEngine.ts`, `components/runner/*`, `pages/Runner/RunnerPage.tsx`, rute `/runner`.

Belum / batasan jujur: OCR untuk PDF scan, KaTeX dan Mermaid penuh (butuh `npm i katex mermaid` lalu ganti `Formula`/`Flow` di Markdown.tsx), tombol buka halaman PDF asli dari tiap bagian (saat ini hanya label halaman), penyimpanan masih localStorage (bukan server, jadi isolasi data hanya di sisi browser), tes otomatis, audit kontras warna dengan alat.
