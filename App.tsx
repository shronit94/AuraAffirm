
import React, { useState, useEffect } from 'react';
import { AppView, UserPreferences, SessionSummary } from './types';
import { TRANSLATIONS } from './constants';
import VoiceSession from './components/VoiceSession';
import Onboarding from './components/Onboarding';
import LotusLogo from './components/LotusLogo';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('aura_prefs');
    if (saved) {
      setPrefs(JSON.parse(saved));
    } else {
      setView(AppView.ONBOARDING);
    }
  }, []);

  const handleSetupComplete = (newPrefs: UserPreferences) => {
    setPrefs(newPrefs);
    localStorage.setItem('aura_prefs', JSON.stringify(newPrefs));
    setView(AppView.HOME);
  };

  const startSession = () => setView(AppView.LIVE_SESSION);
  const endSession = () => setView(AppView.HOME);
  
  const finishSession = (quote: string, theme: string) => {
    setSummary({ quote, theme });
    setView(AppView.SUMMARY);
    if (prefs) {
      const updated = { ...prefs, lastSessionDate: new Date().toISOString() };
      setPrefs(updated);
      localStorage.setItem('aura_prefs', JSON.stringify(updated));
    }
  };

  const t = TRANSLATIONS;

  if (view === AppView.ONBOARDING) {
    return <Onboarding onComplete={handleSetupComplete} />;
  }

  if (view === AppView.SUMMARY && summary) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-rose-50 to-indigo-50">
        <div className="max-w-xl w-full text-center space-y-12 animate-in fade-in zoom-in duration-1000">
          <div className="space-y-4">
            <span className="text-rose-400 font-bold uppercase tracking-[0.2em] text-sm">{t.wisdomLabel}</span>
            <h2 className="text-4xl md:text-5xl font-serif text-rose-950 leading-tight italic">
              "{summary.quote}"
            </h2>
            <div className="h-px w-24 bg-rose-200 mx-auto mt-8"></div>
          </div>
          
          <div className="glass p-8 rounded-[2rem] border-rose-100">
            <p className="text-rose-800/70 font-serif text-xl">
              {t.cultivatedLabel} <span className="text-rose-500 font-bold">{summary.theme}</span> {t.todayLabel}
            </p>
          </div>

          <button 
            onClick={() => setView(AppView.HOME)}
            className="px-12 py-5 bg-rose-500 text-white rounded-full font-bold text-lg hover:bg-rose-600 shadow-xl shadow-rose-200 transition-all hover:scale-105"
          >
            {t.btnReturn}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 lg:py-24 space-y-16">
      <nav className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <LotusLogo size="md" />
          <span className="text-2xl font-serif font-bold text-[#631e1e] tracking-tight">Aura Affirm</span>
        </div>
        {prefs && (
          <div className="flex items-center gap-4 px-4 py-2 bg-white/50 rounded-full border border-rose-100">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-xs font-bold text-rose-800 uppercase tracking-widest">{t.ritualLabel} {prefs.notificationTime}</span>
          </div>
        )}
      </nav>

      <section className="text-center space-y-8 py-12">
        <div className="space-y-6">
          <h1 className="text-6xl md:text-8xl font-serif text-rose-950 leading-tight">
            {t.heroTitle} <br /> 
            <span className="text-rose-400 italic">{t.heroHighlight}</span>
          </h1>
          <p className="text-xl text-rose-700/70 max-w-xl mx-auto font-light leading-relaxed">
            {t.heroDesc}
          </p>
        </div>

        <div className="pt-8 flex flex-col items-center">
          <button 
            onClick={startSession}
            className="group relative px-16 py-8 bg-rose-500 text-white rounded-full font-bold text-2xl hover:bg-rose-600 transition-all shadow-2xl shadow-rose-200"
          >
            <div className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-20 group-hover:opacity-40"></div>
            {t.btnBeginRitual}
          </button>
          <p className="mt-6 text-sm font-bold text-rose-400 uppercase tracking-[0.3em]">{t.sessionSubtitle}</p>
        </div>
      </section>

      {view === AppView.LIVE_SESSION && (
        <VoiceSession 
          onClose={endSession} 
          onFinish={finishSession}
          isFirstTime={!prefs?.lastSessionDate}
        />
      )}
    </div>
  );
};

export default App;
