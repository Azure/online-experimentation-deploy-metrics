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
    const promise = loadConfigFiles(`${__dirname}/invalid-data/*.json`)

    await expect(promise).rejects.toThrow(ParseError)
    await expect(promise).rejects.toThrow(/Failed to parse:/)
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