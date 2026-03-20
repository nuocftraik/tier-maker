"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { Trophy, ArrowLeft, Check, Users, Shuffle, GripVertical, Save, AlertCircle } from 'lucide-react';
import styles from '../../new/NewTournament.module.css'; // Reuse styles
import { Navbar } from '@/components/layout/Navbar';
import { BracketSeeder } from '@/components/tournament/BracketSeeder';
import { GroupSeeder } from '@/components/tournament/GroupSeeder';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function EditTournamentPage({ params }: { params: React.Promise<{ id: string }> }) {
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
    advance_per_group: 1
  });
  
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [manualGroups, setManualGroups] = useState<{ userId: string, group: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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
        advance_per_group: t.advance_per_group || 1
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
          participants: participantsPayload
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

  if (tourneyLoading) return <div className="p-8 text-center">Đang tải...</div>;
  if (session && !session.isAdmin) {
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
                  <label className={styles.label}>Cách phân cặp</label>
                  <select 
                    className={styles.select}
                    value={formData.seeding_mode}
                    onChange={e => setFormData({...formData, seeding_mode: e.target.value})}
                  >
                    <option value="random">🎲 Ngẫu nhiên</option>
                    <option value="manual">✋ Tự sắp xếp</option>
                  </select>
                </div>

                {formData.type === 'custom' && (
                  <div className={styles.customConfig}>
                     <div className={styles.configField}>
                         <label>Số bảng</label>
                         <input type="number" value={formData.group_count} onChange={e => setFormData({...formData, group_count: +e.target.value})} />
                     </div>
                     <div className={styles.configField}>
                         <label>Đi tiếp / bảng</label>
                         <input type="number" value={formData.advance_per_group} onChange={e => setFormData({...formData, advance_per_group: +e.target.value})} />
                     </div>
                  </div>
                )}
              </div>
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

            {/* Seeder Preview */}
            {formData.seeding_mode === 'manual' && selectedParticipants.length >= 2 && (
              <Card className={styles.participantCard}>
                {formData.type === 'elimination' ? (
                  <BracketSeeder 
                    players={selectedParticipants.map(uid => getUserById(uid)).filter(Boolean) as any[]}
                    matchMode={formData.match_mode as any}
                    onSeedingChange={setSelectedParticipants}
                  />
                ) : formData.type === 'custom' ? (
                  <GroupSeeder 
                    players={selectedParticipants.map(uid => getUserById(uid)).filter(Boolean) as any[]}
                    groupCount={formData.group_count}
                    onSeedingChange={setManualGroups}
                  />
                ) : (
                  <div className={styles.seedList}>
                     {selectedParticipants.map((uid, idx) => (
                        <div key={uid} className={styles.seedItem}>
                           <span>#{idx+1}</span>
                           <Avatar src={getUserById(uid)?.avatar_url || ''} alt="" size="sm" />
                           <span>{getUserById(uid)?.name}</span>
                        </div>
                     ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
