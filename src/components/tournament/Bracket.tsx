"use client";

import React from 'react';
import styles from './Bracket.module.css';
import { Trophy, Swords, ChevronRight } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar/Avatar';

interface Player {
  id: string;
  name: string;
  avatar_url: string;
}

interface Match {
  match_id: string;
  team_a: Player[];
  team_b: Player[];
  team_a_score: number;
  team_b_score: number;
  round_number: number;
  match_order: number;
  next_match_id?: string;
  set_scores?: {a: number, b: number}[];
}

interface BracketProps {
  matches: Match[];
  tournamentId: string;
  canEdit?: boolean;
  onMatchClick?: (match: Match) => void;
}

export const Bracket: React.FC<BracketProps> = ({ matches, tournamentId, canEdit = false, onMatchClick }) => {
  // Group matches by round
  const rounds: Record<number, Match[]> = {};
  matches.forEach(match => {
    if (!rounds[match.round_number]) rounds[match.round_number] = [];
    rounds[match.round_number].push(match);
  });

  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);
  const totalRounds = Math.max(...roundNumbers, 0);

  const getRoundLabel = (roundNum: number, total: number) => {
    if (roundNum === total && total > 0) return 'Chung kết';
    if (roundNum === total - 1 && total > 1) return 'Bán kết';
    if (roundNum === total - 2 && total > 2) return 'Tứ kết';
    return `Vòng ${roundNum}`;
  };

  if (roundNumbers.length === 0) return <div>Không có dữ liệu vòng đấu.</div>;

  return (
    <div className={styles.bracketWrapper}>
      <div className={styles.bracketContainer}>
        {roundNumbers.map((roundNum, index) => (
          <div key={roundNum} className={styles.round}>
            <div className={styles.roundHeader}>
              {getRoundLabel(roundNum, totalRounds)}
            </div>
            <div className={styles.matches}>
              {rounds[roundNum]
                .sort((a, b) => a.match_order - b.match_order)
                .map(match => (
                  <MatchCard key={match.match_id} match={match} tournamentId={tournamentId} canEdit={canEdit} onMatchClick={onMatchClick} />
                ))}
            </div>
          </div>
        ))}
        {/* Virtual Champion Round */}
        {(() => {
          const finalMatch = rounds[totalRounds]?.[0];
          const hasWinner = finalMatch && (finalMatch.team_a_score > 0 || finalMatch.team_b_score > 0);
          const winningTeam = finalMatch?.team_a_score > finalMatch?.team_b_score ? finalMatch?.team_a : finalMatch?.team_b;

          return (
            <div className={`${styles.round} ${styles.championRound}`}>
              <div className={styles.roundHeader}>Vô địch</div>
              <div className={styles.matches}>
                <div className={styles.matchItem}>
                  <div className={`${styles.matchBox} ${hasWinner ? styles.championCard : ''}`}>
                    <div className={styles.playerRow}>
                      <div className={styles.playerInfo}>
                        {hasWinner && winningTeam ? (
                          <div className={styles.teamContainer}>
                            {winningTeam.map(p => (
                              <div key={p.id} className={styles.playerStack}>
                                <Avatar src={p.avatar_url} alt={p.name} size="sm" />
                                <span className={styles.playerName}>{p.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={styles.winnerPlaceholder}>
                            <Trophy size={18} className={styles.trophyIcon} />
                            <span>Chờ kết thúc</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

const MatchCard: React.FC<{ match: Match; tournamentId: string; canEdit: boolean; onMatchClick?: (match: Match) => void }> = ({ match, tournamentId, canEdit, onMatchClick }) => {
  const isTeamAWinner = match.team_a_score > match.team_b_score;
  const isTeamBWinner = match.team_b_score > match.team_a_score;
  const isPlayed = match.team_a_score !== 0 || match.team_b_score !== 0;

  const handleClick = () => {
    if (canEdit && match.team_a?.length > 0 && match.team_b?.length > 0) {
      if (onMatchClick) onMatchClick(match);
    }
  };

  return (
    <div className={styles.matchItem}>
      <div 
        className={`${styles.matchBox} ${canEdit && match.team_a?.length > 0 && match.team_b?.length > 0 ? styles.clickable : ''}`}
        onClick={handleClick}
        style={{ cursor: canEdit && match.team_a?.length > 0 && match.team_b?.length > 0 ? 'pointer' : 'default' }}
        title={canEdit && match.team_a?.length > 0 && match.team_b?.length > 0 ? "Click để cập nhật tỉ số" : ""}
      >
        {/* Team A */}
        <div className={`${styles.playerRow} ${isPlayed && isTeamAWinner ? styles.winner : ''} ${isPlayed && !isTeamAWinner && match.team_a?.length > 0 ? styles.loser : ''}`}>
          <div className={styles.playerInfo}>
            {match.team_a?.length > 0 ? (
              <div className={styles.teamContainer}>
                {match.team_a.map((p, idx) => (
                  <div key={p.id} className={styles.playerStack}>
                    <Avatar src={p.avatar_url} alt={p.name} size="sm" />
                    <span className={styles.playerName}>{p.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className={styles.placeholder}>TBD</span>
            )}
          </div>
          <div className={styles.scoreInfo}>
            <div className={styles.score}>{match.team_a_score}</div>
            {match.set_scores && match.set_scores.length > 0 && (
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                ({match.set_scores.map(s => s.a).join(', ')})
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.divider} />
        
        {/* Team B */}
        <div className={`${styles.playerRow} ${isPlayed && isTeamBWinner ? styles.winner : ''} ${isPlayed && !isTeamBWinner && match.team_b?.length > 0 ? styles.loser : ''}`}>
          <div className={styles.playerInfo}>
            {match.team_b?.length > 0 ? (
              <div className={styles.teamContainer}>
                {match.team_b.map((p, idx) => (
                  <div key={p.id} className={styles.playerStack}>
                    <Avatar src={p.avatar_url} alt={p.name} size="sm" />
                    <span className={styles.playerName}>{p.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className={styles.placeholder}>TBD</span>
            )}
          </div>
          <div className={styles.scoreInfo}>
            <div className={styles.score}>{match.team_b_score}</div>
            {match.set_scores && match.set_scores.length > 0 && (
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                ({match.set_scores.map(s => s.b).join(', ')})
              </div>
            )}
          </div>
        </div>
      </div>
      <div className={styles.connector} />
    </div>
  );
};
