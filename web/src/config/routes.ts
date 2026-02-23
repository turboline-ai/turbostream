// @group Configuration : Client-side route path constants

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  TWO_FACTOR: '/2fa',
  DASHBOARD: '/dashboard',
  MARKETPLACE: '/marketplace',
  FEED_DETAIL: '/marketplace/:id',
  MY_FEEDS: '/my-feeds',
  CREATE_FEED: '/my-feeds/create',
  EDIT_FEED: '/my-feeds/:id/edit',
  LLM: '/llm',
  ACCOUNT: '/account',
} as const

export const feedDetailPath = (id: string) => `/marketplace/${id}`
export const editFeedPath = (id: string) => `/my-feeds/${id}/edit`
