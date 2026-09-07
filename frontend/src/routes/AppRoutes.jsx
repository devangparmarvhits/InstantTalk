import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ChatPage from '../pages/Chat';
import Profile from '../pages/Profile';
import Calls from '../pages/Calls';
import LiveStreams from '../pages/LiveStreams';
import StreamPage from '../pages/LiveStreams/StreamPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="page-loader">
        <div className="loading-spinner" />
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="page-loader">
        <div className="loading-spinner" />
      </div>
    );
  }

  return !user ? children : <Navigate to="/chat" replace />;
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/people" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/groups" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/calls" element={<ProtectedRoute><Calls /></ProtectedRoute>} />
        <Route path="/live" element={<ProtectedRoute><LiveStreams /></ProtectedRoute>} />
        <Route path="/live/:streamId" element={<ProtectedRoute><StreamPage /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
