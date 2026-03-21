import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { Badge } from '@/components/ui/Badge/Badge';
import { Crown } from 'lucide-react';
import { Fireworks } from './Fireworks';
import styles from './TopThree.module.css';

interface TopThreeProps {
  topPlayers: any[];
  sTierSettings: any;
}

export const TopThree: React.FC<TopThreeProps> = ({ topPlayers, sTierSettings }) => {
  if (topPlayers.length < 3) return null;

  // Reorder for Podium: [2nd, 1st, 3rd]
  const podium = [topPlayers[1], topPlayers[0], topPlayers[2]];

  return (
    <div className={styles.podiumContainer}>
      <AnimatePresence>
        {podium.map((player, index) => {
          if (!player || player.tier === 'Unranked') return <div key={index} className={styles.emptySlot} />;

          const isFirst = index === 1; // Center is 1st place in the array
          const placeClass = isFirst ? styles.firstPlace : index === 0 ? styles.secondPlace : styles.thirdPlace;
          const showCrown = isFirst && sTierSettings.tier_s_crown_effect;
          
          let avatarEffects: 'none' | 'fire' | 'sparkle' = 'none';
          if (player.tier === 'S') {
            if (sTierSettings.tier_s_fire_effect) avatarEffects = 'fire';
            else if (sTierSettings.tier_s_sparkle_effect) avatarEffects = 'sparkle';
          }

          return (
            <motion.div
              key={player.user_id || player.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
              className={`${styles.podiumItem} ${placeClass}`}
            >
              <Link href={`/profile/${player.user_id || player.id}`} className={styles.profileLink}>
                <div className={styles.avatarWrapper}>
                  {showCrown && <Crown className={styles.crownIcon} size={32} strokeWidth={2.5} />}
                  <Avatar
                    src={player.avatar_url}
                    alt={player.name}
                    size={isFirst ? 'xl' : 'lg'}
                    tierEffects={avatarEffects}
                  />
                </div>
                
                <div className={styles.info}>
                  <span className={styles.name}>{player.name}</span>
                  <Badge tier={player.tier} size="sm" className={styles.badge} />
                  <span className={styles.score}>{player.avg_score} <span className={styles.scoreLabel}>điểm</span></span>
                  <span className={styles.votes}>{player.total_votes} votes</span>
                </div>
              </Link>
              
              <div className={`${styles.pedestal} ${styles[`pedestal-${placeClass}`]}`}>
                {isFirst ? '1st' : index === 0 ? '2nd' : '3rd'}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
