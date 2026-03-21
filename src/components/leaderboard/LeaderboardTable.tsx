import Link from 'next/link';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { Badge } from '@/components/ui/Badge/Badge';
import { Crown } from 'lucide-react';
import styles from './LeaderboardTable.module.css';

interface LeaderboardTableProps {
  players: any[];
  sTierSettings: any;
  showTopThree?: boolean;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ 
  players, 
  sTierSettings,
  showTopThree = true
}) => {
  // If we are showing the Top Three podium, skip them in the main list
  const displayPlayers = showTopThree && players.length >= 3 ? players.slice(3) : players;

  if (players.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>Danh sách trống hoặc chưa có dữ liệu đánh giá 🏸</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.header}>
        <div className={styles.colRank}>#</div>
        <div className={styles.colPlayer}>Tuyển thủ</div>
        <div className={styles.colTier}>Hạng (Tier)</div>
        <div className={styles.colScore}>Điểm</div>
      </div>
      
      <div className={styles.body}>
        <AnimatePresence mode='popLayout'>
          {displayPlayers.map((player) => {
            const isUnranked = player.tier === 'Unranked';
            const isSTier = player.tier === 'S';
            
            // Effect Checks
            const hasFire = isSTier && sTierSettings.tier_s_fire_effect;
            const hasCrown = player.rank === 1 && sTierSettings.tier_s_crown_effect;

            return (
              <motion.div
                key={player.user_id || player.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`${styles.row} ${isSTier && sTierSettings.tier_s_sparkle_effect ? styles.sparkleRow : ''}`}
              >
                <div className={styles.colRank}>
                  {isUnranked ? '-' : player.rank}
                </div>
                
                <Link href={`/profile/${player.user_id || player.id}`} className={styles.colPlayer} style={{ textDecoration: 'none' }}>
                  <div className={styles.avatarWrapper}>
                    {hasCrown && <Crown className={styles.crownIcon} size={16} strokeWidth={3} />}
                    <Avatar 
                      src={player.avatar_url} 
                      alt={player.name} 
                      size="md"
                      tierEffects={hasFire ? 'fire' : 'none'}
                    />
                  </div>
                  <div className={styles.playerInfo}>
                    <span className={styles.name}>{player.name}</span>
                    <span className={styles.votes}>{player.total_votes} votes</span>
                  </div>
                </Link>

                <div className={styles.colTier}>
                  <Badge tier={player.tier} />
                </div>

                <div className={styles.colScore}>
                  {isUnranked ? (
                    <span className={styles.mutedText}>N/A</span>
                  ) : (
                    <span className={styles.score}>{player.avg_score}</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
