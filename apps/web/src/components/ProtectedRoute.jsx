import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ProtectedRoute = ({ children, require }) => {
    const { isAuthed, isAdmin, isClient } = useAuth();

    const allowed =
        isAuthed && (require === 'admin' ? isAdmin : require === 'client' ? isClient : true);

    if (!allowed) {
        const to = require === 'admin' ? '/restrito' : require === 'client' ? '/portal' : '/';
        return <Navigate to={to} replace />;
    }

    return children;
}

export default ProtectedRoute;

export { ProtectedRoute };
