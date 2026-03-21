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
  const [setScores, setSetScores] = useState<{a: number, b: number}[]>(Array(5).fill({a: 0, b: 0}));
  const [manualBestOf, setManualBestOf] = useState<number>(1);

  const bestOf = tournamentData?.tournament?.best_of || manualBestOf;
  const isMultiSet = bestOf > 1;

  // Compute overall score from sets if bestOf > 1
  React.useEffect(() => {
    if (isMultiSet && initialLoaded) {
      let aWins = 0;
      let bWins = 0;
      setScores.slice(0, bestOf).forEach(set => {
         if (set.a > set.b) aWins++;
         else if (set.b > set.a) bWins++;
      });
      setScoreA(aWins);
      setScoreB(bWins);
    }
  }, [setScores, isMultiSet, bestOf, initialLoaded]);

  // Sync with fetched data
  React.useEffect(() => {
    if (matchData?.match && !initialLoaded) {
      const match = matchData.match;
      setTeamA(match.team_a?.map((p: any) => p.id) || []);
      setTeamB(match.team_b?.map((p: any) => p.id) || []);
      setScoreA(match.team_a_score || 0);
      setScoreB(match.team_b_score || 0);
      setType(match.type === 'doubles' ? 'doubles' : 'singles');
      if (match.set_scores && match.set_scores.length > 0) {
        setManualBestOf(match.set_scores.length <= 3 ? 3 : 5);
        const newSets = Array(5).fill({a: 0, b: 0});
        match.set_scores.forEach((s: any, i: number) => {
          if (i < 5) newSets[i] = {a: s.a || 0, b: s.b || 0};
        });
        setSetScores(newSets);
      }
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

  const updateSetScore = (index: number, team: 'a'|'b', val: number) => {
    const newSets = [...setScores];
    newSets[index] = { ...newSets[index], [team]: val };
    setSetScores(newSets);
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

    // Best of validation
    if (isMultiSet) {
      const winsToWin = Math.ceil(bestOf / 2);
      const isAValid = scoreA === winsToWin && scoreB < winsToWin;
      const isBValid = scoreB === winsToWin && scoreA < winsToWin;
      
      if (!isAValid && !isBValid) {
        setErrorMessage(`Trận đấu BO${bestOf} này yêu cầu một đội đạt ${winsToWin} ván thắng để kết thúc. Hiện đang là ${scoreA}-${scoreB}. Vui lòng nhập chi tiết điểm các ván bên dưới.`);
        return;
      }
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
          team_b_players: teamB,
          set_scores: isMultiSet ? setScores.slice(0, bestOf) : undefined
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

          {!matchId && !tournamentId && (
            <div className={styles.section} style={{ marginTop: '1rem' }}>
              <label className={styles.label}>Số ván thi đấu</label>
              <div className={`${styles.typeSelector}`}>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${manualBestOf === 1 ? styles.activeType : ''}`}
                  onClick={() => setManualBestOf(1)}
                  style={{ gap: '0.5rem', padding: '0.5rem 1rem' }}
                >
                  Giao hữu (BO1)
                </button>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${manualBestOf === 3 ? styles.activeType : ''}`}
                  onClick={() => setManualBestOf(3)}
                  style={{ gap: '0.5rem', padding: '0.5rem 1rem' }}
                >
                  Chuyên nghiệp (BO3)
                </button>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${manualBestOf === 5 ? styles.activeType : ''}`}
                  onClick={() => setManualBestOf(5)}
                  style={{ gap: '0.5rem', padding: '0.5rem 1rem' }}
                >
                  Siêu kinh điển (BO5)
                </button>
              </div>
            </div>
          )}

          <div className={styles.teamsGrid}>
            {/* Team A */}
            <div className={styles.teamBox}>
              <h2 className={styles.teamName} style={{ color: '#ef4444' }}>ĐỘI A</h2>
              <div className={styles.scoreInputGroup}>
                <input 
                  type="number" 
                  min="0"
                  required
                  value={scoreA.toString()}
                  onChange={(e) => {
                    let val = e.target.value.replace(/^0+/, '');
                    if (val === '') val = '0';
                    setScoreA(parseInt(val, 10));
                  }}
                  onBlur={(e) => { e.target.value = scoreA.toString(); }}
                  className={styles.scoreInput}
                  style={{ borderColor: scoreA > scoreB ? '#ef4444' : 'var(--border-color)', opacity: isMultiSet ? 0.6 : 1 }}
                  readOnly={isMultiSet}
                />
                <span className={styles.scoreLabel}>
                  {isMultiSet ? `Số ván thắng (BO${bestOf})` : 'Tỉ số'}
                </span>
              </div>
              
              <div className={styles.playerSelection}>
                <p className={styles.helperText}>
                  {matchId ? <><Lock size={12} /> Thành viên đã được xếp</> : `Chọn thành viên (${teamA.length}/${type === 'singles' ? 1 : 2}):`}
                </p>
                <div className={`${styles.playerList} ${matchId ? styles.locked : ''}`}>
                  {users.filter((u: any) => (!matchId || teamA.includes(u.id)) && !teamB.includes(u.id)).map((u: any) => (
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
                  value={scoreB.toString()}
                  onChange={(e) => {
                    let val = e.target.value.replace(/^0+/, '');
                    if (val === '') val = '0';
                    setScoreB(parseInt(val, 10));
                  }}
                  onBlur={(e) => { e.target.value = scoreB.toString(); }}
                  className={styles.scoreInput}
                  style={{ borderColor: scoreB > scoreA ? '#3b82f6' : 'var(--border-color)', opacity: isMultiSet ? 0.6 : 1 }}
                  readOnly={isMultiSet}
                />
                <span className={styles.scoreLabel}>
                  {isMultiSet ? `Số ván thắng (BO${bestOf})` : 'Tỉ số'}
                </span>
              </div>
              
              <div className={styles.playerSelection}>
                <p className={styles.helperText}>
                  {matchId ? <><Lock size={12} /> Thành viên đã được xếp</> : `Chọn thành viên (${teamB.length}/${type === 'singles' ? 1 : 2}):`}
                </p>
                <div className={`${styles.playerList} ${matchId ? styles.locked : ''}`}>
                  {users.filter((u: any) => (!matchId || teamB.includes(u.id)) && !teamA.includes(u.id)).map((u: any) => (
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

          {isMultiSet && (
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
               <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-color)', marginBottom: '1.5rem', textAlign: 'center' }}>
                 Điểm chi tiết từng Ván (Tối đa {bestOf} ván)
               </h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                 {Array.from({length: bestOf}).map((_, i) => {
                   const prevSets = setScores.slice(0, i);
                   let aw = 0, bw = 0;
                   prevSets.forEach(s => {
                      if (s.a > s.b) aw++;
                      else if (s.b > s.a) bw++;
                   });
                   const winsToWin = Math.ceil(bestOf / 2);
                   const isDecided = aw >= winsToWin || bw >= winsToWin;

                   return (
                   <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', opacity: isDecided ? 0.3 : 1, pointerEvents: isDecided ? 'none' : 'auto' }}>
                     <span style={{ fontWeight: 600, color: 'var(--text-muted)', width: '60px' }}>{isDecided ? 'Bỏ qua' : `Ván ${i + 1}`}</span>
                     <input 
                       type="number" 
                       min="0" 
                       value={isDecided ? '' : (setScores[i]?.a?.toString() ?? '0')} 
                       onChange={(e) => {
                         let val = e.target.value.replace(/^0+(?=\d)/, '');
                         if (val === '') val = '0';
                         updateSetScore(i, 'a', parseInt(val, 10));
                       }} 
                       style={{ width: '80px', height: '48px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', border: '2px solid #ef4444', borderRadius: '8px', background: 'var(--background)' }} 
                       disabled={isDecided}
                     />
                     <span style={{ fontWeight: 'bold', color: 'var(--text-color)' }}>-</span>
                     <input 
                       type="number" 
                       min="0" 
                       value={isDecided ? '' : (setScores[i]?.b?.toString() ?? '0')} 
                       onChange={(e) => {
                         let val = e.target.value.replace(/^0+(?=\d)/, '');
                         if (val === '') val = '0';
                         updateSetScore(i, 'b', parseInt(val, 10));
                       }} 
                       style={{ width: '80px', height: '48px', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', border: '2px solid #3b82f6', borderRadius: '8px', background: 'var(--background)' }} 
                       disabled={isDecided}
                     />
                   </div>
                 )})}
               </div>
               <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                 Tỉ số chung cuộc ({scoreA} - {scoreB}) được tự động tính dựa trên số ván thắng. Điền 0-0 để bỏ qua ván chưa đấu.
               </p>
            </div>
          )}

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
