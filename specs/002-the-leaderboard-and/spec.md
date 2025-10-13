# Feature Specification: Leaderboard and Feedback System

**Feature Branch**: `002-the-leaderboard-and`
**Created**: 2025-01-13
**Status**: Draft
**Input**: User description: "the leaderboard and feedback features we have been discussing"

## Clarifications

### Session 2025-01-13

- Q: How many scores should the leaderboard display? → A: old-school arcade leaderboard
- Q: What WPM threshold triggers auto-flagging or shadow-banning? → A: no auto-flag
- Q: How are flagged scores handled? → A: manual deletion by developer
- Q: How is feedback stored and accessed? → A: queue -> gh worker -> static webpage w/ thumbs up feature for community to upvote
- Q: What are the rate limiting specifications? → A: uid required to submit; rate limit on uid
- Q: How long should user ID cookies persist? → A: Never expires (max allowed)
- Q: Are game replays public and how do they work? → A: Public replays viewable by all, votable by users with UID

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit High Score (Priority: P1)

As a player who has completed a game, I want to submit my score to the public leaderboard so that I can see how I rank against other players and establish my identity in the community.

**Why this priority**: This is the foundation of the entire system - without score submission, there's no leaderboard, no user identity, and no community features.

**Independent Test**: Can be fully tested by playing a game, submitting a score with initials, and verifying the score appears on the leaderboard with a unique identifier assigned.

**Acceptance Scenarios**:

1. **Given** a player completes their first game, **When** they submit their score with 3-letter initials, **Then** the system generates a unique user ID, stores it in a persistent cookie, and displays the score on the public leaderboard
2. **Given** a player with an existing user ID completes another game, **When** they submit their score, **Then** the system uses their existing ID and adds the new score to the leaderboard (rate limited per user ID)
3. **Given** a player submits a duplicate game session, **When** the system detects the duplicate hash, **Then** it rejects the submission with an appropriate error code

---

### User Story 2 - Watch and Validate Game Replays (Priority: P1)

As any visitor to the game, I want to watch replays of high scores to see how top players achieved their results and verify legitimacy through community validation.

**Why this priority**: Public replays provide transparency and enable community-driven verification of legitimate scores versus cheating.

**Independent Test**: Can be tested by clicking on a replay link from the leaderboard, watching the full visual game replay, and verifying voting appears for users with UIDs.

**Acceptance Scenarios**:

1. **Given** any visitor views the leaderboard, **When** they click on a score's replay link, **Then** they can watch the complete visual replay of the game as it appeared during original play (moving words, lasers, explosions, etc.)
2. **Given** a user with a UID watches a replay, **When** they finish watching, **Then** they can vote (thumbs up or flag) on the replay's legitimacy
3. **Given** a user without a UID watches a replay, **When** the replay ends, **Then** they see vote counts but cannot vote

---

### User Story 3 - Community Voting on Scores (Priority: P2)

As a player with an established identity (user ID), I want to vote on other players' scores to validate legitimate achievements and flag suspicious entries, helping maintain leaderboard integrity.

**Why this priority**: Community moderation is essential for maintaining trust in the leaderboard without manual administration.

**Independent Test**: Can be tested by submitting a score to get a user ID, then attempting to vote on other scores and verifying vote counts update correctly.

**Acceptance Scenarios**:

1. **Given** a player has a user ID from playing the game, **When** they click thumbs up on a score, **Then** the vote count increases by one and they cannot vote again on that same score
2. **Given** a player has a user ID, **When** they flag a suspicious score, **Then** the flag count increases to help developers identify scores for manual review
3. **Given** a player without a user ID views the leaderboard, **When** they look at scores, **Then** they see vote counts but no voting buttons appear

---

### User Story 4 - Submit Bug Reports and Feedback (Priority: P2)

As a player experiencing issues or having suggestions, I want to submit feedback with my game context so developers can understand and address problems effectively.

**Why this priority**: Quality feedback from actual players is crucial for improving the game and fixing issues.

**Independent Test**: Can be tested by playing at least 3 words, then submitting feedback and verifying it includes game context and user identity.

**Acceptance Scenarios**:

1. **Given** a player with a user ID encounters a bug, **When** they submit a bug report, **Then** the system includes their game context, identity, and description in the report
2. **Given** a player without a user ID is playing and completes 3 words, **When** they submit feedback, **Then** the system prompts for initials, creates a partial game submission to generate a user ID, and submits the feedback
3. **Given** a player without a user ID and not actively playing, **When** they look for feedback options, **Then** no feedback button appears in the interface

---

### User Story 5 - Vote on Feedback Items (Priority: P3)

As a player with an established identity, I want to upvote feedback items on the static feedback page to help prioritize bug fixes and feature requests.

**Why this priority**: Community-driven prioritization helps developers focus on the most impactful improvements.

**Independent Test**: Can be tested by viewing the feedback webpage and verifying that users with IDs can upvote items while others cannot.

**Acceptance Scenarios**:

