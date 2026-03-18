"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { TopThree } from '@/components/leaderboard/TopThree';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { Button } from '@/components/ui/Button/Button';
import { Trophy } from 'lucide-react';
import styles from './page.module.css';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Network Error');
  return data;
};

const TIERS = ['All', 'S', 'A', 'B', 'C', 'D', 'E', 'F', 'Bot', 'Unranked'];

export default function LeaderboardPage() {
  const [filter, setFilter] = useState('All');
  
  // Real-time could be added here by listening to Supabase changes, 
  // but SWR handles aggressive revalidation which is good enough for MVP.
  // We set refreshInterval to 5 seconds to get near-real-time updates without WebSockets yet.
  const { data, error, isLoading } = useSWR(
    `/api/leaderboard${filter !== 'All' ? `?tier=${filter}` : ''}`, 
    fetcher,
    { refreshInterval: 5000 }
  );

  const rankings = data?.rankings || [];
  const sTierSettings = data?.settings || {};

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleWrapper}>
          <Trophy className={styles.trophyIcon} size={32} />
          <h1 className={styles.title}>BẢNG VÀNG INRES</h1>
        </div>
        <p className={styles.subtitle}>Cập nhật thành tích và xếp hạng CLB theo thời gian thực ⚡</p>
      </header>

      <div className={styles.filterSection}>
        <div className={styles.filterScroll}>
          {TIERS.map((tier) => (
            <Button
              key={tier}
              variant={filter === tier ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter(tier)}
              className={styles.filterBtn}
            >
              {tier === 'All' ? 'Tất cả' : tier}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : error ? (
        <div className={styles.errorBanner}>{error.message}</div>
      ) : (
        <div className={styles.content}>
          <TopThree topPlayers={rankings} sTierSettings={sTierSettings} />
          <LeaderboardTable 
            players={rankings} 
            sTierSettings={sTierSettings} 
            showTopThree={filter === 'All'} // Only strip out top 3 if viewing All
          />
        </div>
      )}
    </div>
  );
}
