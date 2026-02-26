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

  // System
  OPEN_EXTERNAL: 'system:openExternal',
} as const
