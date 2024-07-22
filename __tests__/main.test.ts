import * as core from '@actions/core'
import * as api from '../src/api'
import { run } from '../src/main'

jest.mock('@actions/core')

describe('GitHub Action main functionality', () => {
  const originalEnvironment = process.env

  beforeEach(() => {
    jest.resetModules() // Most important - it clears the cache
    process.env = { ...originalEnvironment } // Make a copy
    jest.clearAllMocks()
  })

  afterAll(() => {
    process.env = originalEnvironment // Restore old environment
  })

  it('successfully updates repository settings when settings file is found', async () => {
    const mockGetInput = jest
      .spyOn(core, 'getInput')
      .mockImplementation(name => {
        if (name === 'token') return 'fake_token'
        if (name === 'settings-path') return 'path/to/settings.yml'
        return ''
      })
    const mockSetFailed = jest.spyOn(core, 'setFailed')
    const mockFetchSettingsFile = jest
      .spyOn(api, 'fetchSettingsFile')
      .mockResolvedValue({ repository: { allow_merge_commit: false } })
    const mockUpdateRepoSettings = jest
      .spyOn(api, 'updateRepoSettings')
      .mockResolvedValue(undefined)

    await run()

    expect(mockGetInput).toHaveBeenCalledTimes(2)
    expect(mockFetchSettingsFile).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'path/to/settings.yml'
    )
    expect(mockUpdateRepoSettings).toHaveBeenCalled()
    expect(mockSetFailed).not.toHaveBeenCalled()
  })

  it('logs information and exits early if settings file is not found', async () => {
    jest.spyOn(core, 'getInput').mockImplementation(name => {
      if (name === 'token') return 'fake_token'
      if (name === 'settings-path') return 'path/to/settings.yml'
      return ''
    })
    const mockInfo = jest.spyOn(core, 'info').mockImplementation(() => {})
    jest.spyOn(api, 'fetchSettingsFile').mockResolvedValue(null)

    await run()

    expect(mockInfo).toHaveBeenCalledWith('settings file not found')
  })

  it('fails the action if an error occurs during the process', async () => {
    jest.spyOn(core, 'getInput').mockImplementation(() => 'fake_value')
    jest
      .spyOn(api, 'fetchSettingsFile')
      .mockRejectedValue(new Error('Error fetching settings'))
    const mockSetFailed = jest.spyOn(core, 'setFailed')

    await run()

    expect(mockSetFailed).toHaveBeenCalledWith(expect.any(Error))
  })

  it('fails the action if the GitHub token is missing', async () => {
    jest.spyOn(core, 'getInput').mockImplementation(name => {
      if (name === 'token') return ''
      return 'fake_value'
    })
    const mockSetFailed = jest.spyOn(core, 'setFailed')

    await run()

    expect(mockSetFailed).toHaveBeenCalled()
  })
})
