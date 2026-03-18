import React from 'react';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { Badge } from '@/components/ui/Badge/Badge';
import { Crown } from 'lucide-react';
import styles from './ProfileCard.module.css';

interface ProfileCardProps {
  profile: any;
  sTierSettings: any;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ profile, sTierSettings }) => {
  const isUnranked = profile.tier === 'Unranked';
  const isSTier = profile.tier === 'S';
  const hasCrown = isSTier && sTierSettings?.tier_s_crown_effect;
  const hasFire = isSTier && sTierSettings?.tier_s_fire_effect;

  return (
    <div className={`${styles.card} ${isSTier ? styles.sTierCard : ''}`}>
      <div className={styles.avatarSection}>
        {hasCrown && <Crown className={styles.crownIcon} size={40} strokeWidth={2.5} />}
        <Avatar 
          src={profile.avatar_url} 
          alt={profile.name} 
          size="xl" 
          tierEffects={hasFire ? 'fire' : 'none'}
          className={styles.avatarMain}
        />
      </div>
      
      <div className={styles.infoSection}>
        <h2 className={styles.name}>{profile.name}</h2>
        <div className={styles.metrics}>
          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>HẠNG</span>
            <Badge tier={profile.tier} size="lg" />
          </div>
          
          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>RANKING</span>
            <span className={styles.metricValue}>
              #{isUnranked ? '-' : profile.rank}
            </span>
          </div>

          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>ĐIỂM SỐ</span>
            <span className={`${styles.metricValue} ${styles.scoreColor}`}>
              {isUnranked ? 'N/A' : profile.avg_score}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
