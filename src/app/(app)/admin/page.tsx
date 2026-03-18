"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { Badge } from '@/components/ui/Badge/Badge';
import { Settings, Users, Shield, Plus, Edit2, Trash2 } from 'lucide-react';
import styles from './page.module.css';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
};

// --- Subcomponents ---

const DashboardTab = () => {
  const { data, error } = useSWR('/api/admin/stats', fetcher);
  if (error) return <div>Lỗi tải thống kê</div>;
  if (!data) return <div>Đang tải...</div>;

  return (
    <div className={styles.statsGrid}>
      <Card className={styles.statCard}>
        <h3>Tổng thành viên</h3>
        <p className={styles.statNumber}>{data.totalUsers}</p>
      </Card>
      <Card className={styles.statCard}>
        <h3>Lượt Vote hệ thống</h3>
        <p className={styles.statNumber}>{data.totalVotes}</p>
      </Card>
      <Card className={styles.statCard}>
        <h3>Quản trị viên</h3>
        <p className={styles.statNumber}>{data.totalAdmins}</p>
      </Card>
    </div>
  );
};

const MembersTab = () => {
  const { data: users, mutate } = useSWR('/api/users', fetcher);
  
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', avatar_url: '', is_admin: false, is_active: true });
  const [isAdding, setIsAdding] = useState(false);

  const resetForm = () => {
    setEditingUser(null);
    setIsAdding(false);
    setFormData({ name: '', avatar_url: '', is_admin: false, is_active: true });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isAdding) {
        await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }
      mutate();
      resetForm();
    } catch {
      alert('Lỗi lưu thay đổi');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa thành viên ${name}? Mọi dữ liệu vote của người này sẽ bị mất.`)) return;
    try {
      await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      mutate();
    } catch {
      alert('Lỗi xóa');
    }
  };

  if (!users) return <div>Đang tải...</div>;

  return (
    <div className={styles.membersContainer}>
      <div className={styles.membersHeader}>
        <h2>Quản lý Tuyển thủ</h2>
        <Button onClick={() => setIsAdding(true)} size="sm"><Plus size={16} /> Thêm Mới</Button>
      </div>

      {(isAdding || editingUser) && (
        <Card className={styles.formCard}>
          <h3>{isAdding ? 'Thêm thành viên mới' : 'Chỉnh sửa thành viên'}</h3>
          <form onSubmit={handleSave} className={styles.formGrid}>
            <Input 
              label="Tên hiển thị" 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
            <Input 
              label="Tên file ảnh (Avatar URL)" 
              value={formData.avatar_url} 
              onChange={e => setFormData({...formData, avatar_url: e.target.value})} 
              placeholder="VD: nv_a.png"
            />
            
            <div className={styles.checkboxes}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={formData.is_admin} onChange={e => setFormData({...formData, is_admin: e.target.checked})} />
                Quyền Admin
              </label>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                Đang hoạt động
              </label>
            </div>

            <div className={styles.formActions}>
              <Button type="button" variant="outline" onClick={resetForm}>Hủy</Button>
              <Button type="submit">Lưu</Button>
            </div>
          </form>
        </Card>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Avatar</th>
              <th>Tên</th>
              <th>Vai trò</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {(users as any[]).map(u => (
              <tr key={u.id}>
                <td><Avatar src={u.avatar_url} alt={u.name} size="sm" /></td>
                <td>{u.name}</td>
                <td>{u.is_admin ? <Badge tier="S" size="sm" /> : <Badge tier="Unranked" size="sm" />}</td>
                <td>
                  <div className={styles.actionBtns}>
                    <button onClick={() => { setEditingUser(u); setIsAdding(false); setFormData(u); }} className={styles.iconBtn}><Edit2 size={16}/></button>
                    <button onClick={() => handleDelete(u.id, u.name)} className={`${styles.iconBtn} ${styles.danger}`}><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SettingsTab = () => {
  const { data: settings, mutate } = useSWR('/api/admin/settings', fetcher);
  const [formData, setFormData] = useState<any>(null);

  if (!settings) return <div>Đang tải...</div>;
  if (!formData) setFormData(settings); // init

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      alert('Lưu cài đặt thành công');
      mutate();
    } catch {
      alert('Lỗi lưu cài đặt');
    }
  };

  return (
    <Card>
      <h2>Cài đặt Hệ Thống</h2>
      <form onSubmit={handleSave} className={styles.settingsForm}>
        <div className={styles.formSection}>
          <h3>Bảo mật</h3>
          <Input 
            label="Mã truy cập chung (Access Code)" 
            value={formData?.access_code || ''} 
            onChange={e => setFormData({...formData, access_code: e.target.value})} 
          />
          <Input 
            label="Mật khẩu Admin" 
            value={formData?.admin_password || ''} 
            onChange={e => setFormData({...formData, admin_password: e.target.value})} 
          />
        </div>

        <div className={styles.formSection}>
          <h3>Hiệu ứng & UI (Tier S)</h3>
          <label className={styles.toggleLabel}>
            <input type="checkbox" checked={formData?.tier_s_fire_effect === 'true'} onChange={e => setFormData({...formData, tier_s_fire_effect: e.target.checked ? 'true' : 'false'})} />
            Bật hiệu ứng cháy đỏ
          </label>
          <label className={styles.toggleLabel}>
            <input type="checkbox" checked={formData?.tier_s_sparkle_effect === 'true'} onChange={e => setFormData({...formData, tier_s_sparkle_effect: e.target.checked ? 'true' : 'false'})} />
            Bật rắc kim tuyến
          </label>
          <label className={styles.toggleLabel}>
            <input type="checkbox" checked={formData?.tier_s_crown_effect === 'true'} onChange={e => setFormData({...formData, tier_s_crown_effect: e.target.checked ? 'true' : 'false'})} />
            Hiển thị vương miện
          </label>
        </div>

        <Button type="submit">Lưu Cài Đặt</Button>
      </form>
    </Card>
  );
};

// --- Main Page ---

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Shield size={32} className={styles.icon} />
        <h1>TRUNG TÂM QUẢN TRỊ</h1>
      </div>

      <div className={styles.tabs}>
        <button className={activeTab === 'dashboard' ? styles.activeTab : ''} onClick={() => setActiveTab('dashboard')}>Tổng quan</button>
        <button className={activeTab === 'members' ? styles.activeTab : ''} onClick={() => setActiveTab('members')}>Thành viên</button>
        <button className={activeTab === 'settings' ? styles.activeTab : ''} onClick={() => setActiveTab('settings')}>Cài đặt</button>
      </div>

      <div className={styles.content}>
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'members' && <MembersTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}
