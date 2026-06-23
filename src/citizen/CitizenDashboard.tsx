import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, AlertTriangle, ArrowUpCircle, CheckCircle2 } from 'lucide-react';

interface Issue {
  id: number;
  category: string;
  severity: string;
  description: string;
  photo_url?: string;
  upvote_count?: number;
  status: string;
  created_at: string;
}

export const CitizenDashboard: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/issues');
      // Filter only Pending items if "pending issues" is what the requirements state
      // Provide a more complete view but focus on pending usually 
      if (response.data.success) {
        setIssues(response.data.data.filter((i: Issue) => i.status !== 'Resolved'));
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load issues.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (id: number) => {
    try {
      await axios.post('/api/upvote', { issue_id: id });
      // Update local state without re-fetching
      setIssues(issues.map(issue => 
        issue.id === id ? { ...issue, upvote_count: (issue.upvote_count || 0) + 1 } : issue
      ));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to upvote');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl max-w-2xl mx-auto flex gap-3 text-sm items-start">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold text-white">Pending Issues</h2>
      </div>

      {issues.length === 0 ? (
        <div className="text-center bg-slate-900 border border-slate-800 rounded-3xl py-20 px-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">All clean!</h3>
          <p className="text-slate-400">No pending issues found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {issues.map(issue => (
            <div key={issue.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col h-full hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-full text-xs font-semibold uppercase tracking-wider">
                  {issue.category}
                </span>
                <span className="text-xs text-slate-500 font-medium bg-slate-950 px-2 py-1 rounded-md">
                  {new Date(issue.created_at).toLocaleDateString()}
                </span>
              </div>

              {issue.photo_url && (
                <div className="mb-4 aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative">
                  <img src={issue.photo_url} alt="Issue" className="w-full h-full object-cover" />
                </div>
              )}

              <p className="text-slate-300 text-sm flex-1 mb-6 leading-relaxed">
                {issue.description}
              </p>

              <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-800 gap-4">
                <button 
                  onClick={() => handleUpvote(issue.id)}
                  className="flex flex-1 items-center justify-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 active:bg-blue-500/30 rounded-xl transition-colors font-medium text-sm"
                >
                  <ArrowUpCircle className="w-5 h-5" />
                  Upvote
                </button>
                <div className="flex bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 min-w-[80px] justify-center items-center">
                  <span className="font-bold text-slate-200">
                    {issue.upvote_count || 0}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">votes</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
