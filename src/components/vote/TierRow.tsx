import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { TierCard } from './TierCard';
import { Badge } from '@/components/ui/Badge/Badge';
import styles from './TierRow.module.css';

interface TierRowProps {
  tier: string;
  users: any[];
  votes: Record<string, any>;
  onScoreSave: (userId: string, newScore: number) => void;
  onUnvote: (userId: string) => void;
}

export const TierRow: React.FC<TierRowProps> = ({ tier, users, votes, onScoreSave, onUnvote }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `tier-${tier}`,
    data: { tier },
  });

  return (
    <div 
      className={`${styles.row} ${isOver ? styles.rowOver : ''}`} 
      ref={setNodeRef}
    >
      <div className={`${styles.labelArea} ${styles[`label-${tier.toLowerCase()}`]}`}>
        <span className={styles.labelText}>{tier === 'Bot' ? '🤖 Bot' : tier}</span>
      </div>
      
      <div className={styles.dropZone}>
        {users.map((user) => (
          <TierCard 
            key={user.id} 
            user={user} 
            currentVote={votes[user.id]} 
            onScoreSave={onScoreSave} 
            onUnvote={onUnvote}
          />
        ))}
        {users.length === 0 && (
          <div className={styles.placeholder}>Kéo vào đây</div> // Drag here
        )}
      </div>
    </div>
  );
};
