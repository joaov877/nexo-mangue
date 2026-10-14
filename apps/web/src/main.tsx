import { ReactElement, StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { api, ApiError } from './lib/api';
import { AuthProvider, useAuth } from './lib/auth';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileSetup from './pages/ProfileSetup';
import Connections from './pages/Connections';
import './styles.css';

function Protected({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center muted">Carregando…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function ProfileGate({ children }: { children: ReactElement }) {
  const { user } = useAuth();
  const [state, setState] = useState<'checking' | 'ready' | 'missing' | 'error'>('checking');
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    api.profile().then(() => { if (active) setState('ready'); }).catch((err: ApiError) => {
      if (!active) return;
      if (err.status === 404) setState('missing');
      else { setMessage(err.message); setState('error'); }
    });
    return () => { active = false; };
  }, [user?.id]);
  if (state === 'checking') return <div className="center muted">Verificando seu perfil…</div>;
  if (state === 'missing') return <Navigate to="/perfil" replace />;
  if (state === 'error') return <div className="center"><div className="auth-card"><h1>Não foi possível carregar seu perfil</h1><p className="error">{message}</p><button className="btn" onClick={() => window.location.reload()}>Tentar novamente</button></div></div>;
  return children;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><AuthProvider><BrowserRouter><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/cadastro" element={<Register />} />
    <Route path="/perfil" element={<Protected><ProfileSetup /></Protected>} />
    <Route path="/painel" element={<Protected><ProfileGate><Dashboard /></ProfileGate></Protected>} />
    <Route path="/conexoes" element={<Protected><ProfileGate><Connections /></ProfileGate></Protected>} />
    <Route path="/" element={<Protected><ProfileGate><Home /></ProfileGate></Protected>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter></AuthProvider></StrictMode>,
);
