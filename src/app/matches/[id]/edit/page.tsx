"use client";

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useRouter, useParams } from 'next/navigation';
import { User, Users, Swords, Save } from 'lucide-react';
import styles from '../../new/MatchesNew.module.css';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function EditMatchPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data, error, isLoading } = useSWR('/api/users', fetcher);
  const { data: matchData, error: matchError } = useSWR(id ? `/api/matches/${id}` : null, fetcher);
  
  const [type, setType] = useState<'singles'|'doubles'>('doubles');
  const [teamA, setTeamA] = useState<string[]>([]);
  const [teamB, setTeamB] = useState<string[]>([]);
  const [scoreA, setScoreA] = useState<number>(21);
  const [scoreB, setScoreB] = useState<number>(19);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (matchData?.match) {
      const match = matchData.match;
      setType(match.type);
      setScoreA(match.team_a_score);
      setScoreB(match.team_b_score);
      setTeamA(match.team_a ? match.team_a.map((p: any) => p.id) : []);
      setTeamB(match.team_b ? match.team_b.map((p: any) => p.id) : []);
    }
  }, [matchData]);

  const users = Array.isArray(data) ? data : (data?.users || []);

  const togglePlayer = (team: 'A' | 'B', userId: string) => {
    const maxPlayers = type === 'singles' ? 1 : 2;
    const currentTeam = team === 'A' ? teamA : teamB;
    const setFunc = team === 'A' ? setTeamA : setTeamB;

    if (currentTeam.includes(userId)) {
      setFunc(currentTeam.filter(id => id !== userId));
    } else {
      if (team === 'A') setTeamB(teamB.filter(id => id !== userId));
      else setTeamA(teamA.filter(id => id !== userId));
      
      if (currentTeam.length < maxPlayers) {
        setFunc([...currentTeam, userId]);
      } else {
        setFunc([...currentTeam.slice(1), userId]);
      }
    }
  };

  const isPlayerSelected = (team: 'A' | 'B', userId: string) => {
    return team === 'A' ? teamA.includes(userId) : teamB.includes(userId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    const requiredPlayers = type === 'singles' ? 1 : 2;
    if (teamA.length !== requiredPlayers || teamB.length !== requiredPlayers) {
      setErrorMessage(`Vui lòng chọn đủ ${requiredPlayers} người mỗi đội!`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/matches/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, team_a_score: scoreA, team_b_score: scoreB, team_a_players: teamA, team_b_players: teamB
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi sửa trận đấu');
      
      router.push('/matches'); 
    } catch (err: any) {
      setErrorMessage(err.message);
      setSubmitting(false);
    }
  };

  if (isLoading || !matchData) return <div className="p-8 text-center" style={{ color: 'var(--text-color)' }}>Đang tải...</div>;
  if (error || matchError) return <div className="p-8 text-center text-red-500">Lỗi tải dữ liệu</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => router.back()}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          Trở về
        </button>
        <h1 className={styles.title}>
          <Swords size={32} className={styles.titleIcon} />
          Sửa trận đấu
        </h1>
        <p className={styles.subtitle}>Chỉnh sửa lại thông tin trận đấu</p>
      </div>

      <div className={styles.card}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.section}>
            <label className={styles.label}>Thể thức thi đấu (Không thể thay đổi)</label>
            <div className={styles.typeSelector} style={{ opacity: 0.8, cursor: 'not-allowed' }}>
              <button
                type="button"
                disabled
                className={`${styles.typeBtn} ${type === 'singles' ? styles.activeType : ''}`}
                style={{ cursor: 'not-allowed' }}
              >
                <User size={20} /> Đánh đơn (1v1)
              </button>
              <button
                type="button"
                disabled
                className={`${styles.typeBtn} ${type === 'doubles' ? styles.activeType : ''}`}
                style={{ cursor: 'not-allowed' }}
              >
                <Users size={20} /> Đánh đôi (2v2)
              </button>
            </div>
          </div>

          <div className={styles.teamsGrid}>
            <div className={styles.teamBox}>
              <h2 className={styles.teamName} style={{ color: '#ef4444' }}>ĐỘI A</h2>
              <div className={styles.scoreInputGroup}>
                <input 
                  type="number" min="0" required value={scoreA.toString()} 
                  onChange={(e) => {
                    let val = e.target.value.replace(/^0+/, '');
                    if (val === '') val = '0';
                    setScoreA(parseInt(val, 10));
                  }}
                  onBlur={(e) => { e.target.value = scoreA.toString(); }}
                  className={styles.scoreInput}
                  style={{ borderColor: scoreA > scoreB ? '#ef4444' : 'var(--border-color)' }}
                />
                <span className={styles.scoreLabel}>Tỉ số</span>
              </div>
              
              <div className={styles.playerSelection}>
                <p className={styles.helperText}>Chọn thành viên ({teamA.length}/{type === 'singles' ? 1 : 2}):</p>
                <div className={styles.playerList}>
                  {users.filter((u: any) => !teamB.includes(u.id)).map((u: any) => (
                    <div 
                      key={u.id} onClick={() => togglePlayer('A', u.id)}
                      className={`${styles.playerAvatar} ${isPlayerSelected('A', u.id) ? styles.selectedA : ''}`}
                    >
                      <img src={`https://irwsevmjkrqhcwdbmyfo.supabase.co/storage/v1/object/public/avatars/${u.avatar_url}`} alt={u.name} />
                      <span className={styles.playerName} title={u.name}>{u.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.vsBadge}>VS</div>

            <div className={styles.teamBox}>
              <h2 className={styles.teamName} style={{ color: '#3b82f6' }}>ĐỘI B</h2>
              <div className={styles.scoreInputGroup}>
                <input 
                  type="number" min="0" required value={scoreB.toString()} 
                  onChange={(e) => {
                    let val = e.target.value.replace(/^0+/, '');
                    if (val === '') val = '0';
                    setScoreB(parseInt(val, 10));
                  }}
                  onBlur={(e) => { e.target.value = scoreB.toString(); }}
                  className={styles.scoreInput}
                  style={{ borderColor: scoreB > scoreA ? '#3b82f6' : 'var(--border-color)' }}
                />
                <span className={styles.scoreLabel}>Tỉ số</span>
              </div>
              
              <div className={styles.playerSelection}>
                <p className={styles.helperText}>Chọn thành viên ({teamB.length}/{type === 'singles' ? 1 : 2}):</p>
                <div className={styles.playerList}>
                  {users.filter((u: any) => !teamA.includes(u.id)).map((u: any) => (
                    <div 
                      key={u.id} onClick={() => togglePlayer('B', u.id)}
                      className={`${styles.playerAvatar} ${isPlayerSelected('B', u.id) ? styles.selectedB : ''}`}
                    >
                      <img src={`https://irwsevmjkrqhcwdbmyfo.supabase.co/storage/v1/object/public/avatars/${u.avatar_url}`} alt={u.name} />
                      <span className={styles.playerName} title={u.name}>{u.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {errorMessage && <div className={styles.errorAlert}>{errorMessage}</div>}

          <div className={styles.actions}>
            <button type="submit" disabled={submitting} className={styles.submitBtn}>
              {submitting ? 'Đang cập nhật...' : <><Save size={20} /> CẬP NHẬT KẾT QUẢ</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
