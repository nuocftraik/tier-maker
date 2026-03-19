"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import styles from './Navbar.module.css';
import { LogOut, Trophy, CheckSquare, User, ShieldAlert, Swords } from 'lucide-react';

export const Navbar = ({ session }: { session: any }) => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { name: 'Xếp hạng', href: '/leaderboard', icon: <Trophy size={18} /> },
    { name: 'Bỏ phiếu', href: '/vote', icon: <CheckSquare size={18} /> },
    { name: 'Trận đấu', href: '/matches', icon: <Swords size={18} /> },
    { name: 'Cá nhân', href: `/profile/${session?.id}`, icon: <User size={18} /> },
  ];

  if (session?.isAdmin) {
    navItems.push({ name: 'Admin', href: '/admin', icon: <ShieldAlert size={18} /> });
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <Link href="/leaderboard" className={styles.logo}>
            INRES 🏸
          </Link>
        </div>

        <div className={styles.links}>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              >
                {item.icon}
                <span className={styles.navText}>{item.name}</span>
              </Link>
            );
          })}
        </div>

        <div className={styles.actions}>
          <LanguageToggle />
          <ThemeToggle />
          <div className={styles.divider} />
          <button className={styles.logoutBtn} onClick={handleLogout} title="Đăng xuất">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
};
