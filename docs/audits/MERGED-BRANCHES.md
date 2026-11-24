# Branches already merged into the dev branch (24 November 2026)

`docs/audits/merged-branches.txt` lists 211 remote branches (name and last commit) whose every commit is already in
`claude/wtc-touchscreen-game-pzwxs4`, so deleting them loses no work. Left out on purpose: the dev branch, the deploy branch
(`claude/fux-gradus-two-voice-dataset-ouu87h`) and every branch with an open pull request (#499, #474, #380, #374, #182 and #6).
Two names are not `claude/` branches: `backup/before-night-2026-10-08` and `board/left-scroll`; both are fully merged too.

This session could not delete them: GitHub's connector here has no delete-branch call, and the session's git access refuses
deletions (HTTP 403). Run once from a computer that can push to the repository:

```bash
sh tools/delete-merged-branches.sh
```

It asks before it starts, then deletes the branches in the list one at a time. A deleted branch is recoverable from the last
commit in the list (`git branch <name> <commit>`), and every commit stays in the dev branch anyway.
