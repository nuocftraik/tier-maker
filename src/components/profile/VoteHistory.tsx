import React from 'react';
import { Card } from '@/components/ui/Card/Card';
import { Avatar } from '@/components/ui/Avatar/Avatar';
import { Badge } from '@/components/ui/Badge/Badge';
import { getTierFromScore } from '@/components/vote/VoteBoard';
import styles from './VoteHistory.module.css';

interface VoteHistoryProps {
  votes: any[];
}

export const VoteHistory: React.FC<VoteHistoryProps> = ({ votes }) => {
  if (votes.length === 0) {
    return (
      <Card className={styles.emptyContainer}>
        <p>Chưa có ai đánh giá thành viên này! 😥</p>
      </Card>
    );
  }

  return (
    <Card className={styles.container}>
      <h3 className={styles.title}>Lịch Sử Đánh Giá</h3>
      
      <div className={styles.tableWrapper}>
        <div className={styles.header}>
          <div className={styles.colVoter}>Người Vote</div>
          <div className={styles.colDate}>Thời gian</div>
          <div className={styles.colTier}>Tier Tương Đương</div>
          <div className={styles.colScore}>Điểm</div>
        </div>
        
        <div className={styles.body}>
          {votes.map((vote) => {
            const date = new Date(vote.created_at).toLocaleDateString('vi-VN', {
              day: '2-digit', month: '2-digit', year: 'numeric',
            });
            const equivalentTier = getTierFromScore(vote.score);

            return (
              <div key={vote.id} className={styles.row}>
                <div className={styles.colVoter}>
                  {vote.voter ? (
                    <>
                      <Avatar src={vote.voter.avatar_url} alt={vote.voter.name} size="sm" />
                      <span className={styles.name}>{vote.voter.name}</span>
                    </>
                  ) : (
                    <span className={styles.name}>Người dùng đã xóa</span>
                  )}
                </div>
                
                <div className={styles.colDate}>
                  <span className={styles.dateText}>{date}</span>
                </div>
                
                <div className={styles.colTier}>
                  <Badge tier={equivalentTier} size="sm" />
                </div>
                
                <div className={styles.colScore}>
                  <span className={styles.scoreText}>{Number(vote.score).toFixed(1)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
