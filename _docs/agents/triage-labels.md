# Triage states

No labels. Each spec and ticket file has one `Status:` line near the top with one of these four states:

| State         | Meaning                                                          |
| ------------- | ---------------------------------------------------------------- |
| `needs-info`  | Waiting on Flah for a decision or more information               |
| `ready`       | Fully specified: an agent (or Flah) can pick it up               |
| `in-progress` | Someone is building it                                           |
| `done`        | Finished and checked, or dropped (say why under `## Comments`)   |

When a skill names one of its five canonical roles, write this state instead:

| Role in mattpocock/skills | `Status:` here |
| ------------------------- | -------------- |
| `needs-triage`            | `needs-info`   |
| `needs-info`              | `needs-info`   |
| `ready-for-agent`         | `ready`        |
| `ready-for-human`         | `ready` (add "for Flah" on the line: `Status: ready (for Flah)`) |
| `wontfix`                 | `done` (with the reason under `## Comments`) |
