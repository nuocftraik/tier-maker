"use client";

import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import styles from './ConfirmModal.module.css';
import { Button } from '../ui/Button/Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  isDanger = false
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleIcon}>
            <AlertCircle size={24} color={isDanger ? '#ef4444' : 'var(--color-primary)'} />
            <h3>{title}</h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.body}>
          <p>{message}</p>
        </div>

        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            variant={isDanger ? 'primary' : 'primary'}
            className={isDanger ? styles.dangerBtn : ''}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
