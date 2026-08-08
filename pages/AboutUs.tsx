import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Heart,
  Users,
  Sparkles,
  GraduationCap,
  Rocket,
  Handshake,
  ExternalLink,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// TEAM
// Photos live in /public/team/. Drop each member's photo there named
// member-1, member-2, ... Square images look best (e.g. 600x600).
// The extension may be .jpg, .jpeg or .png - each is tried in turn, and if none
// is found the card shows the member's initials, so the page never looks broken.
// Edit the name / role fields freely.
// ---------------------------------------------------------------------------
const PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png'];

const team = [
  { name: 'Team Member 1', role: 'Founder & CEO', photo: '/team/member-1', color: 'from-rose-500 to-pink-600' },
  { name: 'Team Member 2', role: 'Co-Founder', photo: '/team/member-2', color: 'from-blue-500 to-indigo-600' },
  { name: 'Team Member 3', role: 'Lead Developer', photo: '/team/member-3', color: 'from-emerald-500 to-teal-600' },
  { name: 'Team Member 4', role: 'Backend Developer', photo: '/team/member-4', color: 'from-amber-500 to-orange-600' },
  { name: 'Team Member 5', role: 'UI/UX Designer', photo: '/team/member-5', color: 'from-violet-500 to-purple-600' },
  { name: 'Team Member 6', role: 'Marketing & Partnerships', photo: '/team/member-6', color: 'from-cyan-500 to-sky-600' },
];

// ---------------------------------------------------------------------------
// PARTNERS & INCUBATOR
// Logos live in /public/partners/. Drop each logo there using the file name
// below; a text placeholder shows until the image is added.
// ---------------------------------------------------------------------------
const LOGO_EXTENSIONS = ['png', 'jpg', 'jpeg', 'svg', 'webp'];

const partners = [
  {
    name: 'National University of Management',
    sub: 'Academic partner',
    url: 'https://numuniversity.com/',
    logo: '/partners/num',
  },
  {
    name: 'e-Khmer',
    sub: 'Technology partner',
    url: 'https://www.e-khmer.com/en',
    logo: '/partners/e-khmer',
  },
];

const incubator = {
  name: 'CamboVerse',
  sub: 'Incubated by',
  url: 'https://camboverse.world/',
  logo: '/partners/camboverse',
};

const initialsOf = (name: string) =>
  name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();

/**
 * Tries `base.ext` for each extension in turn. `src` is null once every
 * candidate has failed, which is the caller's cue to render a fallback.
 * This means a photo works whether it was saved as .jpg, .jpeg or .png.
 */
const useImageWithFallbacks = (base: string, extensions: string[]) => {
  const [index, setIndex] = useState(0);
  const src = index < extensions.length ? `${base}.${extensions[index]}` : null;
  return { src, onError: () => setIndex(i => i + 1) };
};

