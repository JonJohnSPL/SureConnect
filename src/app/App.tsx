import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Outlet, RouterProvider, createBrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "../hooks/useAuth";
import { AppLayout } from "../components/AppLayout";
import { AssembliesPage } from "../pages/AssembliesPage";
import { BuilderPage } from "../pages/BuilderPage";
import { LoginPage } from "../pages/LoginPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function RequireAuth() {
  const { session, loading } = useAuth();
  if (loading) return <div className="centered">Loading session...</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/assemblies" replace /> },
          { path: "/assemblies", element: <AssembliesPage /> },
          { path: "/builder", element: <BuilderPage /> },
          { path: "/builder/:assemblyId", element: <BuilderPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/assemblies" replace /> },
]);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

