import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from './components/Toast'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { TablesPage } from './pages/TablesPage'
import { OrderEntryPage } from './pages/OrderEntryPage'
import { BillingPage } from './pages/BillingPage'
import { BillingOverviewPage } from './pages/BillingOverviewPage'
import { InventoryPage } from './pages/InventoryPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { AuditLogPage } from './pages/AuditLogPage'
import { MenuPage } from './pages/MenuPage'
import { OrdersPage } from './pages/OrdersPage'
import { useAuthStore } from './store/authStore'
import { useOnboardingStore } from './store/onboardingStore'

// Requires auth only — used for /onboarding itself
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/auth" replace />
  return <>{children}</>
}

// Requires auth + completed onboarding for THIS user — used for all app pages
function OnboardedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  const { isComplete, completedForEmail } = useOnboardingStore()
  if (!isAuthenticated) return <Navigate to="/auth" replace />
  if (!isComplete || completedForEmail !== user?.email) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <OnboardedRoute>
              <DashboardPage />
            </OnboardedRoute>
          }
        />
        <Route
          path="/tables"
          element={
            <OnboardedRoute>
              <TablesPage />
            </OnboardedRoute>
          }
        />
        <Route
          path="/order/:tableId"
          element={
            <OnboardedRoute>
              <OrderEntryPage />
            </OnboardedRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <OnboardedRoute>
              <BillingOverviewPage />
            </OnboardedRoute>
          }
        />
        <Route
          path="/billing/:tableId"
          element={
            <OnboardedRoute>
              <BillingPage />
            </OnboardedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <OnboardedRoute>
              <InventoryPage />
            </OnboardedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <OnboardedRoute>
              <AnalyticsPage />
            </OnboardedRoute>
          }
        />
        <Route
          path="/audit-log"
          element={
            <OnboardedRoute>
              <AuditLogPage />
            </OnboardedRoute>
          }
        />
        <Route
          path="/menu"
          element={
            <OnboardedRoute>
              <MenuPage />
            </OnboardedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <OnboardedRoute>
              <OrdersPage />
            </OnboardedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}
