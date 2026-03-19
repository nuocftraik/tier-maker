"use client";

import { use, useEffect, useState } from 'react';
import useSWR from 'swr';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { StatsCard } from '@/components/profile/StatsCard';
import { VoteHistory } from '@/components/profile/VoteHistory';
import { ProfileMatchHistory } from '@/components/profile/ProfileMatchHistory';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Server error');
  return data;
};

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  
  // Unwrap Next.js 15 async params using React.use()
  const { id } = use(params);

  // Fetch profile via SWR
  const { data, error, isLoading } = useSWR(`/api/users/${id}/profile`, fetcher);

  // We could also fetch global settings for S-tier if needed, but for simplicity we'll just use a separate call or bundle it.
  // Actually, let's fetch settings.
  const { data: globalData } = useSWR('/api/leaderboard', fetcher, { revalidateOnFocus: false });
  const { data: matchData } = useSWR(`/api/users/${id}/matches`, fetcher);

  const settings = globalData?.settings || {};
  const matches = matchData?.matches || [];

  const matchStats = { total: 0, wins: 0, losses: 0, winRate: 0 };
  matches.forEach((m: any) => {
    const isTeamA = m.team_a?.some((p: any) => p.id === id);
    const isTeamB = m.team_b?.some((p: any) => p.id === id);
    if (isTeamA) {
      if (m.team_a_score > m.team_b_score) matchStats.wins++;
      else if (m.team_a_score < m.team_b_score) matchStats.losses++;
    } else if (isTeamB) {
      if (m.team_b_score > m.team_a_score) matchStats.wins++;
      else if (m.team_b_score < m.team_a_score) matchStats.losses++;
    }
  });
  matchStats.total = matches.length;
  matchStats.winRate = matchStats.total > 0 ? Math.round((matchStats.wins / matchStats.total) * 100) : 0;

  // Tạm xử lý state active tab
  const [activeTab, setActiveTab] = useState<'votes' | 'matches'>('matches');

  if (isLoading) {
    return <div className={styles.loading}>Đang tải hồ sơ...</div>;
  }

  if (error || !data) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorBanner}>{error?.message || 'Không tìm thấy hồ sơ'}</div>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <ArrowLeft size={16} /> Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <ArrowLeft size={16} /> Trở về
        </button>
        <h1 className={styles.title}>CHỈ SỐ & THÀNH TÍCH</h1>
      </header>

      <div className={styles.content}>
        <ProfileCard profile={data} sTierSettings={settings} />
        <StatsCard profile={data} matchStats={matchStats} />
        
        {/* Toggle View */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <button 
            onClick={() => setActiveTab('matches')} 
            style={{ fontWeight: 600, padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: activeTab === 'matches' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'matches' ? 'white' : 'var(--text-color)'
            }}>
            Lịch sử Đấu ({matchStats.total})
          </button>
          <button 
            onClick={() => setActiveTab('votes')}
            style={{ fontWeight: 600, padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: activeTab === 'votes' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'votes' ? 'white' : 'var(--text-color)'
            }}>
            Lịch sử Vote ({data?.votesHistory?.length || 0})
          </button>
        </div>

        {activeTab === 'votes' && <VoteHistory votes={data.votesHistory} />}
        {activeTab === 'matches' && <ProfileMatchHistory matches={matches} userId={id} />}
      </div>
    </div>
  );
}
