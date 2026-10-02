# Implementation roadmap

## Visual / verified account / Python milestone

The MVP baseline is preserved remotely at `5a5e6c7baffe369949f25a78b6c65f71ac2fe3cb` with its archive branch and annotated tag. New work is on `feature/vnext-visual-auth-python`.

- Declarative family-aware choreography and semantic color: implemented and locally tested.
- Optional verified accounts, Mailpit email, password reset and private saves: implemented and locally tested.
- Anonymous browser Python, isolated local queue, trace/player, verified workspace persistence: implemented and locally tested; public execution gated.
- Combined reproducibility/final release: see the current progress status and new milestone audit. Historic audit reports remain unchanged.

## Original construction lots

The construction branch follows the numbered lots in the full build specification. Detailed verified status is in `docs/progress/status.json` and the individual lot reports.

| Lot | Scope                                                            | Status                                                       |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| 00  | Preserve the audited five-problem prototype in Git               | Complete: baseline branch, commit, and tag                   |
| 01  | Teaching steps, mobile fixes, browser-subset semantics           | Complete for bounded v0.1                                    |
| 02  | Event schemas, vocabulary governance, raw/semantic pipeline      | Complete for implemented curated mappers                     |
| 03  | Renderer families and player                                     | Complete for ten renderer families                           |
| 04  | Representative curated problems                                  | Complete: twenty problems                                    |
| 05  | Independent algorithm lab with direct editors                    | Complete: four structures and eight algorithms               |
| 06  | Side-by-side algorithm comparison                                | Complete: three traversal pairs with dual playback           |
| 07  | Contributor problem SDK, renderer SDK, versioned community packs | Complete: reviewed local registration and sample pack        |
| 08  | AI-agnostic connector protocol and normalized response families  | Complete: seven validated families and compatible adapters   |
| 09  | Isolated user-code execution foundation                          | Complete for local bounded Python path; public access gated  |
| 10  | Semantic interpreter over raw execution context                  | Complete for local array and constrained graph inference     |
| 11  | PostgreSQL, users, saved inputs, learning progress               | Complete for optional local accounts and verified run saving |
| 12  | Security, accessibility, performance, deployment hardening       | Partial: local gates pass; public release gates remain       |

Next priorities are an independently reviewed public code runner, more editable-code families and languages, browser-scale event virtualization, a manual screen-reader and contrast audit, deployment proxy/backup/monitoring review, and a live optional AI endpoint test. The browser interpreter is not the isolated execution boundary required before public arbitrary-code execution. The final construction audit is in `docs/audit/final` and does not change the historical prototype audit.
