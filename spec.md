# ⚙️ Technical Specification
## Badminton Club Tier Ranking System

---

## 1. Purpose

This document defines the technical design of the system, including data structures, APIs, and core logic. It is intended to be used as input for implementation and further refinement through AI-assisted workflows.

---

## 2. Scope

This specification covers the MVP version of the system, including:

- Member management
- Voting system
- Ranking calculation
- Tier assignment
- Leaderboard display

Out of scope:
- Authentication system (advanced)
- Match history
- Tournament features
- Multi-club support

---

## 3. System Overview

### 3.1 Architecture (Abstract)

The system consists of:

- Client: Web interface
- Server: API layer handling business logic
- Database: Persistent storage

---

### 3.2 Design Principles

- Keep logic simple and transparent
- Avoid premature optimization
- Ensure easy extensibility
- Maintain clear separation of concerns

---

## 4. Data Model

### 4.1 User

Represents a club member.

Fields:
- id: unique identifier
- name: display name
- createdAt: timestamp

---

### 4.2 Vote

Represents a rating given by one user to another.

Fields:
- id: unique identifier
- voterId: reference to User
- targetUserId: reference to User
- score: numeric value
- createdAt: timestamp
- updatedAt: timestamp

Constraints:
- voterId must not equal targetUserId

---

### 4.3 Ranking

Represents computed ranking data.

Fields:
- userId: reference to User
- score: aggregated score
- tier: tier label (S, A, B, C)
- rank: numeric position
- updatedAt: timestamp

---

## 5. Core Logic

### 5.1 Voting Logic

- A user can vote for another user
- A user cannot vote for themselves
- If a vote already exists:
  - It should be updated instead of duplicated

---

### 5.2 Score Calculation

Score is calculated as the average of all received votes.

Formula:
score = total_score / number_of_votes

---

### 5.3 Ranking Calculation

- All users are sorted by score in descending order
- Rank is assigned based on sorted order
- Users with no votes may be handled separately (to be defined)

---

### 5.4 Tier Assignment

Default tier thresholds:

- S: score >= 4.5
- A: score >= 3.5
- B: score >= 2.5
- C: score < 2.5

Note:
- Thresholds should be configurable in future

---

### 5.5 Recalculation Strategy

Ranking should be recalculated when:

- A vote is created
- A vote is updated
- A vote is deleted

Open decision:
- Recalculate immediately or batch process

---

## 6. API Design

### 6.1 User APIs

GET /users  
→ Return list of users

POST /users  
→ Create new user

PUT /users/{id}  
→ Update user

DELETE /users/{id}  
→ Remove user

---

### 6.2 Vote APIs

POST /votes  
→ Create or update a vote

Request:
{
  "targetUserId": "string",
  "score": "number"
}

---

GET /votes?targetUserId={id}  
→ Get all votes for a specific user

---

### 6.3 Ranking APIs

GET /leaderboard  
→ Return ranked list of users

Response:
[
  {
    "userId": "string",
    "name": "string",
    "score": "number",
    "tier": "string",
    "rank": "number"
  }
]

---

## 7. Data Flow

### 7.1 Voting Flow

1. User submits vote
2. Validate input
3. Save or update vote
4. Trigger ranking recalculation
5. Update ranking data
6. Return updated results

---

## 8. Validation Rules

- score must be within defined range (to be defined)
- voterId must exist
- targetUserId must exist
- voterId must not equal targetUserId

---

## 9. Edge Cases

- Users with no votes
- Multiple rapid vote updates
- Ties in ranking score
- Deleting users with existing votes

---

## 10. Error Handling

- Invalid input → return error
- User not found → return error
- Unauthorized action → return error

---

## 11. Non-Functional Considerations

### Performance
- Should handle small to medium datasets efficiently
- Ranking updates should not block user actions

---

### Scalability
- Design should allow:
  - More users
  - More complex ranking systems (Elo)

---

### Maintainability
- Keep logic modular
- Avoid tightly coupled components

---

## 12. Configuration (Future)

Potential configurable parameters:

- Score range (e.g., 1–5)
- Tier thresholds
- Ranking update strategy
- Vote limits

---

## 13. Open Questions (For Refinement)

- What is the exact score range?
- Should users see who voted for them?
- Should votes expire over time?
- How to handle inactive users?
- Should ranking be real-time or scheduled?

---

## 14. Assumptions

- Users act in good faith
- System is used internally
- Data volume is limited initially

---

## 15. Future Extensions (Technical Direction)

- Authentication & authorization
- Role-based access control
- Match history tracking
- Elo rating system
- Real-time updates (WebSocket)
- Multi-club architecture

---

## 16. Notes for AI Agents

- Prioritize clarity over optimization
- Avoid introducing unnecessary abstractions
- Follow existing patterns consistently
- Keep implementation simple and readable

---