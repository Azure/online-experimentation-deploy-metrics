// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as core from '@actions/core'
import { getActionInput } from './input'
import { loadConfigFiles } from './config-loader'
import { createOrUpdateMetrics, validateMetrics } from './metric-client'

export async function run(): Promise<void> {
  try {
    const input = getActionInput()
    const config = await loadConfigFiles(input.configFile)

    core.info('Configuration loaded')

    await validateMetrics(input, config)
    if (input.operationType === 'deploy') {
      core.info('Creating or updating metrics')
      await createOrUpdateMetrics(input, config)
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
