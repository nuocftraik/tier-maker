"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Users, Swords, Save, Lock } from 'lucide-react';
import styles from './MatchesNew.module.css';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function NewMatchPage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <MatchForm />
    </React.Suspense>
  );
}

function MatchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get('match');
  const tournamentId = searchParams.get('tournament');

  const { data: usersData, error, isLoading } = useSWR('/api/users', fetcher);
  const { data: matchData } = useSWR(matchId ? `/api/matches/${matchId}` : null, fetcher);
  const { data: tournamentData } = useSWR(tournamentId ? `/api/tournaments/${tournamentId}` : null, fetcher);
  
  const [type, setType] = useState<'singles'|'doubles'>('singles');
  const [teamA, setTeamA] = useState<string[]>([]);
  const [teamB, setTeamB] = useState<string[]>([]);
  const [scoreA, setScoreA] = useState<number>(21);
  const [scoreB, setScoreB] = useState<number>(19);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Sync with fetched data
  React.useEffect(() => {
    if (matchData?.match && !initialLoaded) {
      const match = matchData.match;
      setTeamA(match.team_a?.map((p: any) => p.id) || []);
      setTeamB(match.team_b?.map((p: any) => p.id) || []);
      setScoreA(match.team_a_score || 0);
      setScoreB(match.team_b_score || 0);
      setType(match.type === 'doubles' ? 'doubles' : 'singles');
      setInitialLoaded(true);
    } else if (tournamentData?.tournament && !initialLoaded) {
      setType(tournamentData.tournament.match_mode === 'doubles' ? 'doubles' : 'singles');
      // We don't set initialLoaded to true yet because matchData might still arrive
    }
  }, [matchData, tournamentData, initialLoaded]);

  const users = Array.isArray(usersData) ? usersData : (usersData?.users || []);

  const togglePlayer = (team: 'A' | 'B', userId: string) => {
    if (matchId) return; // Không được sửa người chơi khi ghi kết quả tournament/trận cũ
    const maxPlayers = type === 'singles' ? 1 : 2;
    const currentTeam = team === 'A' ? teamA : teamB;
    const setFunc = team === 'A' ? setTeamA : setTeamB;

    if (currentTeam.includes(userId)) {
      setFunc(currentTeam.filter(id => id !== userId));
    } else {
      // Bỏ ở team bên kia nếu lỡ click
      if (team === 'A') setTeamB(teamB.filter(id => id !== userId));
      else setTeamA(teamA.filter(id => id !== userId));
      
      if (currentTeam.length < maxPlayers) {
        setFunc([...currentTeam, userId]);
      } else {
        // Thay người cũ nhất
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
    
    // Validate
    const requiredPlayers = type === 'singles' ? 1 : 2;
    if (teamA.length !== requiredPlayers || teamB.length !== requiredPlayers) {
      setErrorMessage(`Vui lòng chọn đủ ${requiredPlayers} người mỗi đội!`);
      return;
    }

    setSubmitting(true);
    try {
      const url = matchId ? `/api/matches/${matchId}` : '/api/matches';
      const method = matchId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          team_a_score: scoreA,
          team_b_score: scoreB,
          team_a_players: teamA,
          team_b_players: teamB
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi lưu trận đấu');
      
      if (tournamentId) {
        router.push(`/tournaments/${tournamentId}`);
      } else {
        router.push('/matches'); 
      }
    } catch (err: any) {
      setErrorMessage(err.message);
      setSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center" style={{ color: 'var(--text-color)' }}>Đang tải danh sách...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Lỗi tải danh sách vận động viên</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => router.back()}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          Trở về
        </button>
        <h1 className={styles.title}>
          <Swords size={32} className={styles.titleIcon} />
          Ghi nhận trận đấu
        </h1>
        <p className={styles.subtitle}>Cập nhật nhanh tỉ số trận đấu nội bộ</p>
      </div>

      <div className={styles.card}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.section}>
            <label className={styles.label}>Thể thức thi đấu</label>
            <div className={`${styles.typeSelector} ${(matchId || tournamentId) ? styles.lockedSelector : ''}`}>
              <button
                type="button"
                className={`${styles.typeBtn} ${type === 'singles' ? styles.activeType : ''}`}
                onClick={() => { if (!matchId && !tournamentId) { setType('singles'); setTeamA([]); setTeamB([]); } }}
                disabled={!!matchId || !!tournamentId}
              >
                <User size={20} /> Đánh đơn (1v1)
              </button>
              <button
                type="button"
                className={`${styles.typeBtn} ${type === 'doubles' ? styles.activeType : ''}`}
                onClick={() => { if (!matchId && !tournamentId) { setType('doubles'); setTeamA([]); setTeamB([]); } }}
                disabled={!!matchId || !!tournamentId}
              >
                <Users size={20} /> Đánh đôi (2v2)
              </button>
            </div>
          </div>

          <div className={styles.teamsGrid}>
            {/* Team A */}
            <div className={styles.teamBox}>
              <h2 className={styles.teamName} style={{ color: '#ef4444' }}>ĐỘI A</h2>
              <div className={styles.scoreInputGroup}>
                <input 
                  type="number" 
                  min="0"
                  required
                  value={scoreA}
                  onChange={(e) => setScoreA(parseInt(e.target.value) || 0)}
                  className={styles.scoreInput}
                  style={{ borderColor: scoreA > scoreB ? '#ef4444' : 'var(--border-color)' }}
                />
                <span className={styles.scoreLabel}>Tỉ số</span>
              </div>
              
              <div className={styles.playerSelection}>
                <p className={styles.helperText}>
                  {matchId ? <><Lock size={12} /> Thành viên đã được xếp</> : `Chọn thành viên (${teamA.length}/${type === 'singles' ? 1 : 2}):`}
                </p>
                <div className={`${styles.playerList} ${matchId ? styles.locked : ''}`}>
                  {users.filter((u: any) => !matchId || teamA.includes(u.id)).map((u: any) => (
                    <div 
                      key={u.id}
                      onClick={() => togglePlayer('A', u.id)}
                      className={`${styles.playerAvatar} ${isPlayerSelected('A', u.id) ? styles.selectedA : ''}`}
                    >
                      <img 
                        src={u.avatar_url ? `https://irwsevmjkrqhcwdbmyfo.supabase.co/storage/v1/object/public/avatars/${u.avatar_url}` : '/default-avatar.png'} 
                        alt={u.name} 
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + u.name; }}
                      />
                      <span className={styles.playerName} title={u.name}>{u.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* VS Badge */}
            <div className={styles.vsBadge}>VS</div>

            {/* Team B */}
            <div className={styles.teamBox}>
              <h2 className={styles.teamName} style={{ color: '#3b82f6' }}>ĐỘI B</h2>
              <div className={styles.scoreInputGroup}>
                <input 
                  type="number" 
                  min="0"
                  required
                  value={scoreB}
                  onChange={(e) => setScoreB(parseInt(e.target.value) || 0)}
                  className={styles.scoreInput}
                  style={{ borderColor: scoreB > scoreA ? '#3b82f6' : 'var(--border-color)' }}
                />
                <span className={styles.scoreLabel}>Tỉ số</span>
              </div>
              
              <div className={styles.playerSelection}>
                <p className={styles.helperText}>
                  {matchId ? <><Lock size={12} /> Thành viên đã được xếp</> : `Chọn thành viên (${teamB.length}/${type === 'singles' ? 1 : 2}):`}
                </p>
                <div className={`${styles.playerList} ${matchId ? styles.locked : ''}`}>
                  {users.filter((u: any) => !matchId || teamB.includes(u.id)).map((u: any) => (
                    <div 
                      key={u.id}
                      onClick={() => togglePlayer('B', u.id)}
                      className={`${styles.playerAvatar} ${isPlayerSelected('B', u.id) ? styles.selectedB : ''}`}
                    >
                      <img 
                        src={u.avatar_url ? `https://irwsevmjkrqhcwdbmyfo.supabase.co/storage/v1/object/public/avatars/${u.avatar_url}` : '/default-avatar.png'} 
                        alt={u.name} 
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + u.name; }}
                      />
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
              {submitting ? 'Đang lưu...' : <><Save size={20} /> LƯU KẾT QUẢ</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
