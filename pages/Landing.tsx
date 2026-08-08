import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import {
  Calendar,
  Search,
  Mail,
  Wallet,
  Sparkles,
  MessageSquare,
  ArrowRight,
  Heart,
  ShieldCheck,
  ChefHat,
  Home,
  Music,
  BookOpen,
  Send,
  Check,
  GraduationCap,
} from 'lucide-react';

const features = [
  {
    icon: Calendar,
    color: 'text-rose-600 bg-rose-50 border-rose-100',
    title: 'ការគ្រប់គ្រងកម្មវិធី',
    en: 'Ceremony planning',
    desc: 'បង្កើត និងរៀបចំកម្មវិធី គ្រប់គ្រងបញ្ជីភ្ញៀវ ថវិកា និងផែនការជាមួយ AI។',
  },
  {
    icon: Search,
    color: 'text-violet-600 bg-violet-50 border-violet-100',
    title: 'ទីផ្សារសេវាកម្ម',
    en: 'Vendor marketplace',
    desc: 'ស្វែងរក និងកក់ចុងភៅ សាលពិធី ក្រុមតន្ត្រី និងសម្អាងការ ក្នុងកន្លែងតែមួយ។',
  },
  {
    icon: Mail,
    color: 'text-amber-600 bg-amber-50 border-amber-100',
    title: 'លិខិតអញ្ជើញ & RSVP',
    en: 'Invitations & RSVP',
    desc: 'ធៀបការឌីជីថល ភ្ញៀវឆ្លើយតបចូលរួម និងរាយការណ៍ចំណងដៃតាម KHQR។',
  },
  {
    icon: Wallet,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    title: 'ថវិកា & ចំណងដៃ',
    en: 'Budget & gifts',
    desc: 'តាមដានចំណូល-ចំណាយ និងបញ្ជាក់ចំណងដៃពីភ្ញៀវចូលក្នុងបញ្ជីថវិកា។',
  },
  {
    icon: Sparkles,
    color: 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-100',
    title: 'ជំនួយការ AI',
    en: 'AI assistant',
    desc: 'ជជែកជាភាសាខ្មែរ បង្កើតផែនការ រូបភាព ស្កេនវិក្កយបត្រ និងច្រើនទៀត។',
  },
  {
    icon: MessageSquare,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-100',
    title: 'សហគមន៍',
    en: 'Community feed',
    desc: 'ចែករំលែកបទពិសោធន៍ សួរសំណួរ និងរៀនសូត្រពីគ្នាទៅវិញទៅមក។',
  },
];

