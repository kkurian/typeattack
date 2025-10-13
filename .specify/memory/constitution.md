# TypeAttack Constitution

## Core Principles

### I. Zero Dependencies
Features MUST rely solely on vanilla browser APIs and standard language tooling. No npm packages, CDNs, or third-party SDKs may be introduced without a documented constitutional amendment. Any helper utilities must be authored in-repo and kept framework-free.

### II. Fun First
Every feature MUST prioritize player enjoyment and ease of engagement. Additions that introduce friction, grind, or confusing flows REQUIRE explicit sign-off in the spec describing why they still enhance fun. UX decisions SHOULD be validated through play-testing feedback captured in feature docs.

### III. Progressive Mastery
Systems MUST support incremental skill growth for typists. Feature specs REQUIRE clear articulation of how new work reinforces practice loops rather than blocking them. Regressions that disrupt core training flows MUST be rejected in review.

### IV. Client-Side Only (with Exception Protocol)
Gameplay logic and primary experiences MUST run entirely in the browser. Any server-side or worker usage requires: (1) justification in the plan, (2) documented contracts, and (3) disclosure in tasks outlining deployment and observability steps. Violations without this protocol MUST be reverted.

### V. Desktop-First
Typing gameplay and auxiliary tooling MUST be optimized for desktop input (keyboard + large viewport). Responsive or mobile adaptations are OPTIONAL but cannot degrade desktop ergonomics. Specs SHOULD note any mobile compromises explicitly.

## Additional Constraints

- **Testing Discipline**: Automated frameworks are currently out of scope; features MUST include manual test plans or quickstart validation steps.
- **Security & Privacy**: Any data persisted beyond the client MUST document retention, access paths, and tamper protections within the spec or contracts.
- **Documentation**: Feature directories REQUIRE up-to-date `spec.md`, `plan.md`, `tasks.md`, and any referenced contracts before `/implement` begins.

## Development Workflow

1. **Spec Gate**: Specs MUST enumerate user stories, acceptance criteria, and measurable success criteria tied to the principles above.
2. **Plan Gate**: Plans MUST call out constitutional impacts and mitigation work (e.g., server usage exceptions) prior to Phase 0 research.
3. **Tasks Gate**: Tasks MUST provide full coverage for every requirement and success metric. Missing coverage blocks `/implement`.
4. **Review**: Code review MUST verify compliance with principles, documentation completeness, and that manual test instructions remain executable.

## Governance

The constitution supersedes all other project guidance. Amendments REQUIRE a documented proposal, consensus approval, and version metadata updates here. Reviewers are RESPONSIBLE for enforcing compliance; unapproved deviations MUST be rejected or rolled back.

**Version**: 1.0.0 | **Ratified**: 2025-01-01 | **Last Amended**: 2025-01-20
