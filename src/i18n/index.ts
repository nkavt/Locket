import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import { FALLBACK_LANGUAGE, resolveLanguage } from './languages';

export const resources = {
  en: { translation: en },
} as const;

void i18next.use(initReactI18next).init({
  resources,
  lng: resolveLanguage(typeof navigator !== 'undefined' ? navigator.language : undefined),
  fallbackLng: FALLBACK_LANGUAGE,
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
});

export default i18next;
