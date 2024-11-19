// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as core from '@actions/core'
import * as glob from '@actions/glob'
import { ArgumentError, ParseError } from './errors'
import * as fs from 'fs'
import { Metric } from './models'
import * as JsonValidator from 'jsonschema'
import metricsSchema from '../schema/Metrics.v1.0.0.schema.json'

const validator = new JsonValidator.Validator()

export async function loadConfigFiles(inputPattern: string): Promise<Metric[]> {
  core.info('Loading configuration files from: ' + inputPattern)

  const patterns = inputPattern
    .split('\n')
    .map(s => s.replace(/^!\s+/, '!').trim())
    .filter(x => x !== '')
    .join('\n')

  const files = []
  const globber = await glob.create(patterns)
  for await (const file of globber.globGenerator()) {
    files.push(file)
    core.info(`Using configuration file: ${file}`)
  }

  if (files.length === 0) {
    throw new ArgumentError(`No configuration files found`)
  }

  const configs = []

  for (const file of files) {
    core.info(`Parsing : ${file}`)
    configs.push(await parseConfigFile(file))
  }

  // First deep merge all of the config objects into a single object
  // Then flatten the merged object
  core.info('Merging loaded configuration')

  const mergedMetrics = configs.map(config => config.metrics).flat()

  const duplicateMetrics = mergedMetrics.reduce((acc, metric) => {
    const { id } = metric
    acc[id] = (acc[id] || 0) + 1
    return acc
  }, {})

  const duplicates = mergedMetrics.filter(
    metric => duplicateMetrics[metric.id] > 1
  )

  if (duplicates.length > 0) {
    const duplicateIds = duplicates.map(metric => metric.id).join(', ')
    const message = `Metric is defined multiple times which is not allowed: ${duplicateIds}`
    core.error(message)
    throw new ArgumentError(message)
  }

  const schemaValidationResults = mergedMetrics.map(m => {
    return { id: m.id, ...validator.validate(m, metricsSchema) }
  })

  const failedValidations = schemaValidationResults.filter(
    r => r.errors.length > 0
  )

  if (failedValidations.length > 0) {
    const message = failedValidations
      .map(r => {
        const details = r.errors
          .map(e => `${e.property}: ${e.message}`)
          .join('\n')
        return `Schema validation failed for metric: ${r.id}. It should follow the schema defined in the schema file https://github.com/Azure/online-experimentation-deploy-metrics/tree/main/schema/Metrics.v1.0.0.schema.json. Errors: ${details}`
      })
      .join('\n')

    core.error(message)
    throw new ArgumentError(message)
  }

  core.info(`Found ${mergedMetrics.length} metrics in configuration files`)
  return mergedMetrics
}

async function parseConfigFile(file: string): Promise<any> {
  try {
    const data = (await fs.promises.readFile(file)).toString()
    return JSON.parse(data)
  } catch {
    // Will throw a ParseError below
  }
  throw new ParseError(`Failed to parse: ${file}`)
}
