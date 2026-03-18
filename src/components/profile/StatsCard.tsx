import React from 'react';
import { Card } from '@/components/ui/Card/Card';
import { History, TrendingUp, Users, Activity } from 'lucide-react';
import styles from './StatsCard.module.css';

interface StatsCardProps {
  profile: any;
}

export const StatsCard: React.FC<StatsCardProps> = ({ profile }) => {
  const votes = profile.votesHistory || [];
  const validScores = votes.map((v: any) => v.score);
  
  const highestScore = validScores.length > 0 ? Math.max(...validScores).toFixed(1) : '-';
  const lowestScore = validScores.length > 0 ? Math.min(...validScores).toFixed(1) : '-';
  const recentTrend = validScores.length > 1 && validScores[0] > validScores[1] ? 'up' : 'down';

  return (
    <Card className={styles.statsContainer}>
      <h3 className={styles.title}><Activity size={20} /> Tổng Quan Phân Tích</h3>
      
      <div className={styles.grid}>
        <div className={styles.statBox}>
          <div className={styles.iconWrapper}><Users size={20} className={styles.iconPrimary} /></div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Lượt đánh giá</span>
            <span className={styles.statValue}>{profile.total_votes}</span>
          </div>
        </div>

        <div className={styles.statBox}>
          <div className={styles.iconWrapper}><TrendingUp size={20} className={styles.iconSuccess} /></div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Điểm Cực Đại</span>
            <span className={styles.statValue}>{highestScore}</span>
          </div>
        </div>

        <div className={styles.statBox}>
          <div className={styles.iconWrapper}><History size={20} className={styles.iconWarning} /></div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Điểm Cực Tiểu</span>
            <span className={styles.statValue}>{lowestScore}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
