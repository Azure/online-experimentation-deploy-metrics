// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import axios from 'axios'
import {
  ApiResponse,
  Input,
  Metric,
  MetricResponse,
  MetricValidationResponse
} from './models'
import { DefaultAzureCredential } from '@azure/identity'
import * as core from '@actions/core'
import { ApiError, ValidationError } from './errors'

const baseUri = 'https://exp.azure.net'
const apiVersion = '2024-11-30-preview'
const idPattern = '^[a-z_][a-z0-9_]*$'

export async function validateMetrics(
  input: Input,
  metrics: Metric[]
): Promise<void> {
  const accessToken = await getToken()

  const validationResults = await Promise.all(
    metrics.map(metric =>
      validateMetric(input.expWorkspaceId, metric, accessToken).then(
        response => ({ response, metric })
      )
    )
  )

  const results = validationResults.map(({ response, metric }) => {
    return handleValidationResult(response, metric)
  })

  if (results.some(r => r == false)) {
    throw new ValidationError('Metric validation failed')
  }
}

export async function createOrUpdateMetrics(
  input: Input,
  metrics: Metric[]
): Promise<void> {
  const accessToken = await getToken()

  const createResults = await Promise.all(
    metrics.map(metric =>
      createOrUpdateMetric(input, metric, accessToken).then(response => ({
        response,
        metric
      }))
    )
  )

  const results = createResults.map(({ response, metric }) => {
    return handleCreateOrUpdateResult(response, metric)
  })

  if (results.some(r => r == false)) {
    throw new ValidationError('Metric create or update failed')
  }
  core.info('All metrics are created or updated successfully')

  if (input.strictSync) {
    core.info('Deleting remaining metrics in strict mode')
    await deleteRemainingMetrics(input, metrics)
  }

  core.info('Operation completed successfully')
}

async function validateMetric(
  expWorkspaceId: string,
  metric: Metric,
  accessToken: string
): Promise<MetricValidationResponse> {
  if (!isValidMetricId(metric.id)) {
    // TODO: Remove this check once the API is fixed
    return buildInvalidMetricValidationResponse(metric)
  }

  const url = `${baseUri}/workspaces/${expWorkspaceId}/metrics/${metric.id}:validate?api-version=${apiVersion}`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/merge-patch+json',
    Accept: '*/*'
  }

  const response = await axios.post(url, metric, { headers })
  return {
    status: response.status,
    statusText: response.statusText,
    data: response.data
  }
}

async function createOrUpdateMetric(
  input: Input,
  metric: Metric,
  accessToken: string
): Promise<MetricResponse> {
  if (!isValidMetricId(metric.id)) {
    // TODO: Remove this check once the API is fixed
    return buildInvalidMetricResponse(metric)
  }

  const { expWorkspaceId, githubSha, addCommitShaToDescription } = input
  const url = `${baseUri}/workspaces/${expWorkspaceId}/metrics/${metric.id}?api-version=${apiVersion}`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/merge-patch+json',
    Accept: '*/*'
  }

  const { id, ...metricBody } = metric

  if (addCommitShaToDescription) {
    metricBody.description = `${metricBody.description} Commit hash: ${githubSha}`
  }

  const response = await axios.patch(url, metricBody, { headers })
  return {
    status: response.status,
    statusText: response.statusText,
    data: response.data
  }
}

