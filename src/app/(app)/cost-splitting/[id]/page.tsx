"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Wallet, Calendar, User, Receipt, QrCode, ScrollText,
  CheckCircle2, XCircle, PenLine, Lock, Unlock, Trash2, AlertTriangle,
  ThumbsUp, ThumbsDown, Clock, Upload, Settings, Calculator, Edit, ChevronDown, ChevronUp
} from 'lucide-react';
import styles from '../CostSplitting.module.css';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

function formatVND(amount: number) {
  return (amount || 0).toLocaleString('vi-VN') + 'đ';
}

function getAvatarUrl(avatarUrl: string | null) {
  if (!avatarUrl) return '';
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${avatarUrl}`;
}

const VOTE_STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  yes: { label: 'Đi', icon: ThumbsUp, color: '#10b981' },
  no: { label: 'Không đi', icon: ThumbsDown, color: '#ef4444' },
  pending: { label: 'Chưa vote', icon: Clock, color: '#94a3b8' },
};

export default function CostSessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const qrFileRef = useRef<HTMLInputElement>(null);

  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Modals
  const [adjustModal, setAdjustModal] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustAttendanceOverride, setAdjustAttendanceOverride] = useState('follow_vote');
  
  // Start Split Form (Inline Step)
  const [startSplitOpen, setStartSplitOpen] = useState(false);
  const [courtFee, setCourtFee] = useState('');
  const [shuttleFee, setShuttleFee] = useState('');
  const [drinkFee, setDrinkFee] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [payingParts, setPayingParts] = useState<string[]>([]);
  
  // Advance Payment
  interface AdvancePayer {
    id: string;
    user_id: string;
    amount: string;
    note: string;
  }
  const [advancePayers, setAdvancePayers] = useState<AdvancePayer[]>([]);

  const [editSessionOpen, setEditSessionOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');

  const [recentQRs, setRecentQRs] = useState<string[]>([]);

  // Accordion state to toggle visibility of read-only parts
  const [showVoteStep, setShowVoteStep] = useState(false);

  const fetchData = useCallback(() => {
    fetch(`/api/cost-sessions/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        const sess = data.session;
        setSession(sess);
        const parts = data.participants || [];
        setParticipants(parts);
        setRules(data.rules || []);
        if (data.currentUserId) setCurrentUserId(data.currentUserId);
        if (data.canManage !== undefined) setCanManage(data.canManage);
        if (data.recentQRs) setRecentQRs(data.recentQRs);
        
        // Populate the edit form fields
        if (sess) {
          setCourtFee(String(sess.total_court_fee || ''));
          setShuttleFee(String(sess.total_shuttle_fee || ''));
          setDrinkFee(String(sess.total_drink_fee || ''));
          setQrImageUrl(sess.qr_image_url || '');
          
          // Determine who was paying (base_amount > 0)
          const isVotingPhase = sess.status === 'voting' || sess.status === 'poll_locked';
          if (!isVotingPhase) {
            setPayingParts(parts.filter((p: any) => p.base_amount > 0).map((p: any) => p.user_id));
            
            // Populate advance payers if adjustment < 0
            const advs = parts.filter((p: any) => p.adjustment < 0);
            if (advs && advs.length > 0) {
              setAdvancePayers(advs.map((adv: any, i: number) => ({
                id: `adv-${i}`,
                user_id: adv.user_id,
                amount: String(Math.abs(adv.adjustment)),
                note: adv.adjustment_note || ''
              })));
            } else {
              setAdvancePayers([]);
            }
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Set default visual state based on session status exactly ONCE when session changes
  useEffect(() => {
    if (session) {
      if (session.status === 'voting') {
        setShowVoteStep(true);
      } else {
        setShowVoteStep(false);
      }
    }
  }, [session?.status]);

  const handleVote = async (newStatus: string) => {
    if (session?.status !== 'voting') return;
    const currentMyStatus = participants.find(p => p.user_id === currentUserId)?.vote_status || 'pending';
    const targetStatus = newStatus === currentMyStatus ? 'pending' : newStatus;

    // Optimistic Update
    setParticipants(prev => prev.map(p => 
      p.user_id === currentUserId ? { ...p, vote_status: targetStatus } : p
    ));

    try {
      const res = await fetch(`/api/cost-sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', vote_status: targetStatus })
      });
      if (!res.ok) {
        // Rollback on error
        fetchData();
        return;
      }
      
      // If was successful, just update the local session state totals if needed, 
      // but usually the numbers are calculated from participants array. 
      // Instead of fetchData(), we can just update local states.
      // But fetchData() is safest for consistency, just don't wait for it to be visible.
      // Removed fetchData() here if we want maximum speed. 
      // Let's keep it but just don't expect it to change things immediately.
      // fetchData(); 
    } catch {
      fetchData();
    }
  };

  const handleUpdateSessionInfo = async () => {
    if (!editTitle.trim()) return;
    setLoading(true);
    await fetch(`/api/cost-sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'update_session', 
        title: editTitle, 
        session_date: editDate 
      })
    });
    setEditSessionOpen(false);
    fetchData();
  };

  const openEditSessionModal = () => {
    setEditTitle(session?.title || '');
    // Format to YYYY-MM-DDTHH:MM for input type: datetime-local
    if (session?.session_date) {
      const d = new Date(session.session_date);
      const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setEditDate(iso);
    }
    setEditSessionOpen(true);
  };

  const openStartSplitStep = () => {
    if (session?.status === 'voting') {
      const yesIds = participants.filter(p => p.vote_status === 'yes').map(p => p.user_id);
      setPayingParts(yesIds);
    }
    setStartSplitOpen(true);
    setShowVoteStep(false); // Auto-hide vote tab to save space
  };

  const togglePayingPart = (userId: string) => {
    setPayingParts(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleStartSplit = async () => {
    if (payingParts.length === 0) {
      if (!confirm('Chưa chọn ai trả tiền! Bạn có chắc muốn tiếp tục với 0 người trả?')) return;
    }

    setLoading(true);
    await fetch(`/api/cost-sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start_split',
        court_fee: courtFee,
        shuttle_fee: shuttleFee,
        drink_fee: drinkFee,
        qr_image_url: qrImageUrl,
        split_participant_ids: payingParts,
        advance_payers: advancePayers.filter(a => a.user_id && a.amount)
      })
    });
    setStartSplitOpen(false);
    fetchData();
  };

  const handleTogglePaid = async (participant: any) => {
    const targetStatus = !participant.is_paid;

    // Optimistic Update
    setParticipants(prev => prev.map(p => 
      p.id === participant.id ? { ...p, is_paid: targetStatus } : p
    ));

    try {
      const res = await fetch(`/api/cost-sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_paid',
          participant_id: participant.id,
          is_paid: targetStatus
        })
      });
      if (!res.ok) {
        fetchData();
      }
    } catch {
      fetchData();
    }
  };

  const handleAdjust = async () => {
    if (!adjustModal) return;
    await fetch(`/api/cost-sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'adjust',
        participant_id: adjustModal.id,
        adjustment: parseInt(adjustAmount) || 0,
        adjustment_note: adjustNote,
        attendance_override: adjustAttendanceOverride
      })
    });
    setAdjustModal(null);
    setAdjustAmount('');
    setAdjustNote('');
    fetchData();
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/cost-sessions/upload-qr', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        setQrImageUrl(data.url);
        // Uploaded in splitting phase, but we only commit to DB when user hits "Lưu chi phí" 
        // OR we can do direct commit if they are just quickly swapping. 
        // For consistency, setting local state is better if form is open.
        if (!startSplitOpen) {
          await fetch(`/api/cost-sessions/${sessionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'upload_qr', qr_image_url: data.url })
          });
          fetchData();
        }
      } else {
        alert(data.error || 'Lỗi upload');
      }
    } catch { alert('Lỗi kết nối'); }
    finally { setUploading(false); }
  };

  const handleCloseSession = async () => {
    if (!confirm('Bạn có chắc muốn đóng phiên này?')) return;
    await fetch(`/api/cost-sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close' })
    });
    fetchData();
  };

  const handleReopenSession = async () => {
    await fetch(`/api/cost-sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reopen' })
    });
    fetchData();
  };

  const handleLockPoll = async () => {
    if (!confirm('Khóa điểm danh nhóm? Thành viên sẽ không thể vote nữa.')) return;
    await fetch(`/api/cost-sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'lock_poll' })
    });
    fetchData();
  };

  const handleReopenPoll = async () => {
    await fetch(`/api/cost-sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reopen_poll' })
    });
    fetchData();
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc muốn XÓA phiên này? Hành động không thể hoàn tác!')) return;
    const res = await fetch(`/api/cost-sessions/${sessionId}`, { method: 'DELETE' });
    if (res.ok) router.push('/cost-splitting');
  };

  const openAdjustModal = (p: any) => {
    setAdjustModal(p);
    setAdjustAmount(String(p.adjustment || 0));
    setAdjustNote(p.adjustment_note || '');
    setAdjustAttendanceOverride(p.attendance_override || 'follow_vote');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}><Wallet size={48} /><p>Đang tải...</p></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <AlertTriangle size={48} /><p>Không tìm thấy phiên</p>
          <Link href="/cost-splitting" className={styles.emptyBtn}>Quay lại</Link>
        </div>
      </div>
    );
  }

  const isVoting = session.status === 'voting' || session.status === 'poll_locked';
  const isPollLocked = session.status === 'poll_locked';
  const isSplitting = session.status === 'splitting';
  const isClosed = session.status === 'closed';

  const yesParts = participants.filter(p => p.vote_status === 'yes');
  const noParts = participants.filter(p => p.vote_status === 'no');
  const pendingParts = participants.filter(p => p.vote_status === 'pending');
  const paidCount = participants.filter(p => p.is_paid).length;
  
  // Filter for Splitting/Closed Phase to only show exact involved people (final_amount > 0 or has adjustment)
  const activeSplittingParts = participants.filter(p => (p.base_amount > 0 || p.adjustment !== 0 || p.final_amount > 0));

  const myVote = participants.find(p => p.user_id === currentUserId)?.vote_status || 'pending';

  // Form Preview Calculation
  const previewTotalAmt = (parseInt(courtFee) || 0) + (parseInt(shuttleFee) || 0) + (parseInt(drinkFee) || 0);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.detailHeader}>
        <Link href="/cost-splitting" className={styles.backLink}>
          <ArrowLeft size={16} /> Quay lại danh sách
        </Link>
        <h1 className={styles.detailTitle}>
          {session.title}
          <span className={`${styles.statusBadge} ${styles[session.status]}`}>
            {isVoting ? '• Đang Vote' : (isSplitting ? '• Chia tiền' : '• Đã đóng')}
          </span>
          {canManage && (
            <button 
              onClick={openEditSessionModal}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
              title="Sửa tên/ngày"
            >
              <Edit size={16} />
            </button>
          )}
        </h1>
        <div className={styles.detailMeta}>
          <span className={styles.metaItem}>
            <Calendar size={14} />
            {new Date(session.session_date).toLocaleString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
          </span>
          {session.creator && (
            <span className={styles.metaItem}><User size={14} /> {session.creator.name}</span>
          )}
        </div>
      </div>

      {/* MAIN VOTE SECTION (ONLY IF VOTING) */}
      {isVoting && (
        <div className={styles.section} style={startSplitOpen ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
          <div className={styles.sectionHeader} style={{ fontSize: '1.2rem', color: '#3b82f6', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ThumbsUp size={20} className={styles.sectionIcon} /> Bước 1: Bạn có tham gia không?</div>
            {isPollLocked && <span style={{ fontSize: '0.75rem', background: '#e2e8f0', color: '#64748b', padding: '0.2rem 0.5rem', borderRadius: '1rem' }}><Lock size={12} style={{display: 'inline', marginBottom:'-2px'}}/> Đã khóa điểm danh</span>}
          </div>
          <div className={styles.voteButtons} style={{ opacity: isPollLocked ? 0.6 : 1, pointerEvents: isPollLocked ? 'none' : 'auto' }}>
            <button 
              className={`${styles.voteBtn} ${styles.voteYes}`} 
              onClick={() => handleVote('yes')}
              title={myVote === 'yes' ? 'Nhấn để hủy' : 'Vote đi'}
              style={myVote === 'yes' ? { boxShadow: '0 0 0 2px #10b981', filter: 'brightness(1.2)' } : (myVote !== 'pending' ? { opacity: 0.5 } : {})}
            >
              <ThumbsUp size={16} /> Đi ({yesParts.length})
            </button>
            <button 
              className={`${styles.voteBtn} ${styles.voteNo}`} 
              onClick={() => handleVote('no')}
              title={myVote === 'no' ? 'Nhấn để hủy' : 'Vote không đi'}
              style={myVote === 'no' ? { boxShadow: '0 0 0 2px #ef4444', filter: 'brightness(1.2)' } : (myVote !== 'pending' ? { opacity: 0.5 } : {})}
            >
              <ThumbsDown size={16} /> Không đi ({noParts.length})
            </button>
          </div>
          {pendingParts.length > 0 && (
            <div className={styles.votePending}>
              <Clock size={13} /> {pendingParts.length} người chưa vote
            </div>
          )}

          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>👍 Sẽ tham gia ({yesParts.length})</div>
            <div className={styles.participantsGrid} style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
              {yesParts.map(p => (
                <div key={p.id} className={styles.participantCheckbox} style={{ padding: '0.4rem', cursor: 'default' }}>
                  <img src={getAvatarUrl(p.user?.avatar_url)} style={{ width: '20px', height: '20px', borderRadius: '50%' }} alt="" />
                  <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.user?.name}</span>
                </div>
              ))}
              {yesParts.length === 0 && <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', gridColumn: '1 / -1' }}>Chưa có ai</span>}
            </div>

            <div style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>👎 Không tham gia ({noParts.length})</div>
            <div className={styles.participantsGrid} style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
              {noParts.map(p => (
                <div key={p.id} className={styles.participantCheckbox} style={{ padding: '0.4rem', cursor: 'default' }}>
                  <img src={getAvatarUrl(p.user?.avatar_url)} style={{ width: '20px', height: '20px', borderRadius: '50%' }} alt="" />
                  <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.user?.name}</span>
                </div>
              ))}
              {noParts.length === 0 && <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', gridColumn: '1 / -1' }}>Chưa có ai</span>}
            </div>

            <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>⏳ Chưa vote ({pendingParts.length})</div>
            <div className={styles.participantsGrid} style={{ marginBottom: '0.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
              {pendingParts.map(p => (
                <div key={p.id} className={styles.participantCheckbox} style={{ padding: '0.4rem', cursor: 'default', opacity: 0.7 }}>
                  <img src={getAvatarUrl(p.user?.avatar_url)} style={{ width: '20px', height: '20px', borderRadius: '50%' }} alt="" />
                  <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.user?.name}</span>
                </div>
              ))}
              {pendingParts.length === 0 && <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', gridColumn: '1 / -1' }}>Tất cả đã vote</span>}
            </div>
          </div>
        </div>
      )}

      {/* TABS - STEP 1: READ-ONLY VOTE SECTION (ONLY IF NOT VOTING) */}
      {!isVoting && (
        <div className={styles.section} style={{ padding: 0, overflow: 'hidden' }}>
          <div 
            onClick={() => setShowVoteStep(!showVoteStep)}
            style={{ padding: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-tertiary)' }}
          >
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8 }}>
              <ThumbsUp size={16} /> Bước 1: Kết quả Điểm danh ({yesParts.length} Đi / {noParts.length} Nghỉ)
              <span style={{ fontSize: '0.7rem', background: '#cbd5e1', color: 'black', padding: '0.1rem 0.4rem', borderRadius: '1rem' }}>Đã Khóa</span>
            </div>
            {showVoteStep ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
          </div>

          {showVoteStep && (
            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', opacity: 0.8, pointerEvents: 'none' }}>
              <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>👍 Sẽ tham gia ({yesParts.length})</div>
              <div className={styles.participantsGrid} style={{ marginBottom: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                {yesParts.map(p => (
                  <div key={p.id} className={styles.participantCheckbox} style={{ padding: '0.4rem', cursor: 'default' }}>
                    <img src={getAvatarUrl(p.user?.avatar_url)} style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                    <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.user?.name}</span>
                  </div>
                ))}
              </div>

              <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>👎 Không tham gia ({noParts.length})</div>
              <div className={styles.participantsGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                {noParts.map(p => (
                  <div key={p.id} className={styles.participantCheckbox} style={{ padding: '0.4rem', cursor: 'default' }}>
                    <img src={getAvatarUrl(p.user?.avatar_url)} style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                    <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.user?.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* GLOBAL RULES SECTION */}
      {rules.length > 0 && (
        <div className={styles.section} style={{ padding: '1rem' }}>
          <div className={styles.sectionHeader} style={{ fontSize: '0.95rem', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ScrollText size={16} className={styles.sectionIcon} />
              Quy định chung (Toàn nhóm)
            </div>
            {canManage && (
              <Link href="/cost-splitting/rules" style={{ fontSize: '0.75rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none', fontWeight: 600 }}>
                <Settings size={12} /> Quản lý
              </Link>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.5rem' }}>
            {rules.map((r: any) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: '0.4rem', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ color: '#eab308', marginTop: '2px' }}><AlertTriangle size={13} /></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: '1.2' }}>{r.rule_text}</div>
                  {!!r.penalty_amount && (
                    <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700, marginTop: '0.1rem' }}>
                      Phạt: {formatVND(r.penalty_amount)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTION BANNER TO START SPLIT (Voting phase) or EDIT (Splitting phase) */}
      {canManage && isVoting && !startSplitOpen ? (
        <div className={styles.section} style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.1))', borderColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calculator size={20} /> Bước 2: Sẵn sàng chốt sổ?</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              {isPollLocked ? 'Điểm danh đã được khóa. Bắt đầu tính tiền!' : 'Khóa chốt lại danh sách điểm danh trên để tiến hành phân chia chi phí.'}
            </p>
          </div>
          {isPollLocked ? (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className={styles.adjustBtn} onClick={handleReopenPoll} style={{ padding: '0.6rem 1rem', margin: 0 }}>Mở lại Poll</button>
              <button className={styles.submitBtn} onClick={openStartSplitStep} style={{ width: 'auto', padding: '0.6rem 1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Bắt đầu nhập bill <Calculator size={16} />
              </button>
            </div>
          ) : (
            <button onClick={handleLockPoll} style={{ width: 'auto', padding: '0.6rem 1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#1e293b', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
              Khóa Điểm Danh <Lock size={16} />
            </button>
          )}
        </div>
      ) : canManage && !isVoting && !startSplitOpen && !isClosed ? (
        <div className={styles.section} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(59, 130, 246, 0.05)' }}>
          <div>
            <div style={{ color: '#1e293b', fontSize: '1rem', fontWeight: 600 }}>Chi phí đã được khóa 🔒</div>
            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Bạn có thể sửa lại hóa đơn nếu lỡ nhập sai chi phí.</div>
          </div>
          <button className={styles.adjustBtn} onClick={openStartSplitStep} style={{ border: '1px solid #cbd5e1', padding: '0.5rem 1rem' }}>
            <Edit size={14} /> Sửa hóa đơn
          </button>
        </div>
      ) : null}

      {/* TABS - STEP 2: SPLIT INLINE FORM */}
      {startSplitOpen && (
        <div className={styles.section} style={{ border: '2px solid #3b82f6', padding: '0', overflow: 'hidden' }}>
          <div style={{ background: '#3b82f6', color: 'white', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calculator size={18} /> Bước 2: Nhập Chi Phí Hóa Đơn</div>
            <button onClick={() => setStartSplitOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0.2rem' }}>Thoát X</button>
          </div>
          
          <div style={{ padding: '1.5rem' }}>
            <div className={styles.formSectionTitle} style={{ marginTop: 0 }}>1. Nhập chi phí sân cầu nước</div>
            <div className={styles.feeRow} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div>
                <label className={styles.modalLabel}>Tiền sân</label>
                <input type="number" className={styles.modalInput} value={courtFee} onChange={e => setCourtFee(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className={styles.modalLabel}>Tiền cầu</label>
                <input type="number" className={styles.modalInput} value={shuttleFee} onChange={e => setShuttleFee(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className={styles.modalLabel}>Tiền nước</label>
                <input type="number" className={styles.modalInput} value={drinkFee} onChange={e => setDrinkFee(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 600, marginBottom: '1.5rem', textAlign: 'right', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
              💰 Tổng cộng: {formatVND(previewTotalAmt)}
            </div>

            <div className={styles.formSectionTitle}>2. Phụ phí (Người chi tiền trước)</div>
            <div className={styles.modalLabel} style={{ marginBottom: '0.5rem', color: '#64748b' }}>
              Ai ứng tiền ra mua đồ? Sẽ được trả lại bằng cách TRỪ đi số tiền đó lúc TỔNG KẾT cho những người này.
            </div>
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
              {advancePayers.map((adv, idx) => (
                <div key={adv.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 2fr auto', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'flex-end' }}>
                  <div>
                    {idx === 0 && <label className={styles.modalLabel} style={{ fontSize: '0.75rem' }}>Thành viên ứng</label>}
                    <select className={styles.modalInput} value={adv.user_id} onChange={e => {
                      const newAdvs = [...advancePayers];
                      newAdvs[idx].user_id = e.target.value;
                      setAdvancePayers(newAdvs);
                    }}>
                      <option value="">-- Chọn --</option>
                      {participants.map(p => (
                        <option key={p.user_id} value={p.user_id}>{p.user?.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {idx === 0 && <label className={styles.modalLabel} style={{ fontSize: '0.75rem' }}>Số tiền (VND)</label>}
                    <input type="number" className={styles.modalInput} value={adv.amount} onChange={e => {
                      const newAdvs = [...advancePayers];
                      newAdvs[idx].amount = e.target.value;
                      setAdvancePayers(newAdvs);
                    }} placeholder="0" />
                  </div>
                  <div>
                    {idx === 0 && <label className={styles.modalLabel} style={{ fontSize: '0.75rem' }}>Ghi chú phụ phí</label>}
                    <input className={styles.modalInput} value={adv.note} onChange={e => {
                      const newAdvs = [...advancePayers];
                      newAdvs[idx].note = e.target.value;
                      setAdvancePayers(newAdvs);
                    }} placeholder="Mua cầu x2, 1 lavie" />
                  </div>
                  <button onClick={() => setAdvancePayers(advancePayers.filter(a => a.id !== adv.id))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.4rem', paddingBottom: '0.6rem' }} title="Xóa">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => setAdvancePayers([...advancePayers, { id: `new-${Date.now()}`, user_id: '', amount: '', note: '' }])}
                style={{ background: 'transparent', border: '1px dashed #cbd5e1', padding: '0.5rem 1rem', borderRadius: '0.3rem', color: '#3b82f6', cursor: 'pointer', fontSize: '0.85rem', width: '100%', marginTop: advancePayers.length ? '0.5rem' : 0 }}
              >
                + Thêm người ứng tiền
              </button>
            </div>

            <div className={styles.formSectionTitle}>3. Tài khoản nhận tiền quỹ (Quét QR 1 chạm)</div>
            <div className={styles.modalField} style={{ marginBottom: '1.5rem' }}>
              <input ref={qrFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleQrUpload} />
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div 
                  className={styles.uploadArea} 
                  onClick={() => qrFileRef.current?.click()} 
                  style={{ width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, padding: '1rem' }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <Upload size={24} style={{ margin: '0 auto', color: '#64748b', opacity: 0.5 }} />
                    <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#64748b' }}>{uploading ? 'Đang tải...' : 'Tải QR Mới'}</div>
                  </div>
                </div>

                {qrImageUrl && (
                  <div style={{ padding: '0.2rem', border: '2px solid #3b82f6', borderRadius: '0.5rem', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '-10px', left: '10px', background: '#3b82f6', color: 'white', fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '1rem' }}>Đang chọn</div>
                    <img src={qrImageUrl} style={{ width: '122px', height: '122px', objectFit: 'contain', borderRadius: '0.3rem' }} alt="Selected QR" />
                  </div>
                )}
                
                {recentQRs.map((url, i) => {
                  if (url === qrImageUrl) return null;
                  return (
                    <div key={i} onClick={() => setQrImageUrl(url)} title="Dùng lại mã này" style={{ padding: '0.2rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', cursor: 'pointer', opacity: 0.6, transition: '0.2s', filter: 'grayscale(100%)' }} onMouseEnter={e => e.currentTarget.style.filter = 'grayscale(0%)'} onMouseLeave={e => e.currentTarget.style.filter = 'grayscale(100%)'}>
                      <img src={url} style={{ width: '122px', height: '122px', objectFit: 'contain', borderRadius: '0.3rem' }} alt="Recent QR" />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.formSectionTitle}>4. Những ai sẽ tham gia chia tiền? ({payingParts.length} người)</div>
            <div className={styles.modalLabel} style={{ marginBottom: '0.5rem', color: '#64748b' }}>
              Mặc định những ai Vote "Đi" (👍) sẽ được tick sẵn và phải đóng tiền. Tự do tick thêm hoặc bỏ tick.
            </div>
            <div className={styles.participantsGrid} style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
              {participants.map(p => {
                const isSelected = payingParts.includes(p.user_id);
                return (
                  <div key={p.user_id} className={`${styles.participantCheckbox} ${isSelected ? styles.checked : ''}`} onClick={() => togglePayingPart(p.user_id)} style={{ padding: '0.4rem', gap: '0.25rem' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.25rem', overflow: 'hidden' }}>
                      {p.user?.avatar_url && <img src={getAvatarUrl(p.user.avatar_url)} className={styles.cbAvatar} style={{ width: '20px', height: '20px', flexShrink: 0 }} />}
                      <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.user?.name}</span>
                    </div>
                    {p.vote_status === 'yes' && <ThumbsUp size={10} color="#10b981" style={{ flexShrink: 0 }} />}
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <button className={`${styles.modalBtn} ${styles.modalBtnCancel}`} onClick={() => setStartSplitOpen(false)} style={{ margin: 0 }}>Nhấn Hủy</button>
              <button className={`${styles.modalBtn} ${styles.modalBtnPrimary}`} onClick={handleStartSplit} style={{ margin: 0 }}>
                {isVoting ? 'Chốt Sổ & Chia Tiền' : 'Lưu Thay Đổi Hóa Đơn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CALCULATION PRINCIPLES */}
      {!isVoting && !startSplitOpen && (
        <div className={styles.section} style={{ background: 'rgba(59, 130, 246, 0.03)', borderStyle: 'dashed', padding: '1rem' }}>
          <div className={styles.sectionHeader} style={{ fontSize: '0.9rem', color: '#3b82f6', borderBottomStyle: 'dashed', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calculator size={16} className={styles.sectionIcon} /> 
              Nguyên tắc chia tiền (Cách tính)
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <XCircle size={12} color="#94a3b8" /> Thành viên Không đi
              </div>
              Những người này chỉ tính <span style={{ color: '#3b82f6', fontWeight: 600 }}>Tiền sân</span> (nếu có tên trong danh sách nộp). Miễn tiền Cầu & Nước.
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertTriangle size={12} color="#eab308" /> Tiền phạt (Penalty)
              </div>
              Được <span style={{ color: '#10b981', fontWeight: 600 }}>giảm trừ trực tiếp</span> vào tổng hóa đơn chung trước khi chia.
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <CheckCircle2 size={12} color="#10b981" /> Thành viên Có đi
              </div>
              Đóng tiền sân + Chia đều phần bill còn lại sau khi đã trừ phạt & phí người không đi.
            </div>
          </div>
        </div>
      )}

      {/* FINAL BREAKDOWN (Only if splitting or closed, AND not editing) */}
      {!isVoting && !startSplitOpen && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Receipt size={18} className={styles.sectionIcon} />
            Bước 3: Tổng chi phí cần thu
          </div>
          <div className={styles.breakdownGrid}>
            <div className={styles.breakdownItem}>
              <div className={styles.breakdownLabel}>🏟️ Tiền sân</div>
              <div className={`${styles.breakdownValue} ${styles.court}`}>
                {formatVND(session.total_court_fee)}
              </div>
            </div>
            <div className={styles.breakdownItem}>
              <div className={styles.breakdownLabel}>🏸 Tiền cầu</div>
              <div className={`${styles.breakdownValue} ${styles.shuttle}`}>
                {formatVND(session.total_shuttle_fee)}
              </div>
            </div>
            <div className={styles.breakdownItem}>
              <div className={styles.breakdownLabel}>💧 Tiền nước</div>
              <div className={`${styles.breakdownValue} ${styles.drink}`}>
                {formatVND(session.total_drink_fee)}
              </div>
            </div>
            <div className={`${styles.breakdownItem} ${styles.breakdownTotal}`}>
              <div className={styles.breakdownLabel}>💰 Tổng cộng</div>
              <div className={`${styles.breakdownValue} ${styles.total}`}>
                {formatVND(session.total_amount)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Payment & Final Participant List */}
      {!isVoting && !startSplitOpen && (
        <>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <QrCode size={18} className={styles.sectionIcon} />
              Quét mã QR Thanh toán
            </div>
            <div className={styles.qrContainer}>
              {session.qr_image_url ? (
                <img src={session.qr_image_url} alt="QR Code" className={styles.qrImage} />
              ) : (
                <div className={styles.noQr}>
                  <QrCode size={48} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                  <p>Chưa cập nhật QR code</p>
                </div>
              )}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <User size={18} className={styles.sectionIcon} />
              Danh sách nộp tiền ({activeSplittingParts.length} người — 💰 {paidCount} người đã trả)
            </div>

            <table className={styles.participantTable}>
              <thead>
                <tr style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.5rem' }}>THÀNH VIÊN</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>SÂN</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>CẦU/NƯỚC</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>PHẠT/CỘNG</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>TỔNG</th>
                  <th style={{ padding: '0.5rem' }}></th>
                </tr>
              </thead>
              <tbody>
                {activeSplittingParts.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>Trống</td></tr>
                )}
                {activeSplittingParts.map((p: any) => {
                  const voteConfig = VOTE_STATUS_CONFIG[p.vote_status] || VOTE_STATUS_CONFIG.pending;
                  const VoteIcon = voteConfig.icon;
                  return (
                    <tr key={p.id} className={styles.participantRow}>
                      <td>
                        <div className={styles.participantUser}>
                          {(p.user?.avatar_url || true) && (
                            <img src={getAvatarUrl(p.user?.avatar_url)} alt={p.user?.name} className={styles.avatar} style={{ width: '24px', height: '24px' }} />
                          )}
                          <div>
                            <span className={styles.userName} style={{ fontSize: '0.85rem' }}>{p.user?.name || 'N/A'}</span>
                            <div className={styles.voteStatusInline} style={{ color: voteConfig.color, fontSize: '0.65rem' }}>
                              <VoteIcon size={10} /> {voteConfig.label}
                              {p.attendance_override === 'force_absent' && p.vote_status === 'yes' && (
                                <span style={{ marginLeft: '0.3rem', color: '#94a3b8', fontStyle: 'italic' }}>(Vắng)</span>
                              )}
                              {p.attendance_override === 'force_present' && p.vote_status !== 'yes' && (
                                <span style={{ marginLeft: '0.3rem', color: '#10b981', fontStyle: 'italic' }}>(Có đi)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={styles.amountCell} style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {formatVND(p.court_amount || 0)}
                      </td>
                      <td className={styles.amountCell} style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {formatVND(p.shuttle_amount || 0)}
                      </td>
                      <td className={styles.amountCell} style={{ textAlign: 'right' }}>
                        {p.adjustment !== 0 && (
                          <div className={p.adjustment > 0 ? styles.adjustmentPositive : styles.adjustmentNegative} style={{ display: 'inline-block' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>
                              {p.adjustment > 0 ? '+' : ''}{formatVND(p.adjustment)}
                            </div>
                            {p.adjustment_note && (
                              <div style={{ fontSize: '0.65rem', fontStyle: 'italic', opacity: 0.8, maxWidth: '80px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {p.adjustment_note}
                              </div>
                            )}
                          </div>
                        )}
                        {p.adjustment === 0 && <span style={{ color: '#64748b', fontSize: '0.75rem' }}>-</span>}
                      </td>
                      <td className={styles.amountCell} style={{ textAlign: 'right' }}>
                        <div className={styles.finalAmount} style={{ 
                          fontSize: '0.9rem', 
                          fontWeight: 700, 
                          color: p.final_amount < 0 ? '#ef4444' : 'var(--text-primary)' 
                        }}>
                          {formatVND(p.final_amount)}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          {canManage && (
                            <button className={styles.adjustBtn} onClick={() => openAdjustModal(p)} title="Sửa phạt/phụ thu" style={{ padding: '0.4rem' }}>
                              <Edit size={12} />
                            </button>
                          )}
                          <button
                            className={`${styles.paidBadge} ${p.is_paid ? styles.paid : styles.unpaid}`}
                            onClick={() => isSplitting && canManage && handleTogglePaid(p)}
                            disabled={!isSplitting || !canManage}
                            style={{ 
                              padding: '0.3rem 0.5rem', 
                              fontSize: '0.65rem', 
                              borderRadius: '0.3rem',
                              border: 'none',
                              cursor: (isSplitting && canManage) ? 'pointer' : 'default',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              minWidth: '60px',
                              justifyContent: 'center'
                            }}
                          >
                            {p.is_paid ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                            {p.is_paid ? 'Xong' : 'Chưa'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Actions */}
      {canManage && (
        <div className={styles.actionBar}>
          {!isVoting && (isSplitting ? (
            <button className={`${styles.actionBtn} ${styles.close}`} onClick={handleCloseSession}>
              <Lock size={16} /> Khóa chốt phiên (Đóng)
            </button>
          ) : (
            <button className={`${styles.actionBtn} ${styles.reopen}`} onClick={handleReopenSession}>
              <Unlock size={16} /> Mở lại chia tiền
            </button>
          ))}
          {isVoting && !startSplitOpen && (
            <button className={`${styles.actionBtn} ${styles.delete}`} onClick={handleDelete} style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444' }}>
              <Trash2 size={16} /> Xóa phiên
            </button>
          )}
        </div>
      )}

      {/* Adjustment Modal */}
      {adjustModal && (
        <div className={styles.modalOverlay} onClick={() => setAdjustModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>Cộng trừ phụ thu / phạt — {adjustModal?.user?.name || adjustModal?.name}</div>
            
            {rules.length > 0 && (
              <div style={{ marginBottom: '1.2rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>Chọn luật phạt nhanh:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {rules.map(r => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setAdjustAmount(String(r.penalty_amount));
                        setAdjustNote(r.rule_text);
                        // Auto-set the correct override if the rule mentions absence or presence
                        if (r.rule_text.toLowerCase().includes('không đến') || r.rule_text.toLowerCase().includes('hủy kèo')) {
                          setAdjustAttendanceOverride('force_absent');
                        } else if (r.rule_text.toLowerCase().includes('nhưng đến sân')) {
                          setAdjustAttendanceOverride('force_present');
                        }
                      }}
                      style={{
                        background: adjustNote === r.rule_text ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                        border: adjustNote === r.rule_text ? '1px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '0.3rem',
                        padding: '0.4rem 0.75rem',
                        color: '#3b82f6',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {r.rule_text} ({formatVND(r.penalty_amount)})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.modalField} style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.2rem', border: '1px solid var(--border-color)' }}>
              <label className={styles.modalLabel} style={{ marginBottom: '0.5rem' }}>Xác nhận đi thực tế (Không đổi Vote)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                <button 
                  onClick={() => setAdjustAttendanceOverride('follow_vote')}
                  style={{ 
                    padding: '0.4rem', fontSize: '0.75rem', borderRadius: '0.3rem', border: '1px solid var(--border-color)',
                    background: adjustAttendanceOverride === 'follow_vote' ? 'rgba(148, 163, 184, 0.1)' : 'transparent',
                    color: adjustAttendanceOverride === 'follow_vote' ? 'var(--text-primary)' : '#94a3b8',
                    fontWeight: adjustAttendanceOverride === 'follow_vote' ? 700 : 400, cursor: 'pointer'
                  }}
                >
                  Theo Vote
                </button>
                <button 
                  onClick={() => setAdjustAttendanceOverride('force_absent')}
                  style={{ 
                    padding: '0.4rem', fontSize: '0.75rem', borderRadius: '0.3rem', border: '1px solid var(--border-color)',
                    background: adjustAttendanceOverride === 'force_absent' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                    color: adjustAttendanceOverride === 'force_absent' ? '#ef4444' : '#94a3b8',
                    fontWeight: adjustAttendanceOverride === 'force_absent' ? 700 : 400, cursor: 'pointer'
                  }}
                >
                  Vắng (Sân)
                </button>
                <button 
                  onClick={() => setAdjustAttendanceOverride('force_present')}
                  style={{ 
                    padding: '0.4rem', fontSize: '0.75rem', borderRadius: '0.3rem', border: '1px solid var(--border-color)',
                    background: adjustAttendanceOverride === 'force_present' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                    color: adjustAttendanceOverride === 'force_present' ? '#10b981' : '#94a3b8',
                    fontWeight: adjustAttendanceOverride === 'force_present' ? 700 : 400, cursor: 'pointer'
                  }}
                >
                  Có đi (Full)
                </button>
              </div>
              <p style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.6rem', fontStyle: 'italic' }}>
                {adjustAttendanceOverride === 'follow_vote' && '💡 Tính tiền dựa trên nút Đi/Nghỉ họ đã chọn.'}
                {adjustAttendanceOverride === 'force_absent' && '💡 Chỉ tính tiền sân (Miễn cầu/nước), không đổi màu vote.'}
                {adjustAttendanceOverride === 'force_present' && '💡 Tính đủ tiền sân + cầu + nước, không đổi màu vote.'}
              </p>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Số tiền cộng/trừ (VND)</label>
              <input type="number" className={styles.modalInput} value={adjustAmount}
                onChange={e => setAdjustAmount(e.target.value)} placeholder="VD: +20000 hoặc -10000" />
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Ghi chú phạt / phụ thu</label>
              <textarea className={styles.modalTextarea} value={adjustNote}
                onChange={e => setAdjustNote(e.target.value)} placeholder="VD: Đến muộn 30 phút, phạt 20,000đ" />
            </div>
            <div className={styles.modalActions}>
              <button className={`${styles.modalBtn} ${styles.modalBtnCancel}`} onClick={() => setAdjustModal(null)}>Hủy</button>
              <button className={`${styles.modalBtn} ${styles.modalBtnPrimary}`} onClick={handleAdjust}>Lưu Thay Đổi</button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Session Detail Modal */}
      {editSessionOpen && (
        <div className={styles.modalOverlay} onClick={() => setEditSessionOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>Sửa thông tin phiên</div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Tên phiên / Ghi chú buổi</label>
              <input 
                className={styles.modalInput} 
                value={editTitle} 
                onChange={e => setEditTitle(e.target.value)} 
                placeholder="Buổi cầu T3 30/3..."
              />
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Ngày giờ chơi</label>
              <input 
                type="datetime-local" 
                className={styles.modalInput} 
                value={editDate} 
                onChange={e => setEditDate(e.target.value)} 
              />
            </div>
            <div className={styles.modalActions}>
              <button className={`${styles.modalBtn} ${styles.modalBtnCancel}`} onClick={() => setEditSessionOpen(false)}>Hủy</button>
              <button className={`${styles.modalBtn} ${styles.modalBtnPrimary}`} onClick={handleUpdateSessionInfo}>Cập nhật</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
