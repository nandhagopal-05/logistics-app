import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authAPI } from '../services/api';

interface User {
    id: string;
    username: string;
    email?: string;
    role: string;
    must_change_password?: boolean;
    two_factor_enabled?: boolean;
    photo_url?: string;
}

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string, remember?: boolean, token?: string) => Promise<{ success: boolean; requiresTwoFactor?: boolean }>;
    logout: () => void;
    isAuthenticated: boolean;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = async () => {
        try {
            const response = await authAPI.getCurrentUser();
            setUser(response.data);
            // Update storage if exists
            if (localStorage.getItem('user')) {
                localStorage.setItem('user', JSON.stringify(response.data));
            } else if (sessionStorage.getItem('user')) {
                sessionStorage.setItem('user', JSON.stringify(response.data));
            }
        } catch (error) {
            console.error('Failed to refresh user', error);
        }
    };

    useEffect(() => {
        // Check for existing session in both local and session storage
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        if (userStr && token) {
            try {
                setUser(JSON.parse(userStr));
            } catch (e) {
                console.error('Failed to parse user data', e);
            }
        }
        setLoading(false);
    }, []);

    const login = async (username: string, password: string, remember: boolean = false, token?: string): Promise<{ success: boolean; requiresTwoFactor?: boolean }> => {
        try {
            const response = await authAPI.login(username, password, token);

            if (response.data.requiresTwoFactor) {
                return { success: false, requiresTwoFactor: true };
            }

            const { token: jwtToken, user: userData } = response.data;

            setUser(userData);

            if (remember) {
                localStorage.setItem('user', JSON.stringify(userData));
                localStorage.setItem('token', jwtToken);
            } else {
                sessionStorage.setItem('user', JSON.stringify(userData));
                sessionStorage.setItem('token', jwtToken);
            }

            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>;
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
