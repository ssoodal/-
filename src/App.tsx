import { useState, useEffect, FormEvent } from "react";
import AudioPlayer from "./components/AudioPlayer";
import { Sparkles, Trash2, ArrowRightLeft, BookOpen, Volume2, Globe, Heart } from "lucide-react";

interface TranslationResult {
  original: string;
  translations: {
    english: string;
    japanese: string;
    chinese: string;
  };
}

export default function App() {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Translation result (starts null, load from localStorage if present)
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  
  // Previous translation history
  const [history, setHistory] = useState<TranslationResult[]>([]);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("trilingual_history");
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed);
        if (parsed.length > 0) {
          setTranslation(parsed[0]);
        }
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (newResult: TranslationResult) => {
    const updatedHistory = [
      newResult,
      ...history.filter((item) => item.original !== newResult.original),
    ].slice(0, 10); // Keep last 10 entries
    
    setHistory(updatedHistory);
    localStorage.setItem("trilingual_history", JSON.stringify(updatedHistory));
  };

  // Perform translation
  const handleTranslate = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText.trim() }),
      });

      if (!response.ok) {
        throw new Error("서버 응답 오류가 발생했습니다.");
      }

      const data = await response.json();
      if (data.status === "success") {
        const newResult: TranslationResult = {
          original: data.original,
          translations: data.translations,
        };
        setTranslation(newResult);
        saveToHistory(newResult);
      } else {
        throw new Error(data.error || "번역에 실패했습니다.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "번역 및 AI 요동 과정에서 불안정이 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // Clear translation history
  const clearHistory = () => {
    setHistory([]);
    setTranslation(null);
    localStorage.removeItem("trilingual_history");
  };

  // Use preset helper text
  const applyPreset = (preset: string) => {
    setInputText(preset);
  };

  const presets = [
    "실례합니다, 근처에 유명한 맛집이 있나요?",
    "천천히 다시 한번 말씀해 주실 수 있을까요?",
    "이 주소로 가려면 버스 몇 번을 타야 하나요?",
    "한국 요리는 조금 맵지만 아주 맛있어요!"
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-16">
      {/* Upper sleek accent banner decoration */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-rose-500 w-full"></div>

      <div className="max-w-4xl mx-auto px-4 pt-8">
        
        {/* Sleek Header Section */}
        <header className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40 flex flex-col md:flex-row items-center justify-between gap-6 mb-8 relative overflow-hidden">
          {/* Soft background blue gradient overlay */}
          <div className="absolute -right-12 -top-12 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-70"></div>
          
          <div className="flex items-center gap-4 flex-col sm:flex-row text-center sm:text-left relative z-10">
            {/* Mascot Image rendered */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
              <img
                src="/src/assets/images/ghost_mascot_1779330242499.png"
                alt="귀여운 번역 유령 마스코트"
                className="w-full h-full object-contain drop-shadow-md animate-bounce-slow"
                referrerPolicy="no-referrer"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <Globe className="w-5 h-5 text-white animate-spin-slow" />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-800 uppercase">
                  Trilingual <span className="text-blue-600">Guide</span>
                </h1>
              </div>
              <p className="text-sm font-semibold text-slate-400 mt-1">
                👻 꼬마 유령 번역대장과 함께하는 실시간 인공지능 번역
              </p>
            </div>
          </div>

          <div className="relative z-10 w-full md:w-auto max-w-sm">
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-xs font-bold text-slate-600 shadow-sm leading-relaxed">
              {isLoading ? (
                <span className="text-blue-600 animate-pulse block text-center sm:text-left">
                  "열심히 번역 구름을 타고 연산 중이야... 조금만 기다려줘! ✨"
                </span>
              ) : (
                <span className="block text-center sm:text-left">
                  "한국어를 적으면 영어, 일본어, 중국어로 기가 막히게 번역하고 발음까지 완벽 가이드 해둘게! 한 번 적어봐!"
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Input Section - Styled with modern full width text cards */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl shadow-slate-200/40 mb-8">
          <form onSubmit={handleTranslate} className="flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Source Language</span>
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">Auto-Detect: Korean</span>
              </div>
              <button
                type="button"
                onClick={() => setInputText("")}
                className="text-xs font-extrabold text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
              >
                내용 지우기
              </button>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="번역할 한국어 문장을 입력해주세요..."
              rows={3}
              maxLength={500}
              className="w-full resize-none p-2 focus:ring-0 placeholder-slate-300 text-xl sm:text-2xl font-bold text-slate-700 bg-transparent outline-none focus:outline-none transition-all"
            />

            <div className="flex justify-between items-center sm:flex-row gap-3 pt-2">
              <span className="text-xs text-slate-400 font-bold">
                {inputText.length} / 500자
              </span>
              
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:bg-slate-200 font-extrabold text-white rounded-2xl shadow-lg shadow-blue-200/50 hover:shadow-blue-300/40 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>번역 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span>Translate Now</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Presets - Sleek and clean style */}
          <div className="mt-6 border-t border-dashed border-slate-105 pt-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2.5">💡 자주 사용하는 여행·일상 표현</span>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => applyPreset(preset)}
                  className="text-xs font-bold px-3 py-2 bg-slate-50 hover:bg-slate-100 hover:text-blue-600 border border-slate-200/70 rounded-xl transition-all text-left cursor-pointer text-slate-600"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Error Message Box */}
        {errorMsg && (
          <div className="mb-8 p-4 bg-rose-50 border border-rose-100 text-rose-700 font-bold rounded-2xl text-sm flex items-center gap-2">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        {/* Results Grid - Responsive 3 Columns representing the translation output cards */}
        <section className="mt-8">
          
          {/* Active Translations Card Output */}
          {translation ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* English Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md flex flex-col justify-between min-h-[300px] hover:shadow-lg transition-all">
                <div>
                  <div className="flex items-center gap-2 mb-4 justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">English</h3>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">AUTO</span>
                  </div>
                  <p className="text-xs font-extrabold text-slate-400 mb-1.5">영어: (음성 포함)</p>
                  <p className="text-lg leading-relaxed text-slate-800 font-extrabold break-words">
                    "{translation.translations.english}"
                  </p>
                </div>
                <div className="mt-6">
                  <AudioPlayer text={translation.translations.english} langCode="en" />
                </div>
              </div>

              {/* Japanese Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md flex flex-col justify-between min-h-[300px] hover:shadow-lg transition-all">
                <div>
                  <div className="flex items-center gap-2 mb-4 justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Japanese</h3>
                    </div>
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded">AUTO</span>
                  </div>
                  <p className="text-xs font-extrabold text-slate-400 mb-1.5">일본어: (음성 포함)</p>
                  <p className="text-lg leading-relaxed text-slate-800 font-extrabold break-words">
                    "{translation.translations.japanese}"
                  </p>
                </div>
                <div className="mt-6">
                  <AudioPlayer text={translation.translations.japanese} langCode="ja" />
                </div>
              </div>

              {/* Chinese Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md flex flex-col justify-between min-h-[300px] hover:shadow-lg transition-all">
                <div>
                  <div className="flex items-center gap-2 mb-4 justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Chinese</h3>
                    </div>
                    <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded">AUTO</span>
                  </div>
                  <p className="text-xs font-extrabold text-slate-400 mb-1.5">중국어: (음성 포함)</p>
                  <p className="text-lg leading-relaxed text-slate-800 font-extrabold break-words">
                    "{translation.translations.chinese}"
                  </p>
                </div>
                <div className="mt-6">
                  <AudioPlayer text={translation.translations.chinese} langCode="zh-CN" />
                </div>
              </div>

            </div>
          ) : (
            /* Elegant centered placeholder matching the theme */
            <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-md flex flex-col items-center justify-center text-center min-h-[250px]">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-2xl mb-3 animate-bounce-slow border border-slate-100 shadow-inner">
                👻
              </div>
              <h3 className="font-extrabold text-slate-700 text-base">아직 번역 내역이 없습니다</h3>
              <p className="text-xs text-slate-400 mt-1.5 max-w-md leading-relaxed">
                실례합니다, 식단, 위치 묻기 등 기가막힌 한국어 번역 소스를 입력 창에 작성해 보세요. 완벽 매핑된 발음 가이드라인이 출현합니다.
              </p>
            </div>
          )}
        </section>

        {/* Translation History Sidebar styled as sleek horizontal pills */}
        {history.length > 0 && (
          <section className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md mt-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">
                📂 최근 번역 히스토리
              </h3>
              <button
                onClick={clearHistory}
                className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-all cursor-pointer flex items-center gap-1"
                title="전체 삭제"
              >
                <Trash2 className="w-3.5 h-3.5" /> 전체 삭제
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto pr-1">
              {history.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setTranslation(item)}
                  className={`text-xs font-bold px-4 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    translation?.original === item.original
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  "{item.original}"
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Audio tips section instructions */}
        <section className="bg-blue-50/40 border border-blue-100/50 rounded-2xl p-4 text-xs font-bold text-slate-500 mt-8 flex items-start gap-3">
          <span className="text-blue-500">📢</span>
          <p className="leading-relaxed">
            각 번역문 하단에 제공되는 <strong>오디오 재생 가이드</strong>를 이용해보세요. 세세한 속도 조절(0.8x 등)과 볼륨 믹싱을 더해 여행 회화 실력을 간편하게 마스터해보실 수 있습니다.
          </p>
        </section>

        {/* Footer Info conforming to design footer specs */}
        <footer className="mt-12 pt-4 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between text-[10px] font-bold text-slate-400 shrink-0 uppercase tracking-widest gap-2">
          <span>AI translation guide v4.2.0</span>
          <div className="flex gap-4">
            <span>Voice: AI Natural Premium</span>
            <span>Status: Cloud Ready</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
