const REGISTRY_BASE = 'https://registry.modelcontextprotocol.io'

export interface RegistryServer {
  name: string
  title?: string
  description: string
  packages: Array<{
    registryType: 'npm' | 'pypi' | 'docker'
    name: string
    version?: string
    runtime?: string
    packageArguments?: Array<{
      description?: string
      isRequired?: boolean
      format?: string
      value?: string
    }>
  }>
  homepage?: string
}

export interface RegistryResponse {
  servers: RegistryServer[]
  next?: string
  total_count?: number
}

export async function searchRegistry(query: string, limit = 20): Promise<RegistryServer[]> {
  const url = `${REGISTRY_BASE}/v0/servers?search=${encodeURIComponent(query)}&limit=${limit}`
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10000)
  })
  if (!response.ok) {
    throw new Error(`Registry fetch failed: ${response.status} ${response.statusText}`)
  }
  const data: RegistryResponse = await response.json()
  return data.servers ?? []
}

export async function listRegistry(limit = 50): Promise<RegistryServer[]> {
  const url = `${REGISTRY_BASE}/v0/servers?limit=${limit}`
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10000)
  })
  if (!response.ok) {
    throw new Error(`Registry fetch failed: ${response.status} ${response.statusText}`)
  }
  const data: RegistryResponse = await response.json()
  return data.servers ?? []
}
