import * as api from '../src/api'
import { Context } from '@actions/github/lib/context'
import { RepositorySettings } from '../src/types'

describe('GitHub API Functionality Tests', () => {
  const mockOctokit = {
    rest: {
      repos: {
        getContent: jest.fn(),
        update: jest.fn(),
        replaceAllTopics: jest.fn(),
        addCollaborator: jest.fn(),
        updateBranchProtection: jest.fn(),
        deleteBranchProtection: jest.fn(),
        createOrUpdateEnvironment: jest.fn()
      },
      teams: {
        getByName: jest.fn(),
        addOrUpdateRepoPermissionsInOrg: jest.fn()
      },
      users: {
        getByUsername: jest.fn()
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  let mockContext: Context
  let settings: RepositorySettings

  beforeEach(() => {
    mockContext = {
      repo: {
        owner: 'testOwner',
        repo: 'testRepo'
      }
    } as Context
    settings = {
      repository: { name: 'testRepo', topics: ['topic1'] },
      teams: [
        { name: 'team1', permission: 'push' },
        { name: 'org/team2', permission: 'admin' }
      ],
      collaborators: [{ username: 'user1', permission: 'maintain' }],
      branches: [
        {
          name: 'main',
          protection: {
            required_status_checks: null,
            enforce_admins: true,
            required_pull_request_reviews: null,
            restrictions: null
          }
        },
        { name: 'delete-me', protection: null }
      ],
      environments: [{ name: 'production', reviewers: ['org/team1', 'user1'] }]
    }
  })

  it('fetchSettingsFile handles YAML content correctly', async () => {
    const encodedYAML = Buffer.from('repository:\n  name: testRepo').toString(
      'base64'
    )
    mockOctokit.rest.repos.getContent.mockResolvedValue({
      data: { type: 'file', content: encodedYAML }
    })

    const result = await api.fetchSettingsFile(
      mockOctokit,
      mockContext,
      'settings.yml'
    )

    expect(result).toEqual({ repository: { name: 'testRepo' } })
  })

  it('fetchSettingsFile returns null for non-existent file', async () => {
    mockOctokit.rest.repos.getContent.mockRejectedValue(new Error('Not Found'))

    const result = await api.fetchSettingsFile(
      mockOctokit,
      mockContext,
      'missing.yml'
    )

    expect(result).toBeNull()
  })

  it('updateTopLevelSettings updates repository name and topics', async () => {
    await api.updateTopLevelSettings(mockOctokit, mockContext, settings)

    expect(mockOctokit.rest.repos.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'testRepo' })
    )
    expect(mockOctokit.rest.repos.replaceAllTopics).toHaveBeenCalledWith(
      expect.objectContaining({ names: ['topic1'] })
    )
  })

  it('updateTeams adds teams with specified permissions', async () => {
    mockOctokit.rest.teams.getByName.mockResolvedValue({ data: { id: 123 } })

    await api.updateTeams(mockOctokit, mockContext, settings)

    expect(
      mockOctokit.rest.teams.addOrUpdateRepoPermissionsInOrg
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        team_slug: 'team1',
        permission: 'push'
      })
    )
  })

  it('updateCollaborators adds collaborators with specified permissions', async () => {
    await api.updateCollaborators(mockOctokit, mockContext, settings)

    expect(mockOctokit.rest.repos.addCollaborator).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'user1',
        permission: 'maintain'
      })
    )
  })

  it('updateBranchProtections applies and deletes protection rules for branches', async () => {
    await api.updateBranchProtections(mockOctokit, mockContext, settings)

    expect(mockOctokit.rest.repos.updateBranchProtection).toHaveBeenCalledWith(
      expect.objectContaining({
        branch: 'main',
        enforce_admins: true
      })
    )
    expect(mockOctokit.rest.repos.deleteBranchProtection).toHaveBeenCalledWith(
      expect.objectContaining({
        branch: 'delete-me'
      })
    )
  })

  it('updateEnvironments creates environments with specified settings', async () => {
    mockOctokit.rest.teams.getByName.mockResolvedValue({ data: { id: 123 } })
    mockOctokit.rest.users.getByUsername.mockResolvedValue({
      data: { id: 456 }
    })

    await api.updateEnvironments(mockOctokit, mockContext, settings)

    expect(
      mockOctokit.rest.repos.createOrUpdateEnvironment
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        environment_name: 'production',
        reviewers: [
          { type: 'Team', id: 123 },
          { type: 'User', id: 456 }
        ]
      })
    )
  })

  it('lookupUserOrTeamIDs returns empty array for no names', async () => {
    const result = await api.lookupUserOrTeamIDs(mockOctokit, mockContext)

    expect(result).toEqual([])
  })

  it('lookupUserOrTeamIDs returns team and user IDs', async () => {
    mockOctokit.rest.users.getByUsername.mockResolvedValue({
      data: { id: 123 }
    })
    mockOctokit.rest.teams.getByName.mockResolvedValue({ data: { id: 456 } })

    const result = await api.lookupUserOrTeamIDs(mockOctokit, mockContext, [
      'user1',
      'org/team1'
    ])

    expect(result).toEqual([
      { type: 'User', id: 123 },
      { type: 'Team', id: 456 }
    ])
  })

  it('substringAfterLast returns correct substring', () => {
    expect(api.substringAfterLast('org/team1', '/')).toEqual('team1')
    expect(api.substringAfterLast('enterprise/org/team1', '/')).toEqual('team1')
    expect(api.substringAfterLast('org-team1', '/')).toEqual('org-team1')
  })
})
