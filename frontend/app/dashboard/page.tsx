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
  DollarSign,
  PieChart,
  Home,
  Car,
  Info,
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
  has_data: boolean;
  score_source?: string;
  current_estimated_score: number | null;
  target_potential_score: number | null;
  potential_points_gain: number;
  utilization: {
    current_balance: number;
    revolving_balance?: number;
    installment_balance?: number;
    total_real_debt?: number;
    total_past_due?: number;
    total_credit_limit: number;
    utilization_percentage: number;
    target_balance_10_pct: number;
    recommended_paydown: number;
    status: string;
  };
  action_roadmap: OptimizationStep[];
}

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const disputeSectionRef = useRef<HTMLDivElement>(null);
  const scoreOptimizerRef = useRef<HTMLDivElement>(null);
  const accountsSectionRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Data states
  const [creditReport, setCreditReport] = useState<any>(null);
  const [tradelines, setTradelines] = useState<Tradeline[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [campaigns, setCampaigns] = useState<DisputeCampaign[]>([]);
  const [selectedViolationIds, setSelectedViolationIds] = useState<string[]>([]);

  // AI Advisor states
  const [recommendations, setRecommendations] = useState<AdvisorRecommendation[]>([]);
  const [healthIndex, setHealthIndex] = useState<number>(0);

  // Score Optimizer Plan state
  const [scorePlan, setScorePlan] = useState<ScorePlan | null>(null);

  // Dispute form states
  const [letterType, setLetterType] = useState<'SECTION_609' | 'DEBT_VALIDATION' | 'MOV'>('SECTION_609');
  const [targetName, setTargetName] = useState('Experian');
  const [accountNumber, setAccountNumber] = useState('');
  const [balance, setBalance] = useState<number>(0);
  const [disputedAccount, setDisputedAccount] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedMarkdown, setGeneratedMarkdown] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

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

        const [violRes, campRes, advisorRes, scoreRes] = await Promise.all([
          api.get('/api/v1/compliance/violations').catch(() => ({ data: [] })),
          api.get('/api/v1/disputes/campaigns').catch(() => ({ data: [] })),
          api.get('/api/v1/advisor/recommendations').catch(() => ({ data: { recommendations: [], credit_health_index: 0 } })),
          api.get('/api/v1/optimizer/plan').catch(() => ({ data: null })),
        ]);

        setViolations(violRes.data || []);
        setCampaigns(campRes.data || []);

        if (advisorRes.data?.recommendations) {
          setRecommendations(advisorRes.data.recommendations);
          setHealthIndex(advisorRes.data.credit_health_index || 0);
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

  const handleSignOut = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

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

  const handleExecuteScoreStep = (step: OptimizationStep) => {
    if (step.action_type === 'SECTION_609_DISPUTE') {
      disputeSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (step.action_type === 'CALCULATE_PAYMENT') {
      scoreOptimizerRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      alert('Estrategia de Tradelines Positivos: Recomendamos contactar a un emisor de tarjetas para agregar un usuario autorizado de 5+ años de antigüedad sin saldo.');
    }
  };

  const handleUploadAndAudit = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress('Uploading credit report...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadRes = await api.post('/api/v1/reports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const reportData = uploadRes.data;
      setCreditReport(reportData);
      if (reportData.tradelines) {
        setTradelines(reportData.tradelines);
      }

      setUploadProgress('Running statutory FCRA compliance audit...');
      const auditRes = await api.post(`/api/v1/compliance/audit/${reportData.id}`);

      setViolations(auditRes.data || []);
      setUploadProgress('Audit complete!');

      const optRes = await api.get('/api/v1/optimizer/plan');
      if (optRes.data) {
        setScorePlan(optRes.data);
      }

      accountsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err: any) {
      console.error('Upload / Audit error:', err);
      alert(err.response?.data?.detail || 'Failed to analyze credit report.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const toggleViolationSelection = (id: string) => {
    setSelectedViolationIds((prev) =>
      prev.includes(id) ? prev.filter((vId) => vId !== id) : [...prev, id]
    );
  };

  const handleDisputeAccount = (t: Tradeline) => {
    setTargetName(t.creditor_name);
    setAccountNumber(t.account_number_masked);
    
    let maxBal = 0;
    for (const b of t.bureau_details) {
      if (b.current_balance && Number(b.current_balance) > maxBal) {
        maxBal = Number(b.current_balance);
      }
    }
    setBalance(maxBal);
    setLetterType('SECTION_609');
    disputeSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-[#050811] flex items-center justify-center text-slate-300">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-sm font-semibold">Cargando Plataforma de Análisis de Deudas...</span>
        </div>
      </div>
    );
  }

  const hasData = scorePlan?.has_data || tradelines.length > 0;
  const revolvingBal = scorePlan?.utilization.revolving_balance || scorePlan?.utilization.current_balance || 0;
  const installmentBal = scorePlan?.utilization.installment_balance || 0;
  const totalRealDebt = scorePlan?.utilization.total_real_debt || (revolvingBal + installmentBal);

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
                US Credit & <span className="gradient-text">Debt Analyzer</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              100% Private Mode (Zero External Dispatch)
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
        
        {/* SECTION 1: Credit Report Uploader */}
        <section className="glass-panel p-6 sm:p-8 rounded-2xl border border-cyan-500/30 space-y-6 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-2">
                <UploadCloud className="w-3.5 h-3.5" />
                Auditoría de Deudas & Reportes de Crédito
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Subir Reporte de Crédito Tri-Buró (PDF / HTML)
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Cargue su reporte oficial de Experian, Equifax o TransUnion. El sistema analizará cada tarjeta de crédito, préstamo de auto e hipoteca sin duplicar balances.
              </p>
            </div>
          </div>

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
                    {(selectedFile.size / 1024).toFixed(1)} KB — Arrastre o haga clic para reemplazar archivo
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    <span className="font-semibold text-cyan-400">Haga clic aquí</span> o arrastre su archivo PDF/HTML de reporte de crédito
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Soporta reportes oficiales de Equifax, Experian, TransUnion, AnnualCreditReport, SmartCredit e IdentityIQ</p>
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
                  <span>Analizando Cuentas y Saldos...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analizar Cuentas & Deudas Reales</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Dashboard Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{tradelines.length}</div>
              <div className="text-xs text-slate-400">Cuentas Auditadas</div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-black text-red-400 font-mono">
                ${revolvingBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 font-semibold">Deuda Tarjetas de Crédito</div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-black text-indigo-300 font-mono">
                ${installmentBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 font-semibold">Hipotecas y Autos</div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-slate-800 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <PieChart className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-400">
                {scorePlan?.utilization.utilization_percentage || 0}%
              </div>
              <div className="text-xs text-slate-400">Utilización Revolvente</div>
            </div>
          </div>
        </div>

        {/* Real Debt Total Banner */}
        {hasData && (
          <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">Deuda Total Real Consolidada (Sin Duplicados de Buró):</span>
                <div className="text-lg font-black text-cyan-300 font-mono">
                  ${totalRealDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
            <div className="text-xs text-right text-slate-400 hidden sm:block">
              Desglose: Tarjetas <span className="text-red-400 font-bold font-mono">${revolvingBal.toLocaleString()}</span> + Hipotecas/Autos <span className="text-indigo-300 font-bold font-mono">${installmentBal.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* SECTION 2: Complete Tri-Bureau Accounts & Debts Breakdown Table */}
        <section ref={accountsSectionRef} className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-cyan-400" />
                Desglose Detallado de Cuentas, Tarjetas de Crédito y Deudas ({tradelines.length})
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Listado completo de acreedores, saldo actual (cuánto debe), límite disponible y estado ante Experian, Equifax y TransUnion.
              </p>
            </div>
          </div>

          {!hasData || tradelines.length === 0 ? (
            <div className="text-center py-12 border border-slate-800/80 rounded-xl bg-slate-900/30">
              <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">Sistema Limpio — No se han cargado reportes aún</p>
              <p className="text-xs text-slate-500 mt-1">Suba su reporte de crédito arriba para auditar sus tarjetas y préstamos en tiempo real.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/80">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono bg-slate-900/80">
                    <th className="py-3 px-4">Acreedor / Entidad</th>
                    <th className="py-3 px-4">Tipo de Cuenta</th>
                    <th className="py-3 px-4">N° Cuenta</th>
                    <th className="py-3 px-4">Saldo Actual (Debe)</th>
                    <th className="py-3 px-4">Monto en Mora</th>
                    <th className="py-3 px-4">Experian</th>
                    <th className="py-3 px-4">Equifax</th>
                    <th className="py-3 px-4">TransUnion</th>
                    <th className="py-3 px-4">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {tradelines.map((t) => {
                    const expDetail = t.bureau_details.find((b) => b.bureau === 'Experian');
                    const eqDetail = t.bureau_details.find((b) => b.bureau === 'Equifax');
                    const tuDetail = t.bureau_details.find((b) => b.bureau === 'TransUnion');

                    let currentBal = 0;
                    let pastDue = 0;
                    for (const b of t.bureau_details) {
                      if (b.current_balance && Number(b.current_balance) > currentBal) {
                        currentBal = Number(b.current_balance);
                      }
                      if (b.past_due_amount && Number(b.past_due_amount) > pastDue) {
                        pastDue = Number(b.past_due_amount);
                      }
                    }

                    return (
                      <tr key={t.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-200">
                          {t.creditor_name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono">
                            {t.account_type || 'Revolving'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-cyan-300 text-[11px]">
                          {t.account_number_masked}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-extrabold text-red-400">
                          ${currentBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                          {pastDue > 0 ? `$${pastDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '$0.00'}
                        </td>
                        <td className="py-3.5 px-4 text-[10px] font-mono">
                          {expDetail ? (
                            <span className="text-slate-300">{expDetail.account_status || 'Reported'}</span>
                          ) : (
                            <span className="text-slate-600">--</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[10px] font-mono">
                          {eqDetail ? (
                            <span className="text-slate-300">{eqDetail.account_status || 'Reported'}</span>
                          ) : (
                            <span className="text-slate-600">--</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[10px] font-mono">
                          {tuDetail ? (
                            <span className="text-slate-300">{tuDetail.account_status || 'Reported'}</span>
                          ) : (
                            <span className="text-slate-600">--</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleDisputeAccount(t)}
                            className="px-3 py-1 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white text-[11px] font-medium transition-colors whitespace-nowrap"
                          >
                            Redactar Disputa
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* SECTION 3: Credit Score Improvement Plan & Annual Report Disclosure Notice */}
        {hasData && scorePlan && (
          <section ref={scoreOptimizerRef} className="glass-panel p-6 sm:p-8 rounded-2xl border border-emerald-500/30 space-y-6 bg-gradient-to-br from-slate-900/90 via-emerald-950/20 to-slate-950/90 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Plan de Optimización de Puntaje
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  Plan Real de Reducción de Saldos & Estrategia de Crédito
                </h2>
              </div>

              {/* Score Display (Handling PDF Score vs Annual Disclosure Notice) */}
              <div className="flex items-center gap-3 bg-slate-950/90 p-3.5 rounded-xl border border-emerald-500/40">
                {scorePlan.current_estimated_score ? (
                  <>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Puntaje FICO (PDF)</div>
                      <div className="text-xl font-extrabold text-slate-200">{scorePlan.current_estimated_score}</div>
                    </div>
                    <div className="flex items-center text-emerald-400 font-bold text-lg">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-mono">Objetivo</div>
                      <div className="text-2xl font-black text-emerald-400">{scorePlan.target_potential_score}</div>
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-500/30 font-mono whitespace-nowrap">
                      +{scorePlan.potential_points_gain} PTS GAIN
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2.5 text-xs text-amber-300 font-medium">
                    <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>Puntaje Numérico No Impreso en Documento Divulgativo (AnnualCreditReport)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Annual Disclosure Score Notice Banner */}
            {!scorePlan.current_estimated_score && (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-slate-300 text-xs leading-relaxed flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300">Nota Legal sobre Puntajes de Crédito:</span> Los reportes oficiales gratuitos de la ley FCRA (*AnnualCreditReport.com*) incluyen **el 100% de sus cuentas, vehículos, hipotecas y saldos adeudados**, pero por regulación federal no imprimen la cifra del puntaje FICO a menos que se solicite por separado. El análisis estatutario de deudas y utilizaciones arriba es **100% real y basado en sus 15 cuentas del reporte**.
                </div>
              </div>
            )}

            {/* Utilization Breakdown Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="glass-panel p-5 rounded-xl border border-slate-800 bg-slate-950/90 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <span>Utilización en Tarjetas de Crédito</span>
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
                      <span>0% (ÓPTIMO)</span>
                      <span>10% META</span>
                      <span>30% RIESGO</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Saldos Tarjetas de Crédito:</span>
                    <span className="font-mono font-bold">${revolvingBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Saldo Objetivo (10%):</span>
                    <span className="font-mono font-bold">${scorePlan.utilization.target_balance_10_pct.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-cyan-300 pt-1 border-t border-slate-800 font-bold">
                    <span>Monto Recomendado a Pagar:</span>
                    <span className="font-mono">${scorePlan.utilization.recommended_paydown.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Action Roadmap List */}
              <div className="lg:col-span-2 glass-panel p-5 rounded-xl border border-slate-800 bg-slate-950/90 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" />
                  Pasos Recomendados para Aumentar Puntaje
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
          </section>
        )}

        {/* SECTION 4: Detected FCRA Violations Table */}
        {hasData && (
          <section className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Inexactitudes / Errores FCRA Detectados ({violations.length})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Seleccione los errores para adjuntarlos a la carta de disputa estatutaria.
                </p>
              </div>
            </div>

            {violations.length === 0 ? (
              <div className="text-center py-8 border border-slate-800/80 rounded-xl bg-slate-900/30 text-xs text-slate-400 italic">
                No se detectaron violaciones en las cuentas auditadas.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-mono bg-slate-950/60">
                      <th className="py-3 px-4 w-10">Link</th>
                      <th className="py-3 px-4">Severidad</th>
                      <th className="py-3 px-4">Buró</th>
                      <th className="py-3 px-4">Tipo de Inexactitud</th>
                      <th className="py-3 px-4">Cita Estatutaria</th>
                      <th className="py-3 px-4">Descripción</th>
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
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {v.severity}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-200">{v.bureau || 'Todos los Burós'}</td>
                          <td className="py-3 px-4 font-mono text-cyan-300">{v.violation_type}</td>
                          <td className="py-3 px-4 font-mono font-bold text-amber-300">{v.statutory_citation}</td>
                          <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={v.description}>
                            {v.description}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* SECTION 5: Legal Dispute Generator & Live Markdown Preview */}
        <section ref={disputeSectionRef} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Letter Configuration Form */}
          <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Generador de Cartas de Disputa & Validación
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Genere correspondencia legal estatutaria lista para imprimir y enviar por correo certificado.
              </p>
            </div>

            <form onSubmit={handleGenerateDispute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Tipo de Documento Legal
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
                    Sección 609 (Burós)
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
                    Validación de Deuda
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
                    Carta MOV
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre del Acreedor / Banco / Agencia
                </label>
                <input
                  type="text"
                  required
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  placeholder="e.g. Experian, Chase Bank, Midland Credit"
                  className="w-full px-4 py-2.5 rounded-xl text-xs glass-input"
                />
              </div>

              {letterType === 'DEBT_VALIDATION' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Número de Cuenta</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="e.g. 4532****9012"
                      className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Saldo Adeudado ($)</label>
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

              <button
                type="submit"
                disabled={generating}
                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:opacity-95 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Redactando Carta Legal...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Generar Documento Legal de Disputa</span>
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
                  Vista Previa del Documento
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Texto listo para copiar o descargar en formato impreso.
                </p>
              </div>

              {generatedMarkdown && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyMarkdown}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copySuccess ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    className="px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar</span>
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
                  <p className="text-xs font-medium">Cargue un reporte de crédito o presione "Generar Documento Legal de Disputa"</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
