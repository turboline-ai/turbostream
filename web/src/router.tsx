// @group Configuration : React Router v6 route definitions

import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { AppShell } from '@/components/shared/app-shell'
import { ProtectedRoute } from '@/components/shared/protected-route'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { LoginPage } from '@/pages/auth/login-page'
import { RegisterPage } from '@/pages/auth/register-page'
import { TwoFactorPage } from '@/pages/auth/two-factor-page'

// @group Configuration > LazyRoutes : Lazy-loaded page components
const MarketplacePage = lazy(() => import('@/pages/marketplace/marketplace-page').then((m) => ({ default: m.MarketplacePage })))
const FeedDetailPage = lazy(() => import('@/pages/marketplace/feed-detail-page').then((m) => ({ default: m.FeedDetailPage })))
const DashboardPage = lazy(() => import('@/pages/dashboard/dashboard-page').then((m) => ({ default: m.DashboardPage })))
const MyFeedsPage = lazy(() => import('@/pages/my-feeds/my-feeds-page').then((m) => ({ default: m.MyFeedsPage })))
const CreateFeedPage = lazy(() => import('@/pages/my-feeds/create-feed-page').then((m) => ({ default: m.CreateFeedPage })))
const EditFeedPage = lazy(() => import('@/pages/my-feeds/edit-feed-page').then((m) => ({ default: m.EditFeedPage })))
const LLMPage = lazy(() => import('@/pages/llm/llm-query-page').then((m) => ({ default: m.LLMQueryPage })))
const AccountPage = lazy(() => import('@/pages/account/account-page').then((m) => ({ default: m.AccountPage })))

const Fallback = () => <LoadingSpinner fullPage />

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      // Public routes
      { index: true, element: <Navigate to={ROUTES.DASHBOARD} replace /> },
      { path: ROUTES.LOGIN.slice(1), element: <LoginPage /> },
      { path: ROUTES.REGISTER.slice(1), element: <RegisterPage /> },
      { path: ROUTES.TWO_FACTOR.slice(1), element: <TwoFactorPage /> },
      {
        path: ROUTES.MARKETPLACE.slice(1),
        element: <Suspense fallback={<Fallback />}><MarketplacePage /></Suspense>,
      },
      {
        path: 'marketplace/:id',
        element: <Suspense fallback={<Fallback />}><FeedDetailPage /></Suspense>,
      },

      // Protected routes
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: ROUTES.DASHBOARD.slice(1),
            element: <Suspense fallback={<Fallback />}><DashboardPage /></Suspense>,
          },
          {
            path: ROUTES.MY_FEEDS.slice(1),
            element: <Suspense fallback={<Fallback />}><MyFeedsPage /></Suspense>,
          },
          {
            path: 'my-feeds/create',
            element: <Suspense fallback={<Fallback />}><CreateFeedPage /></Suspense>,
          },
          {
            path: 'my-feeds/:id/edit',
            element: <Suspense fallback={<Fallback />}><EditFeedPage /></Suspense>,
          },
          {
            path: ROUTES.LLM.slice(1),
            element: <Suspense fallback={<Fallback />}><LLMPage /></Suspense>,
          },
          {
            path: ROUTES.ACCOUNT.slice(1),
            element: <Suspense fallback={<Fallback />}><AccountPage /></Suspense>,
          },
        ],
      },
    ],
  },
])
