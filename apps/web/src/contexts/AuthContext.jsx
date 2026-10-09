import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import pb from '@/lib/pocketbaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(pb.authStore.record);

    useEffect(() => pb.authStore.onChange((_token, record) => setUser(record)), []);

    // Realtime: reflete alterações de permissão/role feitas pelo admin
    // instantaneamente na sessão do usuário afetado (Matriz de Rastreabilidade).
    useEffect(() => {
        if (!user?.id) return;
        const col = user.collectionName || (pb.authStore.record && pb.authStore.record.collectionName);
        if (!col) return;
        let unsub = () => {};
        void pb
            .collection(col)
            .subscribe(user.id, (e) => {
                if (e.action === 'update' && e.record) setUser(e.record);
            })
            .then((fn) => { unsub = fn; })
            .catch(() => {});
        return () => { try { unsub(); } catch (_) {} void pb.collection(col).unsubscribe(user.id).catch(() => {}); };
    }, [user?.id, user?.collectionName]);

    const value = useMemo(
        () => ({
            user,
            isAuthed: pb.authStore.isValid && !!user,
            isAdmin: user?.collectionName === 'users',
            isClient: user?.collectionName === 'clients',
            login: (email, password) => pb.collection('users').authWithPassword(email, password),
            loginAdmin: (email, password) => pb.collection('users').authWithPassword(email, password),
            loginClient: (protocol, password) => pb.collection('clients').authWithPassword(protocol.trim(), password),
            logout: () => pb.authStore.clear(),
        }),
        [user],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
