import React from 'react';
import { BlueprintItem, QuestionItem } from '../types';
import LatexRenderer from './LatexRenderer';
import MermaidRenderer from './MermaidRenderer';

interface Props {
  blueprint: BlueprintItem[];
  questions: QuestionItem[];
  onNext: () => void;
  onBack: () => void;
  isLoading: boolean;
  onUpdateLevel: (id: number, level: "L1" | "L2" | "L3") => void;
}

const StepThreeCards: React.FC<Props> = ({ blueprint, questions, onNext, onBack, isLoading, onUpdateLevel }) => {

  const handleDownloadDocx = () => {
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Kartu Soal</title>
        <style>
          body { font-family: 'Arial', sans-serif; font-size: 11pt; }
          .card-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 2px solid black; page-break-inside: avoid; }
          .card-table td { border: 1px solid black; padding: 8px; vertical-align: top; }
          .header-row td { background-color: #e0e0e0; font-weight: bold; }
          .label { font-weight: bold; width: 150px; }
        </style>
      </head>
      <body>
        <h2 style="text-align:center;">KUMPULAN KARTU SOAL</h2>
    `;

    let content = "";

    questions.forEach((q, idx) => {
      const bp = blueprint.find(b => b.id === q.blueprintId) || blueprint[idx];
      if (!bp) return;

      const isEssay = bp.questionForm === 'Uraian' || !q.options || q.options.length === 0;

      content += `
        <table class="card-table">
          <tr class="header-row">
            <td colspan="2">Kartu Soal Nomor: ${bp.questionNumber} (${bp.questionForm})</td>
          </tr>
          <tr>
            <td class="label">Kompetensi Dasar</td>
            <td>${bp.basicCompetency}</td>
          </tr>
           <tr>
            <td class="label">Materi</td>
            <td>${bp.material}</td>
          </tr>
          <tr>
            <td class="label">Indikator Soal</td>
            <td>${bp.indicator}</td>
          </tr>
          <tr>
            <td class="label">Level Kognitif</td>
            <td>${bp.level}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 15px;">
              <b>Butir Soal:</b><br/><br/>
              <div dir="auto">${q.questionText.replace(/\n/g, '<br/>')}</div>
              <br/><br/>
              ${!isEssay && q.options ? q.options.map((opt, i) =>
        `<div dir="auto">${String.fromCharCode(65 + i)}. ${opt.replace(/^[A-E]\.\s*/, '')}</div>`
      ).join('') : '<i>(Soal Uraian - Siswa menulis jawaban pada lembar jawab)</i>'}
            </td>
          </tr>
          <tr>
            <td class="label">${isEssay ? 'Kunci / Rubrik' : 'Kunci Jawaban'}</td>
            <td><b dir="auto">${q.correctAnswer}</b></td>
          </tr>
           <tr>
            <td class="label">Pembahasan</td>
            <td dir="auto">${q.explanation}</td>
          </tr>
        </table>
        <br/>
      `;
    });

    const footer = `</body></html>`;
    const fullContent = header + content + footer;

    const blob = new Blob([fullContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Kartu_Soal.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-8 bg-white rounded-xl shadow text-center">
        <div className="animate-spin w-12 h-12 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Sedang menyusun soal lengkap, opsi jawaban, dan pembahasan...</p>
        <p className="text-gray-400 text-sm mt-2">AI sedang berpikir keras untuk membuat soal berkualitas.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200 gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
          Kartu Soal
        </h2>
        <div className="flex gap-3 flex-wrap justify-end">
          <button onClick={handleDownloadDocx} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 shadow-sm">
            <span>📄</span> Unduh .docx
          </button>
          <button onClick={onBack} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">
            &larr; Lihat Kisi-kisi
          </button>
          <button onClick={onNext} className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow hover:bg-blue-700 transition">
            Lihat Naskah Ujian &rarr;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {questions.map((q, idx) => {
          const bp = blueprint.find(b => b.id === q.blueprintId) || blueprint[idx];
          if (!bp) return null;

          const isEssay = bp.questionForm === 'Uraian' || !q.options || q.options.length === 0;

          let levelBadge = "bg-gray-100 text-gray-600";
          if (bp.level === 'L1') levelBadge = "bg-green-100 text-green-800 border-green-200 hover:bg-green-200";
          if (bp.level === 'L2') levelBadge = "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200";
          if (bp.level === 'L3') levelBadge = "bg-red-100 text-red-800 border-red-200 hover:bg-red-200";

          return (
            <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
              {/* Header Kartu Soal */}
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-700">Soal No. {bp.questionNumber}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded border ${isEssay ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>
                      {isEssay ? 'Uraian' : 'Pilihan Ganda'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Indikator: {bp.indicator}</p>
                </div>

                {/* Level Dropdown */}
                <div className="relative group">
                  <select
                    value={bp.level}
                    onChange={(e) => onUpdateLevel(bp.id, e.target.value as "L1" | "L2" | "L3")}
                    className={`appearance-none pl-4 pr-8 py-1.5 rounded-full text-xs font-bold border cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 transition-colors ${levelBadge}`}
                  >
                    <option value="L1">L1 (Pengetahuan)</option>
                    <option value="L2">L2 (Aplikasi)</option>
                    <option value="L3">L3 (Penalaran)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-600">
                    <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                  </div>
                </div>
              </div>

              {/* Body Soal */}
              <div className="p-6">
                {q.mermaidCode && (
                  <div className="mb-4 overflow-x-auto">
                    <MermaidRenderer chart={q.mermaidCode} />
                  </div>
                )}
                <div dir="auto" className="text-gray-800 text-lg font-medium mb-4 leading-relaxed">
                  <LatexRenderer text={q.questionText} />
                </div>

                {/* Options (Only if MC) */}
                {!isEssay && q.options && q.options.length > 0 && (
                  <ul className="space-y-2 ml-1 mb-6">
                    {q.options.map((opt, i) => {
                      return (
                        <li key={i} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50">
                          <span className="bg-blue-50 text-blue-600 font-bold text-sm w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span dir="auto" className="text-gray-700"><LatexRenderer text={opt.replace(/^[A-E]\.\s*/, '')} /></span>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {/* Key & Explanation */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 mt-4">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-xs font-bold uppercase text-blue-500 tracking-wide mt-0.5 w-24 flex-shrink-0">
                      {isEssay ? 'Pedoman / Kunci:' : 'Kunci Jawaban:'}
                    </span>
                    <div dir="auto" className="font-bold text-blue-800">
                      <LatexRenderer text={q.correctAnswer} />
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="font-bold block w-24 flex-shrink-0">Pembahasan:</span>
                    <div dir="auto"><LatexRenderer text={q.explanation} /></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepThreeCards;