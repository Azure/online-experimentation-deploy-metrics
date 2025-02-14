// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as core from '@actions/core'
import { getActionInput } from '../src/input'

let getInputMock: jest.SpiedFunction<typeof core.getInput>

describe('getActionInput', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.GITHUB_SHA = 'test'
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
  })

  it('should return the expected input', () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'online-experimentation-workspace-id':
          return 'workspace1'
        case 'location':
          return 'location1'
        case 'path':
          return 'config1'
        case 'operation':
          return 'deploy'
        case 'strict':
          return 'false'
        case 'add-commit-hash-to-metric-description':
          return 'true'
        default:
          return ''
      }
    })
    const input = getActionInput()
    expect(input).toEqual({
      expWorkspaceId: 'workspace1',
      location: 'location1',
      configFile: 'config1',
      operationType: 'deploy',
      strictSync: false,
      addCommitShaToDescription: true,
      githubSha: 'test'
    })
  })

  it('should throw an error if online-experimentation-workspace-id is missing', () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'online-experimentation-workspace-id':
          return ''
        case 'location':
          return 'location1'
        case 'path':
          return 'config1'
        case 'operation':
          return 'deploy'
        case 'strict':
          return 'false'
        case 'add-commit-hash-to-metric-description':
          return 'false'
        default:
          return ''
      }
    })
    expect(() => getActionInput()).toThrowError(
      'Required input is missing: online-experimentation-workspace-id'
    )
  })

  it('should throw an error if path is missing', () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'online-experimentation-workspace-id':
          return 'workspace1'
        case 'location':
          return 'location1'
        case 'path':
          return ''
        case 'operation':
          return 'deploy'
        case 'strict':
          return 'false'
        case 'add-commit-hash-to-metric-description':
          return 'false'
        default:
          return ''
      }
    })
    expect(() => getActionInput()).toThrowError(
      'Required input is missing: path'
    )
  })

  it('should return deploy operationType when operation is missing', () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'online-experimentation-workspace-id':
          return 'workspace1'
        case 'location':
          return 'location1'
        case 'path':
          return 'config1'
        case 'operation':
          return ''
        case 'strict':
          return 'false'
        case 'add-commit-hash-to-metric-description':
          return 'false'
        default:
          return ''
      }
    })
    const input = getActionInput()
    expect(input.operationType).toEqual('deploy')
  })

  it('should throw an error if operation is invalid', () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'online-experimentation-workspace-id':
          return 'workspace1'
        case 'location':
          return 'location1'
        case 'path':
          return 'config1'
        case 'operation':
          return 'SyncInvalid'
        case 'strict':
          return 'false'
        case 'add-commit-hash-to-metric-description':
          return 'false'
        default:
          return ''
      }
    })
    expect(() => getActionInput()).toThrowError(
      `Invalid operation: syncinvalid. It should be either 'validate' or 'deploy'`
    )
  })

  it('should return Incremental mode when mode is missing', () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'online-experimentation-workspace-id':
          return 'workspace1'
        case 'location':
          return 'location1'
        case 'path':
          return 'config1'
        case 'operation':
          return 'deploy'
        case 'strict':
          return ''
        case 'add-commit-hash-to-metric-description':
          return 'false'
        default:
          return ''
      }
    })
    const input = getActionInput()
    expect(input.strictSync).toEqual(true)
  })

  it('should throw an error if mode is invalid', () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'online-experimentation-workspace-id':
          return 'workspace1'
        case 'location':
          return 'location1'
        case 'path':
          return 'config1'
        case 'operation':
          return 'deploy'
        case 'strict':
          return 'IncrementalInvalid'
        case 'add-commit-hash-to-metric-description':
          return 'false'
        default:
          return ''
      }
    })
    expect(() => getActionInput()).toThrowError(
      `Invalid strict value: incrementalinvalid. It should be either 'true' or 'false'`
    )
  })

  it('should throw error when GITHUB_SHA is missing and add-commit-hash-to-metric-description is set to true', () => {
    delete process.env.GITHUB_SHA
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'online-experimentation-workspace-id':
          return 'workspace1'
        case 'location':
          return 'location1'
        case 'path':
          return 'config1'
        case 'operation':
          return 'deploy'
        case 'strict':
          return 'true'
        case 'add-commit-hash-to-metric-description':
          return 'true'
        default:
          return ''
      }
    })

    expect(() => getActionInput()).toThrowError(
      'Run environment is missing GITHUB_SHA variable'
    )
  })

  it('should not throw error when GITHUB_SHA is missing and add-commit-hash-to-metric-description is set to false', () => {
    delete process.env.GITHUB_SHA
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'online-experimentation-workspace-id':
          return 'workspace1'
        case 'location':
          return 'location1'
        case 'path':
          return 'config1'
        case 'operation':
          return 'deploy'
        case 'strict':
          return 'true'
        case 'add-commit-hash-to-metric-description':
          return 'false'
        default:
          return ''
      }
    })

    const result = getActionInput()
    expect(result.addCommitShaToDescription).toEqual(false)
    expect(result.githubSha).toEqual('')
  })
})
