"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { Trophy, ArrowLeft, Check, Users, Info, Flag, ChevronRight, ChevronLeft, ArrowRight, Settings, Shuffle } from 'lucide-react';
import styles from './NewTournament.module.css';
import { Navbar } from '@/components/layout/Navbar';
import { BracketSeeder } from '@/components/tournament/BracketSeeder';
import { GroupSeeder } from '@/components/tournament/GroupSeeder';
import { ConfirmModal } from '@/components/common/ConfirmModal';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function NewTournamentPage() {
  const router = useRouter();
  const { data: sessionData } = useSWR('/api/auth/session', fetcher);
  const session = sessionData?.session;

  const { data: usersData } = useSWR('/api/users', fetcher);
  const users = usersData || [];

  const [step, setStep] = useState(1);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [manualGroups, setManualGroups] = useState<{ userId: string, group: number }[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'elimination',
    match_mode: 'singles',
    seeding_mode: 'random',
    group_count: 2,
    advance_per_group: 1,
    best_of: 3, // knockout BO
    final_bo: 5,
    group_bo: 1
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [hasShuffled, setHasShuffled] = useState(false);

  // Derived Values
  const entityCount = formData.match_mode === 'doubles' ? Math.ceil(selectedParticipants.length / 2) : selectedParticipants.length;
  const effectiveKnockoutEntities = formData.type === 'custom' ? (formData.group_count * formData.advance_per_group) : entityCount;
  const rounds = Math.max(1, Math.ceil(Math.log2(effectiveKnockoutEntities || 1)));
  const totalSlots = Math.pow(2, rounds);
  const byesCount = Math.max(0, totalSlots - effectiveKnockoutEntities);

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
      setHasShuffled(true);
    }, 500);
  };

  const getUserById = (id: string) => users.find((u: any) => u.id === id);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'elimination': return 'Loại trực tiếp';
      case 'round_robin': return 'Vòng tròn';
      case 'custom': return 'Custom (Bảng→Loại)';
      default: return type;
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (selectedParticipants.length < 2) {
        alert('Cần ít nhất 2 người chơi để tạo giải đấu');
        return;
      }
      if (formData.match_mode === 'doubles' && selectedParticipants.length % 2 !== 0) {
        alert('Số lượng VĐV phải là số chẵn cho Thể thức Cặp (Đôi)');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.name.trim()) {
        alert('Vui lòng nhập tên giải đấu');
        return;
      }
      if (formData.type === 'custom') {
        const gc = Number(formData.group_count) || 2;
        const ag = Number(formData.advance_per_group) || 1;
        if (gc * ag < 2) {
          alert('Cần ít nhất 2 người vào vòng loại trực tiếp.');
          return;
        }
        // Normalize empty inputs
        setFormData(prev => ({ ...prev, group_count: gc, advance_per_group: ag }));
      }
      setStep(3);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const confirmSubmit = async () => {
    setIsSubmitting(true);
    setShowConfirmModal(false);
    try {
      let participantsPayload: any;

      if (formData.seeding_mode === 'manual') {
        if (formData.type === 'custom' && manualGroups.length > 0) {
          participantsPayload = manualGroups.map((item, index) => ({
            userId: item.userId,
            seed: index + 1,
            group_number: item.group
          }));
        } else if (formData.type === 'custom') {
          participantsPayload = selectedParticipants.map((userId, index) => ({
            userId,
            seed: index + 1,
            group_number: (index % formData.group_count) + 1
          }));
        } else {
          participantsPayload = selectedParticipants.map((userId, index) => ({
            userId,
            seed: index + 1,
            group_number: 0
          }));
        }
      } else {
        participantsPayload = selectedParticipants;
      }

      const format_config = {
        knockout_bo: formData.best_of,
        final_bo: formData.final_bo,
        group_bo: formData.group_bo
      };

      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          participants: participantsPayload,
          format_config
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi tạo giải đấu');

      router.push(`/tournaments/${data.tournamentId}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionData && !session) {
    return (
      <div className={styles.unauthorized}>
        <Info size={48} />
        <h1>Đăng nhập để tiếp tục</h1>
        <p>Thao tác này yêu cầu tài khoản người dùng.</p>
        <Button onClick={() => router.push('/login')}>Đăng nhập</Button>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <Navbar session={session} />

      <main className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            <ArrowLeft size={20} /> Quay lại
          </button>
          <h1 className={styles.title}>Thiết lập Giải đấu Mới</h1>
        </div>

        <form onSubmit={handleCreate} className={styles.formGrid}>
          {/* SIDEBAR WIZARD PROGRESS */}
          <div className={styles.sidebar}>
            <Card className={styles.formCard}>
              <h2 className={styles.cardTitle}>Tiến trình</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <div style={{
                  fontWeight: step === 1 ? '600' : 'normal',
                  color: step === 1 ? 'var(--primary-color)' : 'var(--text-color)',
                  opacity: step < 1 ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                  <div style={{ background: step >= 1 ? 'var(--primary-color)' : 'var(--bg-secondary)', color: step >= 1 ? '#fff' : 'var(--text-muted)', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>1</div>
                  Chọn VĐV ({selectedParticipants.length})
                </div>
                <div style={{
                  fontWeight: step === 2 ? '600' : 'normal',
                  color: step === 2 ? 'var(--primary-color)' : 'var(--text-color)',
                  opacity: step < 2 ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                  <div style={{ background: step >= 2 ? 'var(--primary-color)' : 'var(--bg-secondary)', color: step >= 2 ? '#fff' : 'var(--text-muted)', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>2</div>
                  Thể thức & Luật
                </div>
                <div style={{
                  fontWeight: step === 3 ? '600' : 'normal',
                  color: step === 3 ? 'var(--primary-color)' : 'var(--text-color)',
                  opacity: step < 3 ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                  <div style={{ background: step >= 3 ? 'var(--primary-color)' : 'var(--bg-secondary)', color: step >= 3 ? '#fff' : 'var(--text-muted)', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>3</div>
                  Phân Cặp & Xác nhận
                </div>
              </div>
            </Card>

            {step === 3 && (
              <Card className={styles.summaryCard}>
                <h2 className={styles.cardTitle}>Tóm tắt</h2>
                <div className={styles.summaryStats}>
                  <div className={styles.stat}>
                    <Users size={18} />
                    <span>{selectedParticipants.length} Vận động viên</span>
                  </div>
                  <div className={styles.stat}>
                    <Trophy size={18} />
                    <span>{getTypeLabel(formData.type)}</span>
                  </div>
                  <div className={styles.stat}>
                    <span>{formData.match_mode === 'singles' ? '🏸 Đơn (1v1)' : '🏸🏸 Đôi (2v2)'}</span>
                  </div>
                  <div className={styles.stat}>
                    <span>{formData.seeding_mode === 'random' ? '🎲 Phân cặp ngẫu nhiên' : '✋ Tự phân cặp/chọn BYE'}</span>
                  </div>
                </div>
                <Button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={isSubmitting || selectedParticipants.length < 2 || (formData.seeding_mode === 'random' && !hasShuffled)}
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  {isSubmitting ? 'Đang khởi tạo...' : (formData.seeding_mode === 'random' && !hasShuffled ? 'Hãy bốc thăm trước' : 'Hoàn Tất & Bắt Đầu Nháp')}
                </Button>
              </Card>
            )}
          </div>

          {/* MAIN CONTENT AREA */}
          <div className={styles.mainContent}>

            {/* STEP 1: PARTICIPANTS */}
            {step === 1 && (
              <Card className={styles.participantCard}>
                <div className={styles.participantHeader}>
                  <h2 className={styles.cardTitle}>Chọn Vận động viên tham gia ({selectedParticipants.length})</h2>
                  <div className={styles.selectionActions}>
                    <button type="button" onClick={() => setSelectedParticipants(users.map((u: any) => u.id))} className={styles.textBtn} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer' }}>Chọn tất cả</button>
                    <span style={{ color: 'var(--border-color)' }}>|</span>
                    <button type="button" onClick={() => setSelectedParticipants([])} className={styles.textBtn} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Bỏ chọn</button>
                  </div>
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
            )}

            {/* STEP 2: FORMAT & RULES */}
            {step === 2 && (
              <Card className={styles.formCard}>
                <h2 className={styles.cardTitle}>Thiết lập Luật chơi</h2>
                <div className={styles.fields}>
                  <Input
                    label="Tên giải đấu"
                    placeholder="VD: INRES Spring Championship 2026"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />

                  {/* TOURNAMENT TYPE */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Cấu trúc hệ giải đấu</label>
                    <div className={styles.radioGroup}>
                      <label className={`${styles.radioCard} ${formData.type === 'elimination' ? styles.radioActive : ''}`}>
                        <input type="radio" name="type" value="elimination" checked={formData.type === 'elimination'} onChange={() => setFormData({ ...formData, type: 'elimination' })} />
                        <span className={styles.radioEmoji}>🏆</span>
                        <span className={styles.radioTitle}>Loại trực tiếp</span>
                      </label>
                      <label className={`${styles.radioCard} ${formData.type === 'round_robin' ? styles.radioActive : ''}`}>
                        <input type="radio" name="type" value="round_robin" checked={formData.type === 'round_robin'} onChange={() => setFormData({ ...formData, type: 'round_robin' })} />
                        <span className={styles.radioEmoji}>🔄</span>
                        <span className={styles.radioTitle}>Chỉ đánh Vòng Tròn</span>
                      </label>
                      <label className={`${styles.radioCard} ${formData.type === 'custom' ? styles.radioActive : ''}`}>
                        <input type="radio" name="type" value="custom" checked={formData.type === 'custom'} onChange={() => setFormData({ ...formData, type: 'custom' })} />
                        <span className={styles.radioEmoji}>⚡</span>
                        <span className={styles.radioTitle}>Vòng bảng → Knockout</span>
                      </label>

                    </div>
                  </div>

                  {/* MATCH MODE */}
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div className={styles.fieldGroup} style={{ flex: 1 }}>
                      <label className={styles.label}>Chế độ thi đấu</label>
                      <select className={styles.select} value={formData.match_mode} onChange={e => setFormData({ ...formData, match_mode: e.target.value })}>
                        <option value="singles">🏸 Đơn (1 vs 1)</option>
                        <option value="doubles">🏸🏸 Đôi (2 vs 2)</option>
                      </select>
                    </div>
                  </div>

                  {/* RULE CUSTOMIZATION */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginTop: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Settings size={18} /> Tùy chỉnh Best-Of (BO) cho từng loại vòng đấu
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      {['custom', 'round_robin'].includes(formData.type) && (
                        <div className={styles.fieldGroup}>
                          <label className={styles.label}>{formData.type === 'custom' ? 'Các trận Vòng Bảng' : 'Các trận đấu'}</label>
                          <select className={styles.select} value={formData.group_bo} onChange={e => setFormData({ ...formData, group_bo: +e.target.value })}>
                            <option value={1}>BO1 (1 ván)</option>
                            <option value={3}>BO3 (3 thắng 2)</option>
                            <option value={5}>BO5 (5 thắng 3)</option>
                          </select>
                        </div>
                      )}

                      {['elimination', 'custom'].includes(formData.type) && (
                        <div className={styles.fieldGroup}>
                          <label className={styles.label}>Các trận Knockout</label>
                          <select className={styles.select} value={formData.best_of} onChange={e => setFormData({ ...formData, best_of: +e.target.value })}>
                            <option value={1}>BO1 (1 ván)</option>
                            <option value={3}>BO3 (3 thắng 2)</option>
                            <option value={5}>BO5 (5 thắng 3)</option>
                          </select>
                        </div>
                      )}

                      {['elimination', 'custom'].includes(formData.type) && (
                        <div className={styles.fieldGroup}>
                          <label className={styles.label}>Trận Chung Kết (Final)</label>
                          <select className={styles.select} value={formData.final_bo} onChange={e => setFormData({ ...formData, final_bo: +e.target.value })}>
                            <option value={1}>BO1 (1 ván)</option>
                            <option value={3}>BO3 (3 thắng 2)</option>
                            <option value={5}>BO5 (5 thắng 3)</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {formData.type === 'custom' && (
                      <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border-color)' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Thiết lập số lượng Bảng đấu</h4>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <div className={styles.fieldGroup} style={{ flex: 1 }}>
                            <label className={styles.label}>Số bảng đấu</label>
                            <input type="number" className={styles.select} min={2} max={8} value={formData.group_count === '' as any ? '' : formData.group_count} onChange={e => setFormData({ ...formData, group_count: e.target.value === '' ? '' as any : parseInt(e.target.value, 10) })} />
                          </div>
                          <div className={styles.fieldGroup} style={{ flex: 1 }}>
                            <label className={styles.label}>Số người đi tiếp / bảng</label>
                            <input type="number" className={styles.select} min={1} max={4} value={formData.advance_per_group === '' as any ? '' : formData.advance_per_group} onChange={e => setFormData({ ...formData, advance_per_group: e.target.value === '' ? '' as any : parseInt(e.target.value, 10) })} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={styles.fieldGroup} style={{ marginTop: '1rem' }}>
                    <label className={styles.label}>Mô tả / Luật chơi mở rộng (tùy chọn)</label>
                    <textarea
                      className={styles.textarea}
                      placeholder="Ghi chú luật đặc biệt, thời gian, giải thưởng..."
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                </div>
              </Card>
            )}

            {/* STEP 3: SEEDING & BYES */}
            {step === 3 && (
              <>
                <Card className={styles.formCard}>
                  <h2 className={styles.cardTitle}>Thiết lập & Quy tắc giải</h2>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Phương thức Phân hạt giống (Seeding)</label>
                    <div className={styles.radioGroup}>
                      <label className={`${styles.radioCard} ${formData.seeding_mode === 'random' ? styles.radioActive : ''}`}>
                        <input type="radio" name="seeding_mode" value="random" checked={formData.seeding_mode === 'random'} onChange={() => { setFormData({ ...formData, seeding_mode: 'random' }); setHasShuffled(false); }} />
                        <span className={styles.radioEmoji}>🎲</span>
                        <div className={styles.radioText}>
                          <span className={styles.radioTitle}>Auto / Ngẫu nhiên</span>
                          <span className={styles.radioDesc}>Hệ thống tự bốc thăm vị trí và suất đặc cách</span>
                        </div>
                      </label>
                      <label className={`${styles.radioCard} ${formData.seeding_mode === 'manual' ? styles.radioActive : ''}`}>
                        <input type="radio" name="seeding_mode" value="manual" checked={formData.seeding_mode === 'manual'} onChange={() => setFormData({ ...formData, seeding_mode: 'manual' })} />
                        <span className={styles.radioEmoji}>✋</span>
                        <div className={styles.radioText}>
                          <span className={styles.radioTitle}>Tôi muốn tự sắp xếp</span>
                          <span className={styles.radioDesc}>Kéo thả người chơi vào từng cặp đấu cụ thể</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Rules Summary Card */}
                  <div style={{ marginTop: '1.5rem', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--primary-color)', background: 'rgba(56, 189, 248, 0.05)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}>
                      <Flag size={18} /> Quy trình vận hành ({getTypeLabel(formData.type)})
                    </h3>
                    
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: 0, listStyle: 'none', fontSize: '0.95rem' }}>
                      <li style={{ display: 'flex', gap: '0.5rem' }}>
                        <Check size={16} style={{ color: 'var(--success-color)', flexShrink: 0, marginTop: 4 }} />
                        <span><b>Cơ chế phân hạt giống:</b> Thứ tự trong danh sách sẽ quyết định vị trí {formData.type === 'custom' ? 'bảng đấu' : 'cặp đấu'}.
                          <ul className={styles.ruleDetailList}>
                            <li className={styles.ruleDetail}>Chọn "Ngẫu nhiên" để hệ thống tự trộn vị trí công bằng.</li>
                            <li className={styles.ruleDetail}>Chọn "Tự sắp xếp" nếu bạn muốn chủ động chọn {formData.type === 'custom' ? 'bảng đấu cho từng người' : 'suất Đặc cách hoặc các cặp đấu cụ thể'}.</li>
                          </ul>
                        </span>
                      </li>

                      {formData.type === 'custom' && (
                        <li style={{ display: 'flex', gap: '0.5rem' }}>
                          <Check size={16} style={{ color: 'var(--success-color)', flexShrink: 0, marginTop: 4 }} />
                          <span>
                            <b>Vòng bảng → Loại trực tiếp:</b>
                            <ul className={styles.ruleDetailList}>
                              <li className={styles.ruleDetail}>VĐV được chia vào {formData.group_count} bảng đấu. Các trận trong bảng đánh BO{formData.group_bo}.</li>
                              <li className={styles.ruleDetail}>Chọn ra {formData.advance_per_group} người đứng đầu mỗi bảng để vào vòng Knockout.</li>
                              <li className={styles.ruleDetail}>Hệ thống ưu tiên rải hạt giống để các đối thủ mạnh không gặp nhau quá sớm ở vòng loại.</li>
                            </ul>
                          </span>
                        </li>
                      )}
                      
                      {['elimination', 'custom'].includes(formData.type) && (
                        <li style={{ display: 'flex', gap: '0.5rem' }}>
                          <Check size={16} style={{ color: 'var(--success-color)', flexShrink: 0, marginTop: 4 }} />
                          <span>
                            <b>Vòng Loại trực tiếp (Knockout):</b>
                            <ul className={styles.ruleDetailList}>
                              <li className={styles.ruleDetail}>Đánh theo sơ đồ {totalSlots} vị trí. Trận Knockout: BO{formData.best_of}, Chung kết: BO{formData.final_bo}.</li>
                              {byesCount > 0 && (
                                <li className={styles.ruleDetail}>
                                  <b>Xử lý Đặc cách (BYE):</b> Với {effectiveKnockoutEntities} đội, hệ thống tự bù {byesCount} suất BYE để cân bằng sơ đồ.
                                </li>
                              )}
                            </ul>
                          </span>
                        </li>
                      )}

                      {formData.type === 'round_robin' && (
                        <li style={{ display: 'flex', gap: '0.5rem' }}>
                          <Check size={16} style={{ color: 'var(--success-color)', flexShrink: 0, marginTop: 4 }} />
                          <span>
                            <b>Luật xếp hạng Vòng tròn:</b>
                            <ul className={styles.ruleDetailList}>
                              <li className={styles.ruleDetail}>Tính điểm: Thắng 3đ, Hòa 1đ (nếu có), Thua 0đ.</li>
                              <li className={styles.ruleDetail}>Khi bằng điểm: Xét kết quả Đối đầu giữa 2 bên, sau đó đến Hiệu số hiệp (Set) và Điểm số.</li>
                            </ul>
                          </span>
                        </li>
                      )}

                      <li style={{ display: 'flex', gap: '0.5rem' }}>
                        <Check size={16} style={{ color: 'var(--success-color)', flexShrink: 0, marginTop: 4 }} />
                        <span><b>Sự cố và Vắng mặt:</b>
                           <ul className={styles.ruleDetailList}>
                              <li className={styles.ruleDetail}>VĐV vắng mặt sẽ được tính thua cuộc (Walkover) để giải đấu tiếp tục diễn ra.</li>
                              <li className={styles.ruleDetail}>Bạn có thể xóa và tạo lại sơ đồ (Regenerate) bất kỳ lúc nào nếu trận đấu đầu tiên chưa bắt đầu.</li>
                           </ul>
                        </span>
                      </li>
                    </ul>
                  </div>
                </Card>

                {/* Random Seed Preview */}
                {formData.seeding_mode === 'random' && (
                  <Card className={styles.participantCard} style={{ marginTop: '1.5rem' }}>
                    <div className={styles.participantHeader}>
                      <h2 className={styles.cardTitle}>🎲 Kết quả Bốc thăm Dự kiến</h2>
                      <Button type="button" variant="outline" size="sm" onClick={handleShuffle} disabled={isShaking}>
                        <Shuffle size={14} style={{ marginRight: 6 }} className={isShaking ? styles.spinning : ''} /> 
                        {isShaking ? 'Đang quay...' : (hasShuffled ? 'Bốc thăm lại' : 'Bắt đầu bốc thăm')}
                      </Button>
                    </div>

                    {!hasShuffled ? (
                      <div className={styles.emptyShuffleState}>
                        <Shuffle size={48} className={styles.emptyShuffleIcon} />
                        <p>Danh sách thi đấu đang được giữ bí mật.</p>
                        <p className={styles.emptyShuffleSub}>Hãy nhấn <b>Bốc thăm</b> để công bố các cặp đấu và suất Đặc cách!</p>
                      </div>
                    ) : (
                      <>
                        <div style={{ padding: '0.5rem', marginBottom: '1rem', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #10b981', display: isShaking ? 'none' : 'flex', alignItems: 'center', gap: '0.5rem', color: '#047857', fontSize: '0.85rem', fontWeight: 600 }}>
                          <Trophy size={14} /> Chúc mừng các VĐV/Đội đã nhận suất Đặc cách (BYE)!
                        </div>
                        <div className={styles.seedList}>
                          {(() => {
                            const players = selectedParticipants.map(uid => getUserById(uid)).filter(Boolean) as any[];
                            const isDoubles = formData.match_mode === 'doubles';
                            const entityCount = isDoubles ? Math.ceil(players.length / 2) : players.length;
                            
                            // How many squads get BYE?
                            const rounds = Math.ceil(Math.log2(entityCount)) || 1;
                            const totalSlots = Math.pow(2, rounds);
                            const byesCount = totalSlots - entityCount;

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
                        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          * Kết quả bốc thăm này sẽ được sử dụng chính thức khi bạn nhấn "Khởi tạo Bản nháp".
                        </p>
                      </>
                    )}
                  </Card>
                )}

                {/* Manual Seed Widgets */}
                {formData.seeding_mode === 'manual' && formData.type === 'custom' && (
                  <Card className={styles.participantCard} style={{ marginTop: '1.5rem' }}>
                    <GroupSeeder
                      players={selectedParticipants.map(uid => getUserById(uid)).filter(Boolean) as any[]}
                      groupCount={formData.group_count}
                      onSeedingChange={(results) => setManualGroups(results)}
                    />
                  </Card>
                )}

                {formData.seeding_mode === 'manual' && (formData.type === 'elimination' || formData.type === 'round_robin') && (
                  <Card className={styles.participantCard} style={{ marginTop: '1.5rem' }}>
                    <BracketSeeder
                      players={selectedParticipants.map(uid => getUserById(uid)).filter(Boolean) as any[]}
                      matchMode={formData.match_mode as any}
                      type={formData.type as any}
                      onSeedingChange={(orderedIds) => setSelectedParticipants(orderedIds)}
                    />
                  </Card>
                )}
              </>
            )}

            {/* NEXT / PREV BUTTONS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                  <ChevronLeft size={16} style={{ marginRight: 6 }} /> Quay lại
                </Button>
              ) : <div></div>}

              {step < 3 && (
                <Button type="button" onClick={handleNextStep}>
                  Tiếp tục <ChevronRight size={16} style={{ marginLeft: 6 }} />
                </Button>
              )}
            </div>

            {/* Hint for BYE selection */}
            {step === 3 && formData.seeding_mode === 'random' && !hasShuffled && (
              <p style={{ marginTop: '1rem', color: '#f59e0b', fontSize: '0.85rem', textAlign: 'center', background: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Info size={16} /> Vui lòng nhấn <b>"Bốc thăm"</b> bên dưới để xác định danh sách Đặc cách trước khi tạo giải.
              </p>
            )}

            {step === 3 && formData.seeding_mode === 'manual' && (
              <p style={{ marginTop: '1rem', color: 'var(--primary-color)', fontSize: '0.85rem', textAlign: 'center', background: 'rgba(56, 189, 248, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                💡 <b>Mẹo:</b> Những người nằm ở <b>{byesCount} vị trí đầu tiên</b> trong bảng danh sách {formData.type === 'custom' ? 'mỗi bảng' : ''} sẽ nhận suất Đặc cách (BYE).
              </p>
            )}

          </div>
        </form>

        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={confirmSubmit}
          title="Xác nhận tạo Giải đấu"
          message={`Hệ thống sẽ khởi tạo bản nháp giải đấu "${formData.name}". Bạn có thể tinh chỉnh lần cuối trước khi thực sự công bố giải.`}
          confirmLabel="Khởi Tạo Bản Nháp"
        />
      </main>
    </div>
  );
}
