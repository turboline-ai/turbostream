// @group Configuration : Environment variable constants with safe fallbacks

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:7210'
export const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:7210'
