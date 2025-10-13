# Tasks: Leaderboard and Feedback System

**Input**: Design documents from `/specs/002-the-leaderboard-and/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: This implementation follows manual browser testing per the project constitution (no test frameworks).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- Client-side: `js/` at repository root (vanilla JavaScript)
- Cloudflare Workers: `workers/` at repository root
- GitHub Actions: `.github/workflows/` at repository root
- Python scripts: `scripts/` at repository root
- Static data: `data/` and `data/replays/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for all leaderboard components

- [ ] T001 [P] Create directory structure: `js/`, `workers/`, `scripts/`, `data/`, `data/replays/`
- [ ] T002 [P] Initialize `data/leaderboard.json` with empty schema (version 1, empty scores array)
- [ ] T003 [P] Initialize `data/feedback.json` with empty schema (version 1, empty items array)
- [ ] T004 [P] Create `.github/workflows/process-leaderboard-queue.yml` workflow file with placeholder job and TODO notes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Cloudflare Infrastructure

- [ ] T005 Setup Cloudflare KV namespace `typeattack_leaderboard_queue` (manual: via Cloudflare dashboard)
- [ ] T006 Create base Cloudflare Worker in `workers/leaderboard-api.js` with CORS, health endpoint, error handling
- [ ] T007 Configure GitHub Secrets: `CF_ACCOUNT_ID`, `CF_API_TOKEN`, `CF_KV_NAMESPACE_ID` (manual: via GitHub settings)

### Client-Side Foundation

- [ ] T008 [P] Implement user identity system in `js/user-identity.js` (UUID generation, cookie management, localStorage backup)
- [ ] T009 [P] Implement session hash calculation in `js/session-hash.js` (SHA-256 via Web Crypto API)
- [ ] T010 [P] Create session recording system in `js/session-recorder.js` (track words, keystrokes, timings during gameplay)

### Processing Infrastructure

- [ ] T011 Flesh out workflow in `.github/workflows/process-leaderboard-queue.yml` (define cron schedule, Python setup, secrets usage)
- [ ] T012 Implement Cloudflare KV API client in `scripts/cloudflare_kv.py` (fetch queue items, delete items, no external deps)
- [ ] T013 Implement hash validation in `scripts/validate_session.py` (recalculate SHA-256, verify match)
- [ ] T014 Implement JSON generation utilities in `scripts/generate_static.py` (atomic file writes, schema validation)
- [ ] T093 Implement moderation tooling in `scripts/moderate_scores.py` (list flagged scores, support manual deletion workflow)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Submit High Score (Priority: P1) 🎯 MVP

**Goal**: Players can submit their scores to the public leaderboard with unique user identity

**Independent Test**: Play game, submit score with initials, verify score appears on leaderboard with unique user ID

### Implementation for User Story 1

#### Client-Side Score Submission

- [ ] T015 [P] [US1] Implement score submission UI in `js/score-submission.js` (initials prompt, submit button, success/error messages)
- [ ] T016 [P] [US1] Integrate session recorder with game completion in `js/typing.js` (hook into game end, compile session data)
- [ ] T017 [US1] Implement score submission flow in `js/score-submission.js` (check/create UID, calculate hash, POST to API, handle responses)
- [ ] T091 [US1] Enforce 3-letter uppercase initials in `js/score-submission.js` (prevent invalid input before POST)

#### Cloudflare Worker - Score Endpoint

- [ ] T018 [US1] Add `/api/submit-score` endpoint to `workers/leaderboard-api.js` (validate request schema)
- [ ] T019 [US1] Implement hash validation in `/api/submit-score` (recalculate hash, compare, reject if mismatch)
- [ ] T020 [US1] Implement duplicate detection in `/api/submit-score` (check KV for existing sessionHash)
- [ ] T021 [US1] Implement rate limiting in `/api/submit-score` (check `ratelimit:score:{userId}`, enforce 60s limit)
- [ ] T022 [US1] Implement queue storage in `/api/submit-score` (write to KV with key `queue:{timestamp}:{uuid}`)
- [ ] T092 [US1] Validate initials length and characters in `/api/submit-score` (reject non 3-letter uppercase values)

#### GitHub Actions - Queue Processing

