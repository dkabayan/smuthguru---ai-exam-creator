import React, { useState, useEffect } from 'react';
import StepOneConfig from './components/StepOneConfig';
import StepTwoBlueprint from './components/StepTwoBlueprint';
import StepThreeCards from './components/StepThreeCards';
import StepFourExam from './components/StepFourExam';
import ApiKeyInput from './components/ApiKeyInput';
import { AppStep, BlueprintItem, ExamConfig, QuestionItem } from './types';
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

              <button
                onClick={handleClearKey}
                className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 px-2 py-1 rounded transition"
                title="Hapus API Key dan Keluar"
              >
                Keluar / Ganti Key
              </button>
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