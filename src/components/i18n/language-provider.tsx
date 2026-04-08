"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_LANGUAGE,
  getLocaleTag,
  type Language,
} from "@/lib/i18n/ui";

type LanguageContextValue = {
  language: Language;
  localeTag: string;
  setLanguage: (language: Language) => void;
};

const STORAGE_KEY = "social-policy-lab:language";

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored === "ko" || stored === "en") {
      setLanguage(stored);
      return;
    }

    if (navigator.language.toLowerCase().startsWith("ko")) {
      setLanguage("ko");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      localeTag: getLocaleTag(language),
      setLanguage,
    }),
    [language],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider.");
  }

  return context;
}
