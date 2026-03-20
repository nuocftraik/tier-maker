"use client";

import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Swords, Plus, Calendar, Trophy, AlertCircle, Trash2, Edit2, Filter, Search } from 'lucide-react';
import styles from './Matches.module.css';
import { Avatar } from '@/components/ui/Avatar/Avatar';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function MatchesFeedPage() {
  const { data: sessionData } = useSWR('/api/auth/session', fetcher);
  const session = sessionData?.session;

  const [source, setSource] = React.useState('all');
  const [selectedUser, setSelectedUser] = React.useState('');

  const { data: usersData } = useSWR('/api/users', fetcher);
  const users = usersData || [];

  const apiUrl = `/api/matches?limit=20&source=${source}${selectedUser ? `&user_id=${selectedUser}` : ''}`;
  const { data, error, isLoading, mutate } = useSWR(apiUrl, fetcher, { refreshInterval: 10000 });
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

      {/* Filters */}
      <div className={styles.filterSection}>
        <div className={styles.filterGroup}>
          <Filter size={16} />
          <button 
            className={`${styles.filterBtn} ${source === 'all' ? styles.activeFilter : ''}`}
            onClick={() => setSource('all')}
          >Tất cả</button>
          <button 
            className={`${styles.filterBtn} ${source === 'manual' ? styles.activeFilter : ''}`}
            onClick={() => setSource('manual')}
          >Giao lưu lẻ</button>
          <button 
            className={`${styles.filterBtn} ${source === 'tournament' ? styles.activeFilter : ''}`}
            onClick={() => setSource('tournament')}
          >Giải đấu</button>
        </div>

        <div className={styles.searchGroup}>
          <Search size={16} />
          <select 
            className={styles.userSelect}
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <option value="">Lọc theo thành viên...</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

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
            const isDraw = (match.team_a_score === match.team_b_score) && match.team_a_score > 0;
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
                    {match.tournament_id && (
                      <span className={styles.tournamentTag}>🏆 Tournament</span>
                    )}
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
                  {/* Team A Summary */}
                  <div className={`${styles.teamSummary} ${styles.left} ${isTeamAWinner ? styles.winner : (isDraw ? '' : styles.loser)}`}>
                    <div className={styles.playerList}>
                      {match.team_a?.map((p: any) => (
                        <div key={p.id} className={styles.playerInfo} title={p.name}>
                          <Avatar src={p.avatar_url} alt={p.name} size="lg" />
                          <span className={styles.playerName}>{p.name}</span>
                        </div>
                      ))}
                    </div>
                    {isTeamAWinner && <Trophy size={18} className={styles.trophyIcon} />}
                  </div>

                  {/* Central Score Area */}
                  <div className={styles.scoreArea}>
                    <div className={`${styles.scoreBox} ${isTeamAWinner ? styles.winnerScore : ''}`}>
                      {match.team_a_score}
                    </div>
                    <div className={styles.vsDivider}>-</div>
                    <div className={`${styles.scoreBox} ${isTeamBWinner ? styles.winnerScore : ''}`}>
                      {match.team_b_score}
                    </div>
                  </div>

                  {/* Team B Summary */}
                  <div className={`${styles.teamSummary} ${styles.right} ${isTeamBWinner ? styles.winner : (isDraw ? '' : styles.loser)}`}>
                    {isTeamBWinner && <Trophy size={18} className={styles.trophyIcon} />}
                    <div className={styles.playerList}>
                      {match.team_b?.map((p: any) => (
                        <div key={p.id} className={styles.playerInfo} title={p.name}>
                          <span className={styles.playerName}>{p.name}</span>
                          <Avatar src={p.avatar_url} alt={p.name} size="lg" />
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
