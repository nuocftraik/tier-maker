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
}

export const StandingsTable: React.FC<StandingsProps> = ({ participants, matches }) => {
  // Calculate standings
  const playerStats: Record<string, { id: string, name: string, avatar: string, wins: number, losses: number, ptsFor: number, ptsAgainst: number }> = {};
  
  participants.forEach(p => {
    playerStats[p.user_id] = { id: p.user_id, name: p.user.name, avatar: p.user.avatar_url, wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0 };
  });

  matches.forEach(m => {
    // Only count if scores are present (not 0-0 unless played)
    // Actually tournament matches might have scores 0-x
    if (m.team_a_score === 0 && m.team_b_score === 0 && m.team_a?.length === 0) return;
    
    const isPlayed = m.team_a?.length > 0 && m.team_b?.length > 0;
    if (!isPlayed) return;

    // Credit all players in Team A
    m.team_a?.forEach(p => {
      if (playerStats[p.id]) {
        playerStats[p.id].ptsFor += m.team_a_score;
        playerStats[p.id].ptsAgainst += m.team_b_score;
        if (m.team_a_score > m.team_b_score) playerStats[p.id].wins++;
        else if (m.team_a_score < m.team_b_score) playerStats[p.id].losses++;
      }
    });
    
    // Credit all players in Team B
    m.team_b?.forEach(p => {
      if (playerStats[p.id]) {
        playerStats[p.id].ptsFor += m.team_b_score;
        playerStats[p.id].ptsAgainst += m.team_a_score;
        if (m.team_b_score > m.team_a_score) playerStats[p.id].wins++;
        else if (m.team_b_score < m.team_a_score) playerStats[p.id].losses++;
      }
    });
  });

  const sortedStats = Object.values(playerStats).sort((a, b) => {
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
          {sortedStats.map((stat, idx) => (
            <tr key={stat.id} className={idx === 0 ? styles.topRow : ''}>
              <td>{idx + 1} {idx === 0 && <Trophy size={14} className={styles.trophy} />}</td>
              <td className={styles.userCell}>
                <Avatar src={stat.avatar} alt={stat.name} size="sm" />
                <span>{stat.name}</span>
              </td>
              <td className={styles.winCount}>{stat.wins}</td>
              <td className={styles.lossCount}>{stat.losses}</td>
              <td>{stat.ptsFor - stat.ptsAgainst}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
