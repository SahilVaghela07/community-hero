import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Camera, MapPin, AlertTriangle, CheckCircle, UploadCloud, Loader2, Info, LayoutDashboard, Calendar, Trash2, CheckCircle2, Circle, User, ShieldAlert, LogIn, ArrowUpCircle } from 'lucide-react';

axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface Issue {
  id: number;
  category: string;
  severity: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  photo_url?: string;
  upvote_count?: number;
  status: string;
  created_at: string;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  points_balance: number;
}

const ProtectedRoute = ({ user, roleRequired, children }: { user: UserProfile | null, roleRequired?: string, children: React.ReactNode }) => {
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in duration-500">
        <ShieldAlert className="w-16 h-16 text-blue-500/50 mb-6" />
        <h2 className="text-2xl font-semibold text-white mb-2">Authentication Required</h2>
        <p className="text-slate-400">Please sign in to access this page.</p>
      </div>
    );
  }

  if (roleRequired && user.role !== roleRequired) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in duration-500">
        <ShieldAlert className="w-16 h-16 text-rose-500/50 mb-6" />
        <h2 className="text-2xl font-semibold text-white mb-2">Access Denied</h2>
        <p className="text-slate-400">You do not have the necessary permissions.</p>
      </div>
    );
  }

  return <>{children}</>;
};

import { Login } from './auth/Login';
import { Register } from './auth/Register';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ReportIssue } from './citizen/ReportIssue';
import { CitizenDashboard } from './citizen/CitizenDashboard';
import { AdminDashboard } from './admin/AdminDashboard';

function MainApp() {
  const { user: currentUser, logout, isAuthenticated } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'report' | 'dashboard' | 'profile'>('dashboard');

  useEffect(() => {
    if (isAdmin && activeTab === 'report') {
      setActiveTab('dashboard');
    }
  }, [isAdmin, activeTab]);

  // Profile State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const renderActiveView = () => {
    if (activeTab === 'report') {
      return (
        <ProtectedRoute user={currentUser}>
          <ReportIssue />
        </ProtectedRoute>
      );
    }

    if (activeTab === 'dashboard') {
      return (
        <ProtectedRoute user={currentUser}>
          {isAdmin ? <AdminDashboard /> : <CitizenDashboard />}
        </ProtectedRoute>
      );
    }
    if (activeTab === 'profile') {
      return (
        <ProtectedRoute user={currentUser}>
          <div className="w-full max-w-md mx-auto space-y-8 animate-in fade-in duration-500 mt-8">
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2 mb-6">
              <User className="w-6 h-6 text-blue-400" />
              My Profile
            </h2>
            
            {profileLoading ? (
              <div className="flex justify-center py-20 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : userProfile ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-lg mb-6">
                  {userProfile.name.charAt(0)}
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{userProfile.name}</h3>
                <p className="text-slate-400 mb-2 font-medium capitalize">{userProfile.role} Contributor</p>
                <div className={`text-sm text-slate-500 ${userProfile.role !== 'admin' ? 'mb-8' : 'mb-4'}`}>{userProfile.email}</div>
                
                {userProfile.role !== 'admin' && (
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-inner">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Points Wallet</p>
                    <div className="flex items-center justify-center gap-3">
                      <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded-xl">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500 tracking-tighter">
                        {userProfile.points_balance}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-4 max-w-[200px] mx-auto leading-relaxed">
                      Points earned by helping keep the community safe.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-center">
                <p className="font-medium">Failed to load profile details</p>
              </div>
            )}
          </div>
        </ProtectedRoute>
      );
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Top Navigation */}
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                <Camera className="w-5 h-5" />
              </div>
              <span className="font-semibold text-white tracking-tight">Community Hero</span>
            </div>
            
            <div className="flex bg-slate-950 p-1 rounded-xl">
              {!isAdmin && (
                <button
                  onClick={() => setActiveTab('report')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'report' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Report Issue
                </button>
              )}
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'dashboard' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isAdmin ? 'Admin Dashboard' : 'Dashboard'}
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'profile' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-rose-400 transition-colors ml-2"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="p-4 sm:p-8">
        {renderActiveView()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

function AppRouter() {
  const { isAuthenticated } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
        {authMode === 'login' ? (
          <Login onSwitchToRegister={() => setAuthMode('signup')} />
        ) : (
          <Register onSwitchToLogin={() => setAuthMode('login')} />
        )}
      </div>
    );
  }

  return <MainApp />;
}
