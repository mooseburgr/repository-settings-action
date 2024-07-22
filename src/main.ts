import * as core from '@actions/core'
import * as github from '@actions/github'
import * as api from './api'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // gather inputs
    const token: string = core.getInput('token', { required: true })
    const settingsPath: string =
      core.getInput('settings-path') ?? '.github/settings.yml'

    const octokit = github.getOctokit(token)

    // context of the current action run
    const context = github.context

    const settings = await api.fetchSettingsFile(octokit, context, settingsPath)

    if (!settings) {
      core.info('settings file not found')
      return
    }

    await api.updateRepoSettings(octokit, context, settings)
  } catch (error) {
    core.warning(`caught error: ${JSON.stringify(error, null, 2)}`)

    // fail the workflow run if an error occurs
    if (error instanceof Error) {
      core.setFailed(error)
    }
  }
}
