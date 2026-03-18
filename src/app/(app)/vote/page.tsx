"use client";

import { CheckSquare } from 'lucide-react';
import { VoteBoard } from '@/components/vote/VoteBoard';
import styles from './page.module.css';

export default function VotePage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleWrapper}>
          <CheckSquare className={styles.icon} size={32} />
          <h1 className={styles.title}>ĐÁNH GIÁ THÀNH VIÊN</h1>
        </div>
        <p className={styles.subtitle}>
          Kéo thả thành viên vào các Tier để chấm điểm nhanh, hoặc click để nhập điểm chính xác (1.0 - 10.0). Càng đánh giá nhiều, bảng xếp hạng chung càng chính xác.
        </p>
      </header>

      <main className={styles.main}>
        <VoteBoard />
      </main>
    </div>
  );
}
