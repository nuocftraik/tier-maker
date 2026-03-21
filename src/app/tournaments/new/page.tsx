"use client";

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { Trophy, ArrowLeft, Check, Users, Info, GripVertical, Shuffle } from 'lucide-react';
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

    const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'elimination',
    match_mode: 'singles',
    seeding_mode: 'random',
    group_count: 2,
    advance_per_group: 1,
    best_of: 1
  });
  
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [manualGroups, setManualGroups] = useState<{ userId: string, group: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // Manual seed order - separate from selection
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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

  const moveParticipant = (fromIndex: number, toIndex: number) => {
    setSelectedParticipants(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return arr;
    });
  };

  const getUserById = (id: string) => users.find((u: any) => u.id === id);

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'elimination': return 'Loại trực tiếp';
      case 'round_robin': return 'Vòng tròn';
      case 'custom': return 'Custom (Bảng→Loại)';
      default: return type;
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedParticipants.length < 2) {
      alert('Cần ít nhất 2 người chơi để tạo giải đấu');
      return;
    }

    if (formData.match_mode === 'doubles' && selectedParticipants.length % 2 !== 0) {
      alert('Số lượng vận động viên phải là số chẵn cho chế độ thi đấu Đôi (2 vs 2)');
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmSubmit = async () => {
    setIsSubmitting(true);
    setShowConfirmModal(false);
    try {
      let participantsPayload: any;

      if (formData.seeding_mode === 'manual') {
        if (formData.type === 'custom' && manualGroups.length > 0) {
          // Use the explicit group assignments from the seeder
          participantsPayload = manualGroups.map((item, index) => ({
            userId: item.userId,
            seed: index + 1,
            group_number: item.group
          }));
        } else if (formData.type === 'custom') {
          // Fallback if seeder didn't run properly
          participantsPayload = selectedParticipants.map((userId, index) => ({
            userId,
            seed: index + 1,
            group_number: (index % formData.group_count) + 1
          }));
        } else {
          // Elimination or Round Robin (linear seed)
          participantsPayload = selectedParticipants.map((userId, index) => ({
            userId,
            seed: index + 1,
            group_number: 0
          }));
        }
      } else {
        participantsPayload = selectedParticipants;
      }

      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          participants: participantsPayload
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
          <div className={styles.sidebar}>
            <Card className={styles.formCard}>
              <h2 className={styles.cardTitle}>Thông tin cơ bản</h2>
              <div className={styles.fields}>
                <Input 
                  label="Tên giải đấu" 
                  placeholder="VD: INRES Spring Championship 2026"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />

                {/* Tournament Type */}
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Thể thức thi đấu</label>
                  <select 
                    className={styles.select}
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="elimination">🏆 Loại trực tiếp (Single Elimination)</option>
                    <option value="round_robin">🔄 Vòng tròn tính điểm (Round Robin)</option>
                    <option value="custom">⚡ Custom: Vòng bảng → Loại trực tiếp</option>
                  </select>
                </div>

                {/* Match Mode */}
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Chế độ thi đấu</label>
                  <div className={styles.radioGroup}>
                    <label className={`${styles.radioCard} ${formData.match_mode === 'singles' ? styles.radioActive : ''}`}>
                      <input 
                        type="radio" 
                        name="match_mode" 
                        value="singles" 
                        checked={formData.match_mode === 'singles'}
                        onChange={() => setFormData({...formData, match_mode: 'singles'})}
                      />
                      <span className={styles.radioEmoji}>🏸</span>
                      <span className={styles.radioTitle}>Đơn (1 vs 1)</span>
                    </label>
                    <label className={`${styles.radioCard} ${formData.match_mode === 'doubles' ? styles.radioActive : ''}`}>
                      <input 
                        type="radio" 
                        name="match_mode" 
                        value="doubles" 
                        checked={formData.match_mode === 'doubles'}
                        onChange={() => setFormData({...formData, match_mode: 'doubles'})}
                      />
                      <span className={styles.radioEmoji}>🏸🏸</span>
                      <span className={styles.radioTitle}>Đôi (2 vs 2)</span>
                    </label>
                  </div>
                </div>

                {/* Seeding Mode */}
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Cách phân cặp</label>
                  <div className={styles.radioGroup}>
                    <label className={`${styles.radioCard} ${formData.seeding_mode === 'random' ? styles.radioActive : ''}`}>
                      <input 
                        type="radio" 
                        name="seeding_mode" 
                        value="random" 
                        checked={formData.seeding_mode === 'random'}
                        onChange={() => setFormData({...formData, seeding_mode: 'random'})}
                      />
                      <span className={styles.radioEmoji}>🎲</span>
                      <span className={styles.radioTitle}>Ngẫu nhiên</span>
                    </label>
                    <label className={`${styles.radioCard} ${formData.seeding_mode === 'manual' ? styles.radioActive : ''}`}>
                      <input 
                        type="radio" 
                        name="seeding_mode" 
                        value="manual" 
                        checked={formData.seeding_mode === 'manual'}
                        onChange={() => setFormData({...formData, seeding_mode: 'manual'})}
                      />
                      <span className={styles.radioEmoji}>✋</span>
                      <span className={styles.radioTitle}>Tự sắp xếp</span>
                    </label>
                  </div>
                </div>

                {/* Custom type config */}
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Số ván thắng (Best of)</label>
                  <select 
                    className={styles.select}
                    value={formData.best_of}
                    onChange={e => setFormData({...formData, best_of: +e.target.value})}
                  >
                    <option value={1}>⚡ BO1 (Đánh 1 ván)</option>
                    <option value={3}>🔥 BO3 (Đánh 3 thắng 2)</option>
                    <option value={5}>🏆 BO5 (Đánh 5 thắng 3)</option>
                  </select>
                </div>

                {formData.type === 'custom' && (
                  <div className={styles.customConfig}>
                    <div className={styles.configRow}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>Số bảng đấu</label>
                        <input 
                          type="number" 
                          className={styles.select} 
                          min={2} max={8}
                          value={formData.group_count}
                          onChange={e => setFormData({...formData, group_count: parseInt(e.target.value) || 2})}
                        />
                      </div>
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>Số người đi tiếp / bảng</label>
                        <input 
                          type="number" 
                          className={styles.select} 
                          min={1} max={4}
                          value={formData.advance_per_group}
                          onChange={e => setFormData({...formData, advance_per_group: parseInt(e.target.value) || 1})}
                        />
                      </div>
                    </div>
                    <p className={styles.configHint}>
                      → {formData.group_count * formData.advance_per_group} người sẽ vào vòng loại trực tiếp
                    </p>
                  </div>
                )}

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Mô tả (tùy chọn)</label>
                  <textarea 
                    className={styles.textarea}
                    placeholder="Luật chơi, phần thưởng..."
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>
            </Card>

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
                  <span>{formData.seeding_mode === 'random' ? '🎲 Phân cặp ngẫu nhiên' : '✋ Tự sắp xếp'}</span>
                </div>
              </div>
              <Button 
                type="submit" 
                className={styles.submitBtn} 
                disabled={isSubmitting || selectedParticipants.length < 2}
              >
                {isSubmitting ? 'Đang khởi tạo...' : 'Tạo Giải đấu'}
              </Button>
            </Card>
          </div>

          <div className={styles.mainContent}>
            {/* Player Selection Grid */}
            <Card className={styles.participantCard}>
              <div className={styles.participantHeader}>
                <h2 className={styles.cardTitle}>Chọn Vận động viên ({selectedParticipants.length})</h2>
                <div className={styles.selectionActions}>
                  <button type="button" onClick={() => setSelectedParticipants(users.map((u: any) => u.id))} className={styles.textBtn}>Chọn tất cả</button>
                  <button type="button" onClick={() => setSelectedParticipants([])} className={styles.textBtn}>Bỏ chọn</button>
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

            {/* Manual Seed — Group Seeder for custom */}
            {formData.seeding_mode === 'manual' && selectedParticipants.length >= 2 && formData.type === 'custom' && (
              <Card className={styles.participantCard}>
                <GroupSeeder
                  players={selectedParticipants.map(uid => getUserById(uid)).filter(Boolean) as any[]}
                  groupCount={formData.group_count}
                  onSeedingChange={(results) => setManualGroups(results)}
                />
              </Card>
            )}

            {/* Manual Seed — Seeding Tool for elimination & round_robin */}
            {formData.seeding_mode === 'manual' && selectedParticipants.length >= 2 && (formData.type === 'elimination' || formData.type === 'round_robin') && (
              <Card className={styles.participantCard}>
                <BracketSeeder
                  players={selectedParticipants.map(uid => getUserById(uid)).filter(Boolean) as any[]}
                  matchMode={formData.match_mode as any}
                  type={formData.type as any}
                  onSeedingChange={(orderedIds) => setSelectedParticipants(orderedIds)}
                />
              </Card>
            )}
          </div>
        </form>

        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={confirmSubmit}
          title="Xác nhận tạo Giải đấu"
          message={`Hệ thống sẽ khởi tạo giải đấu "${formData.name}" với ${selectedParticipants.length} vận động viên. Bạn có chắc chắn muốn tạo ngay bây giờ?`}
          confirmLabel="Xác nhận Tạo"
        />
      </main>
    </div>
  );
}
