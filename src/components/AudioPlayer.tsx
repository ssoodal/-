import { useState, useEffect, useRef, ChangeEvent } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface AudioPlayerProps {
  text: string;
  langCode: string; // 'en', 'ja', 'zh-CN', 'ko'
}

export default function AudioPlayer({ text, langCode }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [useNativeSpeech, setUseNativeSpeech] = useState(true);

  // References
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // HTML5 Audio as a fallback if window.speechSynthesis is not supported
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  // Get matching language locales for SpeechSynthesis
  const getSubLocale = (code: string) => {
    switch (code) {
      case "en": return "en-US";
      case "ja": return "ja-JP";
      case "zh-CN": return "zh-CN";
      case "ko": return "ko-KR";
      default: return "en-US";
    }
  };

  // Google Translate TTS URL as fallback
  const getTtsUrl = (txt: string, lang: string) => {
    return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(txt)}`;
  };

  // Estimate text utterance duration (seconds) based on character velocity
  const estimateDuration = (txt: string, lang: string, rate: number) => {
    const len = txt.length;
    // Base characters per second under 1.0x rate
    let charPerSec = 7; 
    if (lang === "en") charPerSec = 11;
    if (lang === "ja") charPerSec = 8;
    if (lang === "zh-CN") charPerSec = 8;
    
    const estimated = (len / charPerSec) / rate;
    return Math.max(1.8, estimated); // Minimum 1.8s
  };

  const calculatedDuration = estimateDuration(text, langCode, playbackRate);

  // Synchronize duration display
  useEffect(() => {
    setDuration(calculatedDuration);
    cancelSpeech();
    setCurrentTime(0);
    setIsPlaying(false);
    setIsPaused(false);
  }, [text, langCode, playbackRate]);

  // Handle Speech Event Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, []);

  const cancelSpeech = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
    }
  };

  // Web Speech play handler
  const playNativeSpeech = () => {
    setErrorStatus(null);

    if (isPaused && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      startTimeRef.current = Date.now() - (pausedTimeRef.current * 1000);
      
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        if (elapsed >= calculatedDuration) {
          clearInterval(timerRef.current);
          setIsPlaying(false);
          setIsPaused(false);
          setCurrentTime(0);
        } else {
          setCurrentTime(elapsed);
        }
      }, 50);
      return;
    }

    // Cancel matching previous queues
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    
    // Set locale configuration
    utterance.lang = getSubLocale(langCode);
    utterance.rate = playbackRate;
    utterance.volume = isMuted ? 0 : volume;

    // Apply native voices matching the code
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(langCode));
    if (voice) {
      utterance.voice = voice;
    }

    // Event hooks
    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();
      
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        if (elapsed >= calculatedDuration) {
          clearInterval(timerRef.current);
          setIsPlaying(false);
          setIsPaused(false);
          setCurrentTime(0);
        } else {
          setCurrentTime(elapsed);
        }
      }, 50);
    };

    utterance.onend = () => {
      clearInterval(timerRef.current);
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentTime(0);
    };

    utterance.onerror = (e) => {
      console.warn("Speech API error, falling back to Google TTS stream:", e);
      setUseNativeSpeech(false);
      playLegacyAudio();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Google TTS Fallback audio stream player
  const playLegacyAudio = () => {
    const audioUrl = getTtsUrl(text, langCode);
    
    if (!ttsAudioRef.current) {
      ttsAudioRef.current = new Audio(audioUrl);
    } else {
      ttsAudioRef.current.src = audioUrl;
    }

    const audio = ttsAudioRef.current;
    audio.volume = isMuted ? 0 : volume;
    audio.playbackRate = playbackRate;

    // Setup events
    audio.onplay = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    audio.onpause = () => {
      setIsPlaying(false);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentTime(0);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || calculatedDuration);
    };

    audio.onerror = () => {
      setErrorStatus("음성 리소스 로드 제한이 발생했습니다. 브라우저 기본 TTS를 사용해주세요.");
      setIsPlaying(false);
    };

    audio.play().catch(err => {
      console.warn("Audio fallback failed:", err);
      setErrorStatus("오디오 재생 권한 혹은 샌드박스 정책으로 소리를 낼 수 없습니다.");
    });
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (useNativeSpeech && typeof window !== "undefined" && window.speechSynthesis) {
      if (isPlaying) {
        window.speechSynthesis.pause();
        setIsPaused(true);
        setIsPlaying(false);
        pausedTimeRef.current = currentTime;
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        playNativeSpeech();
      }
    } else {
      // Inline HTML5 Audio mechanism
      if (isPlaying) {
        ttsAudioRef.current?.pause();
        setIsPlaying(false);
      } else {
        playLegacyAudio();
      }
    }
  };

  // Handle timeline manual slide manipulation
  const handleProgressChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (!useNativeSpeech && ttsAudioRef.current) {
      ttsAudioRef.current.currentTime = newTime;
    } else {
      // Simulate timestamp adjustments for SpeechSynthesis
      startTimeRef.current = Date.now() - (newTime * 1000);
    }
  };

  // Modulate speeds
  const changeSpeed = () => {
    const rates = [0.8, 1.0, 1.25, 1.5];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    cancelSpeech();
  };

  // Mute configurations
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (ttsAudioRef.current) {
      ttsAudioRef.current.volume = nextMuted ? 0 : volume;
    }
  };

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0) setIsMuted(false);
    if (ttsAudioRef.current) {
      ttsAudioRef.current.volume = val;
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return "0:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const colors = {
    btnBg: langCode === "en" ? "bg-indigo-500 hover:bg-indigo-600" : (langCode === "ja" ? "bg-rose-500 hover:bg-rose-600" : "bg-amber-500 hover:bg-amber-600"),
    accentColor: langCode === "en" ? "accent-indigo-500" : (langCode === "ja" ? "accent-rose-500" : "accent-amber-500"),
    activeText: langCode === "en" ? "text-indigo-600" : (langCode === "ja" ? "text-rose-600" : "text-amber-600"),
    bgBadge: langCode === "en" ? "bg-indigo-50" : (langCode === "ja" ? "bg-rose-50" : "bg-amber-50"),
  };

  return (
    <div className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
      {/* Option selector to allow user choice between High-Fidelity local synthesis vs Server-based Audio fallbacks */}
      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1 border-b border-slate-100 pb-1.5">
        <span>AUDIO SOURCE ENGINE</span>
        <div className="flex gap-2">
          <button
            onClick={() => { cancelSpeech(); setUseNativeSpeech(true); }}
            className={`px-2 py-0.5 rounded cursor-pointer transition-all ${useNativeSpeech ? `${colors.activeText} ${colors.bgBadge} font-extrabold` : "hover:text-slate-600"}`}
          >
            🔊 HIGH-FIDELITY TTS (기본)
          </button>
          <button
            onClick={() => { cancelSpeech(); setUseNativeSpeech(false); }}
            className={`px-2 py-0.5 rounded cursor-pointer transition-all ${!useNativeSpeech ? `${colors.activeText} ${colors.bgBadge} font-extrabold` : "hover:text-slate-600"}`}
          >
            🌐 EXTERNAL AUDIO (예비)
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full">
        {/* Play Button */}
        <button
          onClick={togglePlay}
          className={`w-10 h-10 flex items-center justify-center rounded-full ${colors.btnBg} text-white shadow-md transition-transform active:scale-95 focus:outline-none cursor-pointer shrink-0`}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-white" />
          ) : (
            <Play className="w-4 h-4 fill-white translate-x-0.5" />
          )}
        </button>

        {/* Progress bar controller */}
        <div className="flex-1 flex flex-col gap-0.5">
          <input
            type="range"
            min="0"
            max={duration || 5}
            step="0.05"
            value={currentTime}
            onChange={handleProgressChange}
            className={`w-full h-1 bg-slate-200 rounded-full ${colors.accentColor} cursor-pointer range-sm`}
          />
          <div className="flex justify-between text-[9px] text-slate-400 font-extrabold">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Speed regulator */}
        <button
          onClick={changeSpeed}
          className="px-1.5 py-1 rounded border border-slate-200 text-slate-500 bg-white hover:bg-slate-100 text-[10px] font-black transition-all cursor-pointer shrink-0"
        >
          {playbackRate.toFixed(1)}x
        </button>

        {/* Mute controller */}
        <button
          onClick={toggleMute}
          className="p-1 rounded text-slate-400 hover:bg-slate-100 transition-all cursor-pointer shrink-0"
        >
          {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Volume scale */}
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className={`w-12 h-1 bg-slate-200 rounded-lg ${colors.accentColor} cursor-pointer hidden sm:block shrink-0`}
        />
      </div>

      {errorStatus && (
        <span className="text-[9px] text-rose-500 font-extrabold text-center mt-1">
          {errorStatus}
        </span>
      )}
    </div>
  );
}

