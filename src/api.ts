import { Context } from '@actions/github/lib/context'
import * as yaml from 'js-yaml'
import { RepositorySettings, Reviewer } from './types'
import * as core from '@actions/core'
import { GitHub } from '@actions/github/lib/utils'

export async function fetchSettingsFile(
  octokit: InstanceType<typeof GitHub>,
  context: Context,
  settingsPath: string
): Promise<RepositorySettings | null> {
  try {
    // read file from repo
    const contentResponse = await octokit.rest.repos.getContent({
      ...context.repo,
      path: settingsPath
    })

    // ensure the response is a file and not a directory
    if (
      !Array.isArray(contentResponse.data) &&
      contentResponse.data.type === 'file'
    ) {
      // decode the base64 content of the file
      const settingsContent = Buffer.from(
        contentResponse.data.content,
        'base64'
      ).toString()

      // parse the YAML content into settings
      return yaml.load(settingsContent) as RepositorySettings
    }
  } catch (error) {
    core.debug(`error fetching settings file: ${JSON.stringify(error)}`)
  }
  return null
}

export async function updateRepoSettings(
  octokit: InstanceType<typeof GitHub>,
  context: Context,
  settings: RepositorySettings
): Promise<void> {
  core.debug(`applying settings from YAML: \n${yaml.dump(settings)}`)

  await updateTopLevelSettings(octokit, context, settings)
  await updateTeams(octokit, context, settings)
  await updateCollaborators(octokit, context, settings)
  await updateBranchProtections(octokit, context, settings)
  await updateEnvironments(octokit, context, settings)
}

export async function updateTopLevelSettings(
  octokit: InstanceType<typeof GitHub>,
  context: Context,
  settings: RepositorySettings
): Promise<void> {
  // update top-level repo settings
  if (settings.repository) {
    core.info(
      `Updating top-level repo settings: ${JSON.stringify(settings.repository)}`
    )
    const updateResp = await octokit.rest.repos.update({
      ...context.repo,
      ...settings.repository
    })
    core.debug(`Updated top-level repo settings: ${JSON.stringify(updateResp)}`)
  }

  // update repo topics
  if (settings.repository?.topics) {
    core.info(
      `Updating repo topics: ${JSON.stringify(settings.repository.topics)}`
    )
    const topicsResp = await octokit.rest.repos.replaceAllTopics({
      ...context.repo,
      names: settings.repository.topics
    })
    core.debug(`Updated repo topics: ${JSON.stringify(topicsResp)}`)
  }
}

export async function updateTeams(
  octokit: InstanceType<typeof GitHub>,
  context: Context,
  settings: RepositorySettings
): Promise<void> {
  // update teams' permissions
  if (settings.teams) {
    core.info(`Updating team permissions: ${JSON.stringify(settings.teams)}`)
    for (const team of settings.teams) {
      // trim input name after any '/' to support {org}/{team} format
      const teamResp = await octokit.rest.teams.addOrUpdateRepoPermissionsInOrg(
        {
          org: context.repo.owner,
          team_slug: substringAfterLast(team.name, '/'),
          owner: context.repo.owner,
          repo: context.repo.repo,
          permission: team.permission
        }
      )
      core.debug(`Updated team permissions: ${JSON.stringify(teamResp)}`)
    }

    // TODO need to remove any teams that are not in the settings?
  }
}

export async function updateCollaborators(
  octokit: InstanceType<typeof GitHub>,
  context: Context,
  settings: RepositorySettings
): Promise<void> {
  // update collaborators' permissions
  if (settings.collaborators) {
    core.info(
      `Updating collaborator permissions: ${JSON.stringify(settings.collaborators)}`
    )
    for (const collaborator of settings.collaborators) {
      const collaboratorResp = await octokit.rest.repos.addCollaborator({
        ...context.repo,
        username: collaborator.username,
        permission: collaborator.permission
      })
      core.debug(
        `Updated collaborator permissions: ${JSON.stringify(collaboratorResp)}`
      )
    }

    // TODO need to remove any collaborators that are not in the settings?
  }
}

export async function updateBranchProtections(
  octokit: InstanceType<typeof GitHub>,
  context: Context,
  settings: RepositorySettings
): Promise<void> {
  // update branch protections
  if (settings.branches) {
    core.info(
      `Updating branch protections: ${JSON.stringify(settings.branches)}`
    )
    for (const branch of settings.branches) {
      if (branch.protection) {
        const branchResp = await octokit.rest.repos.updateBranchProtection({
          ...context.repo,
          branch: branch.name,
          required_status_checks: branch.protection?.required_status_checks,
          enforce_admins: branch.protection?.enforce_admins,
          required_pull_request_reviews:
            branch.protection?.required_pull_request_reviews,
          required_linear_history: branch.protection?.required_linear_history,
          restrictions: branch.protection?.restrictions
        })
        core.debug(`Updated branch protection: ${JSON.stringify(branchResp)}`)
      } else {
        // null protection field -> delete it
        const branchResp = await octokit.rest.repos.deleteBranchProtection({
          ...context.repo,
          branch: branch.name
        })
        core.debug(`Deleted branch protection: ${JSON.stringify(branchResp)}`)
      }
    }
  }
}

export async function updateEnvironments(
  octokit: InstanceType<typeof GitHub>,
  context: Context,
  settings: RepositorySettings
): Promise<void> {
  // update environments
  if (settings.environments) {
    core.info(`Updating environments: ${JSON.stringify(settings.environments)}`)
    for (const environment of settings.environments) {
      // look up all reviewers' user or team IDs
      const envReviewers = await lookupUserOrTeamIDs(
        octokit,
        context,
        environment.reviewers
      )

      const envResp = await octokit.rest.repos.createOrUpdateEnvironment({
        ...context.repo,
        environment_name: environment.name,
        prevent_self_review: environment.prevent_self_review,
        reviewers: envReviewers
      })
      core.debug(`Updated environment: ${JSON.stringify(envResp)}`)
    }
  }
}

export async function lookupUserOrTeamIDs(
  octokit: InstanceType<typeof GitHub>,
  context: Context,
  names?: string[]
): Promise<Reviewer[]> {
  const result: Reviewer[] = []
  if (!names) {
    return result
  }
  for (const name of names) {
    // if name contains a '/', it's a team
    if (name.includes('/')) {
      const team = await octokit.rest.teams.getByName({
        org: context.repo.owner,
        team_slug: substringAfterLast(name, '/')
      })
      result.push({ type: 'Team', id: team?.data?.id })
    } else {
      const user = await octokit.rest.users.getByUsername({
        username: name
      })
      result.push({ type: 'User', id: user?.data?.id })
    }
  }
  return result
}

export function substringAfterLast(input: string, char: string): string {
  const index = input.lastIndexOf(char)
  return index === -1 ? input : input.substring(index + 1)
}
