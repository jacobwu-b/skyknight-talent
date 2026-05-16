# ADR-0001: Spec-driven, agentic engineering operating model

> Status: accepted
> Date: [fill on first commit]
> Deciders: founding engineering team

## Context

This repo is built to be worked on by a mix of human engineers and AI coding
agents. Without a shared operating model, every contributor — human or
otherwise — runs their own playbook, and quality varies wildly across PRs.

The brief "Scaling Technical Repos with AI Coding" lays out five disciplines
that separate productive teams from chaotic ones: context engineering,
spec-driven development, TDD, agentic workflow, and quality gates.

## Decision

We adopt the operating model described in `CLAUDE.md`. In particular:

- The spec is the source of truth. Code is generated against the spec.
- Tests are the contract. Green tests are the only definition of "done."
- Branches are born from `main` and die by squash-merge into `main`.
- Hooks enforce what must happen; evals trend what should happen.
- Agents and humans follow the same rules; the rules are about the work,
  not the worker.

This applies to all work above the Trivial tier as defined in `CLAUDE.md` §3.

## Consequences

**Positive**
- Quality is baked into the process, not the reviewer's mood.
- New contributors (human and agent) ramp on a single document.
- Specs and tests outlive any given chat session or model.

**Negative**
- More upfront writing. The Spec → Plan → Tests → Code loop costs minutes
  per task that could be skipped on truly trivial work.
- Discipline cost: the loop only works if it's followed even when nobody's
  watching. The Trivial tier is a release valve, but it's narrow on purpose.

**Neutral**
- Process is now a versioned artifact. Changing it requires a PR and an ADR
  update — slower than a Slack message, intentionally.

## Alternatives considered

### A: Vibe coding with strong reviewers

Let everyone work however they want; rely on senior reviewers to catch
issues at PR time. Rejected: doesn't scale past ~5 engineers, and reviewer
fatigue degrades the gate over time. AI agents amplify both problems.

### B: Heavyweight RFC process

A formal RFC for every change, reviewed by committee. Rejected: slows
small work to a crawl and produces process theater. Our triage tiers
(Trivial / Standard / Significant) capture the gradient.

## References

- `CLAUDE.md`
- "Scaling Technical Repos with AI Coding" — Office of the CEO, Strategic
  Engineering Practice, 2026