const TeamCard = ({ member }: { member: typeof team[number] }) => {
  const { src, onError } = useImageWithFallbacks(member.photo, PHOTO_EXTENSIONS);
  return (
    <div className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      <div className="aspect-square bg-slate-100 overflow-hidden">
        {src ? (
          <img
            key={src}
            src={src}
            alt={member.name}
            onError={onError}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${member.color}`}>
            <span className="text-white text-4xl font-bold font-serif">{initialsOf(member.name)}</span>
          </div>
        )}
      </div>
      <div className="p-5 text-center">
        <h3 className="font-bold text-slate-900 text-lg">{member.name}</h3>
        <p className="text-sm font-semibold text-rose-600 mt-0.5">{member.role}</p>
      </div>
    </div>
  );
};

const PartnerCard = ({
  name, sub, url, logo, icon: Icon,
}: { name: string; sub: string; url: string; logo: string; icon: any }) => {
  const { src, onError } = useImageWithFallbacks(logo, LOGO_EXTENSIONS);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-rose-200 transition-all"
    >
      <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
        {src ? (
          <img key={src} src={src} alt={name} onError={onError} className="w-full h-full object-contain p-1.5" />
        ) : (
          <Icon size={26} className="text-slate-400" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{sub}</p>
        <h3 className="font-bold text-slate-900 leading-snug group-hover:text-rose-700 transition-colors">{name}</h3>
      </div>
      <ExternalLink size={16} className="ml-auto text-slate-300 group-hover:text-rose-500 transition-colors flex-shrink-0" />
    </a>
  );
};

const AboutUs = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/welcome"><Logo variant="full" size="sm" /></Link>
          <div className="flex items-center gap-2">
            <Link to="/guide" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg transition-colors">
              <BookOpen size={16} /> សៀវភៅណែនាំ
            </Link>
            <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-rose-700 hover:bg-rose-800 px-4 py-2 rounded-lg shadow-sm transition-colors">
              ចូលគណនី <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-rose-50 via-white to-slate-50" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-rose-100/50 rounded-full blur-3xl" />
        <div className="relative max-w-4xl mx-auto px-5 pt-16 pb-12 md:pt-20 md:pb-16 text-center">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-rose-700 bg-rose-50 border border-rose-100 rounded-full px-4 py-1.5 mb-6">
            <Heart size={13} /> អំពីយើង · About us
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-slate-900" style={{ fontFamily: "'Libre Baskerville', 'Kantumruy Pro', serif" }}>
            អ្នកនៅពីក្រោយ <span className="text-rose-700">PITHI</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-base md:text-lg text-slate-600 leading-relaxed">
            PITHI ជាវេទិកាសហគមន៍ឥតគិតថ្លៃ ដែលបង្កើតឡើងដើម្បីជួយសម្រួលការរៀបចំពិធីខ្មែរប្រពៃណី ភ្ជាប់ម្ចាស់ការ អ្នករៀបចំ និងអ្នកផ្គត់ផ្គង់សេវាកម្មនៅកន្លែងតែមួយ។
          </p>
          <p className="mt-2 max-w-2xl mx-auto text-sm text-slate-400">
            A free, community-built platform for planning traditional Cambodian ceremonies — connecting hosts, organizers, and vendors in one place.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-5xl mx-auto px-5 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: Heart, title: 'បេសកកម្ម · Mission', desc: 'ធ្វើឱ្យការរៀបចំពិធីខ្មែរកាន់តែងាយស្រួល តម្លាភាព និងអាចចូលប្រើបានសម្រាប់គ្រប់គ្នា។' },
            { icon: Users, title: 'សហគមន៍ · Community', desc: 'ភ្ជាប់ម្ចាស់ការ អ្នករៀបចំ និងអ្នកលក់សេវាកម្មក្នុងបណ្តាញតែមួយដ៏រឹងមាំ។' },
            { icon: Sparkles, title: 'បច្ចេកវិទ្យា · Technology', desc: 'ប្រើ AI និងឧបករណ៍ទំនើប ដើម្បីសម្រួលការងារ ចាប់ពីធៀបការ រហូតដល់ថវិកា។' },
          ].map((m) => (
            <div key={m.title} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <m.icon size={22} />
              </div>
              <h3 className="font-bold text-slate-900 mb-1.5">{m.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="max-w-6xl mx-auto px-5 py-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 font-serif">ក្រុមការងារ · Our Team</h2>
          <p className="text-slate-500 mt-2">មនុស្សដែលបង្កើត និងថែរក្សា PITHI។</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
          {team.map((m) => <TeamCard key={m.photo} member={m} />)}
        </div>
      </section>

      {/* Partners */}
      <section className="max-w-5xl mx-auto px-5 py-12">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <Handshake size={15} className="text-rose-600" /> ដៃគូ · Partners
          </span>
          <h2 className="text-2xl font-bold text-slate-900 font-serif mt-2">ភាពជាដៃគូ</h2>
          <p className="text-slate-500 mt-2 text-sm">PITHI សហការជាមួយស្ថាប័នអប់រំ និងបច្ចេកវិទ្យាឈានមុខ។</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PartnerCard {...partners[0]} icon={GraduationCap} />
          <PartnerCard {...partners[1]} icon={Sparkles} />
        </div>
      </section>

      {/* Incubator */}
      <section className="max-w-3xl mx-auto px-5 py-12">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 md:p-10 text-center text-white relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-rose-300">
              <Rocket size={15} /> {incubator.sub}
            </span>
            <div className="mt-5 flex justify-center">
              <IncubatorLogo />
            </div>
            <h2 className="text-2xl font-bold font-serif mt-4">{incubator.name}</h2>
            <p className="text-slate-300 text-sm mt-2 max-w-md mx-auto">
              PITHI ត្រូវបានបណ្តុះបណ្តាល និងគាំទ្រដោយ Camboverse។
            </p>
            <a
              href={incubator.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-bold text-white bg-rose-700 hover:bg-rose-800 px-5 py-2.5 rounded-lg transition-colors"
            >
              ចូលមើល Camboverse <ExternalLink size={15} />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo variant="full" size="sm" />
          <div className="flex items-center gap-5 text-sm">
            <Link to="/welcome" className="text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1.5">
              <ArrowLeft size={15} /> ត្រឡប់ទៅទំព័រដើម
            </Link>
            <Link to="/guide" className="text-slate-500 hover:text-slate-800 font-medium">សៀវភៅណែនាំ</Link>
            <Link to="/login" className="text-slate-500 hover:text-slate-800 font-medium">ចូលគណនី</Link>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 pb-6">© 2026 PITHI Platform · Incubated by Camboverse</p>
      </footer>
    </div>
  );
};

const IncubatorLogo = () => {
  const { src, onError } = useImageWithFallbacks(incubator.logo, LOGO_EXTENSIONS);
  return src ? (
    <img
      key={src}
      src={src}
      alt={incubator.name}
      onError={onError}
      className="h-16 w-auto max-w-[220px] object-contain bg-white/95 rounded-xl p-2"
    />
  ) : (
    <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
      <Rocket size={28} className="text-rose-300" />
    </div>
  );
};

export default AboutUs;
