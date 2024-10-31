export interface MetricConfig {
  metrics: Metric[]
}

export interface Metric {
  id: string
  displayName?: string
  description?: string
  lifecycle?: string
  tags?: string[]
  desiredDirection?: string
  definition?: any
}

export interface Input {
  expWorkspaceId: string
  configFile: string
  operationType: 'validate' | 'deploy'
  strictSync: boolean
  addCommitShaToDescription: boolean
  githubSha: string
}

export interface ApiResponse {
  status: number
  statusText: string
}

export interface MetricValidationResponse extends ApiResponse {
  data: MetricValidationResult
}

export interface MetricResponse extends ApiResponse {
  data?: Metric
  error?: string
}

export interface MetricValidationResult {
  result: string
  diagnostics: MetricDiagnostic[]
}

export interface MetricDiagnostic {
  code: string
  message: string
}
