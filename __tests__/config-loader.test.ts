// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { loadConfigFiles } from '../src/config-loader'
import { ArgumentError, ParseError } from '../src/errors'

jest.mock('@actions/core')

describe('loadConfigFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throw when no config files are found', async () => {
    const promise = loadConfigFiles(`${__dirname}/test-data/missing.json`)

    await expect(promise).rejects.toThrow(ArgumentError)
    await expect(promise).rejects.toThrow('No configuration files found')
  })

  it('throw when config format is invalid', async () => {
    const promise = loadConfigFiles(`${__dirname}/invalid-data/invalid.json`)

    await expect(promise).rejects.toThrow(ParseError)
    await expect(promise).rejects.toThrow(/Failed to parse:/)
  })

  it('throw when json is not following schema', async () => {
    const promise = loadConfigFiles(
      `${__dirname}/invalid-data/invalid-kind-enum.json`
    )

    await expect(promise).rejects.toThrow(ArgumentError)

    await expect(promise).rejects.toThrow(
      /Schema validation failed for metric: avg_total_token_count. It should follow the schema defined/
    )
    await expect(promise).rejects.toThrow(
      /instance.definition.kind: is not one of enum values: EventCount,UserCount,EventRate,UserRate,Sum,Average,Percentile/
    )
  })

  it('throw when json is not following schema - percentile is not provided', async () => {
    const promise = loadConfigFiles(
      `${__dirname}/invalid-data/invalid-percentile.json`
    )

    await expect(promise).rejects.toThrow(ArgumentError)

    await expect(promise).rejects.toThrow(
      /Schema validation failed for metric: median_total_token_count. It should follow the schema defined/
    )
  })

  it('throw when json is not following schema - kind is provided but other fields like event are not provided', async () => {
    const promise = loadConfigFiles(
      `${__dirname}/invalid-data/invalid-definition-without-event.json`
    )

    await expect(promise).rejects.toThrow(ArgumentError)

    await expect(promise).rejects.toThrow(
      /Schema validation failed for metric: avg_total_token_count. It should follow the schema defined in the schema file/
    )
    await expect(promise).rejects.toThrow(
      /Errors: instance.definition: is not any of <#\/definitions\/EventCountDefinition>,<#\/definitions\/UserCountDefinition>,<#\/definitions\/EventRateDefinition>,<#\/definitions\/UserRateDefinition>,<#\/definitions\/SumDefinition>,<#\/definitions\/AverageDefinition>,<#\/definitions\/PercentileDefinition>/
    )
  })

  it('Read file correctly', async () => {
    const result = await loadConfigFiles(`${__dirname}/test-data/valid.json`)
    expect(result.length).toBe(2)
    expect(result[0].id).toBe('avg_total_token_count')
    expect(result[1].id).toBe('median_total_token_count')
  })

  it('throw when duplicates are present', async () => {
    const promise = loadConfigFiles(
      `${__dirname}/test-data/valid.json
      ${__dirname}/test-data/duplicates.json`
    )

    await expect(promise).rejects.toThrow(ArgumentError)
    await expect(promise).rejects.toThrow(
      'Metric is defined multiple times which is not allowed: avg_total_token_count, avg_total_token_count'
    )
  })
})
