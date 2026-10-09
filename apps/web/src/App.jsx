import React from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import { BlogPage, BlogPostPage, SobrePage, LinksPage, SearchPage } from './pages/ContentPages';
import { PortalLoginPage, PortalDashboardPage } from './pages/Portal';
import {
  AdminLoginPage,
  AdminLayout,
  AdminDashboard,
  AdminPosts,
  AdminPostEditor,
  AdminClients,
  AdminProcesses,
  AdminProcessDetail,
  AdminBioLinks,
} from './pages/Admin';
import {
  AdminFinanceiro,
  AdminKanban,
  AdminArquivo,
  AdminNotificacoes,
  AdminConfig,
} from './pages/AdminExtra';
import AdminDjen from './pages/AdminDjen';
import {
  AdminUsers,
  AdminAudit,
  AdminDRE,
  AdminAgenda,
  AdminCMS,
} from './pages/AdminAdvanced';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/sobre" element={<SobrePage />} />
          <Route path="/links" element={<LinksPage />} />
          <Route path="/busca" element={<SearchPage />} />
          <Route path="/portal" element={<PortalLoginPage />} />
          <Route
            path="/portal/painel"
            element={
              <ProtectedRoute require="client">
                <PortalDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/restrito" element={<AdminLoginPage />} />
          <Route
            path="/restrito/painel"
            element={
              <ProtectedRoute require="admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="posts" element={<AdminPosts />} />
            <Route path="posts/novo" element={<AdminPostEditor />} />
            <Route path="posts/:id" element={<AdminPostEditor />} />
            <Route path="clientes" element={<AdminClients />} />
            <Route path="processos" element={<AdminProcesses />} />
            <Route path="processos/:id" element={<AdminProcessDetail />} />
            <Route path="bio" element={<AdminBioLinks />} />
            <Route path="financeiro" element={<AdminFinanceiro />} />
            <Route path="dre" element={<AdminDRE />} />
            <Route path="agenda" element={<AdminAgenda />} />
            <Route path="djen" element={<AdminDjen />} />
            <Route path="kanban" element={<AdminKanban />} />
            <Route path="arquivo" element={<AdminArquivo />} />
            <Route path="notificacoes" element={<AdminNotificacoes />} />
            <Route path="usuarios" element={<AdminUsers />} />
            <Route path="auditoria" element={<AdminAudit />} />
            <Route path="conteudo" element={<AdminCMS />} />
            <Route path="config" element={<AdminConfig />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