1. **Given** a player has a user ID, **When** they view the feedback webpage, **Then** they can click thumbs up on feedback items to show support
2. **Given** a player without a user ID views the feedback webpage, **Then** they can see feedback items and vote counts but cannot vote

---

### User Story 6 - View Leaderboard Rankings (Priority: P1)

As any visitor to the game, I want to view the public leaderboard showing player scores, rankings, and community validation signals so I can see top performers and aspire to compete.

**Why this priority**: The leaderboard must be publicly visible to create competition and showcase achievements.

**Independent Test**: Can be tested by visiting the game without playing and verifying the leaderboard displays with scores, vote counts, and proper ranking.

**Acceptance Scenarios**:

1. **Given** any visitor accesses the game, **When** they view the leaderboard, **Then** they see ranked scores with initials, WPM, accuracy, vote counts, flag counts, and replay links
2. **Given** scores have different vote and flag counts, **When** displaying the leaderboard, **Then** scores are ranked by WPM but heavily flagged scores may be hidden
3. **Given** multiple players have the same initials, **When** viewing the leaderboard, **Then** each score appears separately as they have different user IDs

---

### Edge Cases

- What happens when someone attempts to submit the same game session multiple times? (System detects duplicate hash and returns error 409)
- How does system handle obviously impossible scores (300+ WPM)? (Community flagging only, no automatic flagging based on WPM)
- What happens if someone clears cookies? (They lose their user ID and must play again to get a new one)
- How does system prevent rapid vote manipulation? (Rate limiting per user ID)
- What happens when someone tries to vote without playing? (No voting interface appears)
- What happens if someone manipulates replay data? (Hash validation ensures replay matches original session; tampering results in rejection)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate a unique user ID when a player submits their first game score
- **FR-002**: System MUST store user ID in a persistent browser cookie with maximum allowed duration (never expires)
- **FR-003**: System MUST calculate and store a unique hash for each game session based on keystrokes, timings, and words presented
- **FR-003a**: System MUST store complete game session data including all keystrokes and timings to enable replay functionality
- **FR-004**: System MUST reject duplicate game session submissions based on hash comparison
- **FR-005**: System MUST display public leaderboard showing initials, scores, accuracy, vote counts, flag counts, and replay links (arcade-style with top 10-20 scores displayed, but store 30-50 scores as buffer for manual deletions)
- **FR-006**: System MUST allow users with valid user IDs to vote (thumbs up or flag) on other players' scores
- **FR-007**: System MUST enforce one vote per user ID per score
- **FR-008**: System MUST track vote counts and flag counts for each leaderboard entry
- **FR-009**: System MUST only show voting interface to users who have a valid user ID
- **FR-010**: System MUST allow feedback submission only from users who have a user ID or are actively playing (minimum 3 words completed)
- **FR-011**: System MUST include game context (stage, WPM, keystrokes, errors) with all feedback submissions
- **FR-012**: System MUST require 3-letter initials when creating a new user identity
- **FR-013**: System MUST rate-limit submissions per user ID to prevent spam
- **FR-014**: System MUST track flag counts for developer review and support manual deletion of scores from backend processing
- **FR-015**: System MUST maintain association between user IDs and all their submissions (scores, votes, feedback)
- **FR-016**: System MUST process feedback through queue to GitHub worker that generates static webpage displaying feedback items with community upvote capability
- **FR-017**: System MUST provide public replay URLs for all leaderboard scores that can be viewed without authentication
- **FR-018**: System MUST enable replay playback showing the complete visual recreation of the game session as originally played (words scrolling, typing effects, lasers, explosions)
- **FR-019**: System MUST allow users with valid UIDs to vote (thumbs up or flag) on replays after viewing
- **FR-020**: System MUST display replay vote counts publicly but only show voting interface to users with UIDs

### Key Entities

- **User Identity**: Represents a player with unique ID, initials, creation timestamp, and cookie persistence
- **Game Score**: Represents a submitted score with WPM, accuracy, stage reached, session hash, user ID reference
- **Game Session**: Contains complete gameplay data including keystrokes, timings, words presented, used for hash generation, validation, and public replay functionality
- **Vote**: Represents a thumbs up or flag action from one user ID on one score or replay
- **Feedback Report**: Contains bug report or suggestion with game context, user ID, and description
- **Game Replay**: Public viewable recreation of a game session, linked from leaderboard entries, votable by users with UIDs

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Players can submit scores and receive user identity within 2 seconds of game completion
- **SC-002**: System prevents 100% of duplicate game session submissions through hash validation
- **SC-003**: Community flagging provides clear signals for manual review with flagged scores visible to developers for deletion decisions
- **SC-004**: 95% of legitimate players successfully establish identity on first score submission
- **SC-005**: Feedback includes full game context in 100% of submissions from active players
- **SC-006**: System handles 1000 concurrent score views and 100 concurrent submissions without degradation
- **SC-007**: Vote manipulation attempts are blocked with less than 5 fake votes possible per hour per source
- **SC-008**: 100% of leaderboard scores have viewable public replays that accurately recreate the original gameplay experience