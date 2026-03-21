import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Swords, Calendar, Trash2, Edit2 } from 'lucide-react';
import styles from './ProfileMatchHistory.module.css';

interface ProfileMatchHistoryProps {
  matches: any[];
  userId: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export const ProfileMatchHistory: React.FC<ProfileMatchHistoryProps> = ({ matches, userId }) => {
  const router = useRouter();
  const { data: sessionData } = useSWR('/api/auth/session', fetcher);
  const session = sessionData?.session;

  const handleDelete = async (matchId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa trận đấu này?')) return;
    try {
      const res = await fetch(`/api/matches/${matchId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Cấp quyền từ chối hoặc máy chủ lỗi');
      // Tải lại trang để SWR tự refetch profile mới nhất
      window.location.reload();
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

  if (!matches || matches.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Swords size={32} className={styles.emptyIcon} />
        <p>Thành viên này chưa ghi nhận trận đấu nào.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {matches.map((match: any) => {
        const isTeamA = match.team_a?.some((p: any) => p.id === userId);
        const isTeamB = match.team_b?.some((p: any) => p.id === userId);
        
        let isWinner = false;
        let isDraw = match.team_a_score === match.team_b_score;
        let userAssignedTeam = isTeamA ? 'A' : (isTeamB ? 'B' : null);

        if (isTeamA && match.team_a_score > match.team_b_score) isWinner = true;
        if (isTeamB && match.team_b_score > match.team_a_score) isWinner = true;

        const myTeam = isTeamA ? (match.team_a || []) : (match.team_b || []);
        const oppTeam = isTeamA ? (match.team_b || []) : (match.team_a || []);
        const myScore = isTeamA ? match.team_a_score : match.team_b_score;
        const oppScore = isTeamA ? match.team_b_score : match.team_a_score;
        const canEdit = session && (session.isAdmin || session.id === match.created_by);

        return (
          <div key={match.match_id} className={`${styles.matchRow} ${isWinner ? styles.winBg : isDraw ? '' : styles.lossBg}`}>
            <div className={styles.matchMeta}>
              <span className={styles.matchType}>{match.type === 'singles' ? '1v1' : '2v2'}</span>
              <span className={styles.matchType} style={{ background: 'var(--bg-secondary)', color: 'var(--text-color)', marginLeft: '0.25rem' }}>
                {!match.set_scores || match.set_scores.length === 0 ? 'BO1' : (match.set_scores.length > 3 ? 'BO5' : 'BO3')}
              </span>
              <span className={styles.matchDate}>
                <Calendar size={12} /> {formatDate(match.created_at)}
              </span>
              {canEdit && (
                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
                  <Link href={`/matches/${match.match_id}/edit`} style={{ color: 'var(--text-secondary)' }} title="Sửa">
                    <Edit2 size={14} />
                  </Link>
                  <button onClick={() => handleDelete(match.match_id)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Xóa">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className={styles.resultBadge}>
              {isWinner ? (
                <span className={styles.badgeWin}>THẮNG</span>
              ) : isDraw ? (
                <span className={styles.badgeDraw}>HÒA</span>
              ) : (
                <span className={styles.badgeLoss}>THUA</span>
              )}
            </div>

            <div className={styles.scoreBoard} style={{ flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <div className={styles.myTeam}>
                  {myTeam.map((p: any) => (
                    <img key={p.id} title={p.name} className={styles.avatar} src={`https://irwsevmjkrqhcwdbmyfo.supabase.co/storage/v1/object/public/avatars/${p.avatar_url}`} alt={p.name} />
                  ))}
                  <span className={`${styles.score} ${isWinner ? styles.winScore : isDraw ? '' : styles.lossScore}`}>{myScore}</span>
                </div>

                <div className={styles.vs} style={{ margin: '0 1rem' }}>-</div>

                <div className={styles.oppTeam}>
                  <span className={`${styles.score} ${!isWinner && !isDraw ? styles.winScore : isDraw ? '' : styles.lossScore}`}>{oppScore}</span>
                  {oppTeam.map((p: any) => (
                    <img key={p.id} title={p.name} className={styles.avatar} src={`https://irwsevmjkrqhcwdbmyfo.supabase.co/storage/v1/object/public/avatars/${p.avatar_url}`} alt={p.name} />
                  ))}
                </div>
              </div>
              {match.set_scores && match.set_scores.length > 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', alignSelf: 'center' }}>
                  ({match.set_scores.map((s:any) => isTeamA ? `${s.a}-${s.b}` : `${s.b}-${s.a}`).join(', ')})
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
