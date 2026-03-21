"use client";

import React from 'react';
import styles from './Standings.module.css';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { Trophy } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  avatar_url: string;
}

interface Match {
  team_a: Player[];
  team_b: Player[];
  team_a_score: number;
  team_b_score: number;
}

interface StandingsProps {
  participants: any[];
  matches: Match[];
  matchMode?: 'singles' | 'doubles';
  advanceCount?: number;
}

export const StandingsTable: React.FC<StandingsProps> = ({ participants, matches, matchMode, advanceCount }) => {
  const isDoubles = matchMode === 'doubles';

  // Define entities (Individual or Team)
  const entities: { id: string, name: string, avatars: string[], wins: number, losses: number, ptsFor: number, ptsAgainst: number }[] = [];
  const entityMap: Record<string, number> = {}; // userId -> index in entities

  if (isDoubles) {
    // Group participants into pairs
    for (let i = 0; i < participants.length; i += 2) {
      const p1 = participants[i];
      const p2 = participants[i + 1];
      const id = p1.user_id + (p2 ? `_${p2.user_id}` : '');
      const name = p1.user.name + (p2 ? ` & ${p2.user.name}` : '');
      const avatars = [p1.user.avatar_url];
      if (p2) avatars.push(p2.user.avatar_url);

      const entityIdx = entities.length;
      entities.push({ id, name, avatars, wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0 });
      
      entityMap[p1.user_id] = entityIdx;
      if (p2) entityMap[p2.user_id] = entityIdx;
    }
  } else {
    participants.forEach((p, idx) => {
      entities.push({ 
        id: p.user_id, 
        name: p.user.name, 
        avatars: [p.user.avatar_url], 
        wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0 
      });
      entityMap[p.user_id] = idx;
    });
  }

  // Calculate stats from matches
  matches.forEach(m => {
    if (m.team_a_score === 0 && m.team_b_score === 0 && (!m.team_a || m.team_a.length === 0)) return;
    
    // Find entity index for Team A (use first player if team has multiple)
    const teamAIdx = m.team_a?.[0] ? entityMap[m.team_a[0].id] : -1;
    const teamBIdx = m.team_b?.[0] ? entityMap[m.team_b[0].id] : -1;

    if (teamAIdx !== -1) {
      entities[teamAIdx].ptsFor += m.team_a_score;
      entities[teamAIdx].ptsAgainst += m.team_b_score;
      if (m.team_a_score > m.team_b_score) entities[teamAIdx].wins++;
      else if (m.team_a_score < m.team_b_score) entities[teamAIdx].losses++;
    }

    if (teamBIdx !== -1) {
      entities[teamBIdx].ptsFor += m.team_b_score;
      entities[teamBIdx].ptsAgainst += m.team_a_score;
      if (m.team_b_score > m.team_a_score) entities[teamBIdx].wins++;
      else if (m.team_b_score < m.team_a_score) entities[teamBIdx].losses++;
    }
  });

  const sortedStats = [...entities].sort((a, b) => {
    if (a.wins !== b.wins) return b.wins - a.wins;
    const diffA = a.ptsFor - a.ptsAgainst;
    const diffB = b.ptsFor - b.ptsAgainst;
    return diffB - diffA;
  });

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Hạng</th>
            <th>Vận động viên</th>
            <th>Thắng</th>
            <th>Thua</th>
            <th>Hiệu số</th>
          </tr>
        </thead>
        <tbody>
          {sortedStats.map((stat, idx) => {
            const isAdvancing = advanceCount !== undefined && idx < advanceCount;
            return (
            <tr key={stat.id} className={`${idx === 0 ? styles.topRow : ''} ${isAdvancing ? styles.advancingRow : ''}`}>
              <td>{idx + 1} {idx === 0 && <Trophy size={14} className={styles.trophy} />}</td>
              <td className={styles.userCell}>
                <div className={styles.avatarGroup}>
                  {stat.avatars.map((av, aIdx) => (
                    <Avatar key={aIdx} src={av} alt="" size="sm" />
                  ))}
                </div>
                <span>{stat.name}</span>
              </td>
              <td className={styles.winCount}>{stat.wins}</td>
              <td className={styles.lossCount}>{stat.losses}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {stat.ptsFor - stat.ptsAgainst}
                  {isAdvancing && <span className={styles.advanceTag}>Tới Knockout</span>}
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
