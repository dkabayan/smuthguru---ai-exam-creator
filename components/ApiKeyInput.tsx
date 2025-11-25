import React, { useState } from 'react';

interface Props {
  onSetKey: (key: string) => void;
}

const ApiKeyInput: React.FC<Props> = ({ onSetKey }) => {
  const [inputKey, setInputKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim().length > 10) {
      onSetKey(inputKey.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <span className="text-3xl">🔑</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Selamat Datang di SMUTHGuru</h1>
          <p className="text-blue-100 mt-2 text-sm">Asisten AI Pembuat Soal Ujian Otomatis</p>
        </div>

        <div className="p-8">
          <p className="text-gray-600 text-sm mb-6 text-center">
            Untuk menggunakan aplikasi ini, silakan masukkan <strong>Google Gemini API Key</strong> Anda. Key ini disimpan secara lokal di browser Anda.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Tempel API Key di sini..."
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={inputKey.length < 10}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Masuk & Mulai &rarr;
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">Belum punya API Key?</p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm font-semibold inline-flex items-center gap-1 mt-1"
            >
              Dapatkan Gratis di Google AI Studio ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyInput;