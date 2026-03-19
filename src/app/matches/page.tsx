"use client";

import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Swords, Plus, Calendar, Trophy, AlertCircle, Trash2, Edit2 } from 'lucide-react';
import styles from './Matches.module.css';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function MatchesFeedPage() {
  const { data: sessionData } = useSWR('/api/auth/session', fetcher);
  const session = sessionData?.session;

  const { data, error, isLoading, mutate } = useSWR('/api/matches', fetcher, { refreshInterval: 10000 });
  const matches = data?.matches || [];

  const handleDelete = async (matchId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa kết quả trận đấu này? Thao tác này không thể hoàn tác!')) return;
    try {
      const res = await fetch(`/api/matches/${matchId}`, { method: 'DELETE' });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Lỗi khi xóa');
      mutate(); // Refresh the list
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(d);
  };

  if (error) return <div className="p-8 text-center text-red-500"><AlertCircle className="mx-auto mb-2" /> Lỗi tải danh sách trận đấu</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Swords size={32} className={styles.titleIcon} />
            Lịch sử thi đấu
          </h1>
          <p className={styles.subtitle}>Kết quả các trận giao lưu nội bộ gần đây</p>
        </div>
        <Link href="/matches/new" className={styles.addBtn}>
          <Plus size={20} />
          <span>Ghi nhận trận mới</span>
        </Link>
      </header>

      {isLoading ? (
        <div className={styles.loading}>Đang tải...</div>
      ) : matches.length === 0 ? (
        <div className={styles.emptyState}>
          <Swords size={48} className={styles.emptyIcon} />
          <p>Chưa có trận đấu nào được ghi nhận.</p>
          <Link href="/matches/new" className={styles.emptyBtn}>Ghi nhận ngay</Link>
        </div>
      ) : (
        <div className={styles.matchList}>
          {matches.map((match: any) => {
            const isTeamAWinner = match.team_a_score > match.team_b_score;
            const isTeamBWinner = match.team_b_score > match.team_a_score;
            const isDraw = match.team_a_score === match.team_b_score;
            const canEdit = session && (session.isAdmin || session.id === match.created_by);

            return (
              <div key={match.match_id} className={styles.matchCard}>
                <div className={styles.matchMeta}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span className={styles.matchType}>
                      {match.type === 'singles' ? '1 vs 1' : '2 vs 2'}
                    </span>
                    <span className={styles.matchDate}>
                      <Calendar size={14} /> {formatDate(match.created_at)}
                    </span>
                  </div>
                  {canEdit && (
                    <div className={styles.matchActions}>
                      <Link href={`/matches/${match.match_id}/edit`} className={styles.actionBtnEdit} title="Sửa kết quả">
                        <Edit2 size={16} />
                      </Link>
                      <button onClick={() => handleDelete(match.match_id)} className={styles.actionBtnDelete} title="Xóa trận đấu">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className={styles.matchScoreboard}>
                  {/* Team A */}
                  <div className={`${styles.teamContainer} ${isTeamAWinner ? styles.teamWinner : isDraw ? '' : styles.teamLoser}`}>
                    <div className={styles.teamPlayers}>
                      {match.team_a?.map((p: any) => (
                        <div key={p.id} className={styles.playerAvatar} title={p.name}>
                          <img src={`https://irwsevmjkrqhcwdbmyfo.supabase.co/storage/v1/object/public/avatars/${p.avatar_url}`} alt={p.name} />
                          <span className={styles.playerName}>{p.name}</span>
                        </div>
                      ))}
                    </div>
                    {isTeamAWinner && <Trophy size={20} className={styles.trophyIcon} />}
                    <div className={styles.score}>{match.team_a_score}</div>
                  </div>

                  {/* VS splitter */}
                  <div className={styles.vsDivider}>-</div>

                  {/* Team B */}
                  <div className={`${styles.teamContainer} ${styles.teamRight} ${isTeamBWinner ? styles.teamWinner : isDraw ? '' : styles.teamLoser}`}>
                    <div className={styles.score}>{match.team_b_score}</div>
                    {isTeamBWinner && <Trophy size={20} className={styles.trophyIcon} />}
                    <div className={styles.teamPlayers}>
                      {match.team_b?.map((p: any) => (
                        <div key={p.id} className={styles.playerAvatar} title={p.name}>
                          <img src={`https://irwsevmjkrqhcwdbmyfo.supabase.co/storage/v1/object/public/avatars/${p.avatar_url}`} alt={p.name} />
                          <span className={styles.playerName}>{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
