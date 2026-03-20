"use client";

import React, { useState, useEffect } from 'react';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { GripVertical, X, Users, Info } from 'lucide-react';
import styles from './GroupSeeder.module.css';

interface Player {
  id: string;
  name: string;
  avatar_url: string;
}

interface GroupSeederProps {
  players: Player[];
  groupCount: number;
  onSeedingChange: (orderedIdsWithGroups: { userId: string, group: number }[]) => void;
}

export const GroupSeeder: React.FC<GroupSeederProps> = ({ players, groupCount, onSeedingChange }) => {
  // groups: Array of arrays containing player IDs
  const [groups, setGroups] = useState<string[][]>([]);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<'pool' | number | null>(null); // 'pool' or group index

  // Sync state with players and groupCount
  useEffect(() => {
    setGroups(current => {
      const playerIds = new Set(players.map(p => p.id));
      
      // If group count changed or first mount
      if (current.length !== groupCount) {
        const nextGroups = Array.from({ length: groupCount }, () => [] as string[]);
        
        // Initial fill: Round robin distribution
        players.forEach((p, i) => {
          const gIdx = i % groupCount;
          nextGroups[gIdx].push(p.id);
        });
        return nextGroups;
      }
      
      // Keep same group structure but remove deselected players
      return current.map(group => group.filter(id => playerIds.has(id)));
    });
  }, [groupCount, players.length]);

  const unassignedPlayers = players.filter(p => !groups.flat().includes(p.id));

  const getPlayerById = (id: string) => players.find(p => p.id === id);

  const notifyChange = (newGroups: string[][]) => {
    setGroups(newGroups);
    // Flat map to payload-friendly format
    const result: { userId: string, group: number }[] = [];
    newGroups.forEach((group, gIdx) => {
      group.forEach(userId => {
        result.push({ userId, group: gIdx + 1 });
      });
    });
    // Add any unassigned at the end (group 0/unassigned)
    unassignedPlayers.forEach(p => {
        if (!result.find(r => r.userId === p.id)) {
            result.push({ userId: p.id, group: 0 });
        }
    });
    onSeedingChange(result);
  };

  const handleDropOnGroup = (gIdx: number) => {
    if (!draggedPlayerId) return;
    
    const newGroups = groups.map(g => [...g]);
    
    // Remove from source
    if (typeof dragSource === 'number') {
      newGroups[dragSource] = newGroups[dragSource].filter(id => id !== draggedPlayerId);
    }
    
    // Add to target
    newGroups[gIdx].push(draggedPlayerId);
    notifyChange(newGroups);
    setDraggedPlayerId(null);
    setDragSource(null);
  };

  const handleDropOnPool = () => {
    if (!draggedPlayerId || typeof dragSource !== 'number') return;
    const newGroups = groups.map(g => [...g]);
    newGroups[dragSource] = newGroups[dragSource].filter(id => id !== draggedPlayerId);
    notifyChange(newGroups);
    setDraggedPlayerId(null);
    setDragSource(null);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <h3 className={styles.topTitle}>Phân chia bảng đấu</h3>
        <p className={styles.hint}><Info size={14} /> Kéo VĐV vào bảng để sắp xếp</p>
      </div>

      <div className={styles.layout}>
        {/* Pool */}
        <div 
          className={styles.pool}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDropOnPool}
        >
          <div className={styles.poolHeader}>
            <Users size={16} />
            <span>Chưa gắn bảng ({unassignedPlayers.length})</span>
          </div>
          <div className={styles.poolList}>
            {unassignedPlayers.map(p => (
              <div 
                key={p.id} 
                className={styles.playerCard}
                draggable
                onDragStart={() => {
                  setDraggedPlayerId(p.id);
                  setDragSource('pool');
                }}
              >
                <GripVertical size={14} className={styles.grip} />
                <Avatar src={p.avatar_url} alt={p.name} size="sm" />
                <span className={styles.name}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Groups Grid */}
        <div className={styles.grid}>
          {groups.map((group, gIdx) => (
            <div 
              key={gIdx} 
              className={styles.groupCard}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDropOnGroup(gIdx)}
            >
              <div className={styles.groupHeader}>
                Bảng {String.fromCharCode(65 + gIdx)}
                <span className={styles.count}>{group.length} VĐV</span>
              </div>
              <div className={styles.groupList}>
                {group.map(id => {
                  const p = getPlayerById(id);
                  if (!p) return null;
                  return (
                    <div 
                      key={id} 
                      className={styles.playerCard}
                      draggable
                      onDragStart={() => {
                        setDraggedPlayerId(id);
                        setDragSource(gIdx);
                      }}
                    >
                      <GripVertical size={14} className={styles.grip} />
                      <Avatar src={p.avatar_url} alt={p.name} size="sm" />
                      <span className={styles.name}>{p.name}</span>
                      <button 
                        className={styles.removeBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDraggedPlayerId(id);
                          setDragSource(gIdx);
                          handleDropOnPool();
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
                {group.length === 0 && (
                  <div className={styles.emptyGroup}>Trống - Kéo VĐV vào đây</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
