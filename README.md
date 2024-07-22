# repository-settings-action

[![GitHub Super-Linter](https://github.com/mooseburgr/repository-settings-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/mooseburgr/repository-settings-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/mooseburgr/repository-settings-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/mooseburgr/repository-settings-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/mooseburgr/repository-settings-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/mooseburgr/repository-settings-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

Inspired by [this Probot app](https://github.com/repository-settings/app), this
GitHub Action allows you to manage your GitHub repository settings as code,
including repository details, team and collaborator permissions, branch
protections, and environment settings. It's designed to work with a
configuration file that defines the desired state of your repository's settings.

## Features

- **Repository Settings**: Update the repository's name, description,
  visibility, and other general settings.
- **Teams and Collaborators**: Manage permissions for teams and collaborators.
- **Branch Protections**: Configure branch protection rules to enforce certain
  workflows.
- **Environments**: Set up or update environment settings, including required
  reviewers.

## Usage

To use this action, create a YAML configuration file in your repository that
specifies the desired settings. Refer to the types in [this file](src/types.ts)
for the "schema" this YAML should follow.

Here's an example configuration file that demonstrates available settings:

```yaml
# .github/settings.yml

repository:
  name: repository-settings-action
  description: GitHub Action for managing repo settings as code
  homepage: https://github.com/mooseburgr/repository-settings-action
  topics:
    - github-actions
    - typescript
  visibility: private
  has_issues: true # same
  has_projects: true
  has_wiki: true
  has_discussions: true
  is_template: false
  default_branch: main
  allow_squash_merge: true
  allow_merge_commit: false
  allow_rebase_merge: false
  allow_auto_merge: true
  delete_branch_on_merge: true
  allow_update_branch: true

teams:
  # both "{org}/{team}" and "{team}" formats handled
  - name: org/team-1
    permission: push # one of: pull, triage, push, maintain, admin
  - name: team-2
    permission: admin

collaborators:
  - username: mtplewis
    permission: maintain

branches:
  - name: main
    protection: # null to delete this branch's protection rule
      required_pull_request_reviews: # null to disable
        required_approving_review_count: 1
        dismiss_stale_reviews: true
        require_code_owner_reviews: true
      required_status_checks: # null to disable
        strict: true
        contexts:
          - Check dist/
          - TypeScript Tests
      enforce_admins: true
      restrictions: null
      required_linear_history: true

environments:
  - name: prod
    prevent_self_review: true
    reviewers:
      - org/team-1
      - mooseburgr
```

Then create a GitHub Actions workflow file in your repository that calls this
Action:

```yaml
# .github/workflows/apply-repo-settings.yml

name: Apply Repo Settings

on:
  push:
    branches:
      - main
    paths:
      - .github/settings.yml
  schedule:
    - cron: '0 0 * * *' # daily
  workflow_dispatch:

jobs:
  update-settings:
    runs-on: ubuntu-latest
    steps:
      # https://github.com/mooseburgr/repository-settings-action
      - name: Apply Repo Settings
        uses: mooseburgr/repository-settings-action@v1
        with:
          token: ${{ secrets.YOUR_PAT }}
          # optionally override the default settings file path
          settings-path: .github/settings.yml
```

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests with
improvements or bug fixes.

### Publishing a New Release

This project includes a helper script, [`script/release`](./script/release)
designed to streamline the process of tagging and pushing new releases for
GitHub Actions.

GitHub Actions allows users to select a specific version of the action to use,
based on release tags. This script simplifies this process by performing the
following steps:

1. **Retrieving the latest release tag:** The script starts by fetching the most
   recent release tag by looking at the local data available in your repository.
1. **Prompting for a new release tag:** The user is then prompted to enter a new
   release tag. To assist with this, the script displays the latest release tag
   and provides a regular expression to validate the format of the new tag.
1. **Tagging the new release:** Once a valid new tag is entered, the script tags
   the new release.
1. **Pushing the new tag to the remote:** Finally, the script pushes the new tag
   to the remote repository. From here, you will need to create a new release in
   GitHub and users can easily reference the new tag in their workflows.
