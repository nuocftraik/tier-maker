"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { Trophy, ArrowLeft, Check, Users, Shuffle, GripVertical, Save, AlertCircle, Medal, Flag, Info, Settings } from 'lucide-react';
import styles from '../../new/NewTournament.module.css'; // Reuse styles
import { Navbar } from '@/components/layout/Navbar';
import { BracketSeeder } from '@/components/tournament/BracketSeeder';
import { GroupSeeder } from '@/components/tournament/GroupSeeder';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function EditTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  
  const { data: sessionData } = useSWR('/api/auth/session', fetcher);
  const session = sessionData?.session;

  const { data: usersData } = useSWR('/api/users', fetcher);
  const users = usersData || [];

  const { data: tourneyData, isLoading: tourneyLoading } = useSWR(`/api/tournaments/${id}`, fetcher);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'elimination',
    match_mode: 'singles',
    seeding_mode: 'random',
    group_count: 2,
    advance_per_group: 1,
    best_of: 3,
    final_bo: 3,
    group_bo: 1
  });
  
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [manualGroups, setManualGroups] = useState<{ userId: string, group: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [hasShuffled, setHasShuffled] = useState(true); // Default true for edit since data exists, but we can set false if we want the reveal effect every time. 
  // Let's set false if they haven't touched it in this session.
  const [hasRevealedInEdit, setHasRevealedInEdit] = useState(false);

  useEffect(() => {
    if (tourneyData?.tournament) {
      const t = tourneyData.tournament;
      if (t.status !== 'draft') {
        alert('Chỉ có thể sửa giải đấu khi đang ở trạng thái Nháp!');
        router.push(`/tournaments/${id}`);
        return;
      }
      setFormData({
        name: t.name,
        description: t.description || '',
        type: t.type,
        match_mode: t.match_mode,
        seeding_mode: t.seeding_mode,
        group_count: t.group_count || 2,
        advance_per_group: t.advance_per_group || 1,
        best_of: t.best_of || (t.format_config?.knockout_bo) || 3,
        final_bo: t.format_config?.final_bo || (t.best_of) || 3,
        group_bo: t.format_config?.group_bo || 1
      });
      // Participant IDs
      const pIds = (tourneyData.participants || []).map((p: any) => p.user_id);
      setSelectedParticipants(pIds);
    }
  }, [tourneyData, id, router]);

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const shuffleParticipants = () => {
    setSelectedParticipants(prev => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
  };

  const handleShuffle = () => {
    setIsShaking(true);
    shuffleParticipants();
    setTimeout(() => {
      setIsShaking(false);
      setHasRevealedInEdit(true);
    }, 500);
  };

  const moveParticipant = (fromIndex: number, toIndex: number) => {
    setSelectedParticipants(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return arr;
    });
  };

  const getUserById = (userId: string) => users.find((u: any) => u.id === userId);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedParticipants.length < 2) {
      alert('Cần ít nhất 2 người chơi');
      return;
    }

    if (formData.match_mode === 'doubles' && selectedParticipants.length % 2 !== 0) {
      alert('Số lượng vận động viên phải là số chẵn cho chế độ thi đấu Đôi (2 vs 2)');
      return;
    }

    setIsSubmitting(true);
    try {
      let participantsPayload: any;
      if (formData.seeding_mode === 'manual') {
        if (formData.type === 'custom' && manualGroups.length > 0) {
          participantsPayload = manualGroups.map((item, index) => ({
            userId: item.userId,
            seed: index + 1,
            group_number: item.group
          }));
        } else {
          participantsPayload = selectedParticipants.map((userId, index) => ({
            userId,
            seed: index + 1,
            group_number: (formData.type === 'custom') ? (index % formData.group_count) + 1 : 0
          }));
        }
      } else {
        participantsPayload = selectedParticipants;
      }

      const res = await fetch(`/api/tournaments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          participants: participantsPayload,
          format_config: {
            knockout_bo: formData.best_of,
            final_bo: formData.final_bo,
            group_bo: formData.group_bo
          }
        })
      });
      
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Lỗi cập nhật giải đấu');
      
      router.push(`/tournaments/${id}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canEdit = session?.isAdmin || (session && tourneyData?.tournament && session.id === tourneyData.tournament.created_by);

  if (tourneyLoading) return <div className="p-8 text-center">Đang tải...</div>;
  if (!canEdit) {
    return <div className="p-8 text-center">Bạn không có quyền truy cập</div>;
  }

  return (
    <div className={styles.pageWrapper}>
      <Navbar session={session} />
      <main className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            <ArrowLeft size={20} /> Quay lại
          </button>
          <h1 className={styles.title}>Chỉnh sửa Giải đấu (Bản nháp)</h1>
        </div>

        <form onSubmit={handleUpdate} className={styles.formGrid}>
          <div className={styles.sidebar}>
            <Card className={styles.formCard}>
              <h2 className={styles.cardTitle}>Thông tin giải đấu</h2>
              <div className={styles.fields}>
                <Input 
                  label="Tên giải đấu" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
                
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Thể thức</label>
                  <select 
                    className={styles.select}
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="elimination">Loại trực tiếp</option>
                    <option value="round_robin">Vòng tròn</option>
                    <option value="custom">Vòng bảng → Loại</option>
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Chế độ</label>
                  <select 
                    className={styles.select}
                    value={formData.match_mode}
                    onChange={e => setFormData({...formData, match_mode: e.target.value})}
                  >
                    <option value="singles">🏸 Đơn (1v1)</option>
                    <option value="doubles">🏸🏸 Đôi (2v2)</option>
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Phương thức Phân hạt giống (Seeding)</label>
                  <div className={styles.radioGroup}>
                    <label className={`${styles.radioCard} ${formData.seeding_mode === 'random' ? styles.radioActive : ''}`}>
                      <input type="radio" name="seeding_mode" value="random" checked={formData.seeding_mode === 'random'} onChange={() => setFormData({ ...formData, seeding_mode: 'random' })} />
                      <span className={styles.radioEmoji}>🎲</span>
                      <div className={styles.radioText}>
                        <span className={styles.radioTitle}>Auto / Ngẫu nhiên</span>
                        <span className={styles.radioDesc}>Hệ thống tự bốc thăm vị trí và suất đặc cách</span>
                      </div>
                    </label>
                    <label className={`${styles.radioCard} ${formData.seeding_mode === 'manual' ? styles.radioActive : ''}`}>
                      <input type="radio" name="seeding_mode" value="manual" checked={formData.seeding_mode === 'manual'} onChange={() => { setFormData({ ...formData, seeding_mode: 'manual' }); setHasRevealedInEdit(false); }} />
                      <span className={styles.radioEmoji}>✋</span>
                      <div className={styles.radioText}>
                        <span className={styles.radioTitle}>Tôi muốn tự sắp xếp</span>
                        <span className={styles.radioDesc}>Kéo thả người chơi vào từng cặp đấu cụ thể</span>
                      </div>
                    </label>
                  </div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginTop: '1rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Settings size={16} /> Tùy chỉnh Best-Of (BO)
                    </h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                      {['custom', 'round_robin'].includes(formData.type) && (
                        <div className={styles.fieldGroup}>
                          <label className={styles.label}>{formData.type === 'custom' ? 'BO Vòng Bảng' : 'BO Lượt trận'}</label>
                          <select className={styles.select} value={formData.group_bo} onChange={e => setFormData({ ...formData, group_bo: +e.target.value })}>
                            <option value={1}>BO1</option>
                            <option value={3}>BO3</option>
                            <option value={5}>BO5</option>
                          </select>
                        </div>
                      )}

                      {['elimination', 'custom'].includes(formData.type) && (
                        <>
                          <div className={styles.fieldGroup}>
                            <label className={styles.label}>BO Knockout</label>
                            <select className={styles.select} value={formData.best_of} onChange={e => setFormData({ ...formData, best_of: +e.target.value })}>
                              <option value={1}>BO1</option>
                              <option value={3}>BO3</option>
                              <option value={5}>BO5</option>
                            </select>
                          </div>
                          <div className={styles.fieldGroup}>
                            <label className={styles.label}>BO Chung Kết</label>
                            <select className={styles.select} value={formData.final_bo} onChange={e => setFormData({ ...formData, final_bo: +e.target.value })}>
                              <option value={1}>BO1</option>
                              <option value={3}>BO3</option>
                              <option value={5}>BO5</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>

                    {formData.type === 'custom' && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)' }}>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <div className={styles.fieldGroup} style={{ flex: 1 }}>
                            <label className={styles.label}>Số bảng</label>
                            <input type="number" className={styles.select} value={formData.group_count} onChange={e => setFormData({ ...formData, group_count: +e.target.value })} />
                          </div>
                          <div className={styles.fieldGroup} style={{ flex: 1 }}>
                            <label className={styles.label}>Đi tiếp</label>
                            <input type="number" className={styles.select} value={formData.advance_per_group} onChange={e => setFormData({ ...formData, advance_per_group: +e.target.value })} />
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {/* Enhanced Rule Summary */}
              <div style={{ marginTop: '1rem', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--primary-color)', background: 'rgba(56, 189, 248, 0.05)' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-color)' }}>
                  <Flag size={14} /> Quy trình vận hành & Đặc cách
                </h3>
                
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: 0, listStyle: 'none', fontSize: '0.85rem' }}>
                  <li style={{ display: 'flex', gap: '0.5rem' }}>
                    <Check size={14} style={{ color: 'var(--success-color)', flexShrink: 0, marginTop: 2 }} />
                    <span><b>Phân hạt giống:</b> Thứ tự trong danh sách quyết định cặp đấu. Chọn "Ngẫu nhiên" để trộn đều công bằng.</span>
                  </li>
                  
                  {['elimination', 'custom'].includes(formData.type) && (
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <Check size={14} style={{ color: 'var(--success-color)', flexShrink: 0, marginTop: 2 }} />
                      <span><b>BYE Engine:</b> Tự động bù Đặc cách rải đều để đủ sơ đồ (VD: {selectedParticipants.length} đội bù lên nhánh gần nhất).</span>
                    </li>
                  )}

                  {formData.type === 'round_robin' && (
                    <li style={{ display: 'flex', gap: '0.5rem' }}>
                      <Check size={14} style={{ color: 'var(--success-color)', flexShrink: 0, marginTop: 2 }} />
                      <span><b>Luật xếp hạng:</b> Thắng 3đ, Hòa 1đ. Xét H2H {'>'} Hiệu số Set {'>'} Tổng điểm nếu bằng điểm.</span>
                    </li>
                  )}

                  <li style={{ display: 'flex', gap: '0.5rem' }}>
                    <Check size={14} style={{ color: 'var(--success-color)', flexShrink: 0, marginTop: 2 }} />
                    <span><b>Trận đấu:</b> Định dạng BO{formData.best_of} {formData.final_bo !== formData.best_of && `(Chung kết BO${formData.final_bo})`}.</span>
                  </li>

                  <li style={{ display: 'flex', gap: '0.5rem' }}>
                    <Check size={14} style={{ color: 'var(--success-color)', flexShrink: 0, marginTop: 2 }} />
                    <span><b>Sự cố:</b> VĐV vắng mặt tính thua cuộc (Walkover) để giải đấu tiếp tục diễn ra.</span>
                  </li>
                </ul>
              </div>

              {formData.seeding_mode === 'manual' && (
                <p style={{ marginTop: '0.75rem', color: 'var(--primary-color)', fontSize: '0.75rem', textAlign: 'center', background: 'rgba(56, 189, 248, 0.1)', padding: '0.4rem', borderRadius: '8px' }}>
                  💡 <b>Mẹo:</b> Các vị trí đầu danh sách sẽ nhận suất Đặc cách (BYE).
                </p>
              )}
            </Card>
            
            <Button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
              <Save size={18} />
              {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>

          <div className={styles.mainContent}>
             {/* Player Selection Grid */}
             <Card className={styles.participantCard}>
              <div className={styles.participantHeader}>
                <h2 className={styles.cardTitle}>Danh sách VĐV ({selectedParticipants.length})</h2>
              </div>
              <div className={styles.userGrid}>
                {users.map((user: any) => {
                  const isSelected = selectedParticipants.includes(user.id);
                  return (
                    <div 
                      key={user.id} 
                      className={`${styles.userItem} ${isSelected ? styles.selected : ''}`}
                      onClick={() => toggleParticipant(user.id)}
                    >
                      <div className={styles.avatarWrapper}>
                        <Avatar src={user.avatar_url} alt={user.name} size="md" />
                        {isSelected && <div className={styles.checkOverlay}><Check size={16} /></div>}
                      </div>
                      <span className={styles.userName}>{user.name}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {formData.seeding_mode === 'random' && selectedParticipants.length >= 2 && (
              <Card className={styles.participantCard} style={{ marginTop: '1.5rem' }}>
                <div className={styles.participantHeader}>
                  <h2 className={styles.cardTitle}>🎲 Kết quả Bốc thăm Dự kiến</h2>
                  <Button type="button" variant="outline" size="sm" onClick={handleShuffle} disabled={isShaking}>
                    <Shuffle size={14} style={{ marginRight: 6 }} className={isShaking ? styles.spinning : ''} /> 
                    {isShaking ? 'Đang quay...' : (hasRevealedInEdit ? 'Bốc thăm lại' : 'Bắt đầu bốc thăm')}
                  </Button>
                </div>

                {!hasRevealedInEdit ? (
                  <div className={styles.emptyShuffleState}>
                    <Shuffle size={48} className={styles.emptyShuffleIcon} />
                    <p>Nhấn bốc thăm để cập nhật lại danh sách thi đấu dự kiến theo các thay đổi mới.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ padding: '0.4rem 0.75rem', marginBottom: '0.75rem', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #10b981', display: isShaking ? 'none' : 'flex', alignItems: 'center', gap: '0.5rem', color: '#047857', fontSize: '0.8rem', fontWeight: 600 }}>
                      <Trophy size={14} /> Chúc mừng các VĐV/Đội đã nhận suất Đặc cách (BYE)!
                    </div>
                    <div className={styles.seedList}>
                      {(() => {
                        const players = selectedParticipants.map(uid => getUserById(uid)).filter(Boolean) as any[];
                        const isDoubles = formData.match_mode === 'doubles';
                        const effectiveEntities = isDoubles ? Math.ceil(players.length / 2) : players.length;
                        const knockoutEntities = formData.type === 'custom' ? (formData.group_count * formData.advance_per_group) : effectiveEntities;
                        
                        const rounds = Math.ceil(Math.log2(knockoutEntities)) || 1;
                        const totalSlots = Math.pow(2, rounds);
                        const byesCount = totalSlots - knockoutEntities;

                        if (isDoubles) {
                          const teams: any[][] = [];
                          for (let i = 0; i < players.length; i += 2) {
                            const team = [players[i]];
                            if (i + 1 < players.length) team.push(players[i+1]);
                            teams.push(team);
                          }
                          return teams.map((team, idx) => {
                            const isBye = idx < byesCount && (formData.type === 'elimination' || formData.type === 'custom');
                            return (
                              <div key={idx} className={`${styles.seedItem} ${isBye ? styles.byeReveal : ''}`} style={{ cursor: 'default' }}>
                                <span className={styles.seedNumber}>{idx + 1}</span>
                                <div className={styles.seedName} style={{ display: 'flex', gap: '0.5rem' }}>
                                  {team.map(p => p.name).join(' & ')}
                                </div>
                                {isBye && <span className={styles.groupTag} style={{ background: 'var(--success-color)', color: 'white' }}>✨ Đặc cách (BYE)</span>}
                              </div>
                            );
                          });
                        }

                        return players.map((player, idx) => {
                          const isBye = idx < byesCount && (formData.type === 'elimination' || formData.type === 'custom');
                          return (
                            <div key={player.id} className={`${styles.seedItem} ${isBye ? styles.byeReveal : ''}`} style={{ cursor: 'default' }}>
                              <span className={styles.seedNumber}>{idx + 1}</span>
                              <span className={styles.seedName}>{player.name}</span>
                              {isBye && <span className={styles.groupTag} style={{ background: 'var(--success-color)', color: 'white' }}>✨ Đặc cách (BYE)</span>}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </>
                )}
              </Card>
            )}

            {/* Seeder Preview */}
            {formData.seeding_mode === 'manual' && selectedParticipants.length >= 2 && (
              <Card className={styles.participantCard}>
                {formData.type === 'custom' ? (
                  <GroupSeeder 
                    players={selectedParticipants.map(uid => getUserById(uid)).filter(Boolean) as any[]}
                    groupCount={formData.group_count}
                    onSeedingChange={setManualGroups}
                  />
                ) : (
                  <BracketSeeder 
                    players={selectedParticipants.map(uid => getUserById(uid)).filter(Boolean) as any[]}
                    matchMode={formData.match_mode as any}
                    type={formData.type as any}
                    onSeedingChange={setSelectedParticipants}
                  />
                )}
              </Card>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
