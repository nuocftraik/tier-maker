"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, ScrollText, Plus, Trash2, Save, X, Settings, PenLine } from 'lucide-react';
import styles from '../CostSplitting.module.css';

function formatVND(amount: number) {
  return (amount || 0).toLocaleString('vi-VN') + 'đ';
}

export default function GlobalRulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New rule state
  const [newRuleText, setNewRuleText] = useState('');
  const [newRulePenalty, setNewRulePenalty] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRuleText, setEditRuleText] = useState('');
  const [editRulePenalty, setEditRulePenalty] = useState('');

  const fetchRules = useCallback(() => {
    fetch('/api/cost-rules')
      .then(res => res.json())
      .then(data => {
        setRules(data.rules || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleAddRule = async () => {
    if (!newRuleText.trim()) return;
    
    await fetch('/api/cost-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rule_text: newRuleText,
        penalty_amount: newRulePenalty
      })
    });
    
    setNewRuleText('');
    setNewRulePenalty('');
    fetchRules();
  };

  const handleStartEdit = (rule: any) => {
    setEditingId(rule.id);
    setEditRuleText(rule.rule_text);
    setEditRulePenalty(String(rule.penalty_amount));
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editRuleText.trim()) return;

    await fetch(`/api/cost-rules/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rule_text: editRuleText,
        penalty_amount: editRulePenalty
      })
    });

    setEditingId(null);
    fetchRules();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa quy định này? Nội quy chung này sẽ bị mất đối với tất cả các phiên tương lai!')) return;
    
    await fetch(`/api/cost-rules/${id}`, { method: 'DELETE' });
    fetchRules();
  };

  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <Settings size={48} />
            <p>Đang tải nội quy...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <div className={styles.detailHeader}>
          <Link href="/cost-splitting" className={styles.backLink}>
            <ArrowLeft size={16} /> Quay lại danh sách
          </Link>
          <h1 className={styles.detailTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ScrollText /> Nội quy & Phạt chung
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Danh sách nội quy này sẽ hiển thị ở TẤT CẢ các phiên chia tiền. 
            Ai cũng có thể xem và đóng góp ý kiến để cập nhật.
          </p>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Settings size={18} className={styles.sectionIcon} />
            Danh sách ({rules.length})
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {rules.map(rule => (
              <div key={rule.id} className={styles.ruleItem}>
                <div className={styles.ruleIcon}>⚠️</div>
                
                {editingId === rule.id ? (
                  <div style={{ flex: 1, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input 
                      className={styles.fieldInput} 
                      value={editRuleText} 
                      onChange={e => setEditRuleText(e.target.value)} 
                      style={{ flex: 2, minWidth: '200px' }}
                    />
                    <input 
                      type="number" 
                      className={styles.fieldInput} 
                      value={editRulePenalty} 
                      onChange={e => setEditRulePenalty(e.target.value)} 
                      style={{ flex: 1, minWidth: '100px' }}
                      placeholder="Tiền phạt"
                    />
                    <button className={styles.adjustBtn} onClick={handleSaveEdit} style={{ background: '#10b981', color: 'white', border: 'none' }}>
                      <Save size={16} /> Lưu
                    </button>
                    <button className={styles.adjustBtn} onClick={() => setEditingId(null)}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={styles.ruleContent}>
                      <div className={styles.ruleText} style={{ fontWeight: 600, fontSize: '1rem' }}>{rule.rule_text}</div>
                      {rule.penalty_amount > 0 && (
                        <div className={styles.rulePenalty} style={{ color: '#ef4444', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                          Phạt: {formatVND(rule.penalty_amount)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className={styles.adjustBtn} onClick={() => handleStartEdit(rule)}>
                        <PenLine size={14} />
                      </button>
                      <button className={styles.ruleDeleteBtn} onClick={() => handleDelete(rule.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            
            {rules.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                Chưa có nội quy chung nào. Hãy thêm nội quy mới bên dưới.
              </div>
            )}
          </div>
        </div>

        <div className={styles.section} style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(16, 185, 129, 0.05))' }}>
          <div className={styles.sectionHeader}>
            <Plus size={18} className={styles.sectionIcon} />
            Thêm quy định mới
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className={styles.fieldInput}
              placeholder="VD: Không trả cầu sau giờ chơi"
              value={newRuleText}
              onChange={e => setNewRuleText(e.target.value)}
              style={{ flex: 2, minWidth: '250px' }}
            />
            <input
              type="number"
              className={styles.fieldInput}
              placeholder="Mức phạt (0 nếu không phạt)"
              value={newRulePenalty}
              onChange={e => setNewRulePenalty(e.target.value)}
              style={{ flex: 1, minWidth: '150px' }}
            />
            <button 
              className={styles.submitBtn} 
              onClick={handleAddRule} 
              disabled={!newRuleText.trim()}
              style={{ padding: '0.65rem 1.25rem', width: 'auto' }}
            >
              Thêm quy định
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
