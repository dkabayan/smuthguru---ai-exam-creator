import React, { useState, useEffect } from 'react';
import StepOneConfig from './components/StepOneConfig';
import StepTwoBlueprint from './components/StepTwoBlueprint';
import StepThreeCards from './components/StepThreeCards';
import StepFourExam from './components/StepFourExam';
import ApiKeyInput from './components/ApiKeyInput';
import { AppStep, BlueprintItem, ExamConfig, QuestionItem, ExportData } from './types';
import { generateBlueprint, generateQuestions } from './services/geminiService';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [step, setStep] = useState<AppStep>('config');
  const [config, setConfig] = useState<ExamConfig | null>(null);
  const [blueprint, setBlueprint] = useState<BlueprintItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load API Key from Local Storage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleSetKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const handleClearKey = () => {
    setApiKey('');
    localStorage.removeItem('gemini_api_key');
    setStep('config');
    setConfig(null);
    setBlueprint([]);
    setQuestions([]);
  };

  const handleError = (err: any, defaultMsg: string) => {
    console.error(err);
    const msg = err.message || String(err);
    if (msg.includes("403") || msg.includes("permission") || msg.includes("PERMISSION_DENIED")) {
      setError("Gagal: Izin API Ditolak (403). Pastikan API Key Anda valid dan memiliki akses ke model Gemini 2.5 Flash.");
    } else if (msg.includes("400")) {
      setError("Gagal: Permintaan tidak valid. Pastikan file materi tidak rusak atau terlalu besar.");
    } else {
      setError(defaultMsg);
    }
  };

  const handleConfigSubmit = async (data: ExamConfig) => {
    setConfig(data);
    setLoading(true);
    setError(null);
    try {
      // Generate Blueprint using dynamic API Key
      const items = await generateBlueprint(data, apiKey);
      setBlueprint(items);
      setStep('blueprint');
    } catch (err: any) {
      handleError(err, "Gagal membuat kisi-kisi. Silakan coba lagi dengan materi yang berbeda.");
    } finally {
      setLoading(false);
    }
  };

  const handleBlueprintNext = async () => {
    if (!config) return;
    setLoading(true);
    setError(null);
    setStep('cards'); // Move to step 3 UI immediately, showing loading state inside
    try {
      // Generate Questions using dynamic API Key
      const qItems = await generateQuestions(config, blueprint, apiKey);
      setQuestions(qItems);
    } catch (err: any) {
      handleError(err, "Gagal membuat soal. Terjadi kesalahan saat menghubungi AI.");
      setStep('blueprint'); // Go back on error
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLevel = (id: number, newLevel: "L1" | "L2" | "L3") => {
    setBlueprint(prev => prev.map(item =>
      item.id === id ? { ...item, level: newLevel } : item
    ));
  };

  const handleSaveDatabase = () => {
    const data: ExportData = {
      step,
      config,
      blueprint,
      questions,
      timestamp: new Date().toISOString()
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smuthguru_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreDatabase = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const data: ExportData = JSON.parse(json);

        if (data.step && (data.config || data.config === null)) {
          setConfig(data.config);
          setBlueprint(data.blueprint || []);
          setQuestions(data.questions || []);
          setStep(data.step);
          alert("Database berhasil dipulihkan!");
        } else {
          throw new Error("Format file tidak valid");
        }
      } catch (err) {
        console.error(err);
        alert("Gagal memulihkan database: File rusak atau format salah.");
      }
    };
    reader.readAsText(file);
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  };

  // Handle Home Button
  const handleHome = () => {
    if (step === 'config') return; // Already at home

    if (window.confirm("Apakah Anda yakin ingin kembali ke menu utama? Progress saat ini (Setting, Kisi-kisi, Soal) akan dihapus.")) {
      setStep('config');
      setConfig(null);
      setBlueprint([]);
      setQuestions([]);
    }
  };

  // If no API Key is set, show the Input Screen
  if (!apiKey) {
    return <ApiKeyInput onSetKey={handleSetKey} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setStep('config')}>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                G
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-purple-700">
                SMUTHGuru
              </span>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center space-x-4 text-sm font-medium text-gray-500">
                <span className={step === 'config' ? 'text-blue-600' : ''}>1. Materi</span>
                <span>&rsaquo;</span>
                <span className={step === 'blueprint' ? 'text-blue-600' : ''}>2. Kisi-Kisi</span>
                <span>&rsaquo;</span>
                <span className={step === 'cards' ? 'text-blue-600' : ''}>3. Kartu Soal</span>
                <span>&rsaquo;</span>
                <span className={step === 'exam' ? 'text-blue-600' : ''}>4. Naskah</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleHome}
                  className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded transition flex items-center gap-1"
                  title="Kembali ke Menu Utama"
                >
                  <span className="text-sm">🏠</span>
                  Home
                </button>
                <button
                  onClick={handleSaveDatabase}
                  className="text-xs bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 px-3 py-1 rounded transition flex items-center gap-1"
                  title="Simpan progress saat ini ke file JSON"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Simpan
                </button>
                <label className="text-xs bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border border-yellow-200 px-3 py-1 rounded transition flex items-center gap-1 cursor-pointer" title="Muat progress dari file JSON">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Muat
                  <input type="file" accept=".json" onChange={handleRestoreDatabase} className="hidden" />
                </label>

                <button
                  onClick={handleClearKey}
                  className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 px-2 py-1 rounded transition"
                  title="Hapus API Key dan Keluar"
                >
                  Keluar
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Error Banner */}
      {error && (
        <div className="max-w-3xl mx-auto mt-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded shadow-sm flex justify-between items-center animate-pulse">
          <p className="font-medium">{error}</p>
          <button onClick={() => setError(null)} className="font-bold px-2 hover:bg-red-100 rounded">&times;</button>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 'config' && (
          <>
            {loading ? (
              <div className="text-center mt-20">
                <div className="animate-spin w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-6"></div>
                <h3 className="text-xl font-semibold text-gray-800">Sedang Menganalisis Materi...</h3>
                <p className="text-gray-500 mt-2">AI sedang membaca konteks dan menyusun kisi-kisi ujian.</p>
              </div>
            ) : (
              <StepOneConfig onNext={handleConfigSubmit} />
            )}
          </>
        )}

        {step === 'blueprint' && config && (
          <StepTwoBlueprint
            config={config}
            blueprint={blueprint}
            onNext={handleBlueprintNext}
            onBack={() => setStep('config')}
            isLoading={loading}
          />
        )}

        {step === 'cards' && (
          <StepThreeCards
            blueprint={blueprint}
            questions={questions}
            onNext={() => setStep('exam')}
            onBack={() => setStep('blueprint')}
            isLoading={loading}
            onUpdateLevel={handleUpdateLevel}
          />
        )}

        {step === 'exam' && config && (
          <StepFourExam
            config={config}
            questions={questions}
            onBack={() => setStep('cards')}
          />
        )}
      </main>
    </div>
  );
};

export default App;