import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type Language = 'en' | 'hi';
const translations = {
  en: {
    waterGuardians: 'Water Guardians',
    dailyCheck: 'Daily Water Check · 30 seconds',
    streamCheckup: 'Guided Stream Checkup · 2 minutes',
    explain: 'Explain this',
    citizen: 'For citizens',
    researcher: 'Technical view',
    language: 'Language',
    english: 'English',
    hindi: 'हिन्दी',
  },
  hi: {
    waterGuardians: 'वॉटर गार्जियन',
    dailyCheck: 'दैनिक जल जाँच · 30 सेकंड',
    streamCheckup: 'गाइडेड स्ट्रीम चेकअप · 2 मिनट',
    explain: 'इसे समझाएँ',
    citizen: 'नागरिकों के लिए',
    researcher: 'तकनीकी दृश्य',
    language: 'भाषा',
    english: 'English',
    hindi: 'हिन्दी',
  },
} as const;

type I18nContextValue = { language: Language; setLanguage: (language: Language) => void; t: (key: keyof typeof translations.en) => string };
const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('aquaalert-language') as Language) || 'en');
  const changeLanguage = (next: Language) => {
    setLanguage(next);
    localStorage.setItem('aquaalert-language', next);
  };
  const value = useMemo(() => ({ language, setLanguage: changeLanguage, t: (key: keyof typeof translations.en) => translations[language][key] }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
