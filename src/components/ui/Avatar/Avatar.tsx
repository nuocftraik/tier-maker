import React from 'react';
import Image from 'next/image';
import styles from './Avatar.module.css';

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
  className?: string;
  tierEffects?: 'fire' | 'sparkle' | 'none'; // Basic support for future S-tier effects
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'md',
  shape = 'circle',
  className = '',
  tierEffects = 'none',
}) => {
  // Extract initials if no image
  const initials = alt
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  let imageUrl = null;
  
  if (src) {
    if (src.startsWith('http')) {
      imageUrl = src;
    } else {
      imageUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${src}`;
      // Fallback if env variable is missing but we know the path
      if (!supabaseUrl && src) {
        imageUrl = `https://irwsevmjkrqhcwdbmyfo.supabase.co/storage/v1/object/public/avatars/${src}`;
      }
    }
  }

  return (
    <div
      className={`
        ${styles.container}
        ${styles[`size-${size}`]}
        ${styles[`shape-${shape}`]}
        ${tierEffects === 'fire' ? styles.fireEffect : ''}
        ${className}
      `}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className={styles.image}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      ) : (
        <div className={styles.fallback}>{initials}</div>
      )}
      {tierEffects === 'sparkle' && <div className={styles.sparkleEffect} />}
    </div>
  );
};