const roles = [
  { icon: Heart, label: 'ម្ចាស់កម្មវិធី', en: 'Event owners' },
  { icon: ShieldCheck, label: 'អ្នករៀបចំ', en: 'Organizers' },
  { icon: ChefHat, label: 'ចុងភៅ', en: 'Chefs' },
  { icon: Home, label: 'សាលពិធី', en: 'Halls' },
  { icon: Music, label: 'ក្រុមតន្ត្រី', en: 'Bands' },
  { icon: Sparkles, label: 'សម្អាងការ', en: 'Salons' },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Logo variant="full" size="sm" />
          <div className="flex items-center gap-2">
            <Link
              to="/about"
              className="hidden sm:inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg transition-colors"
            >
              អំពីយើង
            </Link>
            <Link
              to="/guide"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg transition-colors"
            >
              <BookOpen size={16} /> សៀវភៅណែនាំ
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-rose-700 hover:bg-rose-800 px-4 py-2 rounded-lg shadow-sm transition-colors"
            >
              ចូលគណនី <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-rose-50 via-white to-slate-50" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-rose-100/50 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-5 pt-16 pb-20 md:pt-24 md:pb-28 text-center">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-rose-700 bg-rose-50 border border-rose-100 rounded-full px-4 py-1.5 mb-6">
            <Heart size={13} /> កម្មវិធីសហគមន៍ · ឥតគិតថ្លៃ · Free community app
          </span>

          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight text-slate-900" style={{ fontFamily: "'Libre Baskerville', 'Kantumruy Pro', serif" }}>
            រៀបចំពិធីខ្មែរ<br className="hidden md:block" /> ដ៏មានន័យ ជាមួយ <span className="text-rose-700">PITHI</span>
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-base md:text-lg text-slate-600 leading-relaxed">
            វេទិកាតែមួយសម្រាប់រៀបចំ និងគ្រប់គ្រងពិធីខ្មែរប្រពៃណី — មង្គលការ ខួបកំណើត ឡើងផ្ទះ និងបុណ្យផ្សេងៗ — ភ្ជាប់ម្ចាស់ការ អ្នករៀបចំ និងអ្នកផ្គត់ផ្គង់សេវាកម្មនៅកន្លែងតែមួយ។
          </p>
          <p className="mt-2 max-w-2xl mx-auto text-sm text-slate-400">
            One Khmer-language platform to plan ceremonies and connect hosts, organizers, and vendors.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-bold text-white bg-rose-700 hover:bg-rose-800 px-7 py-3.5 rounded-xl shadow-lg shadow-rose-700/20 transition-all"
            >
              ចាប់ផ្តើមឥឡូវនេះ · Get started <ArrowRight size={18} />
            </Link>
            <Link
              to="/guide"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-7 py-3.5 rounded-xl transition-colors"
            >
              <BookOpen size={18} /> សៀវភៅណែនាំ
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400">មិនគិតថ្លៃពីអ្នកប្រើប្រាស់ · គ្មានកាតឥណទាន · No user fees, no credit card</p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-5 py-16 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">មុខងារសំខាន់ៗ · What PITHI does</h2>
          <p className="mt-3 text-slate-500">គ្រប់យ៉ាងដែលអ្នកត្រូវការសម្រាប់រៀបចំពិធីមួយ ចាប់ពីផែនការរហូតដល់ចំណងដៃ។</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.en} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${f.color}`}>
                <f.icon size={20} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{f.title}</h3>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-0.5">{f.en}</p>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">សម្រាប់អ្នកគ្រប់គ្នា · Built for everyone</h2>
          <p className="mt-3 text-slate-500">មិនថាអ្នករៀបចំពិធីផ្ទាល់ខ្លួន ឬផ្តល់សេវាកម្មទេ PITHI មានកន្លែងសម្រាប់អ្នក។</p>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {roles.map((r) => (
              <div key={r.en} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-rose-600">
                  <r.icon size={22} />
                </div>
                <span className="text-sm font-bold text-slate-800">{r.label}</span>
                <span className="text-[11px] text-slate-400">{r.en}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community / open-source / incubation */}
      <section className="max-w-6xl mx-auto px-5 py-16 md:py-20">
        <div className="bg-gradient-to-br from-rose-700 to-rose-900 rounded-3xl p-8 md:p-12 text-center text-white shadow-xl shadow-rose-900/10">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-rose-100 bg-white/10 border border-white/15 rounded-full px-4 py-1.5">
            <GraduationCap size={14} /> Incubated by CamboVerse · NUM
          </span>
          <h2 className="mt-5 text-2xl md:text-3xl font-extrabold text-white">កម្មវិធីសហគមន៍ ឥតគិតថ្លៃ</h2>
          <p className="mt-4 max-w-2xl mx-auto text-rose-50/90 leading-relaxed">
            PITHI ជាគម្រោងសហគមន៍ ឥតគិតថ្លៃសម្រាប់អ្នកប្រើប្រាស់ទាំងអស់។ យើងទ្រទ្រង់ខ្លួនតាមរយៈការគាំទ្រ ការបរិច្ចាគ និងការបណ្តុះបណ្តាល — មិនមែនតាមការគិតថ្លៃពីអ្នកប្រើប្រាស់ឡើយ។
          </p>
          <p className="mt-2 max-w-2xl mx-auto text-sm text-rose-100/70">
            A free community project sustained by support, donations, and training — never user fees. Incubated by CamboVerse at the National University of Management (NUM), and planned for release as open source (Apache-2.0).
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-rose-50">
            <span className="inline-flex items-center gap-1.5"><Check size={16} /> ឥតគិតថ្លៃ · Always free</span>
            <span className="inline-flex items-center gap-1.5"><Check size={16} /> Open source</span>
            <span className="inline-flex items-center gap-1.5"><Check size={16} /> ភាសាខ្មែរ · Khmer-first</span>
          </div>

          <div className="mt-9">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 text-base font-bold text-rose-800 bg-white hover:bg-rose-50 px-7 py-3.5 rounded-xl shadow-lg transition-colors"
            >
              ចាប់ផ្តើមរៀបចំពិធីរបស់អ្នក <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo variant="full" size="sm" />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <Link to="/about" className="text-slate-500 hover:text-slate-800 font-medium">អំពីយើង</Link>
            <Link to="/guide" className="text-slate-500 hover:text-slate-800 font-medium">សៀវភៅណែនាំ</Link>
            <Link to="/login" className="text-slate-500 hover:text-slate-800 font-medium">ចូលគណនី</Link>
            <a
              href="https://t.me/+DBOU-zZhP_lkNTg9"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-blue-500 hover:text-blue-600 font-medium"
            >
              <Send size={15} className="-rotate-12" /> Telegram
            </a>
          </div>
          <p className="text-xs text-slate-400 text-center md:text-right">
            © 2026 DEVA · PITHI<br />
            Incubated by CamboVerse · NUM
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
