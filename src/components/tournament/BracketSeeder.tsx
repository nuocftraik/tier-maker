"use client";

import React, { useState, useEffect } from 'react';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { GripVertical, X, Users } from 'lucide-react';
import styles from './BracketSeeder.module.css';

interface Player {
  id: string;
  name: string;
  avatar_url: string;
}

interface BracketSeederProps {
  players: Player[];             // All selected participants
  matchMode?: 'singles' | 'doubles';
  onSeedingChange: (orderedIds: string[]) => void;  // Callback with final ordering
}

export const BracketSeeder: React.FC<BracketSeederProps> = ({ players, matchMode, onSeedingChange }) => {
  // Calculate bracket structure
  const isDoubles = matchMode === 'doubles';
  const entityCount = isDoubles ? Math.ceil(players.length / 2) : players.length;
  const rounds = Math.ceil(Math.log2(entityCount)) || 1;
  const totalSlots = isDoubles ? Math.pow(2, rounds) * 2 : Math.pow(2, rounds);
  const round1Matches = totalSlots / (isDoubles ? 4 : 2);

  // Slots: index 0,1 = Match 1 (Team A, Team B), index 2,3 = Match 2, etc.
  const [slots, setSlots] = useState<(string | null)[]>([]);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<'pool' | number | null>(null); // 'pool' or slot index

  // Sync slots state with totalSlots and selected players
  useEffect(() => {
    setSlots(current => {
      const playerIds = new Set(players.map(p => p.id));
      
      // case: Initial mount or resizing
      if (current.length !== totalSlots) {
        const next = Array(totalSlots).fill(null);
        
        if (current.length === 0) {
          // First time opening the seeder: pre-fill based on selection order
          players.forEach((p, i) => {
            if (i < totalSlots) next[i] = p.id;
          });
        } else {
          // Resizing after user already started arranging: preserve valid placements
          for (let i = 0; i < Math.min(current.length, totalSlots); i++) {
            if (current[i] && playerIds.has(current[i]!)) {
              next[i] = current[i];
            }
          }
        }
        return next;
      }
      
      // Just clean up deselected players from existing slots
      return current.map(id => (id && playerIds.has(id) ? id : null));
    });
  }, [totalSlots, players.length]); // We watch length to handle adding/removing participants

  // Players not yet placed in any slot
  const assignedIds = new Set(slots.filter(Boolean));
  const unassignedPlayers = players.filter(p => !assignedIds.has(p.id));

  const getPlayerById = (id: string | null) => {
    if (!id) return null;
    return players.find(p => p.id === id) || null;
  };

  const updateSlotsAndNotify = (newSlots: (string | null)[]) => {
    setSlots(newSlots);
    // Important: ordered list for seeding MUST include all selected players
    const ordered = newSlots.filter(Boolean) as string[];
    const remaining = players.filter(p => !new Set(ordered).has(p.id)).map(p => p.id);
    onSeedingChange([...ordered, ...remaining]);
  };

  const handleDropOnSlot = (slotIndex: number) => {
    if (!draggedPlayerId) return;
    
    const newSlots = [...slots];
    
    // If dragging from another slot, clear old slot
    if (typeof dragSource === 'number') {
      newSlots[dragSource] = null;
    }
    
    // If target slot already has someone, swap them
    const existingPlayer = newSlots[slotIndex];
    if (existingPlayer && typeof dragSource === 'number') {
      newSlots[dragSource] = existingPlayer; // Swap
    }
    
    newSlots[slotIndex] = draggedPlayerId;
    updateSlotsAndNotify(newSlots);
    setDraggedPlayerId(null);
    setDragSource(null);
  };

  const handleDropOnPool = () => {
    if (!draggedPlayerId || typeof dragSource !== 'number') return;
    const newSlots = [...slots];
    newSlots[dragSource] = null;
    updateSlotsAndNotify(newSlots);
    setDraggedPlayerId(null);
    setDragSource(null);
  };

  const handleRemoveFromSlot = (slotIndex: number) => {
    const newSlots = [...slots];
    newSlots[slotIndex] = null;
    updateSlotsAndNotify(newSlots);
  };

  const handleAutoFill = () => {
    // Fill remaining empty slots with unassigned players
    const newSlots = [...slots];
    let nextUnassignedIdx = 0;
    const currentUnassigned = players.filter(p => !new Set(newSlots.filter(Boolean)).has(p.id));
    
    for (let i = 0; i < totalSlots; i++) {
      if (!newSlots[i] && nextUnassignedIdx < currentUnassigned.length) {
        newSlots[i] = currentUnassigned[nextUnassignedIdx].id;
        nextUnassignedIdx++;
      }
    }
    updateSlotsAndNotify(newSlots);
  };

  const handleClearAll = () => {
    const newSlots = Array(totalSlots).fill(null);
    updateSlotsAndNotify(newSlots);
  };

  // Generate round labels
  const getRoundLabel = (roundNum: number, totalRounds: number) => {
    if (roundNum === totalRounds) return 'Chung kết';
    if (roundNum === totalRounds - 1 && totalRounds > 1) return 'Bán kết';
    if (roundNum === totalRounds - 2 && totalRounds > 2) return 'Tứ kết';
    return `Vòng ${roundNum}`;
  };

  // Build rounds for display
  const buildRounds = () => {
    const allRounds: { label: string; matches: any[] }[] = [];
    
    // Round 1 uses the slots
    const r1Matches = [];
    const slotsPerMatch = isDoubles ? 4 : 2;
    const matchesToRender = totalSlots / slotsPerMatch;

    for (let i = 0; i < matchesToRender; i++) {
      if (isDoubles) {
        const sA1 = i * 4;
        const sA2 = i * 4 + 1;
        const sB1 = i * 4 + 2;
        const sB2 = i * 4 + 3;
        r1Matches.push({
          slotA1: sA1, slotA2: sA2,
          slotB1: sB1, slotB2: sB2,
          playerA1: getPlayerById(slots[sA1]),
          playerA2: getPlayerById(slots[sA2]),
          playerB1: getPlayerById(slots[sB1]),
          playerB2: getPlayerById(slots[sB2]),
          isBye: sB1 >= players.length // Simplistic BYE logic
        });
      } else {
        const slotA = i * 2;
        const slotB = i * 2 + 1;
        r1Matches.push({
          slotA, slotB,
          playerA: getPlayerById(slots[slotA]),
          playerB: getPlayerById(slots[slotB]),
          isBye: slotB >= players.length
        });
      }
    }
    allRounds.push({ label: getRoundLabel(1, rounds), matches: r1Matches });

    // Subsequent rounds are just visual placeholders (no drag)
    let matchesInRound = round1Matches;
    for (let r = 2; r <= rounds; r++) {
      matchesInRound = matchesInRound / 2;
      const roundMatches = [];
      for (let i = 0; i < matchesInRound; i++) {
        roundMatches.push({ slotA: -1, slotB: -1, playerA: null, playerB: null, isBye: false });
      }
      allRounds.push({ label: getRoundLabel(r, rounds), matches: roundMatches });
    }

    return allRounds;
  };

  const roundsData = buildRounds();

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <h3 className={styles.topTitle}>Kéo thả VĐV vào sơ đồ thi đấu</h3>
        <div className={styles.topActions}>
          <button type="button" onClick={handleAutoFill} className={styles.actionBtn}>
            Tự động điền
          </button>
          <button type="button" onClick={handleClearAll} className={styles.actionBtnDanger}>
            Xóa tất cả
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Player Pool */}
        <div 
          className={styles.pool}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDropOnPool}
        >
          <div className={styles.poolHeader}>
            <Users size={16} />
            <span>Chưa xếp ({unassignedPlayers.length})</span>
          </div>
          <div className={styles.poolList}>
            {unassignedPlayers.map(player => (
              <div
                key={player.id}
                className={styles.poolPlayer}
                draggable
                onDragStart={() => {
                  setDraggedPlayerId(player.id);
                  setDragSource('pool');
                }}
                onDragEnd={() => {
                  setDraggedPlayerId(null);
                  setDragSource(null);
                }}
              >
                <GripVertical size={14} className={styles.grip} />
                <Avatar src={player.avatar_url} alt={player.name} size="sm" />
                <span className={styles.poolName}>{player.name}</span>
              </div>
            ))}
            {unassignedPlayers.length === 0 && (
              <div className={styles.poolEmpty}>✅ Đã xếp hết</div>
            )}
          </div>
        </div>

        {/* Bracket Preview */}
        <div className={styles.bracketArea}>
          <div className={styles.bracketScroll}>
            {roundsData.map((round, rIdx) => (
              <div key={rIdx} className={styles.round}>
                <div className={styles.roundLabel}>{round.label}</div>
                <div className={styles.roundMatches}>
                  {round.matches.map((match, mIdx) => (
                    <div key={mIdx} className={styles.matchBox}>
                      {rIdx === 0 ? (
                        <>
                      {isDoubles ? (
                        <div className={styles.doublesMatch}>
                          {/* Team A slots */}
                          <div className={styles.teamSlots}>
                            {[match.slotA1, match.slotA2].map((slotIdx, idx) => (
                              <div
                                key={slotIdx}
                                className={`${styles.slot} ${slots[slotIdx] ? styles.slotFilled : styles.slotEmpty}`}
                                onDragOver={e => e.preventDefault()}
                                onDrop={() => handleDropOnSlot(slotIdx)}
                              >
                                {slots[slotIdx] ? (
                                  <div className={styles.slotPlayer} draggable onDragStart={() => { setDraggedPlayerId(slots[slotIdx]); setDragSource(slotIdx); }}>
                                    <Avatar src={getPlayerById(slots[slotIdx])?.avatar_url || ''} alt="" size="sm" />
                                    <span className={styles.slotName}>{getPlayerById(slots[slotIdx])?.name}</span>
                                    <button type="button" onClick={() => handleRemoveFromSlot(slotIdx)} className={styles.removeBtn}><X size={12} /></button>
                                  </div>
                                ) : <span className={styles.slotPlaceholder}>VĐV {idx + 1}</span>}
                              </div>
                            ))}
                          </div>

                          <div className={styles.vs}>VS</div>

                          {/* Team B slots */}
                          <div className={styles.teamSlots}>
                            {[match.slotB1, match.slotB2].map((slotIdx, idx) => (
                              <div
                                key={slotIdx}
                                className={`${styles.slot} ${slots[slotIdx] ? styles.slotFilled : styles.slotEmpty}`}
                                onDragOver={e => e.preventDefault()}
                                onDrop={() => handleDropOnSlot(slotIdx)}
                              >
                                {slots[slotIdx] ? (
                                  <div className={styles.slotPlayer} draggable onDragStart={() => { setDraggedPlayerId(slots[slotIdx]); setDragSource(slotIdx); }}>
                                    <Avatar src={getPlayerById(slots[slotIdx])?.avatar_url || ''} alt="" size="sm" />
                                    <span className={styles.slotName}>{getPlayerById(slots[slotIdx])?.name}</span>
                                    <button type="button" onClick={() => handleRemoveFromSlot(slotIdx)} className={styles.removeBtn}><X size={12} /></button>
                                  </div>
                                ) : <span className={styles.slotPlaceholder}>VĐV {idx + 1}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Slot A - droppable */}
                          <div
                            className={`${styles.slot} ${match.playerA ? styles.slotFilled : styles.slotEmpty} ${draggedPlayerId ? styles.slotDropTarget : ''}`}
                            onDragOver={e => e.preventDefault()}
                            onDrop={() => handleDropOnSlot(match.slotA)}
                          >
                            {match.playerA ? (
                              <div
                                className={styles.slotPlayer}
                                draggable
                                onDragStart={() => {
                                  setDraggedPlayerId(match.playerA!.id);
                                  setDragSource(match.slotA);
                                }}
                              >
                                <Avatar src={match.playerA.avatar_url} alt={match.playerA.name} size="sm" />
                                <span className={styles.slotName}>{match.playerA.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromSlot(match.slotA)}
                                  className={styles.removeBtn}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <span className={styles.slotPlaceholder}>Kéo VĐV vào đây</span>
                            )}
                          </div>

                          <div className={styles.vs}>VS</div>

                          {/* Slot B - droppable */}
                          <div
                            className={`${styles.slot} ${match.playerB ? styles.slotFilled : styles.slotEmpty} ${draggedPlayerId ? styles.slotDropTarget : ''}`}
                            onDragOver={e => e.preventDefault()}
                            onDrop={() => handleDropOnSlot(match.slotB)}
                          >
                            {match.playerB ? (
                              <div
                                className={styles.slotPlayer}
                                draggable
                                onDragStart={() => {
                                  setDraggedPlayerId(match.playerB!.id);
                                  setDragSource(match.slotB);
                                }}
                              >
                                <Avatar src={match.playerB.avatar_url} alt={match.playerB.name} size="sm" />
                                <span className={styles.slotName}>{match.playerB.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromSlot(match.slotB)}
                                  className={styles.removeBtn}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              match.isBye ? (
                                <span className={styles.slotBye}>BYE</span>
                              ) : (
                                <span className={styles.slotPlaceholder}>Kéo VĐV vào đây</span>
                              )
                            )}
                          </div>
                        </>
                      )}
                        </>
                      ) : (
                        <>
                          {/* Future rounds: read-only placeholders */}
                          <div className={`${styles.slot} ${styles.slotFuture}`}>
                            <span className={styles.slotPlaceholder}>?</span>
                          </div>
                          <div className={styles.vs}>VS</div>
                          <div className={`${styles.slot} ${styles.slotFuture}`}>
                            <span className={styles.slotPlaceholder}>?</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
