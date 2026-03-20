"use client";

import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Medal, Plus, Trophy, Calendar, AlertCircle, Trash2, ArrowRight, Info } from 'lucide-react';
import styles from './Tournaments.module.css';
import { Navbar } from '@/components/layout/Navbar';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function TournamentsPage() {
  const { data: sessionData } = useSWR('/api/auth/session', fetcher);
  const session = sessionData?.session;

  const { data, error, isLoading, mutate } = useSWR('/api/tournaments', fetcher, { refreshInterval: 15000 });
  const tournaments = data?.tournaments || [];

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(d);
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'draft': return 'Bản nháp';
      case 'active': return 'Đang diễn ra';
      case 'completed': return 'Đã kết thúc';
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'elimination': return 'Loại trực tiếp';
      case 'round_robin': return 'Vòng tròn';
      case 'custom': return 'Bảng→Knockout';
      default: return type;
    }
  };

  if (error) return <div className="p-8 text-center text-red-500"><AlertCircle className="mx-auto mb-2" /> Lỗi tải danh sách giải đấu</div>;

  return (
    <div className={styles.pageWrapper}>
      <Navbar session={session} />
      
      <main className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>
              <Medal size={32} className={styles.titleIcon} />
              Giải đấu INRES
            </h1>
            <p className={styles.subtitle}>Nơi vinh danh những nhà vô địch</p>
          </div>
          {session?.isAdmin && (
            <Link href="/tournaments/new" className={styles.addBtn}>
              <Plus size={20} />
              <span>Tạo giải mới</span>
            </Link>
          )}
        </header>

        {isLoading ? (
          <div className={styles.loading}>Đang tải...</div>
        ) : tournaments.length === 0 ? (
          <div className={styles.emptyState}>
            <Trophy size={64} className={styles.emptyIcon} />
            <p>Chưa có giải đấu nào được tổ chức.</p>
            {session?.isAdmin && (
              <Link href="/tournaments/new" className={styles.emptyBtn}>Tạo giải đấu đầu tiên</Link>
            )}
          </div>
        ) : (
          <div className={styles.tournamentGrid}>
            {tournaments.map((tournament: any) => (
              <div key={tournament.id} className={`${styles.tournamentCard} ${styles[`status_${tournament.status}`]}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.badgeGroup}>
                    <span className={`${styles.statusBadge} ${styles[tournament.status]}`}>
                      {getStatusLabel(tournament.status)}
                    </span>
                    <span className={styles.typeBadge}>
                      {getTypeLabel(tournament.type)}
                    </span>
                    <span className={styles.typeBadge}>
                      {tournament.match_mode === 'doubles' ? '2v2' : '1v1'}
                    </span>
                  </div>
                  <span className={styles.date}>
                    <Calendar size={14} /> {formatDate(tournament.created_at)}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <h2 className={styles.tournamentName}>{tournament.name}</h2>
                  <p className={styles.description}>{tournament.description || 'Không có mô tả.'}</p>
                  
                  {tournament.winner && (
                    <div className={styles.winnerSection}>
                      <Trophy size={18} className={styles.winnerIcon} />
                      <div className={styles.winnerInfo}>
                        <span className={styles.winnerLabel}>Nhà vô địch:</span>
                        <span className={styles.winnerName}>{tournament.winner.name}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.createdBy}>
                    <span>Tạo bởi: {tournament.created_by_user?.name || 'Admin'}</span>
                  </div>
                  <Link href={`/tournaments/${tournament.id}`} className={styles.viewBtn}>
                    <span>Chi tiết</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
