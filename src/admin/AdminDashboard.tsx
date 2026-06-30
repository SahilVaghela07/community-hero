/**
 * File Purpose: Frontend View - Admin Control Panel.
 * 
 * This component provides administrative oversight for the Community Hero app.
 * It allows authorized city officials to review reported issues, manage users,
 * export data, and progress issue statuses.
 * 
 * Key Features Documented:
 * - Privilege Separation / Role-Based Security (Admin-only data fetching and rendering)
 * - Automated Status Progression (Filters out Unverified issues until threshold met)
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, AlertTriangle, MapPin, Play, CheckCircle2, Download, Users, Shield, ShieldOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Issue {
  id: number;
  category: string;
  severity: string;
  description: string;
  photo_url?: string;
  latitude?: number;
  longitude?: number;
  status: string;
  created_at: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  points_balance: number;
  created_at: string;
}

export const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Pending' | 'Working' | 'Completed' | 'Users'>('Pending');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchIssues();
  }, []);

  useEffect(() => {
    if (activeTab === 'Users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/issues?all=true&limit=100');
      if (response.data.success) {
        setIssues(response.data.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load issues.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      await axios.patch(`/api/issues/${id}/status`, { status: newStatus });
      fetchIssues(); // Refresh the list
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const updateUserRole = async (userId: number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'citizen' : 'admin';
    try {
      await axios.patch(`/api/users/${userId}/role`, { role: newRole });
      fetchUsers(); // Refresh the user list
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update user role');
    }
  };

  const openMap = (lat?: number, lng?: number) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    } else {
      alert('Location data is not available for this issue.');
    }
  };

  const exportToCSV = async () => {
    try {
      const response = await axios.get('/api/issues?all=true&limit=10000');
      if (response.data.success) {
        const data = response.data.data;
        if (data.length === 0) {
          alert('No issues to export');
          return;
        }

        const headersArray = ['ID', 'Category', 'Severity', 'Description', 'Latitude', 'Longitude', 'Status', 'Upvotes', 'Created At', 'Photo URL'];
        const headers = headersArray.join(',');
        
        const rows = data.map((row: any) => {
          let photoVal = row.photo_url || '';
          if (photoVal.startsWith('data:image')) {
            photoVal = '[Base64 Image Data]';
          }

          const rowData = [
            row.id,
            row.category,
            row.severity,
            row.description,
            row.latitude || '',
            row.longitude || '',
            row.status,
            row.upvote_count || 0,
            new Date(row.created_at).toLocaleString(),
            photoVal
          ];

          return rowData.map((val: any) => {
            if (typeof val === 'string') {
              const cleanString = val.replace(/\r?\n|\r/g, ' ').replace(/"/g, '""');
              return `"${cleanString}"`;
            }
            return val;
          }).join(',');
        });

        const csvContent = [headers, ...rows].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `issues_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to export CSV');
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
      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl max-w-2xl mx-auto flex gap-3 text-sm items-start mt-8">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <p>{error}</p>
      </div>
    );
  }

  const handleTabChange = (tab: 'Pending' | 'Working' | 'Completed' | 'Users') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const filteredIssues = issues.filter(i => i.status === activeTab);
  const itemsPerPage = 6;
  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / itemsPerPage));
  const currentIssues = filteredIssues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getNextStatus = (current: string) => {
    if (current === 'Pending') return { status: 'Working', label: t("dashboard.startWork"), Icon: Play };
    if (current === 'Working') return { status: 'Completed', label: t("dashboard.completeWork"), Icon: CheckCircle2 };
    return null;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 px-4 mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t("dashboard.title")}</h2>
        <div className="flex items-center gap-4">
          <button 
            onClick={exportToCSV} 
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            {t("dashboard.exportCSV")}
          </button>
          <button onClick={fetchIssues} className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
            {t("dashboard.refreshBoard")}
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 mb-6">
        {(['Pending', 'Working', 'Completed', 'Users'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            {tab === 'Users' ? t("dashboard.tabs.users", { defaultValue: "Manage Users" }) : t(`dashboard.tabs.${tab.toLowerCase()}`)}
            {tab !== 'Users' && (
              <span className="ml-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs">
                {issues.filter(i => i.status === tab).length}
              </span>
            )}
            {tab === 'Users' && (
              <span className="ml-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs">
                {users.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'Users' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-medium">{t("users.name", { defaultValue: "Name" })}</th>
                  <th className="px-6 py-4 font-medium">{t("users.email", { defaultValue: "Email" })}</th>
                  <th className="px-6 py-4 font-medium">{t("users.role", { defaultValue: "Role" })}</th>
                  <th className="px-6 py-4 font-medium text-right">{t("users.actions", { defaultValue: "Actions" })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{user.name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}>
                        {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                        {user.role === 'admin' ? t("users.roleAdmin", { defaultValue: "Admin" }) : t("users.roleCitizen", { defaultValue: "Citizen" })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => updateUserRole(user.id, user.role)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          user.role === 'admin'
                            ? 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            : 'bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-slate-200 dark:border-slate-700 hover:border-purple-200 dark:hover:border-purple-500/30'
                        }`}
                      >
                        {user.role === 'admin' ? (
                          <><ShieldOff className="w-3.5 h-3.5" /> {t("users.demote", { defaultValue: "Demote to Citizen" })}</>
                        ) : (
                          <><Shield className="w-3.5 h-3.5" /> {t("users.upgrade", { defaultValue: "Upgrade to Admin" })}</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
             <div className="text-center py-12 text-slate-500 text-sm">
               {t("users.noUsers", { defaultValue: "No users found" })}
             </div>
          )}
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ========================================== */}
        {/* Automated Status Progression Constraint */}
        {/* ========================================== */}
        {/* Admins are shielded from spam. The frontend hides 'Unverified' issues.
            They only appear here once the Sybil-protected backend upvote threshold is met. */}
        {currentIssues.filter((issue: Issue) => issue.status !== 'Unverified').map((issue: Issue) => {
          const next = getNextStatus(issue.status);
          const NextIcon = next?.Icon;
          
          return (
            <div 
              key={issue.id} 
              onClick={() => openMap(issue.latitude, issue.longitude)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer transition-colors flex flex-col gap-3 group"
            >
              <div className="flex justify-between items-start">
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-semibold uppercase tracking-wider">
                  {issue.category}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {new Date(issue.created_at).toLocaleDateString()}
                </span>
              </div>

              {issue.photo_url && (
                <div className="rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 h-40 relative shrink-0 mt-2">
                  <img src={issue.photo_url} alt="Issue" className="w-full h-full object-cover" />
                </div>
              )}

              <p className="text-slate-900 dark:text-slate-100 text-sm leading-relaxed mt-2 line-clamp-3">
                {issue.description}
              </p>

              <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors w-fit p-1 -ml-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30">
                <MapPin className="w-3.5 h-3.5" />
                {t("dashboard.viewLocation")}
              </div>

              {next && NextIcon && (
                <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => updateStatus(issue.id, next.status)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs font-medium"
                  >
                    <NextIcon className="w-3.5 h-3.5" />
                    {next.label}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {currentIssues.length === 0 && (
          <div className="col-span-1 md:col-span-2 text-center py-20 px-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 text-sm">
            {t("dashboard.noIssues")}
          </div>
        )}
      </div>
      )}

      {activeTab !== 'Users' && filteredIssues.length > itemsPerPage && (
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6 mt-6 pb-12">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t("dashboard.pagination.prev")}
          </button>
          
          <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            {t("dashboard.pagination.page", { current: currentPage, total: totalPages })}
          </span>
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t("dashboard.pagination.next")}
          </button>
        </div>
      )}
    </div>
  );
};
