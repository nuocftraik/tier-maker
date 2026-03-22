"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useWindowSize } from 'react-use';
import Confetti from 'react-confetti';
import { TopThree } from '@/components/leaderboard/TopThree';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { Button } from '@/components/ui/Button/Button';
import { Trophy, Medal, Swords, Target } from 'lucide-react';
import styles from './page.module.css';
import { POTMCard } from '@/components/leaderboard/POTMCard';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Network Error');
  return data;
};

const TIERS = ['All', 'S', 'A', 'B', 'C', 'D', 'E', 'F', 'Bot', 'Unranked'];

export default function LeaderboardPage() {
  const [filter, setFilter] = useState('All');
  const [showConfetti, setShowConfetti] = useState(true);
  const [recycle, setRecycle] = useState(true); // Control flow of new pieces
  const [isMounted, setIsMounted] = useState(false);
  const { width, height } = useWindowSize();

  useEffect(() => {
    setIsMounted(true);
    // Generate new pieces continuously for 3 seconds then gracefully wind down
    const stopRecycleTimer = setTimeout(() => setRecycle(false), 3000);
    // Unmount completely after 6 seconds to free up browser memory
    const unmountTimer = setTimeout(() => setShowConfetti(false), 6000);
    
    return () => {
      clearTimeout(stopRecycleTimer);
      clearTimeout(unmountTimer);
    };
  }, []);
  
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
      {isMounted && showConfetti && filter === 'All' && (
        <Confetti 
          width={width} 
          height={height} 
          recycle={recycle} 
          numberOfPieces={600}
          gravity={0.12} // Softer gravity
          initialVelocityY={20} // Explosive upward burst
          style={{ zIndex: 1000, position: 'fixed' }} 
        />
      )}

      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <div className={styles.titleWrapper}>
            <Trophy className={styles.trophyIcon} size={32} />
            <h1 className={styles.title}>BẢNG VÀNG INRES</h1>
          </div>
          <p className={styles.subtitle}>Cập nhật thành tích và xếp hạng CLB theo thời gian thực ⚡</p>
        </div>
        <div className={styles.headerActions}>
           <Button onClick={() => window.location.href = '/head-to-head'} variant="outline" className={styles.h2hQuickBtn}>
              <Target size={18} /> So sánh Đối đầu (H2H)
           </Button>
        </div>
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
          {filter === 'All' && <div className={styles.spotlight}><POTMCard /></div>}
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