- [ ] T023 [US1] Implement queue fetching in `scripts/process_queue.py` (fetch all `queue:*` keys from KV)
- [ ] T024 [US1] Implement score validation in `scripts/process_queue.py` (validate each submission, filter invalid)
- [ ] T025 [US1] Implement leaderboard generation in `scripts/process_queue.py` (sort by WPM, take top 50, assign ranks)
- [ ] T026 [US1] Implement leaderboard.json update in `scripts/process_queue.py` (atomic write with generated timestamp)
- [ ] T027 [US1] Implement queue cleanup in `scripts/process_queue.py` (delete processed items from KV)
- [ ] T028 [US1] Complete GitHub Actions workflow in `.github/workflows/process-leaderboard-queue.yml` (run process_queue.py, git commit, git push)

#### Client-Side Leaderboard Display

- [ ] T029 [P] [US1] Create leaderboard UI component in `js/leaderboard.js` (fetch leaderboard.json, render table with rank/initials/WPM/accuracy/stage/votes)
- [ ] T030 [P] [US1] Add leaderboard display to `index.html` (leaderboard container, styling in `css/game.css`)
- [ ] T031 [US1] Implement client-side caching in `js/leaderboard.js` (localStorage cache with 5-minute TTL)

**Checkpoint**: At this point, User Story 1 should be fully functional - players can submit scores and see them on the leaderboard

---

## Phase 4: User Story 6 - View Leaderboard Rankings (Priority: P1)

**Goal**: Any visitor can view the public leaderboard showing player scores and rankings

**Independent Test**: Visit game without playing, verify leaderboard displays with scores, vote counts, and proper ranking

**Note**: This story is included in MVP as it's tightly coupled with US1 and mostly completed by T029-T031

### Implementation for User Story 6

- [ ] T032 [US6] Enhance leaderboard display in `js/leaderboard.js` (show top 20 by default, hide heavily flagged scores based on flag count)
- [ ] T033 [US6] Add vote count display in `js/leaderboard.js` (thumbs up count, flag count for each score)
- [ ] T034 [US6] Add replay link display in `js/leaderboard.js` (clickable link to replay page for each score)

**Checkpoint**: MVP complete - players can submit scores and anyone can view the leaderboard

---

## Phase 5: User Story 2 - Watch and Validate Game Replays (Priority: P1)

**Goal**: Any visitor can watch replays of high scores to verify legitimacy

**Independent Test**: Click replay link from leaderboard, watch full visual game replay, verify voting appears for users with UIDs

### Implementation for User Story 2

#### Replay Data Generation

- [ ] T035 [US2] Implement replay file generation in `scripts/process_queue.py` (create `data/replays/{sessionHash}.json` with full game state)
- [ ] T036 [US2] Add replay URL to leaderboard entries in `scripts/process_queue.py` (set `replayUrl` field when generating leaderboard.json)

#### Replay Playback Engine

- [ ] T037 [P] [US2] Create replay engine in `js/replay-engine.js` (ReplayEngine class with play/pause/seek controls)
- [ ] T038 [US2] Implement word reconstruction in `js/replay-engine.js` (use seed + word list to recreate word positions over time)
- [ ] T039 [US2] Implement keystroke playback in `js/replay-engine.js` (replay keystrokes at recorded timestamps with visual effects)
- [ ] T040 [US2] Implement visual effects in `js/replay-engine.js` (lasers, explosions, same as live game using existing `js/effects/`)
- [ ] T041 [US2] Add hash verification in `js/replay-engine.js` (recalculate hash from loaded data, show warning if mismatch)

#### Replay UI

- [ ] T042 [P] [US2] Create replay page in `replay.html` (canvas, playback controls, metadata display)
- [ ] T043 [P] [US2] Create replay UI controller in `js/replay-ui.js` (load replay from URL param, initialize engine, handle controls)
- [ ] T044 [US2] Add replay styling in `css/game.css` (replay controls, metadata panel, warning messages)
- [ ] T045 [US2] Integrate replay links in `js/leaderboard.js` (make replay links clickable, navigate to replay.html?hash={sessionHash})

**Checkpoint**: Replays are viewable with full visual recreation of gameplay

---

## Phase 6: User Story 3 - Community Voting on Scores (Priority: P2)

**Goal**: Players with user IDs can vote on scores to validate legitimacy

**Independent Test**: Submit a score to get user ID, then vote on other scores and verify vote counts update

### Implementation for User Story 3

#### Client-Side Voting UI

- [ ] T046 [P] [US3] Create voting UI component in `js/voting.js` (thumbs up button, flag button, vote counts display)
- [ ] T047 [US3] Implement voting logic in `js/voting.js` (check for UID, POST vote to API, update UI, handle already-voted)
- [ ] T048 [US3] Add voting UI to leaderboard in `js/leaderboard.js` (show voting buttons only if user has UID)

