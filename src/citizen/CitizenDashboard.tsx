import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, AlertTriangle, ArrowUpCircle, CheckCircle2, Search } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'Pending' | 'Unverified'>('Pending');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'upvotes'>('newest');
  const limit = 10;

  useEffect(() => {
    fetchIssues();
  }, [page, activeTab]);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const statusParam = activeTab === 'Unverified' ? '&status=Unverified' : '';
      const response = await axios.get(`/api/issues?limit=${limit}&offset=${page * limit}${statusParam}`);
      if (response.data.success) {
        // If "Pending" tab, filter out "Unverified" locally just in case, or if backend doesn't filter
        let fetched = response.data.data;
        if (activeTab === 'Pending') {
           fetched = fetched.filter((i: Issue) => i.status !== 'Unverified');
        }
        setIssues(fetched);
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
      ).filter(issue => {
        if (activeTab === 'Unverified' && issue.id === id && (issue.upvote_count || 0) >= 3) {
          return false;
        }
        return true;
      }));
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

  const filteredIssues = issues.filter(issue => 
    issue.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedIssues = [...filteredIssues].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === 'oldest') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortBy === 'upvotes') {
      return (b.upvote_count || 0) - (a.upvote_count || 0);
    }
    return 0;
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col mb-8 gap-4">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Citizen Dashboard</h2>
        
        {/* Tabs */}
        <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-px">
          <button
            onClick={() => setActiveTab('Pending')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'Pending' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            Ongoing Issues
          </button>
          <button
            onClick={() => setActiveTab('Unverified')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'Unverified' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            Community Verification
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 mt-4">
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="Search issues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block pl-10 p-2.5 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'upvotes')}
            className="w-full sm:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-colors"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="upvotes">Most Upvoted</option>
          </select>
        </div>
      </div>

      {sortedIssues.length === 0 ? (
        <div className="text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl py-20 px-4 shadow-sm dark:shadow-none transition-colors">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-slate-900 dark:text-white mb-2">All clean!</h3>
          <p className="text-slate-600 dark:text-slate-400">No pending issues found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedIssues.map(issue => (
            <div key={issue.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl flex flex-col h-full hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-semibold uppercase tracking-wider">
                  {issue.category}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-500 font-medium bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-md border border-slate-100 dark:border-transparent">
                  {new Date(issue.created_at).toLocaleDateString()}
                </span>
              </div>

              {issue.photo_url && (
                <div className="mb-4 h-48 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 relative shrink-0">
                  <img src={issue.photo_url} alt="Issue" className="w-full h-full object-cover" />
                </div>
              )}

              <p className="text-slate-700 dark:text-slate-300 text-sm flex-1 mb-6 leading-relaxed">
                {issue.description}
              </p>

              <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 gap-4">
                <button 
                  onClick={() => handleUpvote(issue.id)}
                  className="flex flex-1 items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 active:bg-blue-200 dark:active:bg-blue-500/30 rounded-xl transition-colors font-medium text-sm border border-transparent"
                >
                  <ArrowUpCircle className="w-5 h-5" />
                  {activeTab === 'Unverified' ? 'Verify Issue (👍)' : 'Upvote'}
                </button>
                <div className="flex bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 min-w-[80px] justify-center items-center">
                  <span className="font-bold text-slate-900 dark:text-slate-200">
                    {activeTab === 'Unverified' ? `${issue.upvote_count || 0}/3` : (issue.upvote_count || 0)}
                  </span>
                  <span className="text-xs text-slate-500 ml-1 whitespace-nowrap">{activeTab === 'Unverified' ? 'Votes Needed' : 'votes'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && !error && (
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 dark:text-white rounded-lg transition-colors font-medium text-sm border border-slate-200 dark:border-transparent"
          >
            Previous
          </button>
          <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">Page {page + 1}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={issues.length < limit}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 dark:text-white rounded-lg transition-colors font-medium text-sm border border-slate-200 dark:border-transparent"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
