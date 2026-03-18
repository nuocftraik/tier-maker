# 📋 System Requirements
## Badminton Club Tier Ranking System

---

## 1. Introduction

This document defines the functional and non-functional requirements for the Badminton Club Tier Ranking System. It translates product goals from the PRD into specific system behaviors.

---

## 2. Functional Requirements

### 2.1 Member Management

- The system shall display a list of all club members
- The system shall allow adding new members (admin only)
- The system shall allow updating member information (admin only)
- The system shall allow removing members (admin only)

---

### 2.2 User Interaction

- The system shall allow users to view other members' profiles
- The system shall allow users to view ranking and tier information

---

### 2.3 Voting System

- The system shall allow a user to submit a rating for another member
- The system shall prevent users from voting for themselves
- The system shall allow updating or removing a previous vote
- The system shall store each vote with:
  - voter
  - target user
  - score value

---

### 2.4 Ranking Calculation

- The system shall calculate a score for each member based on received votes
- The system shall update rankings when new votes are submitted
- The system shall assign a tier to each member based on their score
- The system shall maintain a consistent ranking order

---

### 2.5 Leaderboard

- The system shall display a leaderboard of all members
- The leaderboard shall include:
  - member name
  - score
  - tier
  - ranking position
- The leaderboard shall be sorted by score in descending order

---

### 2.6 Admin Controls

- The system shall allow admins to manually adjust a member’s tier
- The system shall allow admins to manage member data

---

## 3. Non-Functional Requirements

### 3.1 Performance

- The system should respond to user actions within 300ms under normal conditions
- Ranking updates should be reflected without noticeable delay

---

### 3.2 Usability

- The system should have a simple and intuitive user interface
- The system should be usable on both desktop and mobile devices

---

### 3.3 Scalability

- The system should support increasing number of users without major redesign
- The system architecture should allow future feature expansion

---

### 3.4 Reliability

- The system should ensure data consistency for votes and rankings
- The system should prevent data loss during normal operation

---

### 3.5 Security

- The system should restrict admin functionalities to authorized users only
- The system should validate all user inputs

---

## 4. Business Rules

- A user cannot vote for themselves
- Each vote contributes to the target user’s total score
- A member’s tier is determined by their score
- Ranking is determined by score in descending order

---

## 5. Assumptions

- Users will provide fair and honest ratings
- The number of users is relatively small (internal club scale)
- No complex authentication system is required in the initial version

---

## 6. Constraints

- The system is designed for internal use only
- Limited initial scope (MVP features only)

---

## 7. Open Questions

- What is the score range for voting (e.g., 1–5, 1–10)?
- Should votes be weighted differently?
- Should ranking updates happen in real-time or periodically?
- Should there be limits on how often a user can vote?

---

## 8. Out of Scope

- Social features (comments, reactions)
- Tournament management
- Multi-club support
- Public access system

---