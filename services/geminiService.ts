import { GoogleGenAI, Type, Schema } from "@google/genai";
import { BlueprintItem, ExamConfig, QuestionItem } from "../types";

const getAiClient = (apiKey: string) => {
  if (!apiKey) {
    throw new Error("API Key belum diatur.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to safely parse JSON from AI response
const cleanJson = (text: string) => {
  try {
    // Remove markdown code blocks if present
    const cleaned = text.replace(/```json\n|\n```/g, '').replace(/```/g, '');
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    return {};
  }
};

// Schema for Blueprint
const blueprintSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          learningObjective: { type: Type.STRING, description: "Capaian Pembelajaran (CP) / KD yang relevan" },
          material: { type: Type.STRING },
          indicator: { type: Type.STRING, description: "Indikator soal yang spesifik menggunakan kata kerja operasional" },
          level: { type: Type.STRING, enum: ["L1", "L2", "L3"] },
          questionForm: { type: Type.STRING, enum: ["Pilihan Ganda", "Uraian"] },
          questionNumber: { type: Type.INTEGER }
        },
        required: ["id", "learningObjective", "material", "indicator", "level", "questionForm", "questionNumber"]
      }
    }
  }
};

// Schema for Questions
const questionsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          blueprintId: { type: Type.INTEGER },
          questionText: { type: Type.STRING, description: "Teks soal lengkap termasuk stimulus. Gunakan format LaTeX ($...$) untuk rumus matematika/sains." },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Array of options (A, B, C, D, E). KOSONGKAN array ini [] jika bentuk soal adalah Uraian."
          },
          correctAnswer: { type: Type.STRING, description: "Kunci jawaban (misal 'A' atau teks jawaban singkat). Jika Uraian, isi dengan poin-poin jawaban utama." },
          explanation: { type: Type.STRING, description: "Pembahasan atau pedoman penskoran." },
          imageDescription: { type: Type.STRING, description: "Deskripsi visual untuk gambar/diagram jika soal memerlukannya. Kosongkan jika tidak butuh gambar." },
          mermaidCode: { type: Type.STRING, description: "Kode Mermaid JS untuk diagram/grafik/flowchart jika soal memerlukannya. Contoh: 'graph TD; A-->B;'. Kosongkan jika tidak butuh diagram." }
        },
        required: ["blueprintId", "questionText", "correctAnswer", "explanation"]
      }
    }
  }
};

export const generateBlueprint = async (config: ExamConfig, apiKey: string): Promise<BlueprintItem[]> => {
  const ai = getAiClient(apiKey);

  const total = config.countL1 + config.countL2 + config.countL3;
  const countPg = total - config.countEssay;
  const parts: any[] = [];

  // 1. Add PDF File if present
  if (config.materialFile) {
    parts.push({
      inlineData: {
        mimeType: config.materialFile.mimeType,
        data: config.materialFile.data
      }
    });
  }

  // 2. Build Prompt Text
  let promptText = `
    Bertindaklah sebagai ahli kurikulum dan pembuat soal ujian profesional.
    Tugas: Buatlah Kisi-kisi Soal (Exam Blueprint) berdasarkan materi yang dilampirkan (bisa berupa File PDF atau Teks).
    
    Mata Pelajaran: ${config.subject}
    Kelas: ${config.grade}
    Topik Utama: ${config.topic}
    ${config.learningObjective ? `Capaian Pembelajaran (CP) / KD: ${config.learningObjective}` : ''}
    
    BAHASA OUTPUT:
    Deteksi bahasa utama dari materi atau topik. 
    - Jika materi adalah pelajaran Bahasa Asing (Jepang, Arab, Jerman, Mandarin, Korea, dll), tetap gunakan Bahasa Indonesia untuk mendeskripsikan Materi dan Indikator, kecuali istilah teknis.
    - Jika materi pelajaran umum (Biologi, Fisika) dalam konteks Indonesia, gunakan Bahasa Indonesia.
    - Default: Bahasa Indonesia.
  `;

  if (config.materialText) {
    promptText += `\n\nMateri Tambahan / Teks Konteks:\n"${config.materialText.substring(0, 20000)}"\n`;
  }

  promptText += `
    Jumlah Soal yang diminta (Total ${total}):
    - Level 1 (Pengetahuan & Pemahaman): ${config.countL1} soal.
    - Level 2 (Aplikasi): ${config.countL2} soal.
    - Level 3 (Penalaran): ${config.countL3} soal.
    
    Proporsi Bentuk Soal:
    - Soal Uraian (Essay): ${config.countEssay} butir. (Pilihkan indikator/level yang paling cocok untuk essay, biasanya L2 atau L3).
    - Soal Pilihan Ganda: ${countPg} butir.

    Pastikan:
    1. Indikator soal menggunakan Kata Kerja Operasional (KKO) yang tepat sesuai level kognitif (Taksonomi Bloom).
    2. Materi spesifik diambil dari konteks dokumen/teks yang diberikan.
    3. Level soal didistribusikan TEPAT sesuai permintaan jumlah di atas.
    4. Kolom 'questionForm' harus diisi 'Uraian' atau 'Pilihan Ganda' sesuai jumlah yang diminta.
    5. Kolom 'learningObjective' harus diisi. Gunakan CP/KD yang diberikan user jika relevan, atau turunkan menjadi tujuan pembelajaran spesifik.
  `;

  if (config.isHotsMode) {
    promptText += `
    \n[MODUL HOTS AKTIF - PENTING!]
    Anda diminta menyusun kisi-kisi untuk soal HOTS (Higher Order Thinking Skills).
    - Pastikan indikator untuk L2 dan L3 menuntut siswa menganalisis STIMULUS (grafik, tabel, kasus, atau wacana).
    - Hindari indikator yang hanya "Menyebutkan" atau "Menjelaskan definisi".
    - Gunakan KKO seperti: Menganalisis, Menyimpulkan, Memprediksi, Menelaah, Mengaitkan.
    `;
  }

  parts.push({ text: promptText });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: blueprintSchema,
      temperature: 0.3,
    }
  });

  const data = cleanJson(response.text || "{}");
  let items: BlueprintItem[] = data.items || [];

  // Sort: Pilihan Ganda first, then Uraian
  items.sort((a, b) => {
    if (a.questionForm === "Pilihan Ganda" && b.questionForm === "Uraian") return -1;
    if (a.questionForm === "Uraian" && b.questionForm === "Pilihan Ganda") return 1;
    return 0;
  });

  // Renumber sequentially
  items = items.map((item, index) => ({
    ...item,
    questionNumber: index + 1
  }));

  return items;
};

export const generateQuestions = async (config: ExamConfig, blueprint: BlueprintItem[], apiKey: string): Promise<QuestionItem[]> => {
  const ai = getAiClient(apiKey);
  const parts: any[] = [];

  // 1. Add PDF File if present (Need context again to write questions)
  if (config.materialFile) {
    parts.push({
      inlineData: {
        mimeType: config.materialFile.mimeType,
        data: config.materialFile.data
      }
    });
  }

  // 2. Build Prompt Text
  let promptText = `
    Bertindaklah sebagai penulis soal ujian profesional.
    Tugas: Buatlah naskah soal lengkap berdasarkan KISI-KISI (Blueprint) yang diberikan di bawah ini.
    Gunakan materi yang dilampirkan sebagai sumber kebenaran untuk jawaban.

    BAHASA OUTPUT: 
    - Sesuaikan dengan mata pelajaran atau materi yang diberikan.
    - Untuk pelajaran Bahasa Asing (Jepang, Arab, Jerman, Mandarin, Korea, dll): Instruksi/Pertanyaan soal gunakan Bahasa Indonesia. Hanya gunakan bahasa asing untuk teks wacana/stimulus atau kata yang ditanyakan. Jangan full bahasa asing.
    - Khusus Bahasa Inggris: Boleh full Bahasa Inggris jika levelnya lanjut, namun default gunakan campuran (Instruksi Indo, Konten Inggris) jika ragu.
    - Untuk pelajaran Sains/Sosial konteks Indonesia, gunakan Bahasa Indonesia.
    
    PENTING - FORMAT RUMUS & SAINS (JSON ESCAPING):
    1. Karena output adalah JSON, Anda WAJIB melakukan DOUBLE ESCAPING untuk backslash (\\).
       - JANGAN tulis: "\frac{1}{2}" (ini akan error atau hilang backslash-nya).
       - TULISLAH: "\\frac{1}{2}" (gunakan dua backslash).
       - Contoh: "\\lim_{x \\to 0}", "\\text{...}", "\\ce{H2O}".
    2. Untuk MATEMATIKA / FISIKA: Gunakan format LaTeX biasa yang diapit tanda dolar ($...$). 
       Contoh: $E=mc^2$.
    3. Untuk KIMIA: WAJIB gunakan format mhchem "$\\ce{...}$". 
       Contoh yang BENAR: "$\\ce{H2O}$", "$\\ce{H2SO4}$".
    4. Untuk rumus yang panjang atau kompleks, gunakan mode display ($$...$$).
    5. **WAJIB**: Berikan SPASI sebelum dan sesudah tanda $ atau $$. Jangan menempelkan rumus dengan kata-kata.
       Contoh BENAR: "Maka $x=5$ adalah..."
  `;

  if (config.materialText) {
    promptText += `\n\nKonteks Materi Teks:\n"${config.materialText.substring(0, 10000)}"\n`;
  }

  promptText += `
    Instruksi Penting:
    1. Buat soal SANGAT SESUAI dengan indikator dan level kognitif di kisi-kisi.
    2. Jika bentuk soal 'Pilihan Ganda': Berikan 5 opsi (A, B, C, D, E).
       - **PENTING**: Hindari bias panjang kalimat pada jawaban benar. Jangan biarkan jawaban benar menjadi opsi yang paling panjang secara mencolok sehingga mudah ditebak. Usahakan panjang kalimat antar opsi relatif seimbang.
       - Gunakan kalimat yang tegas, lugas, dan tidak bertele-tele dalam pilihan jawaban.
    3. Jika bentuk soal 'Uraian': Kosongkan bagian 'options' (array kosong []). Isikan 'correctAnswer' dengan poin-poin jawaban utama atau rubrik singkat.
    4. Untuk L3 (Penalaran)/HOTS: Pastikan ada stimulus (data/kasus/cerita) di awal soal.
    5. 'explanation' berisi pembahasan atau pedoman penskoran.
    6. **GAMBAR & TABEL**:
       - Jika soal membutuhkan tabel, gunakan format Markdown Table standar di dalam 'questionText'.
       - **PENTING**:
         1. Pastikan setiap baris tabel dipisahkan oleh karakter baris baru (\\n).
         2. Baris pemisah header (|---|---|) HARUS dalam SATU BARIS saja. Jangan dipecah menjadi beberapa baris.
         3. **JANGAN** gunakan syntax class \`:::className\` atau \`classDef\`. Ini sering menyebabkan error. Gunakan \`style A fill:#f9f,stroke:#333;\` jika ingin memberi warna.
         4. **WAJIB**: Gunakan baris baru (\\n) untuk memisahkan setiap baris tabel. JANGAN menulis tabel dalam satu baris.
         5. **WAJIB**: Baris pemisah header (|---|---|) harus berada di baris sendiri.
         Contoh BENAR:
         | Kolom 1 | Kolom 2 |
         |---|---|
         | Data 1 | Data 2 |
         Contoh SALAH (Jangan lakukan ini):
         | Kolom 1 | Kolom 2 | |---|---| | Data 1 | Data 2 |
        - **PENTING**: Jika materi sumber memuat TABEL, JANGAN gunakan field 'imageDescription'. SALIN ULANG tabel tersebut ke dalam format Markdown Table di dalam 'questionText'.
        - **GRAFIK/DIAGRAM**: Jika grafik/diagram bisa dijelaskan dengan kata-kata (misal: "Grafik fungsi f(x) mendekati 8 dari kiri..."), TULISKAN deskripsi tersebut langsung di dalam 'questionText'.
        - Gunakan field 'imageDescription' HANYA jika soal benar-benar membutuhkan visual murni yang tidak bisa dijelaskan dengan teks (misal: foto spesifik, lukisan, atau diagram yang sangat kompleks).
        - **SANGAT DISARANKAN**: Jika gambar berupa diagram alur, siklus, grafik sederhana, atau struktur, GUNAKAN field 'mermaidCode' untuk membuat diagram visual.
       - **ATURAN MERMAID**:
         1. Gunakan 'graph TD' atau 'graph LR'.
         2. **WAJIB**: Apit semua label node dengan tanda kutip dua ("..."), TANPA KECUALI.
            Contoh SALAH: A[Plastida (Kloroplas)]
            Contoh BENAR: A["Plastida (Kloroplas)"]
         3. **JANGAN** gunakan syntax class \`:::className\` atau \`classDef\`. Ini sering menyebabkan error. Gunakan \`style A fill:#f9f,stroke:#333;\` jika ingin memberi warna.
         4. **WAJIB**: Gunakan baris baru (\\n) untuk memisahkan setiap node/edge. Jangan menulis semua dalam satu baris.
       - Contoh Mermaid:
         \`\`\`mermaid
         graph TD;
             A["Mulai"] --> B{"Keputusan (Ya/Tidak)"};
             B -- "Ya" --> C["Proses A (Lanjut)"];
             B -- "Tidak" --> D["Selesai"];
         \`\`\`
       - Jangan gunakan tag HTML <img>.

    Kisi-kisi (JSON):
    ${JSON.stringify(blueprint)}
  `;

  if (config.isHotsMode) {
    promptText += `
    \n[PERINTAH KHUSUS: MODE HOTS]
    Pengguna mengaktifkan Mode HOTS.
    1. SETIAP SOAL (Terutama L2 dan L3) HARUS MEMILIKI STIMULUS.
       - Tabel data fiktif
       - Deskripsi kasus
       - Grafik (dijelaskan teks)
    2. Soal harus menantang nalar (Analisis/Evaluasi), bukan sekadar hafalan.
    `;
  }

  parts.push({ text: promptText });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: questionsSchema,
      temperature: 0.4,
    }
  });

  const data = cleanJson(response.text || "{}");
  return data.items || [];
};