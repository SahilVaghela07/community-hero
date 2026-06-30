/**
 * File Purpose: Frontend Routing Component
 * 
 * A wrapper component that enforces authentication and role-based access 
 * control on specific client-side routes.
 * 
 * Key Features Documented:
 * - Privilege Separation / Role-Based Security (Restricts routes based on allowedRoles)
 */
import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ShieldAlert } from 'lucide-react';

export const ProtectedRoute = ({ allowedRoles, children }: { allowedRoles?: string[], children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-in fade-in duration-500">
        <ShieldAlert className="w-16 h-16 text-rose-500/50 mb-6" />
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Unauthorized</h2>
        <p className="text-slate-600 dark:text-slate-400">You do not have the necessary permissions to view this page.</p>
        <div className="mt-8">
          <Link to="/" className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-transparent rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