#### Cloudflare Worker - Voting Endpoint

- [ ] T049 [US3] Add `/api/submit-vote` endpoint to `workers/leaderboard-api.js` (validate request schema)
- [ ] T050 [US3] Implement duplicate vote check in `/api/submit-vote` (check KV for `vote:{targetHash}:{userId}`)
- [ ] T051 [US3] Implement rate limiting in `/api/submit-vote` (max 10 votes per 60 minutes per userId)
- [ ] T052 [US3] Implement vote storage in `/api/submit-vote` (write to KV with key `vote:{targetHash}:{userId}`)

#### GitHub Actions - Vote Aggregation

- [ ] T053 [US3] Implement vote counting in `scripts/process_queue.py` (query all `vote:{hash}:*` keys, count up vs flags)
- [ ] T054 [US3] Add vote counts to leaderboard entries in `scripts/process_queue.py` (populate `votes.up` and `votes.flags` fields)
- [ ] T055 [US3] Add vote counts to replay files in `scripts/process_queue.py` (update replay JSON with vote counts)

**Checkpoint**: Users can vote on scores and vote counts are visible on leaderboard

---

## Phase 7: User Story 2 (cont.) - Voting on Replays (Priority: P1)

**Goal**: Users with UIDs can vote on replays after watching them

**Independent Test**: Watch a replay, verify voting interface appears for UID holders, vote and see count update

**Note**: This extends US2 with voting capability from US3

### Implementation for Replay Voting

- [ ] T056 [US2] Add voting UI to replay page in `js/replay-ui.js` (show thumbs up/flag buttons after replay completes, only for UID holders)
- [ ] T057 [US2] Implement replay voting in `js/voting.js` (extend voting logic to handle targetType: "replay")
- [ ] T058 [US2] Update vote aggregation in `scripts/process_queue.py` (handle votes with targetType: "replay", aggregate into replay files)

**Checkpoint**: Replays are fully functional with voting capability

---

## Phase 8: User Story 4 - Submit Bug Reports and Feedback (Priority: P2)

**Goal**: Players can submit feedback with game context for developers

**Independent Test**: Play at least 3 words, submit feedback, verify it includes game context and user identity

### Implementation for User Story 4

#### Client-Side Feedback UI

- [ ] T059 [P] [US4] Create feedback UI component in `js/feedback.js` (feedback button, modal form with type selector and description field)
- [ ] T060 [US4] Implement feedback eligibility check in `js/feedback.js` (show button only if user has UID or played 3+ words)
- [ ] T061 [US4] Implement feedback submission flow in `js/feedback.js` (check UID, create partial session if needed, gather context, POST to API)
- [ ] T062 [US4] Add feedback button to game UI in `index.html` (overlay button, modal styling in `css/game.css`)

#### Cloudflare Worker - Feedback Endpoint

- [ ] T063 [US4] Add `/api/submit-feedback` endpoint to `workers/leaderboard-api.js` (validate request schema, check description length)
- [ ] T064 [US4] Implement rate limiting in `/api/submit-feedback` (max 5 feedback items per 60 minutes per userId)
- [ ] T065 [US4] Implement feedback storage in `/api/submit-feedback` (write to KV with key `feedback:{timestamp}:{uuid}`)

#### GitHub Actions - Feedback Processing

- [ ] T066 [US4] Implement feedback fetching in `scripts/process_queue.py` (fetch all `feedback:*` keys from KV)
- [ ] T067 [US4] Implement feedback.json generation in `scripts/process_queue.py` (aggregate feedback items, sort by votes/timestamp)
- [ ] T068 [US4] Implement feedback cleanup in `scripts/process_queue.py` (delete processed feedback from KV)

#### Feedback Display Page

- [ ] T069 [P] [US4] Create feedback page in `feedback.html` (table/list view with type, description, context, votes, status)
- [ ] T070 [P] [US4] Create feedback display controller in `js/feedback-display.js` (fetch feedback.json, render items, filter by type/status)
- [ ] T071 [US4] Add feedback page styling in `css/game.css` (feedback table, filter controls, vote buttons)

**Checkpoint**: Users can submit feedback and view all feedback items on dedicated page

---

## Phase 9: User Story 5 - Vote on Feedback Items (Priority: P3)

