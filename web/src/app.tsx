// @group Configuration : Application root — providers setup

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { router } from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'hsl(222.2 84% 4.9%)',
            color: 'hsl(210 40% 98%)',
            border: '1px solid hsl(217.2 32.6% 17.5%)',
          },
        }}
      />
    </QueryClientProvider>
  )
}
