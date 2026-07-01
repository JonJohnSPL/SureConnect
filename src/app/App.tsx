import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Outlet, RouterProvider, createBrowserRouter, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "../hooks/useAuth";
import { AppLayout } from "../components/AppLayout";
import { AssembliesPage } from "../pages/AssembliesPage";
import { BuilderPage } from "../pages/BuilderPage";
import { FieldBuilderPage } from "../pages/FieldBuilderPage";
import { FieldRigUpsPage } from "../pages/FieldRigUpsPage";
import { LoginPage } from "../pages/LoginPage";
import { ScopeLandingPage } from "../pages/ScopeLandingPage";

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

function LegacyBuilderRedirect() {
  const { assemblyId } = useParams();
  return <Navigate to={assemblyId ? `/lab/builder/${assemblyId}` : "/lab/builder"} replace />;
}

const routerBaseName = import.meta.env.BASE_URL === "/" ? undefined : import.meta.env.BASE_URL.replace(/\/$/, "");

const router = createBrowserRouter(
  [
    { path: "/login", element: <LoginPage /> },
    {
      element: <RequireAuth />,
      children: [
        {
          element: <AppLayout />,
          children: [
            { index: true, element: <ScopeLandingPage /> },
            { path: "/lab/assemblies", element: <AssembliesPage /> },
            { path: "/lab/builder", element: <BuilderPage /> },
            { path: "/lab/builder/:assemblyId", element: <BuilderPage /> },
            { path: "/field/rig-ups", element: <FieldRigUpsPage /> },
            { path: "/field/builder", element: <FieldBuilderPage /> },
            { path: "/field/builder/:rigUpId", element: <FieldBuilderPage /> },
            { path: "/assemblies", element: <Navigate to="/lab/assemblies" replace /> },
            { path: "/builder", element: <Navigate to="/lab/builder" replace /> },
            { path: "/builder/:assemblyId", element: <LegacyBuilderRedirect /> },
          ],
        },
      ],
    },
    { path: "*", element: <Navigate to="/" replace /> },
  ],
  {
    basename: routerBaseName,
  },
);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
