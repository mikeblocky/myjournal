// frontend/src/routes/index.jsx
import React, { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Shell from "../components/Shell/Shell";
import { useAuth } from "../context/AuthContext";

// Lazy pages (code-splitting)
const DailyBrief     = lazy(() => import("../features/digest/DailyBrief"));
const ArticlesList   = lazy(() => import("../features/articles/ArticlesList"));
const ReaderRoute    = lazy(() => import("../pages/ReaderRoute"));

const JournalHome    = lazy(() => import("../pages/JournalHome"));
const JournalWrite   = lazy(() => import("../pages/JournalWrite"));
const JournalView    = lazy(() => import("../pages/JournalView"));

const NotesPage      = lazy(() => import("../pages/NotesPage"));
const CalendarPage   = lazy(() => import("../pages/CalendarPage"));
const SettingsPage   = lazy(() => import("../pages/SettingsPage"));

const Login          = lazy(() => import("../features/auth/Login"));
const Signup         = lazy(() => import("../features/auth/Signup"));

const PressFeed      = lazy(() => import("../pages/PressFeed"));
const PressArticle   = lazy(() => import("../pages/PressArticle"));

// ✅ add this
const ApiDocs        = lazy(() => import("../pages/ApiDocs"));

// Scroll to top on normal route changes (but not when using #hash anchors)
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname, hash]);
  return null;
}

// Route guards
function RequireAuth({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { token } = useAuth();
  if (token) return <Navigate to="/digest" replace />;
  return children;
}

// Simple page loader
function PageLoader() {
  return <p className="prose" style={{ padding: 16 }}>Loading…</p>;
}

function NotFound() {
  return <p className="prose" style={{ padding: 16 }}>Not found.</p>;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Shell>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Landing → Daily Brief */}
            <Route path="/" element={<Navigate to="/digest" replace />} />

            {/* Public pressroom */}
            <Route path="/press" element={<PressFeed />} />
            <Route path="/press/:slug" element={<PressArticle />} />

            {/* ✅ Public API docs */}
            <Route path="/docs" element={<ApiDocs />} />

            {/* Auth-only sections */}
            <Route
              path="/digest"
              element={
                <RequireAuth>
                  <DailyBrief />
                </RequireAuth>
              }
            />
            <Route
              path="/articles"
              element={
                <RequireAuth>
                  <ArticlesList />
                </RequireAuth>
              }
            />
            <Route
              path="/articles/:id"
              element={
                <RequireAuth>
                  <ReaderRoute />
                </RequireAuth>
              }
            />

            <Route
              path="/journal"
              element={
                <RequireAuth>
                  <JournalHome />
                </RequireAuth>
              }
            />
            <Route
              path="/journal/new"
              element={
                <RequireAuth>
                  <JournalWrite />
                </RequireAuth>
              }
            />
            <Route
              path="/journal/:id"
              element={
                <RequireAuth>
                  <JournalView />
                </RequireAuth>
              }
            />

            <Route
              path="/notes"
              element={
                <RequireAuth>
                  <NotesPage />
                </RequireAuth>
              }
            />
            <Route
              path="/calendar"
              element={
                <RequireAuth>
                  <CalendarPage />
                </RequireAuth>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <SettingsPage />
                </RequireAuth>
              }
            />

            {/* Auth */}
            <Route
              path="/login"
              element={
                <PublicOnly>
                  <Login />
                </PublicOnly>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicOnly>
                  <Signup />
                </PublicOnly>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Shell>
    </BrowserRouter>
  );
}
