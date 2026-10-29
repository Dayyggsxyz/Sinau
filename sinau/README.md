# Sinau

Platform belajar AI untuk pelajar Indonesia. Frontend lengkap: login Google, unggah dan baca dokumen di browser, rangkuman/flashcard/quiz/AI Tutor lewat API AI yang kamu konfigurasi. Belum ada backend, jadi data tersimpan di browser.

## Menjalankan (Windows CMD)

```cmd
cd sinau
copy .env.example .env.local
npm install
npm run build
npm run dev
```

Edit `.env.local` (client ID Google, API key AI), lalu restart `npm run dev` setiap kali mengubahnya. Buka http://localhost:5173.

Node.js 20 atau lebih baru disarankan.

## Konfigurasi

| Variabel | Fungsi |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | OAuth client ID (Web). Tambahkan `http://localhost:5173` ke Authorized JavaScript origins |
| `VITE_ALLOW_GUEST` | `true` menampilkan tombol masuk tanpa akun |
| `VITE_API_BASE_URL` | Opsional, backend untuk verifikasi token (`POST /auth/google`) |
| `VITE_AI_PROVIDER` | `mock`, `anthropic`, atau `openai` (kompatibel OpenAI) |
| `VITE_AI_API_KEY`, `VITE_AI_MODEL`, `VITE_AI_BASE_URL` | Kunci, model, dan URL opsional (proxy) |

Semua variabel `VITE_*` terlihat di browser. Jangan memakai API key pribadi di build yang dipublikasikan; gunakan proxy backend.

## Stack

React 18, TypeScript, Vite 6, Tailwind CSS 4, React Router 6, Lucide. Pembaca dokumen: pdfjs-dist, mammoth, jszip (dimuat saat dibutuhkan).

## Struktur

```
src/
  components/  layout/ ui/ material/ upload/
  context/     Auth, Settings, Library
  data/        data contoh (materi, flashcard, quiz, tutor)
  hooks/       useLocalStorage, useStudyTracker, useDisplayName, ...
  lib/         cn, format, quiz, text, activity, subjects
  pages/       Auth, Dashboard, Materials, Flashcards, Quiz, Tutor, Settings
  services/    auth, llm, ai, extract, documents, storage, config
  types/
```

Baca `HANDOFF.md` sebelum melanjutkan pengembangan.
