import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { TierCard } from './TierCard';
import styles from './MemberPool.module.css';

interface MemberPoolProps {
  unassignedUsers: any[];
  onScoreSave: (userId: string, newScore: number) => void;
  onUnvote: (userId: string) => void;
}

export const MemberPool: React.FC<MemberPoolProps> = ({ unassignedUsers, onScoreSave, onUnvote }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: 'unassigned-pool',
    data: { tier: 'unassigned' },
  });

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Danh sách chờ ({unassignedUsers.length})</h3>
      <p className={styles.subtitle}>Kéo thả các thành viên dưới đây vào các Tier ở trên hoặc click để chấm điểm</p>
      
      <div 
        className={`${styles.pool} ${isOver ? styles.poolOver : ''}`} 
        ref={setNodeRef}
      >
        {unassignedUsers.map((user) => (
          <TierCard 
            key={user.id} 
            user={user} 
            onScoreSave={onScoreSave} 
            onUnvote={onUnvote}
          />
        ))}
      </div>
    </div>
  );
};
