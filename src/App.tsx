import React, { useState, useRef, useEffect } from 'react';
// Ensure JSX IntrinsicElements exists for environments lacking React JSX types
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
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

function MainApp() {
  const { user: currentUser, logout, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'report' | 'dashboard' | 'profile'>('dashboard');

  // Profile State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const isAdmin = currentUser?.role === 'admin';
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>('Detecting location...');
  const [result, setResult] = useState<{ category: string, severity: string, description: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dashboard State
  const [issues, setIssues] = useState<Issue[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  
  // Filter & Sort State
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<'Pending' | 'Resolved' | 'All'>('Pending');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'most-upvotes'>('most-upvotes');
  const categories = ['All', 'Pothole', 'Streetlight', 'Leak', 'Garbage', 'Other'];
  const severities = ['All', 'High', 'Medium', 'Low'];

  useEffect(() => {
    if (activeTab === 'report') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
            setLocationStatus('Location captured');
          },
          (error) => {
            console.warn('Geolocation blocked or failed:', error);
            setLocationStatus('Location disabled');
          }
        );
      } else {
        setLocationStatus('Location not supported');
      }
    } else if (activeTab === 'dashboard') {
      fetchIssues();
    } else if (activeTab === 'profile') {
      fetchProfile();
    }
  }, [activeTab]);

  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const response = await axios.get('/api/users/me');
      if (response.data.success) {
        setUserProfile(response.data.data);
      }
    } catch (err: any) {
      if (err.response?.status !== 401) console.error(err);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchIssues = async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const response = await axios.get('/api/issues');
      if (response.data.success) {
        setIssues(response.data.data);
      } else {
        setDashboardError('Failed to fetch issues.');
      }
    } catch (err: any) {
      if (err.response?.status !== 401) console.error(err);
      setDashboardError('Database cannot be reached or is not configured.');
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this issue?')) {
      try {
        const response = await axios.delete(`/api/issues/${id}`);
        if (response.data.success) {
          setIssues(prevIssues => prevIssues.filter(issue => issue.id !== id));
        } else {
          alert('Failed to delete issue.');
        }
      } catch (err: any) {
        if (err.response?.status !== 401) console.error(err);
        alert('An error occurred while deleting the issue.');
      }
    }
  };

  const handleUpvote = async (id: number) => {
    try {
      await axios.post(`/api/issues/${id}/upvote`);
      fetchIssues();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to upvote');
    }
  };

  const handleResolve = async (id: number) => {
    try {
      const response = await axios.patch(`/api/issues/${id}/resolve`);
      if (response.data.success) {
        setIssues(prevIssues => prevIssues.map(issue => 
          issue.id === id ? { ...issue, status: 'Resolved' } : issue
        ));
        alert('Issue Resolved! 50 Points awarded to the reporter.');
      } else {
        alert(response.data.error || 'Failed to update status.');
      }
    } catch (err: any) {
      if (err.response?.status !== 401) console.error(err);
      alert(err.response?.data?.error || 'An error occurred while resolving the issue.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResult(null);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setResult(null);
        setError(null);
      } else {
        setError('Please drop an image file.');
      }
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);
    if (location) {
      formData.append('latitude', location.lat.toString());
      formData.append('longitude', location.lng.toString());
    }

    try {
      const response = await axios.post('/api/issues', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        setResult(response.data.data);
      } else {
        setError('Server returned an error.');
      }
    } catch (err: any) {
      if (err.response?.status !== 401) console.error(err);
      setError('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const severityColor = (severity: string) => {
    switch(severity?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200 font-bold';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200 font-bold';
      case 'low': return 'bg-green-100 text-green-700 border-green-200 font-bold';
      default: return 'bg-slate-100 text-slate-700 border-slate-200 font-bold';
    }
  };

  const renderActiveView = () => {
    if (activeTab === 'report') {
      return (
        <ProtectedRoute user={currentUser}>

          <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
          {/* Upload Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-xl font-medium text-white mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Report an Issue
            </h2>

            <div 
              className="border-2 border-dashed border-slate-700 bg-slate-900/50 hover:bg-slate-800/50 transition-colors rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer min-h-[300px] relative overflow-hidden group"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
              ) : null}

              <div className="relative z-10 flex flex-col items-center space-y-4">
                <div className="p-4 bg-slate-800/80 rounded-full text-slate-300 backdrop-blur-sm border border-slate-700">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-white shadow-sm">
                    {previewUrl ? 'Click to change photo' : 'Click or drop a photo here'}
                  </p>
                  <p className="text-sm text-slate-400 drop-shadow-md">
                    Supports JPG, PNG up to 10MB
                  </p>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            {/* Location Status */}
            <div className="mt-6 flex items-center gap-3 text-sm text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
              <MapPin className="w-4 h-4 text-emerald-500" />
              <span>{locationStatus}</span>
              {location && <span className="ml-auto font-mono text-xs opacity-70">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>}
            </div>

            <div className="mt-6">
              <button
                onClick={handleSubmit}
                disabled={!file || loading}
                className="w-full relative overflow-hidden flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium py-4 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>🧠 AI is analyzing your report...</span>
                  </>
                ) : (
                  <>
                    Submit Report
                  </>
                )}
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm text-center">
                {error}
              </div>
            )}
          </div>

          {/* Success Card */}
          {result && (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-full mt-1 shrink-0">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="space-y-4 w-full">
                  <div>
                    <h3 className="text-xl font-medium text-emerald-400">Report Processed</h3>
                    <p className="text-emerald-500/70 text-sm">Our AI has successfully analyzed and logged the issue.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Category</p>
                      <p className="text-lg font-medium text-white">{result.category}</p>
                    </div>
                    <div className={`border rounded-xl p-4 flex flex-col justify-center ${severityColor(result.severity)}`}>
                      <p className="text-xs uppercase tracking-wider font-semibold mb-1 opacity-70">Severity</p>
                      <p className="text-lg font-medium">{result.severity}</p>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">AI Description</p>
                    <p className="text-slate-300 flex items-start gap-2">
                      <Info className="w-4 h-4 mt-0.5 shrink-0 opacity-50" />
                      {result.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
=======
          <ReportIssue />
>>>>>>> 92777e156c9fe1dc8c3e3c9cdcbae22fd277bc9c
        </ProtectedRoute>
      );
    }

    if (activeTab === 'dashboard') {
      return (
        <ProtectedRoute user={currentUser}>
          <CitizenDashboard />
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
                <div className="text-sm text-slate-500 mb-8">{userProfile.email}</div>
                
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
              <button
                onClick={() => setActiveTab('report')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'report' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Report Issue
              </button>
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