**Goal**: Players with user IDs can upvote feedback to help prioritize

**Independent Test**: View feedback webpage, verify users with IDs can upvote items while others cannot

### Implementation for User Story 5

#### Client-Side Feedback Voting

- [ ] T072 [US5] Add voting UI to feedback page in `js/feedback-display.js` (show upvote button only if user has UID)
- [ ] T073 [US5] Implement feedback voting logic in `js/feedback-display.js` (POST to API, update vote count, handle already-voted)

#### Cloudflare Worker - Feedback Voting Endpoint

- [ ] T074 [US5] Add `/api/vote-feedback` endpoint to `workers/leaderboard-api.js` (validate feedbackId, check for duplicate vote)
- [ ] T075 [US5] Implement rate limiting in `/api/vote-feedback` (max 20 feedback votes per 60 minutes per userId)
- [ ] T076 [US5] Implement feedback vote storage in `/api/vote-feedback` (write to KV with key `feedback-vote:{feedbackId}:{userId}`)

#### GitHub Actions - Feedback Vote Aggregation

- [ ] T077 [US5] Implement feedback vote counting in `scripts/process_queue.py` (query all `feedback-vote:{feedbackId}:*` keys, count votes)
- [ ] T078 [US5] Update feedback.json with vote counts in `scripts/process_queue.py` (populate `votes` field for each feedback item)

**Checkpoint**: All user stories complete - full leaderboard and feedback system operational

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T079 [P] Add loading states and spinners in `js/leaderboard.js`, `js/feedback-display.js`, `js/replay-ui.js`
- [ ] T080 [P] Add error messages and retry logic in all client-side modules (handle network failures gracefully)
- [ ] T081 [P] Implement client-side validation in `js/score-submission.js`, `js/feedback.js` (validate before API call)
- [ ] T082 Add security hardening in `workers/leaderboard-api.js` (payload size limits, input sanitization, XSS prevention)
- [ ] T083 Add monitoring and logging in `workers/leaderboard-api.js` (log all API calls with anonymized data)
- [ ] T084 [P] Performance optimization in `js/replay-engine.js` (optimize canvas rendering, reduce memory usage)
- [ ] T085 [P] Add accessibility features (ARIA labels, keyboard navigation, screen reader support)
- [ ] T086 Add analytics tracking in `scripts/process_queue.py` (generate stats.json with aggregates - optional future enhancement)
- [ ] T087 Update constitution documentation in `.specify/memory/constitution.md` (document justified violation)
- [ ] T088 Run end-to-end validation per `specs/002-the-leaderboard-and/quickstart.md` (all test flows)
- [ ] T089 Code cleanup and refactoring (remove console.logs, add comments, consistent formatting)
- [ ] T090 Create deployment documentation in `specs/002-the-leaderboard-and/deployment.md` (production setup steps)
- [ ] T094 Document score moderation workflow in `specs/002-the-leaderboard-and/quickstart.md` (manual deletion steps for flagged entries)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - Phase 3 (US1): Submit High Score - MVP core
  - Phase 4 (US6): View Leaderboard - extends US1 (minimal work)
  - Phase 5 (US2): Watch Replays - depends on US1 (needs replay data from score submissions)
  - Phase 6 (US3): Vote on Scores - depends on US1 (needs scores to vote on)
  - Phase 7 (US2 cont.): Vote on Replays - depends on US2 + US3 (needs replays + voting infrastructure)
  - Phase 8 (US4): Submit Feedback - mostly independent, light dependency on user identity from US1
  - Phase 9 (US5): Vote on Feedback - depends on US4 (needs feedback items to vote on)
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (US1) - Submit High Score**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 6 (US6) - View Leaderboard**: Depends on US1 (needs leaderboard data) - Included in MVP
- **User Story 2 (US2) - Watch Replays**: Depends on US1 (needs replay files generated from score submissions)
- **User Story 3 (US3) - Vote on Scores**: Depends on US1 (needs scores to vote on)
- **User Story 2 cont. - Vote on Replays**: Depends on US2 + US3 (needs both replay viewing and voting infrastructure)
- **User Story 4 (US4) - Submit Feedback**: Mostly independent, light dependency on user identity system from US1
- **User Story 5 (US5) - Vote on Feedback**: Depends on US4 (needs feedback items to vote on)

### Within Each User Story

