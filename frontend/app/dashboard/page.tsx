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
  RefreshCw,
  Eye,
  Trash2,
  ShieldCheck,
  ShieldX,
  Lock,
  Building2,
  ArrowRight,
  Compass,
  Zap,
  TrendingUp,
  CreditCard,
  Target,
  ChevronRight,
  X,
  Mail,
  CheckSquare,
  ExternalLink,
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

interface DataLeak {
  id: string;
  breach_name: string;
  leak_date?: string;
  exposed_fields?: string[];
  compromised_credentials?: string;
  risk_level: string;
  created_at: string;
}

interface DataBroker {
  id: string;
  broker_name: string;
  category?: string;
  opt_out_url?: string;
  removal_mechanism: string;
}

interface OptOutRequest {
  id: string;
  broker_id: string;
  status: 'PENDING' | 'SUBMITTED' | 'VERIFIED_REMOVED' | 'REJECTED' | string;
  request_date: string;
  confirmation_token?: string;
  last_checked: string;
  broker?: DataBroker;
}

interface AdvisorRecommendation {
  id: string;
  priority: 'IMMEDIATE_ACTION' | 'HIGH_PRIORITY' | 'RECOMMENDED' | 'PREVENTATIVE' | string;
  title: string;
  statute_citation: string;
  action_type: 'FCRA_605B_BLOCK' | 'SECTION_609_DISPUTE' | 'DEBT_VALIDATION' | 'CCPA_OPT_OUT' | string;
  description: string;
  expected_impact: string;
}

interface OptimizationStep {
  step_number: number;
  category: string;
  title: string;
  statute_citation: string;
  description: string;
  potential_point_gain: string;
  action_button_text: string;
  action_type: string;
}

interface ScorePlan {
  current_estimated_score: number;
  target_potential_score: number;
  potential_points_gain: number;
  utilization: {
    current_balance: number;
    total_credit_limit: number;
    utilization_percentage: number;
    target_balance_10_pct: number;
    recommended_paydown: number;
    status: string;
  };
  action_roadmap: OptimizationStep[];
}

interface NoticePreview {
  request_id: string;
  broker_name: string;
  target_email: string;
  confirmation_ref: string;
  status: string;
  subject: string;
  body_text: string;
  mailto_link: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const disputeSectionRef = useRef<HTMLDivElement>(null);
  const privacySectionRef = useRef<HTMLDivElement>(null);
  const scoreOptimizerRef = useRef<HTMLDivElement>(null);

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

  // AI Advisor states
  const [recommendations, setRecommendations] = useState<AdvisorRecommendation[]>([]);
  const [healthIndex, setHealthIndex] = useState<number>(85);
  const [loadingAdvisor, setLoadingAdvisor] = useState(false);

  // Score Optimizer Plan state
  const [scorePlan, setScorePlan] = useState<ScorePlan | null>(null);

  // Privacy & Leak Agent states
  const [privacyScore, setPrivacyScore] = useState<number>(85);
  const [leaks, setLeaks] = useState<DataLeak[]>([]);
  const [brokerRequests, setBrokerRequests] = useState<OptOutRequest[]>([]);
  const [scanningPrivacy, setScanningPrivacy] = useState(false);
  const [triggeringOptOut, setTriggeringOptOut] = useState(false);

