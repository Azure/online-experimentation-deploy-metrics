// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { ArgumentError } from './errors'
import * as core from '@actions/core'
import { Input } from './models'
import exp from 'constants'

export function getActionInput(): Input {
  const shouldAddCommit = getBooleanInput(
    'add-commit-hash-to-metric-description',
    false
  )
  return {
    expWorkspaceEndpoint: getExpWorkspaceEndpoint(),
    configFile: getRequiredInputString('path'),
    operationType: getOperationType(),
    strictSync: getBooleanInput('strict', true),
    addCommitShaToDescription: shouldAddCommit,
    githubSha: shouldAddCommit ? getGithubSha() : ''
  }
}

function getExpWorkspaceEndpoint() {
  let expWorkspaceEndpoint = getRequiredInputString(
    'online-experimentation-workspace-endpoint'
  )
  expWorkspaceEndpoint = expWorkspaceEndpoint.trim().replace(/\/+$/, '')
  if (!expWorkspaceEndpoint.startsWith('https://')) {
    throw new ArgumentError(
      'The online-experimentation-workspace-endpoint should start with https://'
    )
  }

  if (!expWorkspaceEndpoint.includes('exp.azure.net')) {
    throw new ArgumentError(
      'The online-experimentation-workspace-endpoint should include exp.azure.net'
    )
  }

  return expWorkspaceEndpoint
}

function getGithubSha() {
  const githubSha = process.env.GITHUB_SHA
  if (!githubSha) {
    throw new ArgumentError('Run environment is missing GITHUB_SHA variable')
  }

  core.info(`GitHub SHA: ${githubSha}`)
  return githubSha
}

function getOperationType() {
  let operationType = getNonRequiredInputString('operation')
  if (!operationType) {
    return 'deploy'
  }
  operationType = operationType.toLowerCase()

  if (operationType !== 'validate' && operationType !== 'deploy') {
    throw new ArgumentError(
      `Invalid operation: ${operationType}. It should be either 'validate' or 'deploy'`
    )
  }

  return operationType
}

const getRequiredInputString = (name: string): string => {
  const input = getNonRequiredInputString(name)
  if (!input) {
    throw new ArgumentError(`Required input is missing: ${name}`)
  }

  return input
}

const getNonRequiredInputString = (name: string): string | undefined => {
  return core.getInput(name, { required: false })
}

const getBooleanInput = (name: string, defaultValue: boolean): boolean => {
  let settingValue = getNonRequiredInputString(name)
  if (!settingValue) {
    return defaultValue
  }

  settingValue = settingValue.toLowerCase()
  if (settingValue !== 'true' && settingValue !== 'false') {
    throw new ArgumentError(
      `Invalid ${name} value: ${settingValue}. It should be either 'true' or 'false'`
    )
  }

  return settingValue === 'true'
}
