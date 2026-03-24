"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Medal, Trophy, Calendar, AlertCircle, Play, ArrowLeft, Users, Swords, ArrowRightCircle, Trash2, Pencil } from 'lucide-react';
import styles from './TournamentDetails.module.css';
import { Navbar } from '@/components/layout/Navbar';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { Bracket } from '@/components/tournament/Bracket';
import { StandingsTable } from '@/components/tournament/StandingsTable';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { InlineScoreModal } from '@/components/tournament/InlineScoreModal';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const getTypeLabel = (type: string) => {
  switch(type) {
    case 'elimination': return 'Loại trực tiếp';
    case 'round_robin': return 'Vòng tròn';
    case 'custom': return 'Custom (Bảng→Loại)';
    default: return type;
  }
};

const getRoundLabel = (roundNum: number, totalRounds: number) => {
  if (roundNum === totalRounds && totalRounds > 0) return 'Chung kết';
  if (roundNum === totalRounds - 1 && totalRounds > 1) return 'Bán kết';
  if (roundNum === totalRounds - 2 && totalRounds > 2) return 'Tứ kết';
  return `Vòng ${roundNum}`;
};

export default function TournamentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const { width, height } = useWindowSize();
  
  const { data: sessionData } = useSWR('/api/auth/session', fetcher);
  const session = sessionData?.session;

  const { data, error, isLoading, mutate } = useSWR(`/api/tournaments/${id}`, fetcher);
  const tournament = data?.tournament;
  const participants = data?.participants || [];
  const matches = data?.matches || [];

  const canManage = session?.isAdmin || (session && tournament && session.id === tournament.created_by);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<any>(null);

  // Filtered matches by stage
  const groupMatches = matches.filter((m: any) => m.stage === 'group');
  const knockoutMatches = matches.filter((m: any) => m.stage === 'knockout');
  
  const [activeTab, setActiveTab] = useState<'group' | 'knockout'>('group');

  React.useEffect(() => {
    if (tournament?.current_stage) {
      setActiveTab(tournament.current_stage as 'group' | 'knockout');
    }
  }, [tournament?.current_stage]);
  
  const isGroupStageComplete = groupMatches.length > 0 && groupMatches.every((m: any) => 
    m.team_a_score > 0 || m.team_b_score > 0 || (m.set_scores && m.set_scores.length > 0) || m.is_bye
  );

  // Group participants by group_number
  const groups: Record<number, any[]> = {};
  participants.forEach((p: any) => {
    const g = p.group_number || 0;
    if (!groups[g]) groups[g] = [];
    groups[g].push(p);
  });

  const handleGenerateBracket = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/tournaments/${id}/generate-bracket`, { method: 'POST' });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Lỗi tạo vòng đấu');
      mutate();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsGenerating(false);
      setIsStartModalOpen(false);
    }
  };

  const getAdvancingParticipants = () => {
      const advancing: any[] = [];
      Object.keys(groups).filter(g => Number(g) > 0).forEach(g => {
        const groupNum = Number(g);
        const groupPlayers = groups[groupNum] || [];
        const gMatches = groupMatches.filter((m: any) => m.group_number === groupNum && (m.team_a_score > 0 || m.team_b_score > 0));
        
        const stats = groupPlayers.map((p: any) => {
           let pts = 0;
           gMatches.forEach((m: any) => {
               const isTeamA = m.team_a?.some((x:any) => x.id === p.user.id);
               const isTeamB = m.team_b?.some((x:any) => x.id === p.user.id);
               if (isTeamA && m.team_a_score > m.team_b_score) pts += 3;
               if (isTeamB && m.team_b_score > m.team_a_score) pts += 3;
           });
           return { ...p, pts };
        });
        
        stats.sort((a,b) => b.pts - a.pts);
        advancing.push(...stats.slice(0, tournament.advance_per_group));
      });

      return advancing.map((p, idx) => ({
        user_id: p.user_id,
        seed: idx + 1,
        group_number: p.group_number
      }));
  };

  const handleAdvanceToKnockout = async () => {
    setIsAdvancing(true);
    try {
      const advancingPayload = getAdvancingParticipants();
      
      const res = await fetch(`/api/tournaments/${id}/generate-bracket`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           stage: 'knockout',
           advancingParticipants: advancingPayload
        })
      });

      if (res.ok) {
        await fetch(`/api/tournaments/${id}`, {
           method: 'PATCH',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ current_stage: 'knockout' })
        });
      }

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Lỗi chuyển vòng');
      mutate();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsAdvancing(false);
      setIsAdvanceModalOpen(false);
    }
  };

  const handleDeleteTournament = async () => {
    try {
      const res = await fetch(`/api/tournaments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lỗi xóa giải đấu');
      }
      router.push('/tournaments');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateString));
  };

  if (error) return <div className="p-8 text-center text-red-500"><AlertCircle className="mx-auto mb-2" /> Lỗi tải thông tin giải đấu</div>;
  if (!tournament && !isLoading) return <div className="p-8 text-center">Không tìm thấy giải đấu</div>;

  const renderRoundMatches = (matchesToRender: any[]) => {
    // Group by round_number
    const rounds: Record<number, any[]> = {};
    matchesToRender.forEach((m: any) => {
      const r = m.round_number || 1;
      if (!rounds[r]) rounds[r] = [];
      rounds[r].push(m);
    });

    return Object.keys(rounds).sort((a,b) => Number(a)-Number(b)).map(r => {
      const roundNum = Number(r);
      const roundMatchesArr = rounds[roundNum];
      return (
        <div key={roundNum} className={styles.roundGroup}>
          <h4 className={styles.roundTitle}>
            <Calendar size={16} /> 
            {tournament?.type === 'round_robin' || tournament?.type === 'custom' ? `Lượt trận ${roundNum}` : getRoundLabel(roundNum, 1)}
          </h4>
          <div className={styles.matchList}>
            {roundMatchesArr.map((match: any) => (
              <div key={match.match_id} className={styles.matchCard}>
                <div className={styles.matchMeta}>TRẬN #{match.match_order}</div>
                <div className={styles.matchContent}>
                  <div className={styles.team}>
                    {match.team_a?.map((p: any) => (
                      <div key={p.id} className={styles.teamMember}>
                        <Avatar src={p.avatar_url} alt="" size="sm" />
                        <span>{p.name}</span>
                      </div>
                    )) || 'TBD'}
                  </div>
                  <div className={styles.scoreContainer}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div className={styles.score}>{match.team_a_score}</div>
                      <div className={styles.scoreSeparator}>-</div>
                      <div className={styles.score}>{match.team_b_score}</div>
                    </div>
                    {match.set_scores && match.set_scores.length > 0 && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem', fontWeight: 600 }}>
                        ({match.set_scores.map((s:any) => `${s.a}-${s.b}`).join(', ')})
                      </div>
                    )}
                  </div>
                  <div className={styles.team} style={{ textAlign: 'right', flexDirection: 'row-reverse' }}>
                    {match.team_b?.map((p: any) => (
                      <div key={p.id} className={styles.teamMember} style={{ flexDirection: 'row-reverse' }}>
                        <Avatar src={p.avatar_url} alt="" size="sm" />
                        <span>{p.name}</span>
                      </div>
                    )) || 'TBD'}
                  </div>
                </div>
                {(() => {
                  const isParticipant = match.team_a?.some((p: any) => p.id === session?.id) || match.team_b?.some((p: any) => p.id === session?.id);
                  const canEditThisMatch = (canManage || isParticipant) && tournament.status !== 'draft';
                  
                  return canEditThisMatch && match.team_a?.length > 0 && match.team_b?.length > 0 && (
                    <button onClick={() => setEditingMatch(match)} className={styles.recordBtn}>
                      {match.team_a_score > 0 || match.team_b_score > 0 ? 'Sửa điểm' : 'Ghi kết quả'}
                    </button>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  // Determine what to show in main area
  const renderMainContent = () => {
    if (tournament?.status === 'draft') {
      return (
        <Card className={styles.draftCard}>
          <div className={styles.draftEmpty}>
            <Play size={48} className={styles.playIcon} />
            <h2>Sẵn sàng bắt đầu?</h2>
            <p>Giải đấu đang ở trạng thái nháp. Hãy kiểm tra danh sách người chơi bên cạnh và bấm nút bên dưới để tạo vòng đấu.</p>
            {canManage && (
              <Button onClick={() => setIsStartModalOpen(true)} disabled={isGenerating}>
                <Swords size={18} />
                {isGenerating ? 'Đang tạo vòng đấu...' : 'Tạo vòng đấu & Bắt đầu'}
              </Button>
            )}
          </div>
        </Card>
      );
    }

    if (tournament?.type === 'elimination' || tournament?.type === 'round_robin') {
      return (
        <div className={styles.simpleLayout}>
          {tournament?.type === 'elimination' && (
            <>
              <h2 className={styles.sectionTitle}>Sơ đồ thi đấu</h2>
              <Bracket 
                matches={matches} 
                tournamentId={id} 
                canEdit={canManage && tournament.status !== 'draft'} 
                sessionUserId={session?.id}
                onMatchClick={(m: any) => setEditingMatch(m)} 
              />
            </>
          )}
          {tournament?.type === 'round_robin' && (
            <>
              <h2 className={styles.sectionTitle}>Bảng xếp hạng</h2>
              <StandingsTable participants={participants} matches={matches} matchMode={tournament.match_mode} />
              
              <h2 className={styles.sectionTitle} style={{ marginTop: '3rem' }}>Lịch thi đấu</h2>
              {renderRoundMatches(matches)}
            </>
          )}
        </div>
      );
    }

    // CUSTOM type
    if (tournament?.type === 'custom') {
      return (
        <div className={styles.customLayout}>
          {/* Tabs */}
          <div className={styles.stageTabs}>
            <button 
              onClick={() => setActiveTab('group')} 
              className={`${styles.stageTab} ${activeTab === 'group' ? styles.activeTab : ''}`}
            >
              Vòng bảng
            </button>
            <button 
              onClick={() => setActiveTab('knockout')} 
              className={`${styles.stageTab} ${activeTab === 'knockout' ? styles.activeTab : ''}`}
              disabled={knockoutMatches.length === 0}
            >
              Vòng Knockout
            </button>
          </div>

          {/* Group Stage */}
          {activeTab === 'group' && (
            <div>
              <div className={styles.stageHeader}>
              <h2 className={styles.sectionTitle}>🔄 Vòng bảng</h2>
              {tournament.current_stage === 'group' && (
                <span className={styles.currentStageBadge}>Đang diễn ra</span>
              )}
            </div>
            {Object.keys(groups).filter(g => Number(g) > 0).map(g => {
              const groupNum = Number(g);
              const groupPlayers = groups[groupNum] || [];
              const gMatches = groupMatches.filter((m: any) => m.group_number === groupNum);
              return (
                <div key={groupNum} className={styles.groupSection}>
                  <h3 className={styles.groupTitle}>Bảng {String.fromCharCode(64 + groupNum)}</h3>
                  <StandingsTable participants={groupPlayers} matches={gMatches} matchMode={tournament.match_mode} advanceCount={tournament.advance_per_group} />
                  <div className={styles.groupMatchesPreview}>
                    {renderRoundMatches(gMatches)}
                  </div>
                </div>
              );
            })}
            
            {/* Advance button */}
            {tournament.current_stage === 'group' && canManage && (
              <div className={styles.advanceSection}>
                <Button 
                  onClick={() => setIsAdvanceModalOpen(true)} 
                  disabled={isAdvancing || !isGroupStageComplete}
                >
                  <ArrowRightCircle size={18} />
                  {isAdvancing ? 'Đang xử lý...' : `Chuyển sang Vòng Knockout (Top ${tournament.advance_per_group}/bảng)`}
                </Button>
                {!isGroupStageComplete && (
                  <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    *Cần hoàn tất tất cả các trận Vòng bảng để đi tiếp
                  </p>
                )}
              </div>
            )}
          </div>
          )}

          {/* Knockout Stage */}
          {activeTab === 'knockout' && knockoutMatches.length > 0 && (
            <div>
              <div className={styles.stageHeader}>
                <h2 className={styles.sectionTitle}>🏆 Vòng loại trực tiếp</h2>
                {tournament.current_stage === 'knockout' && (
                  <span className={styles.currentStageBadge}>Đang diễn ra</span>
                )}
              </div>
              <Bracket 
                matches={knockoutMatches} 
                tournamentId={id} 
                canEdit={canManage && tournament.status !== 'draft'} 
                sessionUserId={session?.id}
                onMatchClick={(m: any) => setEditingMatch(m)} 
              />
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className={styles.pageWrapper}>
      <Navbar session={session} />
      
      <main className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <button onClick={() => router.back()} className={styles.backBtn}>
              <ArrowLeft size={18} /> Quay lại
            </button>
            <div className={styles.titleInfo}>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>{tournament?.name || 'Đang tải...'}</h1>
                <div className={`${styles.statusBadge} ${styles[(tournament?.status || 'draft') + 'Badge']}`}>
                  {tournament?.status === 'draft' ? 'BẢN NHÁP' : 
                   tournament?.status === 'active' ? 'ĐANG DIỄN RA' : 'ĐÃ HOÀN THÀNH'}
                </div>
              </div>
              <p className={styles.meta}>
                <Calendar size={14} /> Tạo ngày {tournament && formatDate(tournament.created_at)} • 
                <Medal size={14} /> {getTypeLabel(tournament?.type)} •
                {tournament?.match_mode === 'doubles' ? ' 🏸🏸 Đôi (2v2)' : ' 🏸 Đơn (1v1)'} •
                <strong> BO {tournament?.best_of || 1}</strong>
              </p>
            </div>
          </div>

          {canManage && (
            <div className={styles.adminActions}>
              {tournament?.status === 'draft' && (
                <Link href={`/tournaments/${id}/edit`} className={styles.editBtn}>
                  <Pencil size={18} /> Sửa Bản Nháp
                </Link>
              )}
              <button 
                onClick={() => setIsDeleteModalOpen(true)} 
                className={styles.deleteBtn}
                title={tournament?.status === 'completed' ? "Admin có quyền xóa giải đã kết thúc" : "Xóa giải đấu"}
              >
                <Trash2 size={18} /> Xóa Giải Đấu
              </button>
            </div>
          )}
        </div>

        <div className={styles.layout}>
          <div className={styles.mainArea}>
            {/* Winner Section */}
            {tournament?.status === 'completed' && (
              <section className={styles.winnerSection}>
                {/* Physical Confetti for excitement */}
                <Confetti
                  width={width}
                  height={height}
                  recycle={false}
                  numberOfPieces={500}
                  gravity={0.15}
                  colors={['#fbbf24', '#f59e0b', '#fff', '#ffffff']}
                />
                
                <div className={styles.winnerCard}>
                  <div className={styles.confetti}>🎉</div>
                  <div className={styles.confetti} style={{ left: 'unset', right: '20px' }}>🌟</div>
                  <div className={styles.confetti} style={{ top: 'unset', bottom: '10px', left: '40px' }}>🎊</div>
                  <div className={styles.confetti} style={{ top: 'unset', bottom: '10px', right: '40px' }}>🏸</div>
                  
                  <h2 className={styles.winnerTitle}>🏆 NHÀ VÔ ĐỊCH 🏅</h2>
                  <div className={styles.winnerInfo}>
                    {(() => {
                      const relevantMatches = tournament.type === 'custom' ? knockoutMatches : matches;
                      const maxRound = relevantMatches.length > 0 ? Math.max(...relevantMatches.map((x: any) => x.round_number)) : 0;
                      const finalMatch = relevantMatches.find((m: any) => 
                        m.round_number === maxRound &&
                        (m.team_a_score > 0 || m.team_b_score > 0)
                      );
                      
                      const winningTeam = finalMatch?.team_a_score > finalMatch?.team_b_score ? finalMatch?.team_a : finalMatch?.team_b;
                      
                      if (winningTeam && winningTeam.length > 0) {
                        return (
                          <div className={styles.winningTeam}>
                            {winningTeam.map((p: any) => (
                              <div key={p.id} className={styles.winnerProfile}>
                                <div className={styles.champAvatarWrap}>
                                  <Avatar src={p.avatar_url} alt={p.name} size="xl" />
                                  <Trophy className={styles.champTrophy} />
                                </div>
                                <div className={styles.winnerLabel}>{p.name}</div>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      
                      const winnerUser = participants.find((p: any) => p.user_id === tournament.winner_id)?.user;
                      if (winnerUser) {
                        return (
                          <div className={styles.winnerProfile}>
                            <div className={styles.champAvatarWrap}>
                              <Avatar src={winnerUser.avatar_url} alt={winnerUser.name} size="xl" />
                              <Trophy className={styles.champTrophy} />
                            </div>
                            <div className={styles.winnerLabel}>{winnerUser.name}</div>
                          </div>
                        );
                      }
                      
                      return <p>Đang xác định...</p>;
                    })()}
                  </div>
                  <div className={styles.winnerMessage}>Chúc mừng tân vương đã chinh phục ngôi vị cao nhất của giải đấu!</div>
                </div>
              </section>
            )}

            {renderMainContent()}
          </div>

          {/* Sidebar */}
          <aside className={styles.sidebar}>
            <Card className={styles.sidebarCard}>
              <h2 className={styles.cardTitle}>Vận động viên ({participants.length})</h2>
              <ul className={styles.participantList}>
                {participants.map((p: any) => (
                  <li key={p.user_id} className={styles.participantItem}>
                    <Avatar src={p.user.avatar_url} alt={p.user.name} size="sm" />
                    <span className={styles.pName}>{p.user.name}</span>
                    <span className={styles.pSeed}>#{p.seed}</span>
                    {p.group_number > 0 && (
                      <span className={styles.pGroup}>Bảng {String.fromCharCode(64 + p.group_number)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Final Standings / Top 3 (Celebratory) */}
            {tournament?.status === 'completed' && (
              <Card className={styles.sidebarCard}>
                <h2 className={styles.cardTitle}>🏅 Bảng vàng danh dự</h2>
                <div className={styles.topThree}>
                  {(() => {
                    // Logic to find top 3 in Elimination:
                    // 1st: Tournament Winner
                    // 2nd: Final Loser
                    // 3rd: Semi-final Losers (tied or pick one)
                    const relevantMatches = tournament?.type === 'custom' ? knockoutMatches : matches;
                    const maxRound = relevantMatches.length > 0 ? Math.max(...relevantMatches.map((x: any) => x.round_number)) : 0;
                    const finalMatch = relevantMatches.find((m: any) => m.round_number === maxRound);
                    
                    const champion = finalMatch?.team_a_score > finalMatch?.team_b_score ? finalMatch?.team_a : finalMatch?.team_b;
                    const runnerUp = finalMatch?.team_a_score > finalMatch?.team_b_score ? finalMatch?.team_b : finalMatch?.team_a;
                    
                    return (
                      <div className={styles.podiumList}>
                        {champion && (
                          <div className={`${styles.podiumItem} ${styles.gold}`}>
                            <Medal size={20} />
                            <span className={styles.podiumName}>{champion.map((p: any) => p.name).join(' & ')}</span>
                            <span className={styles.podiumRank}>Hạng 1</span>
                          </div>
                        )}
                        {runnerUp && (
                          <div className={`${styles.podiumItem} ${styles.silver}`}>
                            <Medal size={20} />
                            <span className={styles.podiumName}>{runnerUp.map((p: any) => p.name).join(' & ')}</span>
                            <span className={styles.podiumRank}>Hạng 2</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </Card>
            )}

            <Card className={styles.sidebarCard}>
              <h2 className={styles.cardTitle}>Quy tắc & Thông tin</h2>
              <div className={styles.infoContent}>
                <p><strong>Thể thức:</strong> {getTypeLabel(tournament?.type)}</p>
                <p><strong>Cơ chế:</strong> {tournament?.seeding_mode === 'random' ? '🎲 Bốc thăm ngẫu nhiên' : '✋ Sắp xếp thủ công'}</p>
                
                {['elimination', 'custom'].includes(tournament?.type) && (
                  <>
                    <p><strong>Số VĐV:</strong> {participants.length}</p>
                    {(() => {
                      const isDoubles = tournament?.match_mode === 'doubles';
                      const entityCount = isDoubles ? Math.ceil(participants.length / 2) : participants.length;
                      const rounds = Math.ceil(Math.log2(entityCount)) || 1;
                      const totalSlots = Math.pow(2, rounds);
                      const byesCount = totalSlots - entityCount;
                      return (
                        <>
                          <p><strong>Nhánh đấu:</strong> {totalSlots} vị trí</p>
                          {byesCount > 0 && (
                            <p style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
                              <strong>Đặc cách (BYE):</strong> {byesCount} suất
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}

                <p><strong>Trận đấu:</strong> {tournament?.match_mode === 'doubles' ? 'Đôi (2v2)' : 'Đơn (1v1)'}</p>
                <p><strong>Định dạng:</strong> BO {tournament?.best_of} (Chung kết BO {tournament?.format_config?.final_bo || tournament?.best_of})</p>
                
                <p><strong>Người tạo:</strong> {tournament?.created_by_user?.name}</p>

                {tournament?.type === 'custom' && (
                  <>
                    <p><strong>Số bảng:</strong> {tournament.group_count}</p>
                    <p><strong>Đi tiếp/bảng:</strong> {tournament.advance_per_group}</p>
                    <p><strong>Giai đoạn:</strong> {tournament.current_stage === 'group' ? 'Vòng bảng' : 'Loại trực tiếp'}</p>
                  </>
                )}
                
                {tournament?.description && (
                  <div className={styles.descBox}>
                    <strong>Lưu ý:</strong>
                    <p>{tournament.description}</p>
                  </div>
                )}
              </div>
            </Card>
          </aside>
        </div>
      </main>

      <ConfirmModal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        onConfirm={handleGenerateBracket}
        title="Bắt đầu Giải đấu"
        message="Hệ thống sẽ tạo sơ đồ thi đấu dựa trên danh sách vận động viên. Bạn sẽ không thể thay đổi người tham gia sau thao tác này."
        confirmLabel="Tạo & Bắt đầu"
      />

      <ConfirmModal
        isOpen={isAdvanceModalOpen}
        onClose={() => setIsAdvanceModalOpen(false)}
        onConfirm={handleAdvanceToKnockout}
        title="Chuyển sang Vòng Loại"
        message="Hành động này sẽ kết thúc vòng bảng, tính toán điểm số và chọn các đội đứng đầu để vào vòng KO. Bạn chắc chứ?"
        confirmLabel="Tiến tới Knockout"
        isDanger={true}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteTournament}
        title="Xóa Giải đấu"
        isDanger={true}
        message="BẠN CÓ CHẮC CHẮN? Toàn bộ trận đấu, tỉ số và dữ liệu giải đấu sẽ biến mất vĩnh viễn khỏi hệ thống."
        confirmLabel="Xóa vĩnh viễn"
      />

      {editingMatch && (
        <InlineScoreModal
          match={editingMatch}
          tournament={tournament}
          isOpen={true}
          onClose={() => setEditingMatch(null)}
          onSuccess={() => { mutate(); }}
        />
      )}
    </div>
  );
}
