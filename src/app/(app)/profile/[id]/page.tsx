"use client";

import { use, useEffect, useState } from 'react';
import useSWR from 'swr';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { StatsCard } from '@/components/profile/StatsCard';
import { VoteHistory } from '@/components/profile/VoteHistory';
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
  const settings = globalData?.settings || {};

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
          <ArrowLeft size={16} /> Bảng Vàng
        </button>
        <h1 className={styles.title}>HỒ SƠ TUYỂN THỦ</h1>
      </header>

      <div className={styles.content}>
        <ProfileCard profile={data} sTierSettings={settings} />
        <StatsCard profile={data} />
        <VoteHistory votes={data.votesHistory} />
      </div>
    </div>
  );
}
