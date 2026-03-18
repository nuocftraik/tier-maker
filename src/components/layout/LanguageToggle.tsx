"use client";

import { useState } from 'react';
import { Globe } from 'lucide-react';
import styles from './Toggle.module.css';

// For MVP, we toggle a simple state. For a real app, you'd use next-intl or similar.
export const LanguageToggle = () => {
  const [lang, setLang] = useState<'vi' | 'en'>('vi');

  const toggleLang = () => {
    setLang(lang === 'vi' ? 'en' : 'vi');
    // We could store it in localStorage or cookie
    // localStorage.setItem('lang', newLang);
  };

  return (
    <button className={styles.toggleBtn} onClick={toggleLang} aria-label="Toggle language">
      <Globe size={20} />
      <span style={{ fontSize: '0.75rem', marginLeft: '4px', fontWeight: 'bold' }}>
        {lang.toUpperCase()}
      </span>
    </button>
  );
};
