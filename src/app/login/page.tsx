"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import styles from './page.module.css';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { Card } from '@/components/ui/Card/Card';
import { Avatar } from '@/components/ui/Avatar/Avatar';

type User = {
  id: string;
  name: string;
  avatar_url: string;
  is_admin: boolean;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Network error');
  return data;
};

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1); // 1 = Code, 2 = Select User
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  // Form State
  const [accessCode, setAccessCode] = useState('');
  const [password, setPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Validation / Status
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Users data
  const { data: users, error: usersError } = useSWR<User[]>('/api/users', fetcher);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode) {
      setError('Vui lòng nhập mã truy cập.');
      return;
    }
    setError('');
    // Normally we could validate the code via API here, but doing it together on final login saves an API call.
    setStep(2);
  };

  const handleLogin = async () => {
    if (!selectedUser) {
      setError('Vui lòng chọn tài khoản của bạn.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = isAdminMode
      ? { userId: selectedUser.id, password }
      : { userId: selectedUser.id, accessCode };

    const endpoint = isAdminMode ? '/api/auth/admin-login' : '/api/auth/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Đăng nhập thất bại');
      }

      router.push('/leaderboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.loginCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>INRES BADMINTON</h1>
          <p className={styles.subtitle}>
            {isAdminMode ? 'Đăng nhập Quản Trị' : 'Truy cập hệ thống xếp hạng'}
          </p>
        </div>

        {(error || usersError) && <div className={styles.errorBanner}>{error || usersError?.message}</div>}

        {step === 1 && !isAdminMode && (
          <form className={styles.form} onSubmit={handleNextStep}>
            <Input
              label="Mã truy cập CLB"
              type="text"
              placeholder="VD: inres2026"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              autoFocus
            />
            <Button type="submit" fullWidth>
              Tiếp tục
            </Button>
            <div className={styles.actions}>
              <button 
                type="button" 
                className={styles.linkButton}
                onClick={() => setIsAdminMode(true)}
              >
                Đăng nhập với tư cách Admin
              </button>
            </div>
          </form>
        )}

        {step === 1 && isAdminMode && (
          <form className={styles.form} onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
            <p className={styles.helperText}>Chọn tài khoản Admin của bạn ở bước tiếp theo.</p>
            <Button type="submit" fullWidth>
              Chọn Tài Khoản
            </Button>
            <div className={styles.actions}>
              <button 
                type="button" 
                className={styles.linkButton}
                onClick={() => setIsAdminMode(false)}
              >
                Quay lại đăng nhập Thành Viên
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className={styles.step2Container}>
            <p className={styles.helperText}>Bạn là ai?</p>
            
            {(!users && !usersError) && <div className={styles.loading}>Vui lòng chờ...</div>}
            
            <div className={styles.userGrid}>
              {Array.isArray(users) && users.map((u) => {
                // In admin mode, only show admins
                if (isAdminMode && !u.is_admin) return null;

                const isSelected = selectedUser?.id === u.id;
                
                return (
                  <button
                    key={u.id}
                    type="button"
                    className={`${styles.userCard} ${isSelected ? styles.userSelected : ''}`}
                    onClick={() => setSelectedUser(u)}
                  >
                    <Avatar 
                      src={u.avatar_url} 
                      alt={u.name} 
                      size="md" 
                      className={isSelected ? styles.avatarSelected : ''} 
                    />
                    <span className={styles.userName}>{u.name}</span>
                  </button>
                );
              })}
            </div>

            {isAdminMode && selectedUser && (
              <div className={styles.passwordField}>
                <Input
                  label="Mật khẩu Admin"
                  type="password"
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            <div className={styles.buttonGroup}>
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
                Quay lại
              </Button>
              <Button onClick={handleLogin} disabled={loading || !selectedUser || (isAdminMode && !password)}>
                {loading ? 'Đang vào...' : 'Đăng nhập'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
