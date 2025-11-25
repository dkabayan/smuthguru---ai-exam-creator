
import React from 'react';
import { BlueprintItem, ExamConfig } from '../types';

interface Props {
  config: ExamConfig;
  blueprint: BlueprintItem[];
  onNext: () => void;
  onBack: () => void;
  isLoading: boolean;
}

const StepTwoBlueprint: React.FC<Props> = ({ config, blueprint, onNext, onBack, isLoading }) => {
  // Calculate real-time stats based on current blueprint data
  const stats = {
    L1: blueprint.filter(i => i.level === 'L1').length,
    L2: blueprint.filter(i => i.level === 'L2').length,
    L3: blueprint.filter(i => i.level === 'L3').length,
    total: blueprint.length
  };

  const handleDownloadDocx = () => {
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Kisi-Kisi Soal</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 1px solid black; padding: 8px; text-align: left; vertical-align: top; }
          th { background-color: #f2f2f2; text-align: center; font-weight: bold; }
          h2, h3 { text-align: center; margin: 0 0 10px 0; }
          .info { margin-bottom: 20px; }
        </style>
      </head>
      <body>
    `;

    const info = `
      <h2>KISI-KISI PENULISAN SOAL</h2>
      <div class="info">
        <p><strong>Mata Pelajaran:</strong> ${config.subject}</p>
        <p><strong>Kelas:</strong> ${config.grade}</p>
        <p><strong>Materi Pokok:</strong> ${config.topic}</p>
        <p><strong>Jumlah Soal:</strong> ${stats.total}</p>
        ${config.isHotsMode ? '<p><strong>Jenis Soal:</strong> HOTS (Berbasis Stimulus)</p>' : ''}
      </div>
    `;

    let tableContent = `
      <table>
        <thead>
          <tr>
            <th style="width: 5%">No</th>
            <th style="width: 25%">Kompetensi Dasar / Materi</th>
            <th style="width: 40%">Indikator Soal</th>
            <th style="width: 15%">Level Kognitif</th>
            <th style="width: 15%">Bentuk Soal</th>
          </tr>
        </thead>
        <tbody>
    `;

    blueprint.forEach((item) => {
      tableContent += `
        <tr>
          <td style="text-align: center;">${item.questionNumber}</td>
          <td>
            <b>${item.basicCompetency}</b><br/>
            ${item.material}
          </td>
          <td>${item.indicator}</td>
          <td style="text-align: center;">${item.level}</td>
          <td style="text-align: center;">${item.questionForm}</td>
        </tr>
      `;
    });

    tableContent += `</tbody></table></body></html>`;

    const content = header + info + tableContent;
    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Kisi_Kisi_${config.subject.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-8 bg-white rounded-xl shadow text-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Sedang menganalisis materi dan menyusun kisi-kisi...</p>
        <p className="text-gray-400 text-sm mt-2">Ini mungkin memakan waktu beberapa detik.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200 gap-4">
         <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              Kisi-Kisi Soal
            </h2>
            <div className="ml-10 mt-1 text-sm text-gray-500 space-y-1">
               <p><span className="font-semibold">Mapel:</span> {config.subject} ({config.grade})</p>
               {config.materialFile && (
                 <p className="flex items-center gap-1 text-blue-600">
                   <span>📄</span> Sumber: <span className="font-medium">{config.materialFile.name}</span>
                 </p>
               )}
               {config.isHotsMode && (
                 <span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-bold border border-orange-200">
                    🔥 Mode HOTS Aktif
                 </span>
               )}
            </div>
         </div>
        <div className="flex gap-3 w-full md:w-auto flex-wrap">
            <button onClick={handleDownloadDocx} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 shadow-sm">
              <span>📄</span> Unduh .docx
            </button>
            <button onClick={onBack} className="flex-1 md:flex-none px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium border border-gray-200 md:border-transparent">
                &larr; Kembali
            </button>
            <button onClick={onNext} className="flex-1 md:flex-none px-6 py-2 bg-primary text-white rounded-lg font-bold shadow hover:bg-blue-700 transition">
                Lanjut: Buat Soal &rarr;
            </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Soal</div>
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
         </div>
         <div className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm">
            <div className="text-xs text-green-700 uppercase font-bold tracking-wider">Level 1 (Pemahaman)</div>
            <div className="text-2xl font-bold text-green-800">{stats.L1}</div>
         </div>
         <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 shadow-sm">
            <div className="text-xs text-yellow-700 uppercase font-bold tracking-wider">Level 2 (Aplikasi)</div>
            <div className="text-2xl font-bold text-yellow-800">{stats.L2}</div>
         </div>
         <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm">
            <div className="text-xs text-red-700 uppercase font-bold tracking-wider">Level 3 (Penalaran)</div>
            <div className="text-2xl font-bold text-red-800">{stats.L3}</div>
         </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 w-16">No</th>
                <th className="px-6 py-3">Kompetensi Dasar & Materi</th>
                <th className="px-6 py-3">Indikator Soal</th>
                <th className="px-6 py-3 w-32">Level Kognitif</th>
                <th className="px-6 py-3 w-32">Bentuk Soal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {blueprint.map((item) => {
                let levelColor = "bg-gray-100 text-gray-600";
                if (item.level === 'L1') levelColor = "bg-green-100 text-green-800 border border-green-200";
                if (item.level === 'L2') levelColor = "bg-yellow-100 text-yellow-800 border border-yellow-200";
                if (item.level === 'L3') levelColor = "bg-red-100 text-red-800 border border-red-200";

                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-center text-gray-500">{item.questionNumber}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{item.basicCompetency}</div>
                      <div className="text-xs text-gray-500 mt-1">{item.material}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 italic">"{item.indicator}"</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${levelColor}`}>
                        {item.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{item.questionForm}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {blueprint.length === 0 && (
            <div className="p-8 text-center text-gray-500">
                Belum ada data kisi-kisi. Silakan kembali dan generate ulang.
            </div>
        )}
      </div>
    </div>
  );
};

export default StepTwoBlueprint;