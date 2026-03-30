"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet, Plus, Calendar, Users, Receipt, Trash2, ScrollText } from 'lucide-react';
import styles from './CostSplitting.module.css';

function formatVND(amount: number) {
  return amount.toLocaleString('vi-VN') + 'đ';
}

export default function CostSplittingPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cost-sessions')
      .then(res => res.json())
      .then(data => {
        setSessions(data.sessions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <Wallet size={48} />
            <p>Đang tải...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>
              <Wallet className={styles.titleIcon} size={28} />
              Chia tiền
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/cost-splitting/rules" className={styles.addBtn} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <ScrollText size={18} />
              Quy định
            </Link>
            <Link href="/cost-splitting/create" className={styles.addBtn}>
              <Plus size={18} />
              Tạo phiên mới
            </Link>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className={styles.emptyState}>
            <Receipt size={64} className={styles.emptyIcon} />
            <p>Chưa có phiên chia tiền nào</p>
            <Link href="/cost-splitting/create" className={styles.emptyBtn}>
              <Plus size={16} />
              Tạo phiên đầu tiên
            </Link>
          </div>
        ) : (
          <div className={styles.sessionGrid}>
            {sessions.map((session: any) => {
              const handleDelete = async (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (!confirm(`Bạn có muốn xóa phiên "${session.title}"? Dữ liệu không thể khôi phục!`)) return;
                
                try {
                  const res = await fetch(`/api/cost-sessions/${session.id}`, { method: 'DELETE' });
                  if (res.ok) {
                    setSessions(prev => prev.filter(s => s.id !== session.id));
                  } else {
                    alert('Không thể xóa phiên, vui lòng thử lại');
                  }
                } catch (err) {
                  alert('Lỗi kết nối');
                }
              };

              // Determine status label and style
              let statusLabel = 'Không rõ';
              let statusStyle = session.status === 'poll_locked' ? 'voting' : session.status;
              if (session.status === 'voting') statusLabel = 'Đang Vote';
              if (session.status === 'poll_locked') statusLabel = 'Khóa Vote';
              if (session.status === 'splitting') statusLabel = 'Đang Chia tiền';
              if (session.status === 'closed') statusLabel = 'Đã đóng';

              return (
                <Link
                  key={session.id}
                  href={`/cost-splitting/${session.id}`}
                  className={`${styles.sessionCard} ${styles[statusStyle] || ''}`}
                >
                  <div className={`${styles.cardIcon} ${styles[statusStyle] || ''}`}>
                    <Wallet size={22} />
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardTitle}>
                      {session.title}
                      <span className={`${styles.statusBadge} ${styles[statusStyle] || ''}`}>
                        • {statusLabel}
                      </span>
                    </div>
                    <div className={styles.cardMeta}>
                      <span className={styles.metaItem}>
                        <Calendar size={13} />
                        {new Date(session.session_date).toLocaleString('vi-VN', {
                          weekday: 'short', day: 'numeric', month: 'short',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                      <span className={styles.metaItem}>
                        <Users size={13} />
                        {session.status === 'voting' || session.status === 'poll_locked'
                           ? `${session.participant_count} người (👍 ${session.voted_yes_count})`
                           : `${session.participant_count} người trả quỹ`}
                      </span>
                      {session.creator && (
                        <span className={styles.metaItem}>
                          bởi {session.creator.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.cardRight} style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', justifyContent: 'flex-end' }}>
                      <span className={styles.amount} style={{ lineHeight: '1' }}>{formatVND(session.total_amount)}</span>
                      {session.canManage && (
                        <button 
                          onClick={handleDelete}
                          title="Xóa phiên"
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', padding: '0 0.2rem', cursor: 'pointer', zIndex: 10 }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                    <span className={styles.paidProgress}>
                      {session.status === 'voting' || session.status === 'poll_locked' ? 'Đang chờ' : `${session.paid_count}/${session.participant_count} đã trả`}
                      {session.status !== 'voting' && session.status !== 'poll_locked' && (
                        <span className={styles.progressBar}>
                          <span
                            className={styles.progressFill}
                            style={{
                              width: session.participant_count > 0
                                ? `${(session.paid_count / session.participant_count) * 100}%`
                                : '0%'
                            }}
                          />
                        </span>
                      )}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
