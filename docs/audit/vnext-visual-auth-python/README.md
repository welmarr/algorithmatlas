# VNext final audit — 2026-10-02

**Classification: complete bounded local milestone; public production deployment remains gated.** This audit covers the visual, optional verified-account and browser Python vertical slices. It preserves both earlier audit directories unchanged.

## Answers

| Question                               | Evidence-based answer                                                                                                                                                                                                                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What is complete?                      | Family-aware choreography, optional verification/reset/session lifecycle, private persisted work, anonymous browser-to-container Python execution, trace interpretation and interactive replay.                                                                              |
| What is partial?                       | Python semantic inference covers bounded integer arrays and constrained numeric graphs; unknown intent falls back to variables/raw trace. Accessibility and production operations have automated/local evidence, not full independent certification.                         |
| What is intentionally gated?           | Python execution defaults off and can be enabled only in the documented local mode. Public hostile-code hosting is not approved.                                                                                                                                             |
| What remains unsupported?              | C++/Java execution, unrestricted Python imports/files/network, arbitrary semantic inference, public distributed execution, all-provider live AI compatibility.                                                                                                               |
| Can anonymous users learn and execute? | Yes: problem learning, simulation, Lab, Compare and configured local Python require no account. Saving requires a verified account.                                                                                                                                          |
| Can verified users save and restore?   | Yes: input/run/progress ownership and Python source/input workspace save, logout/login, restore and rerun are tested.                                                                                                                                                        |
| Does email verification work?          | Yes, real SMTP into fresh Mailpit, explicit one-use token consumption and resend controls. Real external SMTP delivery is untested.                                                                                                                                          |
| Does reset work?                       | Yes: generic request response, expiring one-use token, changed password, old-password rejection and all-session revocation.                                                                                                                                                  |
| Does Python reach visualization?       | Yes: browser source/input → authenticated local queue → constrained Docker process → raw trace → semantics → learning steps → choreography/player.                                                                                                                           |
| What isolation was proven?             | Real container inspection and attack tests prove configured nonroot, no network, read-only root, dropped capabilities, no-new-privileges, memory/CPU/PID/tmpfs limits, bounds and cleanup. They do not prove a container can safely host arbitrary hostile public workloads. |
| Can AI be disabled?                    | Yes; all final core journeys run without an AI provider.                                                                                                                                                                                                                     |
| Does a fresh clone reproduce?          | See the final result in [TEST_REPORT.md](TEST_REPORT.md). Windows line-ending reproducibility was fixed in the repository before the successful rerun.                                                                                                                       |
| Was the baseline remote first?         | Yes: GitHub main and archive branch/tag received the tested baseline before Lot A.                                                                                                                                                                                           |
| What passed or was skipped?            | See [TEST_REPORT.md](TEST_REPORT.md); live optional AI is untested.                                                                                                                                                                                                          |
| What production gates remain?          | See [OPEN_GATES.md](OPEN_GATES.md).                                                                                                                                                                                                                                          |

## Revision evidence

- Repository: https://github.com/welmarr/algorithmatlas
- Preserved baseline: `5a5e6c7baffe369949f25a78b6c65f71ac2fe3cb`, branch `archive/mvp-before-visual-auth-python`, annotated tag `mvp-before-visual-auth-python`.
- Development branch: `feature/vnext-visual-auth-python`.
- Combined implementation gate and initial remote CI: `00089c3b0b9727e30d8a0b043a5e397e22f159e8`.
- Fresh-clone candidate with repository LF policy: `4873ad58938d61260b584642fe7d13eda2b8af98`.
- The final documentation commit is identified by the annotated `vnext-visual-auth-python` release tag and the main/feature branch tips. Resolve its exact commit with `git rev-parse vnext-visual-auth-python^{}` and verify with `git ls-remote origin`. Its own hash cannot be embedded in that same commit. The completion report records the resolved hashes.

Main is merged only after the full gate, fresh clone, clean builds and startup verification pass. Historical reports describe their earlier checkpoints and are not current release status.

## Reports

[Feature matrix](FEATURE_MATRIX.md) · [Tests](TEST_REPORT.md) · [Security](SECURITY_REPORT.md) · [Accounts](AUTH_REPORT.md) · [Python](PYTHON_EXECUTION_REPORT.md) · [Visual pedagogy](VISUAL_PEDAGOGY_REPORT.md) · [Open gates](OPEN_GATES.md).
