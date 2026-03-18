import React, { useState, useEffect } from 'react';
import styles from './ScoreInput.module.css';
import { Check, X } from 'lucide-react';

interface ScoreInputProps {
  initialScore: number;
  onSave: (score: number) => void;
  onCancel: () => void;
}

export const ScoreInput: React.FC<ScoreInputProps> = ({ initialScore, onSave, onCancel }) => {
  const [value, setValue] = useState(initialScore.toString());

  useEffect(() => {
    // Focus automatically
    document.getElementById('inline-score-input')?.focus();
  }, []);

  const handleSave = () => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 1 && num <= 10) {
      onSave(num);
    } else {
      // Basic validation fail, reset or alert
      setValue(initialScore.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className={styles.container} onClick={(e) => e.stopPropagation()}>
      <input
        id="inline-score-input"
        type="number"
        step="0.1"
        min="1"
        max="10"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className={styles.input}
      />
      <div className={styles.actions}>
        <button className={`${styles.btn} ${styles.btnSave}`} onClick={handleSave}><Check size={14} /></button>
        <button className={`${styles.btn} ${styles.btnCancel}`} onClick={onCancel}><X size={14} /></button>
      </div>
    </div>
  );
};
