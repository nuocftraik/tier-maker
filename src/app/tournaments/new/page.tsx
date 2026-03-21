"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { Trophy, ArrowLeft, Check, Users, Info, Flag, ChevronRight, ChevronLeft, ArrowRight, Settings } from 'lucide-react';
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

  if (session && !session.isAdmin) {
    return (
      <div className={styles.unauthorized}>
        <Info size={48} />
        <h1>Không có quyền truy cập</h1>
        <p>Thao tác này chỉ dành cho quản trị viên.</p>
        <Button onClick={() => router.push('/tournaments')}>Quay lại</Button>
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
                  disabled={isSubmitting || selectedParticipants.length < 2}
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  {isSubmitting ? 'Đang khởi tạo...' : 'Hoàn Tất & Bắt Đầu Nháp'}
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
                  <h2 className={styles.cardTitle}>Phân Cặp & Nhánh Đấu</h2>

                  {byesCount > 0 && ['elimination', 'custom'].includes(formData.type) && (
                    <div style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary-color)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: 'bold' }}>
                        <Info size={18} />
                        Lưu ý Cơ chế Đặc Cách (BYE)
                      </div>
                      <p style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>
                        Dựa trên số lượng tham gia vòng loại trực tiếp <b>({effectiveKnockoutEntities} đội)</b>, nhánh đấu cần <b>{totalSlots} khe trống (slots)</b>.
                        Do đó, hệ thống sẽ tự động tạo <b>{byesCount} vé ĐẶC CÁCH (BYE)</b>. Đội gặp BYE sẽ nghiễm nhiên được cộng 1 vòng thắng để tiến thẳng vào vòng trong.
                      </p>
                    </div>
                  )}

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Phương thức Phân hạt giống (Seeding)</label>
                    <div className={styles.radioGroup}>
                      <label className={`${styles.radioCard} ${formData.seeding_mode === 'random' ? styles.radioActive : ''}`}>
                        <input type="radio" name="seeding_mode" value="random" checked={formData.seeding_mode === 'random'} onChange={() => setFormData({ ...formData, seeding_mode: 'random' })} />
                        <span className={styles.radioEmoji}>🎲</span>
                        <span className={styles.radioTitle}>Auto / Ngẫu nhiên</span>
                      </label>
                      <label className={`${styles.radioCard} ${formData.seeding_mode === 'manual' ? styles.radioActive : ''}`}>
                        <input type="radio" name="seeding_mode" value="manual" checked={formData.seeding_mode === 'manual'} onChange={() => setFormData({ ...formData, seeding_mode: 'manual' })} />
                        <span className={styles.radioEmoji}>✋</span>
                        <span className={styles.radioTitle}>Tôi muốn tự sắp xếp</span>
                      </label>
                    </div>
                  </div>
                </Card>

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
