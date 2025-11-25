import React, { useState, useRef } from 'react';
import { ExamConfig } from '../types';

interface Props {
  onNext: (config: ExamConfig) => void;
}

const StepOneConfig: React.FC<Props> = ({ onNext }) => {
  const [formData, setFormData] = useState<ExamConfig>({
    subject: '',
    grade: '',
    topic: '',
    materialText: '',
    countL1: 3,
    countL2: 3,
    countL3: 2,
    countEssay: 0,
    isHotsMode: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Handle Checkbox separately
    if ((e.target as HTMLInputElement).type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: name.startsWith('count') ? parseInt(value) || 0 : value
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check for PDF by mime type OR extension to be robust
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        // Handle PDF
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          // Remove Data URL prefix to get raw base64
          const base64 = result.split(',')[1];
          setFormData(prev => ({
            ...prev,
            materialFile: {
              data: base64,
              mimeType: 'application/pdf',
              name: file.name
            },
            // Keep materialText as optional notes
          }));
        };
        reader.readAsDataURL(file);
      } else {
        // Handle Text/MD/JSON
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setFormData(prev => ({
            ...prev,
            materialText: text,
            materialFile: undefined // Clear file if text file is uploaded to switch mode
          }));
        };
        reader.readAsText(file);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalQuestions = formData.countL1 + formData.countL2 + formData.countL3;
    if (formData.countEssay > totalQuestions) {
      alert("Jumlah soal essay tidak boleh melebihi total soal (L1+L2+L3).");
      return;
    }
    onNext(formData);
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
        Konfigurasi & Materi
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mata Pelajaran</label>
            <input
              required
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Contoh: Biologi, Bahasa Arab, Kimia"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kelas / Fase</label>
            <input
              required
              type="text"
              name="grade"
              value={formData.grade}
              onChange={handleChange}
              placeholder="Contoh: X / Fase E"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Topik / Materi Pokok</label>
          <input
            required
            type="text"
            name="topic"
            value={formData.topic}
            onChange={handleChange}
            placeholder="Contoh: Ekosistem, Hukum Newton, Tata Bahasa Jepang"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          />
          <p className="text-xs text-gray-500 mt-1">
            AI akan otomatis mendeteksi bahasa (Indonesia, Arab, Inggris, Jepang, dll) berdasarkan materi yang Anda berikan.
          </p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Materi Pembelajaran
          </label>

          <div className="flex flex-col gap-3 mb-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition flex items-center gap-2"
              >
                <span>📂</span> Upload File (.pdf, .txt, .md)
              </button>
              <span className="text-xs text-gray-500">
                *Mendukung PDF untuk dianalisis langsung oleh AI.
              </span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".txt,.md,.json,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />

            {formData.materialFile && (
              <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-3 py-2 rounded border border-blue-200">
                <span>📄</span>
                <span className="font-semibold">{formData.materialFile.name}</span>
                <span className="text-xs opacity-75">(PDF Terlampir)</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, materialFile: undefined }))}
                  className="ml-auto text-blue-500 hover:text-blue-800"
                >
                  &times;
                </button>
              </div>
            )}
          </div>

          <textarea
            name="materialText"
            value={formData.materialText}
            onChange={handleChange}
            rows={6}
            placeholder="Atau tempelkan teks materi, rangkuman, atau artikel di sini..."
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-sm"
          ></textarea>
          <p className="text-xs text-gray-500 mt-1 text-right">
            Jika upload PDF, teks di atas bersifat opsional (catatan tambahan).
          </p>
        </div>

        <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-start gap-3">
          <div className="pt-1">
            <input
              type="checkbox"
              id="isHotsMode"
              name="isHotsMode"
              checked={formData.isHotsMode}
              onChange={handleChange}
              className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500 cursor-pointer"
            />
          </div>
          <div>
            <label htmlFor="isHotsMode" className="block text-sm font-bold text-orange-800 cursor-pointer">
              Aktifkan Mode HOTS (Higher Order Thinking Skills)
            </label>
            <p className="text-xs text-orange-700 mt-1">
              Jika diaktifkan, AI akan dipaksa membuat soal berbasis <strong>Stimulus</strong> (Grafik, Data, Kasus) yang menuntut penalaran tinggi (Analisis, Evaluasi, Kreasi).
            </p>
          </div>
        </div>

        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
          <h3 className="text-sm font-bold text-blue-800 mb-4 uppercase tracking-wide">Distribusi Level Kognitif & Bentuk Soal</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-blue-700 mb-1">Level 1 (Pengetahuan)</label>
              <input
                type="number"
                min="0"
                name="countL1"
                value={formData.countL1}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded border border-blue-200 text-center font-bold text-lg focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-700 mb-1">Level 2 (Aplikasi)</label>
              <input
                type="number"
                min="0"
                name="countL2"
                value={formData.countL2}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded border border-blue-200 text-center font-bold text-lg focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-700 mb-1">Level 3 (Penalaran)</label>
              <input
                type="number"
                min="0"
                name="countL3"
                value={formData.countL3}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded border border-blue-200 text-center font-bold text-lg focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-blue-200">
            <label className="block text-sm font-bold text-gray-700 mb-2">Jumlah Soal Uraian / Essay</label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="0"
                max={formData.countL1 + formData.countL2 + formData.countL3}
                name="countEssay"
                value={formData.countEssay}
                onChange={handleChange}
                className="w-24 px-3 py-2 rounded border border-gray-300 text-center font-bold text-lg focus:ring-blue-500 outline-none"
              />
              <div className="text-sm text-gray-600">
                <p>Dari total soal, berapa yang berbentuk Uraian?</p>
                <p className="text-xs text-gray-500">Sisanya akan otomatis menjadi Pilihan Ganda.</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-blue-200 flex justify-between items-center">
            <div className="text-sm text-blue-800">
              <span className="font-bold">Summary:</span> PG: {(formData.countL1 + formData.countL2 + formData.countL3) - formData.countEssay}, Essay: {formData.countEssay}
            </div>
            <div className="text-right font-bold text-blue-900 bg-blue-200 px-3 py-1 rounded-lg">
              Total Soal: {formData.countL1 + formData.countL2 + formData.countL3}
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg transition transform active:scale-95"
        >
          Buat Kisi-Kisi Soal &rarr;
        </button>
      </form>
    </div>
  );
};

export default StepOneConfig;