import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { ScoreInput } from './ScoreInput';
import { X } from 'lucide-react';
import styles from './TierCard.module.css';

interface TierCardProps {
  user: any;
  currentVote?: any; // The vote given by the current session user
  onScoreSave: (userId: string, newScore: number) => void;
  onUnvote: (userId: string) => void;
}

export const TierCard: React.FC<TierCardProps> = ({ user, currentVote, onScoreSave, onUnvote }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: user.id,
    data: { user, currentVote },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const score = currentVote ? currentVote.score : null;

  // Single click starts editing if already voted, otherwise drag handles placing
  const handleClick = (e: React.MouseEvent) => {
    // Only allow clicking to edit if we are not dragging, and we actually want to open the editor
    // We can also let the user click to give a score from anywhere
    setIsEditing(true);
  };

  const handleSave = (newScore: number) => {
    onScoreSave(user.id, newScore);
    setIsEditing(false);
  };

  const handleUnvoteClick = () => {
    onUnvote(user.id);
    setIsEditing(false);
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`${styles.card} ${isDragging ? styles.dragging : ''}`}
    >
      <div 
        className={styles.dragHandle} 
        {...listeners} 
        {...attributes}
        onClick={handleClick}
      >
        <Avatar src={user.avatar_url} alt={user.name} size="xl" shape="square" className={styles.avatarImage} />
        <div className={styles.nameOverlay}>{user.name}</div>
        
        {score !== null && (
          <div className={styles.scoreBadge}>{score.toFixed(1)}</div>
        )}
      </div>

      {score !== null && !isDragging && (
        <button 
          className={styles.unvoteBtn} 
          onClick={(e) => { e.stopPropagation(); onUnvote(user.id); }}
          title="Xóa vote"
        >
          <X size={10} strokeWidth={4} />
        </button>
      )}

      {isEditing && (
        <ScoreInput
          initialScore={score !== null ? score : 5.0} // Default 5.0 if not voted yet
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      )}
    </div>
  );
};
