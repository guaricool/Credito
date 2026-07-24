import Link from 'next/link';
import {
  ShieldCheck,
  Scale,
  FileText,
  Clock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
  Search,
  Zap,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-r from-cyan-600/20 via-indigo-600/20 to-purple-600/20 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[400px] bg-cyan-600/10 blur-[120px] pointer-events-none rounded-full" />

      {/* Top Header Navigation */}
      <header className="border-b border-slate-800/80 glass-panel sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-lg shadow-cyan-500/20">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white">
                US Credit <span className="gradient-text">Law Engine</span>
              </span>
              <div className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 font-semibold">
                FCRA & FDCPA Statutory Compliance
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2"
            >
              Access Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-16 lg:py-24 flex flex-col items-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-8">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          Automated Statutory Dispute Engine
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl leading-none mb-6">
          Automate Credit Bureau Disputes with{' '}
          <span className="gradient-text">Statutory Precision</span>
        </h1>

        <p className="text-slate-300 text-lg sm:text-xl max-w-3xl leading-relaxed mb-10">
          Instantly audit Experian, Equifax, and TransUnion reports against{' '}
          <strong className="text-white">15 U.S.C. § 1681i</strong>,{' '}
          <strong className="text-white">15 U.S.C. § 1681c</strong>, and Metro 2 compliance standards. Auto-generate legally binding Section 609, Debt Validation, and MOV letters.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:opacity-95 shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-3"
          >
            <Zap className="w-5 h-5 fill-current" />
            Start Free FCRA Audit
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-semibold text-slate-200 glass-panel glass-panel-hover flex items-center justify-center gap-2"
          >
            Launch Live Dashboard
            <ArrowRight className="w-5 h-5 text-slate-400" />
          </Link>
        </div>

        {/* Live Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mb-20">
          <div className="glass-panel p-4 rounded-xl text-center">
            <div className="text-2xl font-black text-cyan-400">100%</div>
            <div className="text-xs text-slate-400 mt-1">FCRA Statutory Mapping</div>
          </div>
          <div className="glass-panel p-4 rounded-xl text-center">
            <div className="text-2xl font-black text-indigo-400">30-Day</div>
            <div className="text-xs text-slate-400 mt-1">Response Window Tracker</div>
          </div>
          <div className="glass-panel p-4 rounded-xl text-center">
            <div className="text-2xl font-black text-purple-400">Metro 2</div>
            <div className="text-xs text-slate-400 mt-1">Format Audit Rules</div>
          </div>
          <div className="glass-panel p-4 rounded-xl text-center">
            <div className="text-2xl font-black text-emerald-400">Section 609</div>
            <div className="text-xs text-slate-400 mt-1">Instant Letter Generation</div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="w-full text-left">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">
              Built for Legal Accuracy & Credit Recovery
            </h2>
            <p className="text-slate-400 text-sm">
              Comprehensive compliance verification across federal statutes and credit bureau reporting guidelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-panel glass-panel-hover p-8 rounded-2xl border border-slate-800">
              <div className="p-3 w-fit rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-6">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                1. Multi-Bureau Report Parser
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Upload HTML or PDF credit reports from Experian, Equifax, or TransUnion. Automatically extract tradelines, payment histories, balances, and bureau discrepancies.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  Tri-bureau tradeline comparison
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  Automatic Date of First Delinquency tracking
                </li>
              </ul>
            </div>

            <div className="glass-panel glass-panel-hover p-8 rounded-2xl border border-slate-800">
              <div className="p-3 w-fit rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                2. FCRA & FDCPA Compliance Audit
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Scan extracted tradelines for statutory violations including 7-year obsolescence (15 U.S.C. § 1681c), unverifiable balance reporting, and missing DOFD.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  Statutory violation citation mapping
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  Severity classification & remedy advice
                </li>
              </ul>
            </div>

            <div className="glass-panel glass-panel-hover p-8 rounded-2xl border border-slate-800">
              <div className="p-3 w-fit rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-6">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                3. Legal Dispute Letter Generator
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Generate custom, legally tailored dispute campaigns: Section 609 disclosures, Debt Validation (FDCPA § 809), and Method of Verification (MOV).
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  Live Markdown preview & copy/download
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  Integrated 30-day response deadline tracker
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 glass-panel py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Lock className="w-4 h-4 text-cyan-400" />
            <span>US Credit Law & Dispute Platform — 15 U.S.C. § 1681 Engine</span>
          </div>
          <div>
            Built with Next.js 14, TailwindCSS & FastAPI Backend
          </div>
        </div>
      </footer>
    </div>
  );
}
