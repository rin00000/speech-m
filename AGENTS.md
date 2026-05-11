# Speech-M Agent Index

This file is intentionally minimal for token efficiency.

## Load Order
1. System/platform constraints
2. `.cursor/rules/*.mdc`
3. Explicit user request
4. This file

## Project Identity
- Product: Speech-M all-in-one management platform for broadcaster job prep
- Core pipeline: `Scrape -> AI Filter -> Human-in-the-loop -> AI Post`
- Quality bar: prioritize "Director's Eye" curation quality over posting volume

## Notes
- Keep this file short; move detailed policies to `.cursor/rules/*.mdc`.
- Parallel worktree source of truth: `docs/worktree-parallel-status.md`.