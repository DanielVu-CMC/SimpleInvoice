import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  Link,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './services/auth/auth-provider';
import { ApiError } from './services/api/client';
import { Layout } from './components/layout';
import { Loading, ErrorState } from './components/feedback';
import { LoginPage } from './features/auth/login-page';
import { InvoiceListPage } from './features/invoices/list-page';
import { CreateInvoicePage } from './features/invoices/create-page';
import { InvoiceDetailPage } from './features/invoices/detail-page';
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15000,
      retry: (attempt, error) =>
        !(error instanceof ApiError && error.status < 500) && attempt < 1,
      refetchOnWindowFocus: true,
    },
  },
});
function SessionGate() {
  const { loading, unavailable, retry } = useAuth();
  if (loading) return <Loading label="Opening your workspace…" />;
  if (unavailable)
    return (
      <ErrorState
        message="We couldn’t connect to your workspace. Please check that the API is running."
        retry={retry}
      />
    );
  return <Outlet />;
}
function ProtectedRoutes() {
  return useAuth().user ? <Layout /> : <Navigate to="/login" replace />;
}
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<SessionGate />}>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoutes />}>
          <Route path="/" element={<Navigate to="/invoices" replace />} />
          <Route path="/invoices" element={<InvoiceListPage />} />
          <Route path="/invoices/new" element={<CreateInvoicePage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          <Route
            path="*"
            element={
              <div className="page-body">
                <h1>Page not found.</h1>
                <p>Let’s get you back to your invoices.</p>
                <Link to="/invoices" className="back-link">
                  Back to invoices
                </Link>
              </div>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
