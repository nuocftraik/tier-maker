"use client";

import React from 'react';
import useSWR from 'swr';
import { Medal, Trophy, TrendingUp, Info } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { Card } from '@/components/ui/Card/Card';
import styles from './POTMCard.module.css';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export const POTMCard = () => {
  const { data, isLoading } = useSWR('/api/stats/potm', fetcher);
  const potm = data?.potm;

  if (isLoading || !potm) return null;

  return (
    <Card className={styles.container}>
      <div className={styles.header}>
        <div className={styles.badge}>
          <Medal size={16} /> VẬN ĐỘNG VIÊN CỦA THÁNG
        </div>
        <div className={styles.month}>Tháng {new Date().getMonth() + 1} / {new Date().getFullYear()}</div>
      </div>

      <div className={styles.content}>
        <div className={styles.avatarWrapper}>
          <Avatar src={potm.user.avatar_url} alt={potm.user.name} size="xl" />
          <Trophy className={styles.trophyIcon} />
        </div>
        
        <div className={styles.info}>
          <h2 className={styles.name}>{potm.user.name}</h2>
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statVal}>{potm.stats.wins}</span>
              <span className={styles.statLabel}>Trận thắng</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.statItem}>
              <span className={styles.statVal}>{potm.stats.winRate}%</span>
              <span className={styles.statLabel}>Tỉ lệ thắng</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.statItem}>
              <span className={styles.statVal}>{potm.stats.total}</span>
              <span className={styles.statLabel}>Tổng trận</span>
            </div>
          </div>
          <div className={styles.note}>
             <TrendingUp size={14} /> Phong độ xuất sắc nhất trong 30 ngày qua
          </div>
        </div>
      </div>
    </Card>
  );
};