- Client-side components before API endpoints (UI defines requirements)
- API endpoints before processing scripts (queue must be populated before processing)
- Processing scripts before display components (data must be generated before display)
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks (T001-T004) can run in parallel
- Within Foundational phase:
  - T008, T009, T010 (client-side foundation) can run in parallel
- Within US1:
  - T015, T016 (client-side submission) can run in parallel
  - T029, T030 (leaderboard display) can run in parallel
- Within US2:
  - T037 (replay engine) can start early
  - T042, T043 (replay UI) can run in parallel
- Within US3:
  - T046, T047 (voting UI) can run in parallel
- Within US4:
  - T059 (feedback UI) can start early
  - T069, T070 (feedback display) can run in parallel
- Polish tasks (T079-T090) - many can run in parallel (different files)

---

## Parallel Example: User Story 1 (Submit High Score)

```bash
# Phase 1: Client-side components (parallel)
Task: "T015 [P] [US1] Implement score submission UI in js/score-submission.js"
Task: "T016 [P] [US1] Integrate session recorder with game completion in js/typing.js"

# Phase 2: Cloudflare Worker endpoints (sequential - same file)
Task: "T018 [US1] Add /api/submit-score endpoint"
Task: "T019 [US1] Implement hash validation"
Task: "T020 [US1] Implement duplicate detection"
Task: "T021 [US1] Implement rate limiting"
Task: "T022 [US1] Implement queue storage"

# Phase 3: Processing (sequential - same file)
Task: "T023 [US1] Implement queue fetching"
Task: "T024 [US1] Implement score validation"
Task: "T025 [US1] Implement leaderboard generation"
Task: "T026 [US1] Implement leaderboard.json update"
Task: "T027 [US1] Implement queue cleanup"

# Phase 4: Leaderboard display (parallel)
Task: "T029 [P] [US1] Create leaderboard UI component"
Task: "T030 [P] [US1] Add leaderboard display to index.html"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 6 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T014) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T015-T031) - Submit High Score
4. Complete Phase 4: User Story 6 (T032-T034) - View Leaderboard
5. **STOP and VALIDATE**: Test score submission and leaderboard display end-to-end per quickstart.md
6. Deploy/demo if ready

**MVP Scope**: Players can submit scores and anyone can view the leaderboard. This delivers core value.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + 6 → Test independently → Deploy/Demo (MVP! 🎯)
3. Add User Story 2 → Test independently → Deploy/Demo (Replays added)
4. Add User Story 3 → Test independently → Deploy/Demo (Score voting added)
5. Add User Story 2 (voting) → Test independently → Deploy/Demo (Replay voting added)
6. Add User Story 4 → Test independently → Deploy/Demo (Feedback submission added)
7. Add User Story 5 → Test independently → Deploy/Demo (Feedback voting added)
8. Polish → Final release

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers after Foundational phase completes:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 + 6 (MVP)
   - Developer B: User Story 2 (Replays) - can start client-side work early
   - Developer C: User Story 4 (Feedback) - mostly independent
3. After US1 completes:
   - Developer A: User Story 3 (Score voting)
   - Developer B: Continues US2, adds voting (depends on US3)
   - Developer C: Continues US4, then US5 (Feedback voting)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- No test framework per constitution - use manual browser testing
- Test flows defined in quickstart.md (Part 5: End-to-End Testing)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently per quickstart.md
- Cloudflare setup tasks (T005, T007) are manual steps via dashboards
- GitHub Actions will run every 15 minutes once workflow is deployed
- All API endpoints share the same worker file (`workers/leaderboard-api.js`)
- All processing logic shares scripts in `scripts/` directory
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Task Count Summary

- **Total Tasks**: 94
- **Setup (Phase 1)**: 4 tasks
- **Foundational (Phase 2)**: 11 tasks
- **User Story 1 - Submit High Score (P1)**: 19 tasks
- **User Story 6 - View Leaderboard (P1)**: 3 tasks
- **User Story 2 - Watch Replays (P1)**: 11 tasks
- **User Story 3 - Vote on Scores (P2)**: 10 tasks
- **User Story 2 (cont.) - Vote on Replays (P1)**: 3 tasks
- **User Story 4 - Submit Feedback (P2)**: 13 tasks
- **User Story 5 - Vote on Feedback (P3)**: 7 tasks
- **Polish & Cross-Cutting (Phase 10)**: 13 tasks

**MVP Scope (US1 + US6)**: 37 tasks (Setup + Foundational + US1 + US6)
**Parallel Opportunities**: 23 tasks marked [P] within their phases
