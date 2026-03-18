import React, { useEffect, useState } from 'react';
import styles from './Fireworks.module.css';

export const Fireworks = () => {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    const generateExplosion = () => {
      return Array.from({ length: 40 }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const velocity = 80 + Math.random() * 150; // spread distance
        return {
          id: i,
          x: Math.cos(angle) * velocity,
          y: Math.sin(angle) * velocity - 100, // bias slightly upwards
          color: ['#ff3b30', '#ffcc00', '#4cd964', '#5ac8fa', '#007aff', '#ff2d55'][Math.floor(Math.random() * 6)],
          size: 4 + Math.random() * 6, // 4-10px diff sizes
        };
      });
    };

    setParticles(generateExplosion());
    
    // Optionally trigger a second explosion after a delay
    const timer = setTimeout(() => {
      setParticles(prev => [...prev, ...generateExplosion().map(p => ({ ...p, id: p.id + 100 }))]);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={styles.container}>
      {particles.map(p => (
        <div
          key={p.id}
          className={styles.particle}
          style={{
            '--tx': `${p.x}px`,
            '--ty': `${p.y}px`,
            backgroundColor: p.color,
            width: `${p.size}px`,
            height: `${p.size}px`,
          } as any}
        />
      ))}
    </div>
  );
};
