// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as core from '@actions/core'
import { getActionInput } from '../src/input'
import { loadConfigFiles } from '../src/config-loader'
import { createOrUpdateMetrics, validateMetrics } from '../src/metric-client'
import { run } from '../src/main'
import { Input } from '../src/models'

jest.mock('@actions/core')
jest.mock('../src/input')
jest.mock('../src/config-loader')
jest.mock('../src/metric-client')

describe('run', () => {
  const mockInput: Input = {
    configFile: 'test-data/valid.json',
    operationType: 'deploy',
    expWorkspaceEndpoint: 'https://test.eastus2.exp.azure.net',
    strictSync: false,
    addCommitShaToDescription: false,
    githubSha: 'test'
  }
  const mockConfig = {
    /* add your mock config data */
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should load configuration and validate metrics', async () => {
    ;(getActionInput as jest.Mock).mockReturnValue(mockInput)
    ;(loadConfigFiles as jest.Mock).mockImplementation(async () => mockConfig)
    ;(validateMetrics as jest.Mock).mockImplementation(async () => undefined)
    ;(createOrUpdateMetrics as jest.Mock).mockImplementation(
      async () => undefined
    )

    await run()

    expect(getActionInput).toHaveBeenCalledTimes(1)
    expect(loadConfigFiles).toHaveBeenCalledWith(mockInput.configFile)
    expect(validateMetrics).toHaveBeenCalledWith(mockInput, mockConfig)
    expect(core.info).toHaveBeenCalledWith('Configuration loaded')
    expect(core.info).toHaveBeenCalledWith('Creating or updating metrics')
    expect(createOrUpdateMetrics).toHaveBeenCalledWith(mockInput, mockConfig)
  })

  it('should not create or update metrics if validate is true', async () => {
    const inputWithvalidate = {
      ...mockInput,
      operationType: 'validate'
    }
    ;(getActionInput as jest.Mock).mockReturnValue(inputWithvalidate)
    ;(loadConfigFiles as jest.Mock).mockResolvedValue(mockConfig)
    ;(validateMetrics as jest.Mock).mockResolvedValue(undefined)

    await run()

    expect(validateMetrics).toHaveBeenCalledWith(inputWithvalidate, mockConfig)
    expect(core.info).toHaveBeenCalledWith('Configuration loaded')
    expect(createOrUpdateMetrics).not.toHaveBeenCalled()
  })

  it('should set action to failed if an error is thrown', async () => {
    const mockError = new Error('Test error')
    ;(getActionInput as jest.Mock).mockReturnValue(mockInput)
    ;(loadConfigFiles as jest.Mock).mockRejectedValue(mockError)

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(mockError.message)
  })
})
