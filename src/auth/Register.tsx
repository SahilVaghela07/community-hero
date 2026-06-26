import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { Loader2, UserPlus, AlertTriangle } from 'lucide-react';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'citizen' | 'admin'>('citizen');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const validateEmail = (emailStr: string) => {
    if (!emailStr) {
      setEmailError(null);
      return true;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailStr)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    validateEmail(val);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/auth/signup', { name, email, password, role });
      if (response.data.success) {
        // Automatically log them in after signup
        const loginResponse = await axios.post('/api/auth/login', { email, password });
        if (loginResponse.data.success) {
           login(loginResponse.data.token, loginResponse.data.user);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-semibold text-white">Create Account</h2>
          <p className="text-slate-400 mt-2">Join Community Hero</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
            <input 
              type="text" 
              required 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={handleEmailChange}
              className={`w-full bg-slate-950 border ${emailError ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-800 focus:border-blue-500 focus:ring-blue-500'} rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-1 transition-colors`}
              placeholder="you@example.com"
            />
            {emailError && (
              <p className="mt-2 text-sm text-rose-500">{emailError}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Account Role</label>
            <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setRole('citizen')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  role === 'citizen' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Citizen
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  role === 'admin' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Municipal Admin
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-800 pt-6">
          <p className="text-slate-400 text-sm">
            Already have an account?{' '}
            <button 
              onClick={onSwitchToLogin}
              className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
            >
              Log in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
