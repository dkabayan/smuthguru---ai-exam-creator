import React, { useState, useMemo } from 'react';
import { ExamConfig, QuestionItem } from '../types';
import LatexRenderer from './LatexRenderer';

interface Props {
  config: ExamConfig;
  questions: QuestionItem[];
  onBack: () => void;
}

const StepFourExam: React.FC<Props> = ({ config, questions, onBack }) => {
  const [showKey, setShowKey] = useState(false);

  // Memoize shuffled questions so they don't reshuffle on re-renders
  const shuffledQuestions = useMemo(() => {
    return questions.map(q => {
      // Check if Essay (no options or empty options)
      const isEssay = !q.options || q.options.length === 0;

      // If Essay, no shuffling needed
      if (isEssay) return q;

      // --- Multiple Choice Shuffle Logic ---

      // 1. Clean up existing options (remove prefixes like "A. ", "B. ")
      const cleanOptions = q.options!.map(opt => opt.replace(/^[A-E][\.\)]\s*/, '').trim());

      // 2. Identify which index is currently the correct answer
      let originalCorrectIndex = -1;

      // Try identifying by Letter (e.g., "A", "A. Jawaban")
      const keyLetter = q.correctAnswer.trim().toUpperCase().charAt(0);
      if (['A', 'B', 'C', 'D', 'E'].includes(keyLetter)) {
        // If key is just "A" or "A. Something"
        if (q.correctAnswer.length === 1 || q.correctAnswer.match(/^[A-E][\.\)]/)) {
          originalCorrectIndex = keyLetter.charCodeAt(0) - 65;
        }
      }

      // Fallback: Try identifying by Text match
      if (originalCorrectIndex === -1 || originalCorrectIndex >= cleanOptions.length) {
        const cleanKey = q.correctAnswer.replace(/^[A-E][\.\)]\s*/, '').trim();
        originalCorrectIndex = cleanOptions.findIndex(opt =>
          opt.toLowerCase() === cleanKey.toLowerCase() ||
          cleanKey.includes(opt)
        );
      }

      // If we still can't find the correct answer, preserve original
      if (originalCorrectIndex === -1) return q;

      // 3. Create objects to shuffle
      const optionsWithFlag = cleanOptions.map((text, index) => ({
        text,
        isCorrect: index === originalCorrectIndex
      }));

      // 4. Fisher-Yates Shuffle
      for (let i = optionsWithFlag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionsWithFlag[i], optionsWithFlag[j]] = [optionsWithFlag[j], optionsWithFlag[i]];
      }

      // 5. Reconstruct the question with new order and new key
      const newOptions = optionsWithFlag.map(o => o.text);
      const newCorrectIndex = optionsWithFlag.findIndex(o => o.isCorrect);
      const newCorrectLetter = String.fromCharCode(65 + newCorrectIndex); // New A, B, C...

      return {
        ...q,
        options: newOptions,
        correctAnswer: `${newCorrectLetter}. ${optionsWithFlag[newCorrectIndex].text}`,
        explanation: q.explanation
      };
    });
  }, [questions]);

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadGIFT = () => {
    let giftContent = "";

    shuffledQuestions.forEach((q, idx) => {
      const isEssay = !q.options || q.options.length === 0;
      // Escape special GIFT characters in text: { } ~ = # :
      const safeText = (text: string) => text.replace(/([{}~=#:])/g, "\\$1").replace(/\n/g, " ");

      giftContent += `::Soal ${idx + 1}:: `;
      giftContent += `${safeText(q.questionText)} {\n`;

      if (!isEssay && q.options && q.options.length > 0) {
        q.options.forEach((opt, i) => {
          const optionLetter = String.fromCharCode(65 + i);
          const safeOpt = safeText(opt);
          const keyLetter = q.correctAnswer.trim().toUpperCase().charAt(0);
          const isCorrect = keyLetter === optionLetter;

          const prefix = isCorrect ? "=" : "~";
          giftContent += `\t${prefix}${safeOpt}\n`;
        });
      } else {
        giftContent += `\t{}\n`;
      }

      if (q.explanation) {
        giftContent += `\t####${safeText(q.explanation)}\n`;
      }
      giftContent += "}\n\n";
    });

    // Add BOM for UTF-8 recognition
    const bom = "\uFEFF";
    downloadFile(bom + giftContent, `Soal_${config.subject.replace(/\s+/g, '_')}_${config.grade.replace(/\s+/g, '_')}.gift.txt`, 'text/plain;charset=utf-8');
  };

  const handleDownloadDocx = () => {
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Naskah Soal</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; }
          .header { text-align: center; font-weight: bold; margin-bottom: 20px; }
          table.q-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          td.num { width: 30px; vertical-align: top; }
          td.content { vertical-align: top; }
          .opt-table { width: 100%; margin-top: 5px; }
          .opt-letter { width: 25px; vertical-align: top; }
        </style>
      </head>
      <body>
        <div class="header">
          <p>NASKAH SOAL UJIAN</p>
          <p>Mata Pelajaran: ${config.subject}</p>
          <p>Kelas: ${config.grade}</p>
        </div>
    `;

    let content = "";

    shuffledQuestions.forEach((q, idx) => {
      const isEssay = !q.options || q.options.length === 0;

      content += `
        <table class="q-table">
          <tr>
            <td class="num">${idx + 1}.</td>
            <td class="content">
              <div dir="auto">${q.questionText.replace(/\n/g, '<br/>')}</div>
      `;

      if (!isEssay && q.options && q.options.length > 0) {
        content += `<table class="opt-table">`;
        q.options.forEach((opt, i) => {
          content += `
              <tr>
                <td class="opt-letter">${String.fromCharCode(65 + i)}.</td>
                <td dir="auto">${opt}</td>
              </tr>
            `;
        });
        content += `</table>`;
      } else {
        // Essay lines
        content += `<br/><br/><hr/><br/><br/>`;
      }

      content += `
            </td>
          </tr>
        </table>
      `;
    });

    const footer = `</body></html>`;
    downloadFile(header + content + footer, `Naskah_Soal_${config.subject.replace(/\s+/g, '_')}.doc`, 'application/msword');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200 gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
            Naskah Soal Ujian
          </h2>
          <p className="text-sm text-gray-500 ml-10 mt-1">Siap dicetak atau diekspor ke LMS.</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button
            onClick={() => setShowKey(!showKey)}
            className={`px-4 py-2 rounded-lg font-medium border transition ${showKey ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-gray-600 border-gray-300'}`}
          >
            {showKey ? 'Sembunyikan Kunci' : 'Tampilkan Kunci'}
          </button>
          <button onClick={handleDownloadDocx} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 shadow-sm">
            <span>📄</span> Unduh .doc (Word)
          </button>
          <button onClick={handleDownloadGIFT} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 shadow-sm">
            <span>⬇</span> Unduh .GIFT (Moodle)
          </button>
          <button onClick={onBack} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium border border-gray-200">
            &larr; Kembali
          </button>
          <button onClick={() => window.print()} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium shadow-sm">
            🖨 Cetak
          </button>
        </div>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-xl shadow-sm border border-gray-200 min-h-screen print:shadow-none print:border-none">
        {/* Kop Naskah */}
        <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
          <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">Naskah Soal Ujian</h1>
          <div className="flex justify-center gap-8 text-sm font-semibold text-gray-700">
            <span>Mata Pelajaran: {config.subject}</span>
            <span>Kelas: {config.grade}</span>
            <span>Waktu: 90 Menit</span>
          </div>
        </div>

        {/* Daftar Soal */}
        <div className="space-y-8">
          {shuffledQuestions.map((q, idx) => {
            const isEssay = !q.options || q.options.length === 0;

            return (
              <div key={idx} className={`relative ${idx > 0 && idx % 4 === 0 ? 'print:break-before-page' : ''}`}>
                <div className="flex gap-3">
                  <span className="font-bold text-lg min-w-[24px]">{idx + 1}.</span>
                  <div className="flex-1">
                    <div dir="auto" className="text-lg text-gray-800 mb-3 leading-relaxed">
                      <LatexRenderer text={q.questionText} />
                    </div>

                    {!isEssay && q.options && q.options.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 ml-1">
                        {q.options.map((opt, i) => (
                          <div key={i} className="flex gap-2 group">
                            <span className="font-semibold w-6">{String.fromCharCode(65 + i)}.</span>
                            <span dir="auto" className="text-gray-700 group-hover:text-black">
                              <LatexRenderer text={opt} />
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg h-32 bg-gray-50 flex items-center justify-center text-gray-400 text-sm italic print:border-gray-400">
                        (Area Jawaban Siswa)
                      </div>
                    )}

                    {/* Key Display for Teacher View */}
                    {showKey && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 inline-block print:hidden">
                        <strong>Kunci: </strong> <span dir="auto"><LatexRenderer text={q.correctAnswer} /></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center text-sm text-gray-400 italic print:hidden">
          --- Akhir Naskah Soal ---
        </div>
      </div>
    </div>
  );
};

export default StepFourExam;