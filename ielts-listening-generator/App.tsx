import React, { useState, useCallback } from 'react';
import { generateSpeech } from './services/geminiService';
import { createWavFileDataUrl } from './utils/audioUtils';
import Spinner from './components/Spinner';

const App: React.FC = () => {
  const [script, setScript] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [numVoices, setNumVoices] = useState<string>('1');
  const [voiceGenders, setVoiceGenders] = useState<string>('');
  const [accent, setAccent] = useState<string>('');
  const [trailingSilence, setTrailingSilence] = useState<string>('0');


  const handleGenerateAudio = useCallback(async () => {
    if (!script.trim()) {
      setError('Vui lòng nhập văn bản để tạo audio.');
      return;
    }
    setError(null);
    
    const parsedNumVoices = parseInt(numVoices, 10);
    if (isNaN(parsedNumVoices) || parsedNumVoices < 1) {
      setError('Số lượng giọng nói phải là một số lớn hơn hoặc bằng 1.');
      return;
    }

    if (parsedNumVoices > 2) {
      setError('Lỗi: API hiện tại chỉ hỗ trợ tối đa 2 giọng nói. Vui lòng giảm số lượng giọng nói xuống 1 hoặc 2.');
      return;
    }

    const parsedTrailingSilence = parseFloat(trailingSilence);
     if (isNaN(parsedTrailingSilence) || parsedTrailingSilence < 0) {
      setError('Thời gian chờ phải là một số lớn hơn hoặc bằng 0.');
      return;
    }


    setIsLoading(true);
    setAudioDataUrl(null);

    try {
      const options = {
        numVoices: parsedNumVoices,
        voiceGenders,
        accent,
      };
      const base64Audio = await generateSpeech(script, options);
      if (base64Audio) {
        const wavDataUrl = createWavFileDataUrl(base64Audio, parsedTrailingSilence);
        setAudioDataUrl(wavDataUrl);
      } else {
        throw new Error('Không nhận được dữ liệu audio.');
      }
    } catch (err: any) {
      console.error(err);
      // Attempt to parse a JSON error message from the API
      try {
        const errorJson = JSON.parse(err.message.substring(err.message.indexOf('{')));
        setError(`Lỗi từ API: ${errorJson.error.message}`);
      } catch (parseError) {
         setError(err.message || 'Đã xảy ra lỗi khi tạo audio. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [script, numVoices, voiceGenders, accent, trailingSilence]);

  const handleDownloadAudio = useCallback(() => {
    if (!audioDataUrl) return;

    const link = document.createElement('a');
    link.href = audioDataUrl;
    link.download = 'ielts_listening_audio.wav';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [audioDataUrl]);

  return (
    <div className="bg-slate-900 min-h-screen text-white flex flex-col items-center p-4 sm:p-6 md:p-8 font-sans">
      <div className="w-full max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-cyan-400">Tạo Audio cho IELTS Listening</h1>
          <p className="text-slate-400 mt-2 text-lg">
            Dán đoạn hội thoại hoặc độc thoại vào ô bên dưới để tạo và tải về file âm thanh.
          </p>
        </header>

        <main className="bg-slate-800 rounded-xl shadow-2xl p-6 sm:p-8 ring-1 ring-slate-700">
          <div className="flex flex-col gap-6">
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Nhập đoạn hội thoại hoặc độc thoại IELTS Listening của bạn vào đây..."
              className="w-full h-64 p-4 bg-slate-900 border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 resize-y text-slate-200 placeholder-slate-500"
              disabled={isLoading}
              aria-label="IELTS Script Input"
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="num-voices" className="block text-sm font-medium text-slate-300 mb-1">Số lượng giọng nói (Tối đa 2)</label>
                <input
                  type="number"
                  id="num-voices"
                  min="1"
                  max="2"
                  value={numVoices}
                  onChange={(e) => setNumVoices(e.target.value)}
                  className="w-full p-2 bg-slate-900 border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 text-slate-200"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="voice-genders" className="block text-sm font-medium text-slate-300 mb-1">Giới tính giọng nói</label>
                <input
                  type="text"
                  id="voice-genders"
                  placeholder="ví dụ: 1 nam 1 nữ"
                  value={voiceGenders}
                  onChange={(e) => setVoiceGenders(e.target.value)}
                  className="w-full p-2 bg-slate-900 border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 text-slate-200 placeholder-slate-500 disabled:bg-slate-800 disabled:cursor-not-allowed"
                  disabled={isLoading || (parseInt(numVoices, 10) || 1) < 2}
                />
              </div>
               <div>
                <label htmlFor="accent" className="block text-sm font-medium text-slate-300 mb-1">Giọng (Accent)</label>
                <input
                  type="text"
                  id="accent"
                  placeholder="ví dụ: Australian, Italian"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="w-full p-2 bg-slate-900 border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 text-slate-200 placeholder-slate-500"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="trailing-silence" className="block text-sm font-medium text-slate-300 mb-1">Thời gian chờ cuối (giây)</label>
                <input
                  type="number"
                  id="trailing-silence"
                  min="0"
                  step="0.1"
                  value={trailingSilence}
                  onChange={(e) => setTrailingSilence(e.target.value)}
                  className="w-full p-2 bg-slate-900 border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 text-slate-200"
                  disabled={isLoading}
                />
              </div>
            </div>


            {error && (
              <div role="alert" className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg text-center">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleGenerateAudio}
                disabled={isLoading || !script.trim()}
                className="flex-1 flex justify-center items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500"
              >
                {isLoading ? (
                  <>
                    <Spinner />
                    <span>Đang tạo...</span>
                  </>
                ) : (
                  'Tạo Audio'
                )}
              </button>

              <button
                onClick={handleDownloadAudio}
                disabled={!audioDataUrl || isLoading}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500"
              >
                Tải xuống Audio
              </button>
            </div>

            {audioDataUrl && (
              <div className="mt-4">
                <audio controls src={audioDataUrl} className="w-full rounded-lg">
                  Trình duyệt của bạn không hỗ trợ phần tử audio.
                </audio>
              </div>
            )}
          </div>
        </main>
        
        <footer className="text-center mt-8 text-slate-500 text-sm">
            <p>Powered by Google Gemini API</p>
        </footer>
      </div>
    </div>
  );
};

export default App;