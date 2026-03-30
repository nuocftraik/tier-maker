"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Wallet, Calendar, Receipt, Users, ScrollText,
  Check, Eye
} from 'lucide-react';
import styles from '../CostSplitting.module.css';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

function getAvatarUrl(avatarUrl: string | null) {
  if (!avatarUrl) return '';
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${avatarUrl}`;
}

function getDefaultTitle() {
  const now = new Date();
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const day = days[now.getDay()];
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `Buổi cầu ${day} ${dd}/${mm}`;
}

function getDefaultDateTime() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

export default function CreateCostSessionPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [sessionDate, setSessionDate] = useState(getDefaultDateTime());
  const [notes, setNotes] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data.users || data || []))
      .catch(() => {});
  }, []);

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAll = () => {
    if (selectedParticipants.length === users.length) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(users.map(u => u.id));
    }
  };

  const handleTitleFocus = () => {
    if (!title) {
      setTitle(getDefaultTitle());
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { alert('Vui lòng nhập tiêu đề'); return; }
    if (selectedParticipants.length === 0) { alert('Vui lòng chọn ít nhất 1 người tham gia'); return; }

    setLoading(true);

    try {
      const res = await fetch('/api/cost-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          session_date: sessionDate ? new Date(sessionDate).toISOString() : new Date().toISOString(),
          notes: notes || null,
          participants: selectedParticipants
        })
      });

      const data = await res.json();
      if (res.ok) {
        router.push(`/cost-splitting/${data.sessionId}`);
      } else {
        alert(data.error || 'Lỗi tạo poll');
      }
    } catch {
      alert('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.createPage}>
      <Link href="/cost-splitting" className={styles.backLink}>
        <ArrowLeft size={16} /> Quay lại
      </Link>

      <h1 className={styles.formTitle}>
        <Wallet size={28} />
        Tạo Poll & Phiên chia tiền
      </h1>

      {/* Basic Info */}
      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>
          <Receipt size={18} /> Thông tin cơ bản
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Tiêu đề * <span style={{ fontWeight: 400, fontSize: '0.7rem' }}>(nhấn vào để tự điền hôm nay)</span></label>
          <input
            type="text"
            className={styles.fieldInput}
            placeholder={getDefaultTitle()}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onFocus={handleTitleFocus}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Ngày & giờ chơi
          </label>
          <input
            type="datetime-local"
            className={styles.fieldInput}
            value={sessionDate}
            onChange={e => setSessionDate(e.target.value)}
          />
        </div>
      </div>

      {/* Participants */}
      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>
          <Users size={18} /> Danh sách mời tham gia ({selectedParticipants.length}/{users.length})
        </div>
        <div className={styles.selectAll} onClick={selectAll}>
          <Check size={14} />
          {selectedParticipants.length === users.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả (để mọi người cùng Vote)'}
        </div>
        <div className={styles.participantsGrid}>
          {users.map(user => {
            const isSelected = selectedParticipants.includes(user.id);
            return (
              <div
                key={user.id}
                className={`${styles.participantCheckbox} ${isSelected ? styles.checked : ''}`}
                onClick={() => toggleParticipant(user.id)}
              >
                {user.avatar_url && (
                  <img src={getAvatarUrl(user.avatar_url)} alt="" className={styles.cbAvatar} />
                )}
                <span>{user.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>
          <ScrollText size={18} /> Ghi chú buổi chơi
        </div>
        <textarea
          className={styles.fieldTextarea}
          placeholder="Ghi chú thêm cho buổi chơi (tùy chọn)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      {/* Preview */}
      {selectedParticipants.length > 0 && (
        <div className={styles.preview}>
          <div className={styles.previewTitle}>
            <Eye size={16} /> Thông tin Poll
          </div>
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>Tiêu đề</span>
            <span className={styles.previewValue}>{title || '—'}</span>
          </div>
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>Ngày giờ</span>
            <span className={styles.previewValue}>
              {sessionDate ? new Date(sessionDate).toLocaleString('vi-VN') : '—'}
            </span>
          </div>
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>Số người mời</span>
            <span className={styles.previewValue}>{selectedParticipants.length}</span>
          </div>
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>Trạng thái</span>
            <span className={styles.previewValue} style={{ color: '#f59e0b' }}>Đang Vote</span>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        className={styles.submitBtn}
        onClick={handleSubmit}
        disabled={loading || !title.trim() || selectedParticipants.length === 0}
      >
        {loading ? 'Đang tạo...' : '✅ Tạo Poll'}
      </button>
    </div>
  );
}
