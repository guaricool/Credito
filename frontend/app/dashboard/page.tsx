'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Scale,
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  FileText,
  Clock,
  CheckCircle,
  Copy,
  Download,
  LogOut,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Layers,
  Building2,
} from 'lucide-react';

interface BureauDetail {
  id: string;
  bureau: string;
  account_status?: string;
  current_balance?: number;
  past_due_amount?: number;
  date_of_first_delinquency?: string;
  date_last_reported?: string;
  payment_history_24_months?: string;
  comments?: string;
}

interface Tradeline {
  id: string;
  creditor_name: string;
  account_number_masked: string;
  account_type?: string;
  date_opened?: string;
  bureau_details: BureauDetail[];
}

interface Violation {
  id: string;
  tradeline_id?: string;
  bureau?: string;
  violation_type: string;
  statutory_citation: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  recommended_letter_type: string;
}

interface DisputeLetter {
  id: string;
  campaign_id: string;
  letter_type: string;
  content_markdown: string;
  created_at: string;
}

interface DisputeCampaign {
  id: string;
  campaign_name: string;
  target_type: string;
  target_name: string;
  status: string;
  sent_date?: string;
  response_due_date?: string;
  created_at: string;
  letters: DisputeLetter[];
}

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Data states
  const [creditReport, setCreditReport] = useState<any>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [campaigns, setCampaigns] = useState<DisputeCampaign[]>([]);
  const [selectedViolationIds, setSelectedViolationIds] = useState<string[]>([]);

  // Dispute form states
  const [letterType, setLetterType] = useState<'SECTION_609' | 'DEBT_VALIDATION' | 'MOV'>('SECTION_609');
  const [targetName, setTargetName] = useState('Experian');
  const [accountNumber, setAccountNumber] = useState('');
  const [balance, setBalance] = useState<number>(0);
  const [disputedAccount, setDisputedAccount] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedMarkdown, setGeneratedMarkdown] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // 30-Day Response Window Countdown state
  const [timeLeft, setTimeLeft] = useState({
    days: 29,
    hours: 23,
    minutes: 58,
    seconds: 45,
  });

  // Check auth & fetch user profile
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchInitialData = async () => {
      try {
        const userRes = await api.get('/api/v1/auth/me');
        setUser(userRes.data);

        // Fetch existing violations & campaigns
        const [violRes, campRes] = await Promise.all([
          api.get('/api/v1/compliance/violations').catch(() => ({ data: [] })),
          api.get('/api/v1/disputes/campaigns').catch(() => ({ data: [] })),
        ]);

        setViolations(violRes.data || []);
        setCampaigns(campRes.data || []);
      } catch (err) {
        console.error('Auth check error:', err);
        localStorage.removeItem('token');
        router.push('/login');
      } finally {
        setLoadingUser(false);
      }
    };

    fetchInitialData();
  }, [router]);

  // FCRA Countdown timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Upload & Audit Report Trigger
  const handleUploadAndAudit = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress('Uploading credit report...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Step 1: Upload Report
      const uploadRes = await api.post('/api/v1/reports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const reportData = uploadRes.data;
      setCreditReport(reportData);

      // Step 2: Trigger Compliance Audit
      setUploadProgress('Running statutory FCRA compliance audit...');
      const auditRes = await api.post(`/api/v1/compliance/audit/${reportData.id}`);

      setViolations(auditRes.data || []);
      setUploadProgress('Audit complete!');
    } catch (err: any) {
      console.error('Upload / Audit error:', err);
      alert(err.response?.data?.detail || 'Failed to analyze credit report.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  // Toggle selection for dispute generation
  const toggleViolationSelection = (id: string) => {
    setSelectedViolationIds((prev) =>
      prev.includes(id) ? prev.filter((vId) => vId !== id) : [...prev, id]
    );
  };

  // Generate Dispute Letter Trigger
  const handleGenerateDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setGeneratedMarkdown(null);

    try {
      const payload = {
        letter_type: letterType,
        target_name: targetName,
        target_type: letterType === 'DEBT_VALIDATION' ? 'COLLECTOR' : 'BUREAU',
        violation_ids: selectedViolationIds,
        account_number: accountNumber || undefined,
        balance: balance || 0,
        disputed_account: disputedAccount || undefined,
      };

      const res = await api.post('/api/v1/disputes/generate', payload);
      const campaign: DisputeCampaign = res.data;

      if (campaign.letters && campaign.letters.length > 0) {
        setGeneratedMarkdown(campaign.letters[0].content_markdown);
      }

      // Refresh campaigns list
      setCampaigns((prev) => [campaign, ...prev]);
    } catch (err: any) {
      console.error('Dispute generation error:', err);
      alert(err.response?.data?.detail || 'Failed to generate dispute letter.');
    } finally {
      setGenerating(false);
    }
  };

  // Copy Markdown to Clipboard
  const handleCopyMarkdown = () => {
    if (!generatedMarkdown) return;
    navigator.clipboard.writeText(generatedMarkdown);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Download Markdown file
  const handleDownloadMarkdown = () => {
    if (!generatedMarkdown) return;
    const blob = new Blob([generatedMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Dispute_Letter_${letterType}_${targetName.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-[#050811] flex items-center justify-center text-slate-300">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-sm font-semibold">Loading FCRA Compliance Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col pb-16 relative">
      {/* Background glow */}
      <div className="absolute top-0 right-1/4 w-[800px] h-[400px] bg-cyan-600/10 blur-[140px] pointer-events-none rounded-full" />

      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 glass-panel sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-md shadow-cyan-500/20">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-white hidden sm:inline">
                US Credit <span className="gradient-text">Law Engine</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              FCRA Statutory Engine Active
            </div>

            <div className="text-right text-xs">
              <div className="font-semibold text-slate-200">
                {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.email}
              </div>
              <div className="text-slate-400 font-mono text-[10px]">{user?.email}</div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8 flex-1 w-full">
        {/* FCRA 30-Day Response Window Countdown Banner */}
        <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 relative overflow-hidden bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-950/90 shadow-xl shadow-cyan-950/20">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Clock className="w-48 h-48 text-cyan-400" />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">
                <Clock className="w-3.5 h-3.5" />
                Statutory FCRA Response Deadline
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Active FCRA 30-Day Response Window
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Under <strong className="text-slate-200">15 U.S.C. § 1681i(a)(1)</strong>, Credit Reporting Agencies must complete their investigation and notify the consumer within 30 days of receiving a dispute notice.
              </p>
            </div>

            {/* Countdown Clock Display */}
            <div className="flex items-center gap-3 font-mono">
              <div className="bg-slate-950/90 border border-cyan-500/30 px-4 py-3 rounded-xl text-center min-w-[70px]">
                <div className="text-2xl sm:text-3xl font-black text-cyan-400">
                  {String(timeLeft.days).padStart(2, '0')}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">DAYS</div>
              </div>
              <span className="text-2xl font-black text-cyan-500">:</span>
              <div className="bg-slate-950/90 border border-cyan-500/30 px-4 py-3 rounded-xl text-center min-w-[70px]">
                <div className="text-2xl sm:text-3xl font-black text-cyan-400">
                  {String(timeLeft.hours).padStart(2, '0')}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">HRS</div>
              </div>
              <span className="text-2xl font-black text-cyan-500">:</span>
              <div className="bg-slate-950/90 border border-cyan-500/30 px-4 py-3 rounded-xl text-center min-w-[70px]">
                <div className="text-2xl sm:text-3xl font-black text-cyan-400">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">MINS</div>
              </div>
              <span className="text-2xl font-black text-cyan-500">:</span>
              <div className="bg-slate-950/90 border border-cyan-500/30 px-4 py-3 rounded-xl text-center min-w-[70px]">
                <div className="text-2xl sm:text-3xl font-black text-cyan-400">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">SECS</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{creditReport ? 1 : 0}</div>
              <div className="text-xs text-slate-400">Audited Reports</div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{violations.length}</div>
              <div className="text-xs text-slate-400">Violations Found</div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{campaigns.length}</div>
              <div className="text-xs text-slate-400">Dispute Campaigns</div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">Active</div>
              <div className="text-xs text-slate-400">Compliance Status</div>
            </div>
          </div>
        </div>

        {/* SECTION 1: Credit Report Uploader */}
        <section className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-cyan-400" />
                Credit Report Upload & Statutory Parser
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload raw HTML or PDF credit reports from Experian, Equifax, or TransUnion.
              </p>
            </div>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-cyan-400 bg-cyan-500/10'
                : selectedFile
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.html,.htm"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center gap-3">
              <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-cyan-400">
                <UploadCloud className="w-8 h-8" />
              </div>
              {selectedFile ? (
                <div>
                  <p className="text-sm font-bold text-emerald-400">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {(selectedFile.size / 1024).toFixed(1)} KB — Click or drag to replace file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    <span className="font-semibold text-cyan-400">Click to upload</span> or drag and drop credit report file
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Supports PDF or HTML tri-bureau credit reports</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-400">
              {uploadProgress && <span className="text-cyan-400 font-mono animate-pulse">{uploadProgress}</span>}
            </div>

            <button
              onClick={handleUploadAndAudit}
              disabled={!selectedFile || uploading}
              className="px-6 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-95 shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 disabled:opacity-40"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Auditing Report...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run Statutory Audit</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* SECTION 2: Audit Results & Violations Table */}
        <section className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Detected FCRA / Metro 2 Violations ({violations.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select violations below to automatically attach them to your statutory dispute letter.
              </p>
            </div>
          </div>

          {violations.length === 0 ? (
            <div className="text-center py-12 border border-slate-800/80 rounded-xl bg-slate-900/30">
              <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">No violations detected yet</p>
              <p className="text-xs text-slate-500 mt-1">Upload a credit report above to run automated compliance verification.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono bg-slate-950/60">
                    <th className="py-3 px-4 w-10">Link</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Bureau</th>
                    <th className="py-3 px-4">Violation Type</th>
                    <th className="py-3 px-4">Statutory Citation</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Rec. Letter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {violations.map((v) => {
                    const isSelected = selectedViolationIds.includes(v.id);
                    return (
                      <tr
                        key={v.id}
                        onClick={() => toggleViolationSelection(v.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-cyan-500/10' : 'hover:bg-slate-900/50'
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                              v.severity === 'CRITICAL'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                : v.severity === 'HIGH'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : v.severity === 'MEDIUM'
                                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {v.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-200">{v.bureau || 'All Bureaus'}</td>
                        <td className="py-3 px-4 font-mono text-cyan-300">{v.violation_type}</td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-300">{v.statutory_citation}</td>
                        <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={v.description}>
                          {v.description}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[10px]">{v.recommended_letter_type}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* SECTION 3: Legal Dispute Generator & Live Markdown Preview */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Letter Configuration Form */}
          <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Statutory Dispute Letter Generator
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate tailored legal correspondence backed by statutory citations.
              </p>
            </div>

            <form onSubmit={handleGenerateDispute} className="space-y-4">
              {/* Select Letter Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Dispute Letter Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLetterType('SECTION_609')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                      letterType === 'SECTION_609'
                        ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white border-cyan-400 shadow-md'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    Section 609
                  </button>
                  <button
                    type="button"
                    onClick={() => setLetterType('DEBT_VALIDATION')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                      letterType === 'DEBT_VALIDATION'
                        ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white border-cyan-400 shadow-md'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    Debt Validation
                  </button>
                  <button
                    type="button"
                    onClick={() => setLetterType('MOV')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                      letterType === 'MOV'
                        ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white border-cyan-400 shadow-md'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    MOV Letter
                  </button>
                </div>
              </div>

              {/* Target Name (Bureau or Debt Collector) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Name (Credit Bureau / Collector)
                </label>
                <input
                  type="text"
                  required
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  placeholder="e.g. Experian, Equifax, TransUnion, Midland Credit"
                  className="w-full px-4 py-2.5 rounded-xl text-xs glass-input"
                />
              </div>

              {/* Conditional fields based on letter type */}
              {letterType === 'DEBT_VALIDATION' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="e.g. 4532****9012"
                      className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Alleged Balance ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={balance}
                      onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                    />
                  </div>
                </div>
              )}

              {letterType === 'MOV' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Disputed Account Name/ID</label>
                  <input
                    type="text"
                    value={disputedAccount}
                    onChange={(e) => setDisputedAccount(e.target.value)}
                    placeholder="e.g. Chase Bank #12345"
                    className="w-full px-4 py-2.5 rounded-xl text-xs glass-input"
                  />
                </div>
              )}

              {/* Selected Violations Summary */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                <div className="text-slate-400 font-semibold mb-1">
                  Attached Statutory Violations ({selectedViolationIds.length})
                </div>
                {selectedViolationIds.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    No violations selected. Select rows from the audit table above to attach specific citations.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedViolationIds.map((id) => {
                      const v = violations.find((item) => item.id === id);
                      return (
                        <span key={id} className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                          {v?.statutory_citation || id.slice(0, 8)}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:opacity-95 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating Dispute Letter...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Generate Legal Dispute Campaign</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Live Markdown Preview Window */}
          <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-400" />
                  Live Markdown Letter Preview
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Formatted legal letter ready for review, copying, or export.
                </p>
              </div>

              {generatedMarkdown && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyMarkdown}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                    title="Copy Markdown"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    className="px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    title="Download File"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              )}
            </div>

            {/* Content Container */}
            <div className="flex-1 min-h-[350px] p-5 rounded-xl bg-slate-950/90 border border-slate-800 font-mono text-xs text-slate-300 overflow-y-auto leading-relaxed whitespace-pre-wrap selection:bg-cyan-500 selection:text-white">
              {generatedMarkdown ? (
                generatedMarkdown
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-600 space-y-2 py-12">
                  <FileText className="w-10 h-10 stroke-1" />
                  <p className="text-xs font-medium">No dispute letter generated yet.</p>
                  <p className="text-[11px]">Configure parameters on the left and click "Generate Legal Dispute Campaign".</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
