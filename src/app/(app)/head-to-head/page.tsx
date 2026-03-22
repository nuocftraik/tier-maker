"use client";

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Card } from '@/components/ui/Card/Card';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { Swords, Users, Target, TrendingUp, Calendar, AlertCircle, ChevronRight, Scale } from 'lucide-react';
import styles from './HeadToHead.module.css';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function HeadToHeadPage() {
  const { data: sessionData } = useSWR('/api/auth/session', fetcher);
  const { data: usersData } = useSWR('/api/users', fetcher);
  
  const [u1, setU1] = useState<string | null>(null);
  const [u2, setU2] = useState<string | null>(null);
  const [selectingFor, setSelectingFor] = useState<1 | 2 | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const users = Array.isArray(usersData) ? usersData : (usersData?.users || []);
  
  const { data: h2hData, isLoading: h2hLoading } = useSWR(
    u1 && u2 ? `/api/matches/h2h?u1=${u1}&u2=${u2}` : null,
    fetcher
  );

  const stats = h2hData?.stats;
  const matches = h2hData?.matches || [];
  
  const player1 = users.find((u: any) => u.id === u1);
  const player2 = users.find((u: any) => u.id === u2);

  return (
    <div className={styles.pageWrapper}>
      
      <main className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <Scale size={32} className={styles.titleIcon} />
            <h1 className={styles.title}>SO SÁNH ĐỐI ĐẦU</h1>
          </div>
          <p className={styles.subtitle}>Phân tích lịch sử chạm trán trực tiếp giữa các tay vợt 🏸</p>
        </header>

        <section className={styles.selectionGrid}>
          <div 
             className={`${styles.playerPickBox} ${u1 ? styles.picked : ''} ${selectingFor === 1 ? styles.selecting : ''}`}
             onClick={() => setSelectingFor(1)}
          >
             <div className={styles.boxHeader}>Góc đỏ (P1)</div>
             {player1 ? (
                <div className={styles.selectedProfile}>
                   <Avatar src={player1.avatar_url} alt={player1.name} size="xl" className={styles.p1Avatar} />
                   <h3 className={styles.pickedName}>{player1.name}</h3>
                   <div className={styles.statsTip}>Nhấn để đổi đối thủ</div>
                </div>
             ) : (
                <div className={styles.emptySlot}>
                   <Users size={48} className={styles.slotIcon} />
                   <p>Chọn vận động viên 1</p>
                </div>
             )}
          </div>

          <div className={styles.vsBadge}>
             <span className={styles.vsText}>VS</span>
             <div className={styles.vsCircle} />
          </div>

          <div 
             className={`${styles.playerPickBox} ${u2 ? styles.picked : ''} ${selectingFor === 2 ? styles.selecting : ''}`}
             onClick={() => setSelectingFor(2)}
          >
             <div className={styles.boxHeader}>Góc xanh (P2)</div>
             {player2 ? (
                <div className={styles.selectedProfile}>
                   <Avatar src={player2.avatar_url} alt={player2.name} size="xl" className={styles.p2Avatar} />
                   <h3 className={styles.pickedName}>{player2.name}</h3>
                   <div className={styles.statsTip}>Nhấn để đổi đối thủ</div>
                </div>
             ) : (
                <div className={styles.emptySlot}>
                   <Users size={48} className={styles.slotIcon} />
                   <p>Chọn vận động viên 2</p>
                </div>
             )}
          </div>
        </section>

        {selectingFor && (
           <div className={styles.pickerOverlay}>
              <div className={styles.pickerModal}>
                 <div className={styles.pickerHeader}>
                    <h3>Lựa chọn vận động viên (P{selectingFor})</h3>
                    <button className={styles.closePicker} onClick={(e) => { e.stopPropagation(); setSelectingFor(null); }}>Đóng</button>
                 </div>
                 <div className={styles.pickerSearch}>
                    <input 
                       type="text" 
                       placeholder="Tìm kiếm tên..." 
                       className={styles.searchBar} 
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                       autoFocus
                    />
                 </div>
                 <div className={styles.pickerListGrid}>
                    {users
                      .filter((u: any) => selectingFor === 1 ? u.id !== u2 : u.id !== u1)
                      .filter((u: any) => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((u: any) => (
                       <div key={u.id} className={styles.pickerCard} onClick={(e) => {
                          e.stopPropagation();
                          if (selectingFor === 1) setU1(u.id);
                          else setU2(u.id);
                          setSelectingFor(null);
                       }}>
                          <Avatar src={u.avatar_url} alt={u.name} size="md" />
                          <span className={styles.pickerName}>{u.name}</span>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}

        {u1 && u2 && (
          <div className={styles.resultsArea}>
            {h2hLoading ? (
               <div className={styles.loading}>Đang tính toán dữ liệu...</div>
            ) : !stats || stats.total === 0 ? (
               <div className={styles.emptyState}>
                  <AlertCircle size={48} />
                  <h3>Chưa có lịch sử đối đầu</h3>
                  <p>Hai người chơi này chưa từng chạm trán trong các trận đấu được ghi nhận.</p>
               </div>
            ) : (
               <>
                  {/* Stats Overview */}
                  <div className={styles.statsOverview}>
                    <div className={styles.winRateSection}>
                       <div className={styles.winRateLabels}>
                          <div className={styles.labelGroup}>
                             <span className={styles.rateVal}>{Math.round((stats.u1Wins / (stats.u1Wins + stats.u2Wins || 1)) * 100)}%</span>
                             <span className={styles.rateName}>{player1?.name}</span>
                          </div>
                          <div className={`${styles.labelGroup} ${styles.rightAlign}`}>
                             <span className={styles.rateVal}>{Math.round((stats.u2Wins / (stats.u1Wins + stats.u2Wins || 1)) * 100)}%</span>
                             <span className={styles.rateName}>{player2?.name}</span>
                          </div>
                       </div>
                       <div className={styles.winRateBar}>
                          <div 
                            className={styles.barP1} 
                            style={{ width: `${(stats.u1Wins / (stats.u1Wins + stats.u2Wins || 1)) * 100}%` }}
                          />
                          <div 
                            className={styles.barP2} 
                            style={{ width: `${(stats.u2Wins / (stats.u1Wins + stats.u2Wins || 1)) * 100}%` }}
                          />
                       </div>
                    </div>

                    <div className={styles.statsGrid}>
                       <div className={styles.statCard}>
                          <div className={styles.statVal}>{stats.total}</div>
                          <div className={styles.statLabel}>Tổng số trận</div>
                       </div>
                       <div className={styles.statCard}>
                          <div className={styles.statVal}>{stats.asOpponents}</div>
                          <div className={styles.statLabel}>Đối đầu trực tiếp</div>
                       </div>
                       <div className={styles.statCard}>
                          <div className={styles.statVal}>{stats.asTeammates}</div>
                          <div className={styles.statLabel}>Đồng đội</div>
                       </div>
                       <div className={styles.statCard}>
                          <div className={styles.statVal}>{stats.draws}</div>
                          <div className={styles.statLabel}>Hòa</div>
                       </div>
                    </div>
                  </div>

                  {/* Match History */}
                  <div className={styles.historySection}>
                     <h2 className={styles.sectionTitle}>Lịch sử trận đấu ({matches.length})</h2>
                     <div className={styles.matchList}>
                        {matches.map((m: any) => {
                           const p1InA = m.team_a?.some((p:any) => p.id === u1);
                           const p1InB = m.team_b?.some((p:any) => p.id === u1);
                           const p1Winner = (p1InA && m.team_a_score > m.team_b_score) || (p1InB && m.team_b_score > m.team_a_score);
                           const p2InA = m.team_a?.some((p:any) => p.id === u2);
                           const p2InB = m.team_b?.some((p:any) => p.id === u2);
                           const p2Winner = (p2InA && m.team_a_score > m.team_b_score) || (p2InB && m.team_b_score > m.team_a_score);
                           const isTeammates = (p1InA && p2InA) || (p1InB && p2InB);

                           return (
                              <div key={m.match_id} className={styles.matchItem}>
                                 <div className={styles.matchDate}>
                                    {new Date(m.created_at).toLocaleDateString('vi-VN')}
                                 </div>
                                 <div className={styles.matchType}>
                                    {m.type === 'singles' ? '1v1' : '2v2'} 
                                    {m.tournament_id && (
                                       <Link href={`/tournaments/${m.tournament_id}`} className={styles.tournLink} title={m.tournament_name}>
                                          🏆
                                       </Link>
                                    )}
                                 </div>
                                 <div className={styles.matchContent}>
                                    <div className={`${styles.team} ${p1Winner ? styles.winner : ''}`}>
                                       {m.team_a.map((p:any) => (
                                          <span key={p.id} className={(p.id === u1 || p.id === u2) ? styles.highlight : ''}>{p.name}</span>
                                       )).reduce((prev:any, curr:any) => [prev, ' & ', curr])}
                                    </div>
                                    <div className={styles.matchScore}>
                                       {m.team_a_score} - {m.team_b_score}
                                       {isTeammates && <div className={styles.teammateTag}>ĐỒNG ĐỘI</div>}
                                       {m.set_scores && m.set_scores.length > 0 && (
                                          <div className={styles.setScores}>
                                             ({m.set_scores.map((s: any) => `${s.a}-${s.b}`).join(', ')})
                                          </div>
                                       )}
                                    </div>
                                    <div className={`${styles.team} ${p2Winner ? styles.winner : ''}`}>
                                       {m.team_b.map((p:any) => (
                                          <span key={p.id} className={(p.id === u1 || p.id === u2) ? styles.highlight : ''}>{p.name}</span>
                                       )).reduce((prev:any, curr:any) => [prev, ' & ', curr])}
                                    </div>
                                 </div>
                              </div>
                           )
                        })}
                     </div>
                  </div>
               </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
