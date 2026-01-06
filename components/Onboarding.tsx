
import React, { useState } from 'react';
import { TRANSLATIONS } from '../constants';
import { UserPreferences } from '../types';
import LotusLogo from './LotusLogo';

interface OnboardingProps {
  onComplete: (prefs: UserPreferences) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [time, setTime] = useState('08:00');

  const t = TRANSLATIONS;

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else {
      onComplete({
        notificationTime: time,
        setupComplete: true,
        lastSessionDate: null
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-tr from-rose-50 to-indigo-50">
      <div className="max-w-lg w-full glass p-10 md:p-16 rounded-[3rem] shadow-2xl space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {step === 1 && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <LotusLogo size="xl" className="mx-auto mb-6" />
              <h2 className="text-4xl font-serif text-rose-950">{t.welcomeTitle}</h2>
              <p className="text-rose-700/70 leading-relaxed">{t.welcomeDesc}</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">⏰</span>
              </div>
              <h2 className="text-4xl font-serif text-rose-950">{t.ritualTitle}</h2>
              <p className="text-rose-700/70">{t.ritualDesc}</p>
            </div>
            <div className="flex justify-center">
              <input 
                type="time" 
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="text-5xl font-serif text-rose-900 bg-white/50 border-b-2 border-rose-300 focus:border-rose-500 outline-none px-4 py-2 text-center rounded-xl"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 text-center">
            <div className="space-y-6">
              <LotusLogo size="xl" className="mx-auto animate-pulse" />
              <h2 className="text-4xl font-serif text-rose-950">{t.readyTitle}</h2>
              <p className="text-rose-700/70 leading-relaxed italic">
                "{t.readyDesc}"
              </p>
            </div>
          </div>
        )}

        <button 
          onClick={handleNext}
          className="w-full py-6 bg-rose-500 text-white rounded-full font-bold text-xl hover:bg-rose-600 shadow-xl shadow-rose-200 transition-all active:scale-95"
        >
          {step === 3 ? t.btnBeginJourney : t.btnContinue}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