async function deleteRemainingMetrics(
  input: Input,
  metrics: Metric[]
): Promise<void> {
  const accessToken = await getToken()
  const expWorkspaceId = input.expWorkspaceId

  const url = `${baseUri}/workspaces/${expWorkspaceId}/metrics?api-version=${apiVersion}&top=100`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/merge-patch+json',
    Accept: '*/*'
  }

  const response = await axios.get(url, { headers })
  if (response.status >= 400) {
    const failMessage = `Failed to get metrics: ${response.statusText}. Status: ${response.status}. Message: ${JSON.stringify(response.data)}`
    core.error(failMessage)
    throw new ApiError(failMessage)
  }

  core.info(`Found ${response.data.value.length} metrics`)

  const metricIdsToKeep = metrics.map(metric => metric.id)
  const metricIdsToDelete: string[] = response.data.value
    .map((v: Metric) => v.id)
    .filter((item: string) => !metricIdsToKeep.includes(item))

  core.info(
    `Found ${metricIdsToDelete.length} metrics that needs to be deleted`
  )

  const deleteResults = await Promise.all(
    metricIdsToDelete.map((metricId: string) =>
      deleteMetric(input.expWorkspaceId, metricId, accessToken).then(
        response => ({ response, metricId })
      )
    )
  )

  const results = deleteResults.map(({ response, metricId }) => {
    return handleDeleteResult(response, metricId)
  })

  if (results.some(r => r == false)) {
    throw new ValidationError('Metric deletion failed')
  }

  core.info('Additional metrics are deleted successfully')
}

async function deleteMetric(
  expWorkspaceId: string,
  metricId: string,
  accessToken: string
): Promise<ApiResponse> {
  const url = `${baseUri}/workspaces/${expWorkspaceId}/metrics/${metricId}?api-version=${apiVersion}`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/merge-patch+json',
    Accept: '*/*'
  }

  const response = await axios.delete(url, { headers })
  core.info(
    `Metric ${metricId} is deleted. Status: ${response.status}. Message: ${JSON.stringify(response.data)}`
  )
  return {
    status: response.status,
    statusText: response.statusText
  }
}

function handleValidationResult(
  response: MetricValidationResponse,
  metric: Metric
): boolean {
  if (response.status >= 400) {
    core.error(
      `Failed to validate metric ${metric.id}: ${response.statusText}. Status: ${response.status}. Message: ${JSON.stringify(response.data)}`
    )
    return false
  } else if (response.data.result !== 'Valid') {
    core.error(
      `Metric validation failed for ${metric.id}: ${response.statusText}. Message: ${JSON.stringify(response.data)}`
    )
    return false
  } else {
    core.info(`Metric ${metric.id} is valid`)
  }
  return true
}

function handleCreateOrUpdateResult(
  response: MetricResponse,
  metric: Metric
): boolean {
  if (response.status >= 400) {
    const failMessage = `Failed to create or update metric ${metric.id}: ${response.statusText}. Status: ${response.status}. Message: ${JSON.stringify(response.data)}. Error : ${response.error}`
    core.error(failMessage)
    return false
  } else {
    core.info(
      `Metric ${metric.id} is updated to ${JSON.stringify(response.data)}`
    )
  }
  return true
}

function handleDeleteResult(response: ApiResponse, metricId: string): boolean {
  if (response.status >= 400) {
    const failMessage = `Failed to delete metric ${metricId}: ${response.statusText}. Status: ${response.status}.`
    core.error(failMessage)
    return false
  } else {
    core.info(`Metric ${metricId} is deleted`)
  }
  return true
}

const isValidMetricId = (metricId: string) => {
  return metricId.match(idPattern)
}

async function getToken() {
  const credential = new DefaultAzureCredential()
  const tokenResponse = await credential.getToken(`${baseUri}/.default`)
  return tokenResponse.token
}

function buildInvalidMetricResponse(metric: Metric): MetricResponse {
  return {
    status: 400,
    statusText: 'Bad Request',
    error: `Invalid metric id ${metric.id}, it should match ${idPattern}`
  }
}

function buildInvalidMetricValidationResponse(
  metric: Metric
): MetricValidationResponse {
  return {
    status: 200,
    statusText: 'Ok',
    data: {
      result: 'Invalid',
      diagnostics: [
        {
          message: `Invalid metric id: ${metric.id}, it should match ${idPattern}`,
          code: 'InvalidMetricDefinition'
        }
      ]
    }
  }
}
