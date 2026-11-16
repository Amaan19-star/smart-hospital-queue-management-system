import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  LanguageOption,
  translations
} from '../i18n/translations';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, defaultText?: string) => string;
  languages: LanguageOption[];
  currentLanguageOption: LanguageOption;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('hospital_lang') as SupportedLanguage;
    if (saved && translations[saved]) {
      return saved;
    }
    return 'en';
  });

  const currentLanguageOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
  const isRTL = currentLanguageOption.dir === 'rtl';

  useEffect(() => {
    localStorage.setItem('hospital_lang', language);
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [language, isRTL]);

  const setLanguage = (lang: SupportedLanguage) => {
    if (translations[lang]) {
      setLanguageState(lang);
    }
  };

  const t = (key: string, defaultText?: string): string => {
    const dict = translations[language] || translations.en;
    if (dict[key]) {
      return dict[key];
    }
    // Fallback to English
    if (translations.en[key]) {
      return translations.en[key];
    }
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
        currentLanguageOption,
        isRTL
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
