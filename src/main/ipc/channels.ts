export const IPC = {
  // Query flow
  QUERY_SUBMIT: 'query:submit',
  QUERY_PROGRESS: 'query:progress',

  // Server management
  SERVERS_GET_ALL: 'servers:getAll',
  SERVERS_SET_ENABLED: 'servers:setEnabled',
  SERVERS_ADD_CUSTOM: 'servers:addCustom',
  SERVERS_REMOVE: 'servers:remove',
  REGISTRY_SEARCH: 'registry:search',

  // Settings
  API_KEY_SET: 'apiKey:set',
  API_KEY_HAS: 'apiKey:has',

  // AI Backend
  BACKEND_GET: 'backend:get',
  BACKEND_SET: 'backend:set',

  // Anthropic config
  ANTHROPIC_CONFIG_GET: 'anthropic:configGet',
  ANTHROPIC_CONFIG_SET: 'anthropic:configSet',

  // Ollama / OpenAI-compatible config
  OLLAMA_CONFIG_GET: 'ollama:configGet',
  OLLAMA_CONFIG_SET: 'ollama:configSet',
  OLLAMA_TEST_CONNECTION: 'ollama:testConnection',
  OLLAMA_FETCH_MODELS: 'ollama:fetchModels',

  // System
  OPEN_EXTERNAL: 'system:openExternal',
} as const
