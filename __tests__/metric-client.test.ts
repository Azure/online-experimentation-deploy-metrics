// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import axios from 'axios'
import { DefaultAzureCredential } from '@azure/identity'
import * as core from '@actions/core'
import { validateMetrics, createOrUpdateMetrics } from '../src/metric-client'
import { ValidationError } from '../src/errors'
import { Input } from '../src/models'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

jest.mock('@azure/identity', () => ({
  DefaultAzureCredential: jest.fn()
}))
jest.mock('@actions/core')

// Mock the GitHub Actions core library
let debugMock: jest.SpiedFunction<typeof core.debug>
let infoMock: jest.SpiedFunction<typeof core.info>
let errorMock: jest.SpiedFunction<typeof core.error>
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>
let setOutputMock: jest.SpiedFunction<typeof core.setOutput>

// Mock data for testing
const mockAccessToken = 'mocked-access-token'
const mockInput: Input = {
  expWorkspaceEndpoint: 'https://workspace-id.eastus2.exp.azure.net',
  strictSync: false,
  configFile: 'path',
  operationType: 'deploy',
  addCommitShaToDescription: false,
  githubSha: 'github-sha'
}

const mockMetrics = [
  { id: 'metric1', name: 'TestMetric1' },
  { id: 'metric2', name: 'TestMetric2' }
]

beforeEach(() => {
  jest.clearAllMocks()

  DefaultAzureCredential.prototype.getToken = jest.fn().mockResolvedValue({
    token: mockAccessToken
  })
  debugMock = jest.spyOn(core, 'debug').mockImplementation()
  infoMock = jest.spyOn(core, 'info').mockImplementation()
  errorMock = jest.spyOn(core, 'error').mockImplementation()
  getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
  setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
  setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()
})

describe('validateMetrics', () => {
  it('should validate all metrics successfully', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      data: { result: 'Valid' }
    })

    await validateMetrics(mockInput, mockMetrics)

    expect(axios.post).toHaveBeenCalledTimes(mockMetrics.length)
    mockMetrics.forEach(metric => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining(metric.id),
        expect.any(Object),
        expect.any(Object)
      )
    })

    expect(infoMock).toHaveBeenCalledWith('Metric metric1 is valid')
    expect(infoMock).toHaveBeenCalledWith('Metric metric2 is valid')
  })

  it('should throw ValidationError if server returns error', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 400,
      statusText: 'Bad Request'
    })

    await expect(validateMetrics(mockInput, mockMetrics)).rejects.toThrow(
      ValidationError
    )

    expect(errorMock).toHaveBeenCalled()
  })

  it('should throw ValidationError if server returns Invalid', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      statusText: 'Ok',
      data: {
        isValid: false,
        diagnostics: [{ code: 'code', message: 'message' }]
      }
    })

    await expect(validateMetrics(mockInput, mockMetrics)).rejects.toThrow(
      ValidationError
    )

    expect(errorMock).toHaveBeenCalled()
  })
})

describe('createOrUpdateMetrics', () => {
  it('should create or update all metrics successfully', async () => {
    mockedAxios.patch.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      data: { id: 'metric1' }
    })

    await createOrUpdateMetrics(mockInput, mockMetrics)

    expect(axios.patch).toHaveBeenCalledTimes(mockMetrics.length)
    mockMetrics.forEach(metric => {
      expect(axios.patch).toHaveBeenCalledWith(
        expect.stringContaining(metric.id),
        expect.any(Object),
        expect.any(Object)
      )
    })

    expect(core.info).toHaveBeenCalledWith(
      `Metric metric1 is updated to {"id":"metric1"}`
    )
  })

  it('should throw ValidationError if any metric creation or update fails', async () => {
    mockedAxios.patch.mockResolvedValueOnce({
      status: 400,
      statusText: 'Bad Request',
      data: {}
    })

    await expect(createOrUpdateMetrics(mockInput, mockMetrics)).rejects.toThrow(
      ValidationError
    )

    expect(errorMock).toHaveBeenCalled()
  })

  it('should delete remaining metrics in strict mode', async () => {
    mockedAxios.patch.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      data: { id: 'metric1' }
    })

    mockedAxios.delete.mockResolvedValue({
      status: 200,
      statusText: 'OK'
    })

    mockedAxios.get.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      data: {
        value: [
          { id: 'metric1' },
          { id: 'metric2' },
          { id: 'metric3' },
          { id: 'metric4' }
        ]
      }
    })

    mockInput.strictSync = true

    await createOrUpdateMetrics(mockInput, mockMetrics)

    expect(axios.delete).toHaveBeenCalledTimes(2)
    expect(axios.delete).toHaveBeenCalledWith(
      expect.stringContaining('metric3'),
      expect.any(Object)
    )
    expect(axios.delete).toHaveBeenCalledWith(
      expect.stringContaining('metric4'),
      expect.any(Object)
    )
  })
})
