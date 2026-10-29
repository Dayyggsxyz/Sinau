/** DATA DEMO untuk AI Tutor. Jawaban contoh berbasis kata kunci, bukan hasil model AI. */
export interface TutorTopic {
  keywords: string[]
  answer: string
}

export const tutorTopics: TutorTopic[] = [
  {
    keywords: ['fotosintesis', 'calvin', 'klorofil', 'tilakoid'],
    answer:
      'Fotosintesis berlangsung dalam dua tahap.\n\n1. Reaksi terang (tilakoid): cahaya memecah air, melepaskan O₂, dan menghasilkan ATP serta NADPH.\n2. Siklus Calvin (stroma): ATP dan NADPH dipakai untuk mengikat CO₂ menjadi gula.\n\nCoba jelaskan dengan kata-katamu sendiri: mengapa siklus Calvin tetap bergantung pada cahaya walau tidak memakai cahaya langsung?',
  },
  {
    keywords: ['respirasi', 'krebs', 'glikolisis', 'atp'],
    answer:
      'Respirasi aerob memecah glukosa lewat tiga tahap: glikolisis (sitoplasma), siklus Krebs (matriks mitokondria), lalu transpor elektron (membran dalam mitokondria). Tahap terakhir menghasilkan ATP paling banyak, dan oksigen berperan sebagai akseptor elektron terakhir.',
  },
  {
    keywords: ['newton', 'inersia', 'kelembaman', 'aksi', 'reaksi'],
    answer:
      'Tiga hukum Newton secara singkat:\n\n- Hukum I: jika ΣF = 0, kecepatan benda tetap.\n- Hukum II: ΣF = m · a.\n- Hukum III: gaya aksi dan reaksi sama besar, berlawanan arah, dan bekerja pada benda yang berbeda.\n\nMau coba soal? Benda 3 kg diberi gaya 12 N. Berapa percepatannya?',
  },
  {
    keywords: ['proklamasi', 'rengasdengklok', 'maeda', 'ppki'],
    answer:
      'Urutan peristiwanya: Jepang menyerah (15 Agustus), peristiwa Rengasdengklok (16 Agustus), perumusan teks di rumah Laksamana Maeda (malam 16 sampai dini hari 17 Agustus), pembacaan proklamasi (17 Agustus, sekitar pukul 10.00), lalu sidang PPKI (18 Agustus).',
  },
  {
    keywords: ['kuadrat', 'diskriminan', 'parabola', 'abc'],
    answer:
      'Untuk ax² + bx + c = 0, hitung dulu diskriminan D = b² − 4ac.\n\n- D > 0: dua akar real berbeda.\n- D = 0: satu akar kembar.\n- D < 0: tidak ada akar real.\n\nSetelah itu akar dicari dengan x = (−b ± √D) ÷ 2a.',
  },
  {
    keywords: ['eksposisi', 'tesis', 'argumentasi'],
    answer:
      'Teks eksposisi tersusun dari tesis (pendapat penulis), argumentasi (alasan dan bukti), dan penegasan ulang (tesis diperkuat kembali). Bahasanya baku dan banyak memakai konjungsi sebab-akibat.',
  },
]

export const tutorFallback =
  'AI Tutor masih mode demo, jadi aku hanya bisa menjawab beberapa topik contoh: fotosintesis, respirasi, hukum Newton, proklamasi, fungsi kuadrat, dan teks eksposisi. Coba tanyakan salah satunya, atau pilih materi di atas.'

export const suggestedPrompts = [
  'Jelaskan fotosintesis dengan bahasa sederhana',
  'Apa beda hukum I dan hukum III Newton?',
  'Urutkan peristiwa menjelang proklamasi',
  'Bagaimana cara memakai diskriminan?',
]
