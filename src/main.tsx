import "@/lib/logger";
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import App from './App.tsx'

const DemoWorldPage = lazy(() => import('./components/DemoWorldPage.tsx'))

const isDemoRoute = window.location.pathname === "/demo"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDemoRoute ? (
      <Suspense fallback={null}>
        <DemoWorldPage />
      </Suspense>
    ) : (
      <BrowserRouter>
        <TRPCProvider>
          <App />
        </TRPCProvider>
      </BrowserRouter>
    )}
  </StrictMode>,
)