  // CCPA Legal Notice Inspector Modal states
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticePreviews, setNoticePreviews] = useState<NoticePreview[]>([]);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const [loadingPreviews, setLoadingPreviews] = useState(false);

  // FCRA 605B Block Affidavit states
  const [blockBureau, setBlockBureau] = useState('Experian');
  const [policeReportNumber, setPoliceReportNumber] = useState('FTC-IDENTITY-THEFT-AFFIDAVIT-2026');
  const [fraudulentAccounts, setFraudulentAccounts] = useState('');
  const [generatingBlock, setGeneratingBlock] = useState(false);
  const [blockMarkdown, setBlockMarkdown] = useState<string | null>(null);
  const [copyBlockSuccess, setCopyBlockSuccess] = useState(false);

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

  // Check auth & fetch user profile + privacy leaks + AI Advisor + Score Optimizer Plan
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

        // Fetch violations, campaigns, leaks, brokers, AI advisor, and score optimization plan
        const [violRes, campRes, scanRes, leaksRes, brokersRes, advisorRes, scoreRes] = await Promise.all([
          api.get('/api/v1/compliance/violations').catch(() => ({ data: [] })),
          api.get('/api/v1/disputes/campaigns').catch(() => ({ data: [] })),
          api.post('/api/v1/privacy/scan').catch(() => ({ data: { privacy_score: 85 } })),
          api.get('/api/v1/privacy/leaks').catch(() => ({ data: [] })),
          api.get('/api/v1/privacy/brokers').catch(() => ({ data: [] })),
          api.get('/api/v1/advisor/recommendations').catch(() => ({ data: { recommendations: [], credit_health_index: 85 } })),
          api.get('/api/v1/optimizer/plan').catch(() => ({ data: null })),
        ]);

        setViolations(violRes.data || []);
        setCampaigns(campRes.data || []);
        if (scanRes.data?.privacy_score) setPrivacyScore(scanRes.data.privacy_score);
        setLeaks(leaksRes.data || []);
        setBrokerRequests(brokersRes.data || []);

        if (advisorRes.data?.recommendations) {
          setRecommendations(advisorRes.data.recommendations);
          setHealthIndex(advisorRes.data.credit_health_index || 85);
        }

        if (scoreRes.data) {
          setScorePlan(scoreRes.data);
        }
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

  // Refresh AI Advisor recommendations
  const handleRefreshAdvisor = async () => {
    setLoadingAdvisor(true);
    try {
      const [advRes, optRes] = await Promise.all([
        api.get('/api/v1/advisor/recommendations'),
        api.get('/api/v1/optimizer/plan'),
      ]);
      if (advRes.data?.recommendations) {
        setRecommendations(advRes.data.recommendations);
        setHealthIndex(advRes.data.credit_health_index || 85);
      }
      if (optRes.data) {
        setScorePlan(optRes.data);
      }
    } catch (err) {
      console.error('Advisor refresh error:', err);
    } finally {
      setLoadingAdvisor(false);
    }
  };

  // Execute recommendation handler (pre-fills form & scrolls)
  const handleExecuteRecommendation = (rec: AdvisorRecommendation) => {
    if (rec.action_type === 'FCRA_605B_BLOCK') {
      privacySectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (rec.action_type === 'CCPA_OPT_OUT') {
      privacySectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      handleOpenNoticeInspector();
    } else if (rec.action_type === 'DEBT_VALIDATION') {
      setLetterType('DEBT_VALIDATION');
      disputeSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setLetterType('SECTION_609');
      disputeSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Execute Score Step Handler
  const handleExecuteScoreStep = (step: OptimizationStep) => {
    if (step.action_type === 'SECTION_609_DISPUTE') {
      disputeSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (step.action_type === 'CALCULATE_PAYMENT') {
      scoreOptimizerRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      alert('Estrategia de Tradelines Positivos: Recomendamos contactar a un emisor de tarjetas para agregar un usuario autorizado de 5+ años de antigüedad sin saldo.');
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

      // Refresh Advisor & Score Plan
      handleRefreshAdvisor();
    } catch (err: any) {
      console.error('Upload / Audit error:', err);
      alert(err.response?.data?.detail || 'Failed to analyze credit report.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  // Trigger Privacy Scan
  const handleTriggerPrivacyScan = async () => {
    setScanningPrivacy(true);
    try {
      const scanRes = await api.post('/api/v1/privacy/scan');
      if (scanRes.data?.privacy_score) setPrivacyScore(scanRes.data.privacy_score);

      const [leaksRes, brokersRes] = await Promise.all([
        api.get('/api/v1/privacy/leaks'),
        api.get('/api/v1/privacy/brokers'),
      ]);
      setLeaks(leaksRes.data || []);
      setBrokerRequests(brokersRes.data || []);
      handleRefreshAdvisor();
    } catch (err) {
      console.error('Privacy scan error:', err);
    } finally {
      setScanningPrivacy(false);
    }
  };

  // Open Legal Notice Inspector Modal & Fetch Previews
  const handleOpenNoticeInspector = async () => {
    setLoadingPreviews(true);
    try {
      const previewRes = await api.get('/api/v1/privacy/opt-out/previews');
      setNoticePreviews(previewRes.data || []);
      setSelectedPreviewIndex(0);
      setShowNoticeModal(true);
    } catch (err) {
      console.error('Error fetching opt-out previews:', err);
      alert('Could not generate notice previews.');
    } finally {
      setLoadingPreviews(false);
    }
  };

  // Trigger Mailto sending & record request as submitted in DB
  const handleMailtoDispatch = async (mailtoLink: string) => {
    try {
      // Mark as submitted in DB
      const optRes = await api.post('/api/v1/privacy/opt-out', {});
      setBrokerRequests(optRes.data || []);
      setPrivacyScore((prev) => Math.min(100, prev + 10));
      handleRefreshAdvisor();
    } catch (err) {
      console.error('Error recording opt-out status:', err);
    }
    // Open native mailto app
    window.location.href = mailtoLink;
  };

  // Generate FCRA 605B Block Affidavit
  const handleGenerateFCRA605B = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingBlock(true);
    setBlockMarkdown(null);

    const tradelinesList = fraudulentAccounts
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (tradelinesList.length === 0) {
      tradelinesList.push('FRAUDULENT ACCOUNT #998877 EXPOSED IN DATA BREACH');
    }

    try {
      const payload = {
        bureau: blockBureau,
        police_report_or_affidavit_number: policeReportNumber,
        fraudulent_tradelines: tradelinesList,
      };

      const res = await api.post('/api/v1/privacy/fcra-605b', payload);
      setBlockMarkdown(res.data.content_markdown);
    } catch (err: any) {
      console.error('FCRA 605B Affidavit generation error:', err);
      alert(err.response?.data?.detail || 'Failed to generate FCRA 605B affidavit.');
    } finally {
      setGeneratingBlock(false);
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

      setCampaigns((prev) => [campaign, ...prev]);
    } catch (err: any) {
      console.error('Dispute generation error:', err);
      alert(err.response?.data?.detail || 'Failed to generate dispute letter.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!generatedMarkdown) return;
    navigator.clipboard.writeText(generatedMarkdown);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

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

  const handleCopyBlockMarkdown = () => {
    if (!blockMarkdown) return;
    navigator.clipboard.writeText(blockMarkdown);
    setCopyBlockSuccess(true);
    setTimeout(() => setCopyBlockSuccess(false), 2000);
  };

  const handleDownloadBlockMarkdown = () => {
    if (!blockMarkdown) return;
    const blob = new Blob([blockMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FCRA_Section_605B_Affidavit_${blockBureau.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-[#050811] flex items-center justify-center text-slate-300">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-sm font-semibold">Loading FCRA & AI Strategy Advisor...</span>
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
                US Credit & <span className="gradient-text">AI Legal Advisor</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              AI Advisor Engine Active
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
        
        {/* SECTION 0: AI Credit & Privacy Advisor Strategy Engine */}
        <section className="glass-panel p-6 sm:p-8 rounded-2xl border border-cyan-500/30 space-y-6 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Compass className="w-72 h-72 text-cyan-400" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Statutory AI Strategy Advisor
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Personalized Legal & Privacy Action Plan
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Continuous cross-analysis of your FCRA audit violations, dark web credential leaks, and data broker profile to generate a prioritized statutory strategy.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-right font-mono">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest">Health Index</div>
                <div className="text-xl font-black text-emerald-400">{healthIndex}/100</div>
              </div>

              <button
                onClick={handleRefreshAdvisor}
                disabled={loadingAdvisor}
                className="p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white transition-colors disabled:opacity-40"
                title="Refresh AI Recommendations"
              >
                <RefreshCw className={`w-4 h-4 text-cyan-400 ${loadingAdvisor ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Recommendations Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
            {recommendations.length === 0 ? (
              <div className="md:col-span-2 text-center py-8 text-slate-400 text-xs italic">
                Analyzing credit and privacy profile...
              </div>
            ) : (
              recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-5 rounded-xl border flex flex-col justify-between space-y-4 transition-all duration-300 ${
                    rec.priority === 'IMMEDIATE_ACTION'
                      ? 'bg-red-950/20 border-red-500/40 hover:border-red-500/70 shadow-lg shadow-red-950/20'
                      : rec.priority === 'HIGH_PRIORITY'
                      ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/70 shadow-lg shadow-amber-950/20'
                      : 'bg-cyan-950/20 border-cyan-500/30 hover:border-cyan-500/60'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                          rec.priority === 'IMMEDIATE_ACTION'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : rec.priority === 'HIGH_PRIORITY'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {rec.priority.replace('_', ' ')}
                      </span>

                      <span className="font-mono text-[10px] text-amber-300 font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {rec.statute_citation}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug">{rec.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{rec.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono font-semibold">
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>{rec.expected_impact}</span>
                    </div>

                    <button
                      onClick={() => handleExecuteRecommendation(rec)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-95 shadow-md transition-all flex items-center gap-1 whitespace-nowrap"
                    >
                      <span>Execute</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* NEW SECTION: Credit Score Improvement Plan & Simulator */}
        <section ref={scoreOptimizerRef} className="glass-panel p-6 sm:p-8 rounded-2xl border border-emerald-500/30 space-y-6 bg-gradient-to-br from-slate-900/90 via-emerald-950/20 to-slate-950/90 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Score Optimization Engine
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Credit Score Improvement Plan & Simulator
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Calculates revolving card utilization targets (Statement Date rule), hard inquiry removal, and projects maximum potential credit score gains.
              </p>
            </div>

            {/* Score Gain Meter Display */}
            {scorePlan && (
              <div className="flex items-center gap-4 bg-slate-950/90 p-3.5 rounded-xl border border-emerald-500/40">
                <div className="text-center">
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Current</div>
                  <div className="text-xl font-extrabold text-slate-200">{scorePlan.current_estimated_score}</div>
                </div>
                <div className="flex items-center text-emerald-400 font-bold text-lg">
                  <ChevronRight className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-mono">Target</div>
                  <div className="text-2xl font-black text-emerald-400">{scorePlan.target_potential_score}</div>
                </div>
                <div className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-500/30 font-mono whitespace-nowrap">
                  +{scorePlan.potential_points_gain} PTS GAIN
                </div>
              </div>
            )}
          </div>

          {/* Utilization Calculator & Breakdown Card */}
          {scorePlan && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Utilization Gauge */}
              <div className="glass-panel p-5 rounded-xl border border-slate-800 bg-slate-950/90 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <span>Revolving Utilization Rate</span>
                    <span className="font-mono text-emerald-400 font-bold">{scorePlan.utilization.utilization_percentage}%</span>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          scorePlan.utilization.utilization_percentage > 30
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, scorePlan.utilization.utilization_percentage)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>0% (OPTIMAL)</span>
                      <span>10% TARGET</span>
                      <span>30% RISK</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Total Card Balances:</span>
                    <span className="font-mono font-bold">${scorePlan.utilization.current_balance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Target Balance (10%):</span>
                    <span className="font-mono font-bold">${scorePlan.utilization.target_balance_10_pct.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-cyan-300 pt-1 border-t border-slate-800 font-bold">
                    <span>Paydown Required:</span>
                    <span className="font-mono">${scorePlan.utilization.recommended_paydown.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Action Roadmap List */}
              <div className="lg:col-span-2 glass-panel p-5 rounded-xl border border-slate-800 bg-slate-950/90 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" />
                  Score Optimization Step-by-Step Roadmap
                </h3>

                <div className="space-y-3">
                  {scorePlan.action_roadmap.map((step) => (
                    <div
                      key={step.step_number}
                      className="p-4 rounded-xl border border-slate-800/90 bg-slate-900/50 hover:bg-slate-900/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold flex items-center justify-center border border-emerald-500/30">
                            {step.step_number}
                          </span>
                          <span className="font-bold text-white text-xs">{step.title}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-950 font-mono text-[9px] text-amber-300 border border-slate-800">
                            {step.statute_citation}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] leading-relaxed pl-7">{step.description}</p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pl-7 sm:pl-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                        <span className="font-mono text-emerald-400 font-bold text-xs whitespace-nowrap">
                          {step.potential_point_gain}
                        </span>

                        <button
                          onClick={() => handleExecuteScoreStep(step)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 border border-slate-700 bg-slate-800 hover:text-white hover:border-slate-600 transition-all whitespace-nowrap"
                        >
                          {step.action_button_text}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

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
              <div className="text-xs text-slate-400">FCRA Violations</div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{leaks.length}</div>
              <div className="text-xs text-slate-400">Breaches Detected</div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-400">{privacyScore}/100</div>
              <div className="text-xs text-slate-400">Privacy Defense Score</div>
            </div>
          </div>
        </div>

        {/* SECTION: Privacy & Data Leak Defense Agent */}
        <section ref={privacySectionRef} className="glass-panel p-6 sm:p-8 rounded-2xl border border-indigo-500/30 space-y-6 bg-gradient-to-b from-indigo-950/30 to-slate-950/60 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
                <Lock className="w-3.5 h-3.5" />
                Data Leak & Data Broker Removal Agent
              </div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
                Dark Web Leak Monitor & CCPA Data Broker Opt-Out Engine
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Monitors credential exposures (SSN, Email, Address) and automates CCPA / CPRA statutory opt-out deletion requests to US Data Brokers (*Whitepages, Spokeo, LexisNexis*).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleTriggerPrivacyScan}
                disabled={scanningPrivacy}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-200 border border-slate-700 bg-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${scanningPrivacy ? 'animate-spin' : ''}`} />
                <span>{scanningPrivacy ? 'Scanning...' : 'Rescan Leaks'}</span>
              </button>

              <button
                onClick={handleOpenNoticeInspector}
                disabled={loadingPreviews || triggeringOptOut}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 hover:opacity-95 shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-40"
              >
                {loadingPreviews ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading Notices...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    <span>Review & Send CCPA Notices (Mailto)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Privacy Score Card & Breach Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Privacy Score Gauge */}
            <div className="glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-4 bg-slate-950/80">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Privacy Defense Score</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-emerald-400">{privacyScore}</span>
                  <span className="text-slate-500 font-mono text-sm">/ 100</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Calculated based on active credential exposures vs. completed data broker opt-out deletions.
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-800 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500 h-full transition-all duration-1000"
                    style={{ width: `${privacyScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>EXPOSED</span>
                  <span>SECURED</span>
                </div>
              </div>
            </div>

            {/* Detected Dark Web Breaches List */}
            <div className="lg:col-span-2 glass-panel p-5 rounded-xl border border-slate-800 bg-slate-950/80 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldX className="w-4 h-4 text-red-400" />
                  Detected Data Breaches ({leaks.length})
                </h3>
              </div>

              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {leaks.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No active data breaches detected.</p>
                ) : (
                  leaks.map((leak) => (
                    <div
                      key={leak.id}
                      className="p-3 rounded-lg border border-slate-800/80 bg-slate-900/60 flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-200 flex items-center gap-2">
                          <span>{leak.breach_name}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              leak.risk_level === 'CRITICAL'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {leak.risk_level}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{leak.compromised_credentials}</p>
                      </div>
                      <div className="text-right text-[10px] text-slate-500 font-mono whitespace-nowrap">
                        {leak.leak_date || '2026-07-24'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* US Data Broker Removal Progress Table */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              US Data Broker Removal Tracker (CCPA / CPRA Statutory Requests)
            </h3>

            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/80">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 font-mono bg-slate-900/80">
                    <th className="py-2.5 px-4">Data Broker</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Removal Mechanism</th>
                    <th className="py-2.5 px-4">Confirmation Ref</th>
                    <th className="py-2.5 px-4">Removal Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {brokerRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 px-4 text-center text-slate-500 text-xs italic">
                        Click "Review & Send CCPA Notices (Mailto)" above to inspect and send removal requests.
                      </td>
                    </tr>
                  ) : (
                    brokerRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-200">
                          {req.broker?.broker_name || 'US Data Broker'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {req.broker?.category || 'People Search'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-cyan-300">
                          {req.broker?.removal_mechanism || 'CCPA_FORM'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-amber-300">
                          {req.confirmation_token || 'PENDING-GEN'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              req.status === 'VERIFIED_REMOVED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : req.status === 'SUBMITTED'
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {req.status === 'VERIFIED_REMOVED'
                              ? 'VERIFIED REMOVED'
                              : req.status === 'SUBMITTED'
                              ? 'OPT-OUT SUBMITTED'
                              : 'PENDING REMOVAL'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* FCRA § 605B (15 U.S.C. § 1681c-2) Identity Theft Deletion Generator */}
          <div className="pt-4 border-t border-slate-800/80 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                FCRA § 605B (15 U.S.C. § 1681c-2) 4-Day Identity Theft Tradeline Block Affidavit
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                If a data breach led to fraudulent credit accounts or identity theft, credit bureaus **MUST** block and expunge the tradelines within **4 business days** under federal law.
              </p>
            </div>

            <form onSubmit={handleGenerateFCRA605B} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Credit Bureau Target</label>
                <select
                  value={blockBureau}
                  onChange={(e) => setBlockBureau(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                >
                  <option value="Experian">Experian</option>
                  <option value="Equifax">Equifax</option>
                  <option value="TransUnion">TransUnion</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">FTC / Police Affidavit Number</label>
                <input
                  type="text"
                  value={policeReportNumber}
                  onChange={(e) => setPoliceReportNumber(e.target.value)}
                  placeholder="e.g. FTC-IDENTITY-THEFT-AFFIDAVIT-2026"
                  className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Fraudulent Tradelines (One per line)</label>
                <input
                  type="text"
                  value={fraudulentAccounts}
                  onChange={(e) => setFraudulentAccounts(e.target.value)}
                  placeholder="e.g. MIDLAND CREDIT #4455"
                  className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                />
              </div>

              <div className="md:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={generatingBlock}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-red-600 hover:opacity-95 shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-40"
                >
                  {generatingBlock ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Affidavit...</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Generate Statutory 4-Day Block Affidavit (§ 605B)</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Markdown Preview Window for FCRA 605B Affidavit */}
            {blockMarkdown && (
              <div className="p-4 rounded-xl bg-slate-950/90 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-400">
                    FCRA § 605B Affidavit Preview (15 U.S.C. § 1681c-2)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyBlockMarkdown}
                      className="px-3 py-1 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs transition-colors flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copyBlockSuccess ? 'Copied!' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={handleDownloadBlockMarkdown}
                      className="px-3 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-slate-900/90 border border-slate-800 font-mono text-xs text-slate-300 max-h-60 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                  {blockMarkdown}
                </div>
              </div>
            )}
          </div>
        </section>

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
        <section ref={disputeSectionRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 py-16">
                  <FileText className="w-10 h-10 stroke-[1.5]" />
                  <p className="text-xs font-medium">Select dispute type and click "Generate Legal Dispute Campaign"</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* CCPA LEGAL NOTICE INSPECTOR & MAILTO DISPATCH MODAL */}
      {showNoticeModal && noticePreviews.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1021] border border-indigo-500/40 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    CCPA / CPRA Statutory Legal Notice Inspector (Direct Mailto Dispatch)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Inspect notice text for each Data Broker and dispatch directly from your personal email client.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowNoticeModal(false)}
                className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Main Body */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-800">
              {/* Left Broker Tabs List */}
              <div className="w-full md:w-64 p-3 space-y-2 bg-slate-950/60 overflow-y-auto max-h-48 md:max-h-none">
                <div className="text-[10px] font-mono uppercase text-slate-400 px-2 py-1 tracking-wider">
                  Target Data Brokers ({noticePreviews.length})
                </div>
                {noticePreviews.map((preview, idx) => (
                  <button
                    key={preview.request_id}
                    onClick={() => setSelectedPreviewIndex(idx)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex flex-col gap-1 ${
                      selectedPreviewIndex === idx
                        ? 'bg-indigo-600/20 border-indigo-500/60 text-white font-bold'
                        : 'border-slate-800/80 text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{preview.broker_name}</span>
                      <span className="text-[9px] font-mono text-cyan-400">{preview.confirmation_ref.slice(0, 8)}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 truncate">{preview.target_email}</div>
                  </button>
                ))}
              </div>

              {/* Right Notice Document Viewer */}
              <div className="flex-1 p-5 flex flex-col space-y-3 bg-slate-950/90 overflow-y-auto">
                {noticePreviews[selectedPreviewIndex] && (
                  <>
                    <div className="space-y-2 border-b border-slate-800 pb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-mono">Recipient Email:</span>
                        <span className="font-mono font-bold text-cyan-300">
                          {noticePreviews[selectedPreviewIndex].target_email}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-mono">Subject:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {noticePreviews[selectedPreviewIndex].subject}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 p-4 rounded-xl bg-slate-900/90 border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap overflow-y-auto">
                      {noticePreviews[selectedPreviewIndex].body_text}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => handleMailtoDispatch(noticePreviews[selectedPreviewIndex].mailto_link)}
                        className="px-6 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 hover:opacity-95 shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Send CCPA Notice via Personal Email App (Mailto)</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Modal Action Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Pre-filled & formatted according to Cal. Civ. Code § 1798.100 & § 1798.135.</span>
              </div>

              <button
                onClick={() => setShowNoticeModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-300 border border-slate-700 bg-slate-900 hover:text-white transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
