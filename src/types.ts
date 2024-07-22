export interface RepositorySettings {
  repository?: Repository
  teams?: Team[]
  collaborators?: Collaborator[]
  branches?: Branch[]
  environments?: Environment[]
}

// https://docs.github.com/en/rest/repos/repos?#update-a-repository
export interface Repository {
  name?: string
  description?: string
  homepage?: string
  topics?: string[]
  visibility?: 'public' | 'private'
  has_issues?: boolean
  has_projects?: boolean
  has_wiki?: boolean
  has_discussions?: boolean
  is_template?: boolean
  default_branch?: string
  allow_squash_merge?: boolean
  allow_merge_commit?: boolean
  allow_rebase_merge?: boolean
  allow_auto_merge?: boolean
  delete_branch_on_merge?: boolean
  allow_update_branch?: boolean

  // future features...?

  // security_and_analysis?: SecurityAndAnalysis
  // enable_automated_security_fixes?: boolean
  // enable_vulnerability_alerts?: boolean
}

export type Permission = 'pull' | 'triage' | 'push' | 'maintain' | 'admin'

export interface Team {
  name: string
  permission: Permission
}

export interface Collaborator {
  username: string
  permission: Permission
}

// https://docs.github.com/en/rest/branches/branch-protection?#update-branch-protection
export interface Branch {
  name: string
  protection: BranchProtection | null
}

export interface BranchProtection {
  required_status_checks: RequiredStatusChecks | null
  enforce_admins: boolean | null
  required_pull_request_reviews: RequiredPullRequestReviews | null
  restrictions: Restrictions | null
  // above four are "required" but nullable
  required_linear_history?: boolean
  allow_force_pushes?: boolean
  allow_deletions?: boolean
  block_creations?: boolean
  required_conversation_resolution?: boolean
  lock_branch?: boolean
  allow_fork_syncing?: boolean
}

export interface RequiredPullRequestReviews {
  required_approving_review_count?: number
  dismiss_stale_reviews?: boolean
  require_code_owner_reviews?: boolean
  dismissal_restrictions?: Restrictions
}

export interface RequiredStatusChecks {
  strict: boolean
  contexts: string[]
}

export interface Restrictions {
  users: string[]
  teams: string[]
  apps?: string[]
}

// https://docs.github.com/en/rest/deployments/environments?#create-or-update-an-environment
export interface Environment {
  name: string
  prevent_self_review?: boolean
  reviewers?: string[]
}

export interface Reviewer {
  type: 'User' | 'Team'
  id: number
}
