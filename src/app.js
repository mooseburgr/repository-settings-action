// copy-pasta fork of: https://github.com/repository-settings/app/blob/master/index.js
import * as core from '@actions/core'

const mergeArrayByName = require('@repository-settings/app/lib/mergeArrayByName')

/**
 * @param {import('probot').Probot} robot
 * @param _
 * @param Settings
 */
module.exports = (robot, _, Settings = require('@repository-settings/app/lib/settings')) => {
    async function syncSettings (context, repo = context.repo()) {
        const config = await context.config('settings.yml', {}, { arrayMerge: mergeArrayByName })
        return Settings.sync(context.octokit, repo, config)
    }

    try {
        robot.on('push', async context => {
            return syncSettings(context)
        })

        robot.onAny(async context => {
            return syncSettings(context)
        })

    } catch (error) {
        console.error(error)
        core.setFailed(error)
    }
}
