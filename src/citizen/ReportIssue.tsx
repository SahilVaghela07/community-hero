import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import { Camera, AlertTriangle, Loader2 } from 'lucide-react';

export const ReportIssue: React.FC = () => {
  const { user } = useAuth();
  const [photoUrl, setPhotoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Pothole');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !type) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post('/api/issues', {
        photo_url: photoUrl,
        description,
        type,
        reporter_id: user?.id,
      });

      if (response.data.success) {
        setSuccess('Issue reported successfully!');
        setPhotoUrl('');
        setDescription('');
        setType('Pothole');
      } else {
        setError('Server returned an error.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <h2 className="text-xl font-medium text-white mb-6 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          Report an Issue
        </h2>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Issue Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            >
              <option value="Water Leakage">Water Leakage</option>
              <option value="Garbage">Garbage</option>
              <option value="Pothole">Pothole</option>
              <option value="Streetlight">Streetlight</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Description</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe the issue..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Photo URL (Optional)</label>
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Camera className="w-5 h-5" />
                Submit Report
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
