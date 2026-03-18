import React from 'react';
import styles from './Badge.module.css';

type TierType = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'Bot' | 'Unranked';

interface BadgeProps {
  tier: TierType;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Badge: React.FC<BadgeProps> = ({
  tier,
  className = '',
  size = 'md',
}) => {
  const isSpecial = tier === 'S' || tier === 'Bot';
  const displayTier = tier === 'Bot' ? '🤖 Bot' : tier === 'Unranked' ? 'Chưa Xếp Hạng' : tier;

  return (
    <span
      className={`
        ${styles.badge}
        ${styles[`badge-${tier.toLowerCase()}`]}
        ${styles[`size-${size}`]}
        ${isSpecial ? styles.special : ''}
        ${className}
      `}
    >
      {displayTier}
    </span>
  );
};
