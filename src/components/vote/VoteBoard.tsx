"use client";

import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { TierRow } from './TierRow';
import { MemberPool } from './MemberPool';
import { TierCard } from './TierCard';
import useSWR from 'swr';
import styles from './VoteBoard.module.css';

const TIERS = ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'Bot'];

const TIER_DEFAULT_SCORES: Record<string, number> = {
  'S': 9.5,
  'A': 8.5,
  'B': 7.5,
  'C': 6.5,
  'D': 5.5,
  'E': 4.5,
  'F': 3.0,
  'Bot': 1.0
};

export const getTierFromScore = (score: number) => {
  if (score >= 9.0) return 'S';
  if (score >= 8.0) return 'A';
  if (score >= 7.0) return 'B';
  if (score >= 6.0) return 'C';
  if (score >= 5.0) return 'D';
  if (score >= 4.0) return 'E';
  if (score >= 2.0) return 'F';
  return 'Bot';
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
};

export const VoteBoard = () => {
  const { data: usersData, error: usersError } = useSWR('/api/users', fetcher);
  const { data: votesData, error: votesError, mutate: mutateVotes } = useSWR('/api/votes/my-votes', fetcher);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // 5px movement before dragging
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (usersError || votesError) {
    return <div className={styles.errorBanner}>Lỗi tải dữ liệu. Vui lòng thử lại.</div>;
  }

  if (!usersData || !votesData) {
    return <div className={styles.loading}>Đang tải...</div>;
  }

  const users = Array.isArray(usersData) ? usersData : [];
  const votes = Array.isArray(votesData) ? votesData : [];

  // Create a map for quick lookup
  const votesMap = votes.reduce((acc: any, vote: any) => {
    acc[vote.target_user_id] = vote;
    return acc;
  }, {});

  // Categorize users
  const unassignedUsers = users.filter((u) => !votesMap[u.id]);
  const assignedUsers = users.filter((u) => votesMap[u.id]);

  const handleScoreSave = async (userId: string, newScore: number) => {
    // Optimistic UI update
    const previousVotes = [...votes];
    const newVote = { target_user_id: userId, score: newScore };
    
    // Check if updating or adding
    const existingIndex = previousVotes.findIndex(v => v.target_user_id === userId);
    let updatedVotes = [...previousVotes];
    if (existingIndex >= 0) {
      updatedVotes[existingIndex] = { ...updatedVotes[existingIndex], ...newVote };
    } else {
      updatedVotes.push(newVote);
    }
    
    mutateVotes(updatedVotes, false); // Update local cache without revalidating instantly

    // Network request
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVote),
      });
      
      const contentType = res.headers.get('content-type');
      if (!res.ok) {
        let errorMsg = 'Lỗi lưu dữ liệu';
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } else {
          errorMsg = `Lỗi từ máy chủ (${res.status})`;
        }
        throw new Error(errorMsg);
      }
      
      mutateVotes(); // Revalidate from server
    } catch (err: any) {
      mutateVotes(previousVotes, false); // Revert on failure
      alert(err.message || 'Lỗi lưu điểm. Vui lòng thử lại.');
    }
  };

  const handleUnvote = async (userId: string) => {
    // Optimistic UI update
    const previousVotes = [...votes];
    const updatedVotes = previousVotes.filter(v => v.target_user_id !== userId);
    mutateVotes(updatedVotes, false);

    try {
      const voteToDelete = votesMap[userId];
      if (!voteToDelete) return;

      const res = await fetch(`/api/votes/${voteToDelete.id}`, {
        method: 'DELETE',
      });
      
      const contentType = res.headers.get('content-type');
      if (!res.ok) {
        let errorMsg = 'Lỗi unvote';
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } else {
          errorMsg = `Lỗi từ máy chủ (${res.status})`;
        }
        throw new Error(errorMsg);
      }
      
      mutateVotes();
    } catch (err: any) {
      mutateVotes(previousVotes, false);
      alert(err.message || 'Lỗi khi unvote. Vui lòng thử lại.');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const userId = active.id as string;
    const overId = over.id as string;

    if (overId.startsWith('tier-')) {
      const tierName = overId.replace('tier-', '');
      const existingVote = votesMap[userId];
      
      // If already in this tier and score matches, do nothing
      // However, if dragged to a tier, we auto-assign the default score
      // Or if it's already dragged inside the same tier, maybe we shouldn't overwrite the exact score?
      // Let's overwrite score if moving to a new tier or first vote.
      const currentGivenTier = existingVote ? getTierFromScore(existingVote.score) : null;
      
      if (currentGivenTier !== tierName) {
        handleScoreSave(userId, TIER_DEFAULT_SCORES[tierName]);
      }
    }
  };

  const activeUser = activeId ? users.find((u: any) => u.id === activeId) : null;

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.boardContainer}>
        <div className={styles.tiersContainer}>
          {TIERS.map((tier) => {
            const usersInTier = assignedUsers.filter((u) => getTierFromScore(votesMap[u.id].score) === tier);
            return (
              <TierRow 
                key={tier} 
                tier={tier} 
                users={usersInTier} 
                votes={votesMap}
                onScoreSave={handleScoreSave}
                onUnvote={handleUnvote}
              />
            );
          })}
        </div>

        <MemberPool 
          unassignedUsers={unassignedUsers} 
          onScoreSave={handleScoreSave}
          onUnvote={handleUnvote}
        />
      </div>

      <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeUser ? (
          <TierCard 
            user={activeUser} 
            currentVote={votesMap[activeUser.id]} 
            onScoreSave={() => {}} 
            onUnvote={() => {}}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
