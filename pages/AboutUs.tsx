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
  Building2,
  Globe,
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
  { name: 'Team Member 1', role: 'Member', photo: '/team/member-1', color: 'from-rose-500 to-pink-600' },
  { name: 'Team Member 2', role: 'Member', photo: '/team/member-2', color: 'from-blue-500 to-indigo-600' },
  { name: 'Team Member 3', role: 'Member', photo: '/team/member-3', color: 'from-emerald-500 to-teal-600' },
  { name: 'Team Member 4', role: 'Member', photo: '/team/member-4', color: 'from-amber-500 to-orange-600' },
  { name: 'Team Member 5', role: 'Member', photo: '/team/member-5', color: 'from-violet-500 to-purple-600' },
  { name: 'Team Member 6', role: 'Member', photo: '/team/member-6', color: 'from-cyan-500 to-sky-600' },
  { name: 'Team Member 7', role: 'Member', photo: '/team/member-7', color: 'from-teal-500 to-emerald-600' },
  { name: 'Team Member 8', role: 'Member', photo: '/team/member-8', color: 'from-fuchsia-500 to-pink-600' },
  { name: 'Team Member 9', role: 'Member', photo: '/team/member-9', color: 'from-orange-500 to-amber-600' },
];

// ---------------------------------------------------------------------------
// PARTNERS & SUPPORTERS
// Logos live in /public/partners/. Drop each logo there using the base name
// below with any of LOGO_EXTENSIONS; a placeholder icon shows until then.
// ---------------------------------------------------------------------------
const LOGO_EXTENSIONS = ['png', 'jpg', 'jpeg', 'svg', 'webp'];

const partners = [
  {
    name: 'National University of Management',
    roleKm: 'សាកលវិទ្យាល័យម្ចាស់ផ្ទះ',
    roleEn: 'HOST UNIVERSITY',
    desc: 'PITHI is hosted at the National University of Management in Phnom Penh.',
    site: 'num.edu.kh',
    url: 'https://num.edu.kh/',
    logo: '/partners/num',
  },
  {
    name: 'CamboVerse Center',
    roleKm: 'អ្នកបណ្ដុះបណ្ដាលគម្រោង',
    roleEn: 'INCUBATOR',
    desc: 'PITHI is incubated by the CamboVerse Center at NUM, which supports Cambodian technology projects.',
    site: 'camboverse.world',
    url: 'https://camboverse.world/',
    logo: '/partners/camboverse',
  },
  {
    name: 'E-KHMER Technology Co., Ltd.',
    roleKm: 'ដៃគូបច្ចេកវិទ្យា',
    roleEn: 'TECHNOLOGY PARTNER',
    desc: 'E-KHMER contributes engineering and technical support to the platform.',
    site: 'e-khmer.com',
    url: 'https://www.e-khmer.com/en',
    logo: '/partners/e-khmer',
  },
];

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
    <div className="group flex flex-col items-center text-center">
      {/* Circular portrait. The photos are square, so the circle only masks the
          corners - the head, which sits at the top centre, stays intact. */}
      <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full overflow-hidden bg-slate-100 ring-4 ring-white shadow-lg shadow-slate-200/70 transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
        {src ? (
          <img
            key={src}
            src={src}
            alt={member.name}
            onError={onError}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${member.color}`}>
            <span className="text-white text-3xl md:text-4xl font-bold font-serif">{initialsOf(member.name)}</span>
          </div>
        )}
      </div>
      <h3 className="mt-5 font-bold text-slate-900 text-base md:text-lg leading-snug">{member.name}</h3>
      <p className="text-sm font-semibold text-rose-600 mt-0.5">{member.role}</p>
    </div>
  );
};

const PartnerCard = ({ partner }: { partner: typeof partners[number] }) => {
  const { src, onError } = useImageWithFallbacks(partner.logo, LOGO_EXTENSIONS);
  return (
    <a
      href={partner.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col items-center text-center bg-white rounded-3xl border border-slate-100 p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
    >
      {/* Logo */}
      <div className="h-24 flex items-center justify-center mb-6">
        {src ? (
          <img
            key={src}
            src={src}
            alt={partner.name}
            onError={onError}
            className="max-h-24 max-w-[200px] w-auto object-contain"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
            <Building2 size={30} className="text-slate-300" />
          </div>
        )}
      </div>

      <h3 className="font-bold text-slate-900 text-lg leading-snug">{partner.name}</h3>
      <p className="text-sm font-bold text-emerald-700 mt-1.5">
        {partner.roleKm} <span className="whitespace-nowrap">({partner.roleEn})</span>
      </p>
      <p className="text-sm text-slate-500 leading-relaxed mt-4">{partner.desc}</p>

      <span className="inline-flex items-center gap-1.5 mt-6 text-sm font-bold text-slate-400 group-hover:text-rose-600 transition-colors">
        <Globe size={15} /> {partner.site}
      </span>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-10 md:gap-y-14 justify-items-center">
          {team.map((m) => <TeamCard key={m.photo} member={m} />)}
        </div>
      </section>

      {/* Partners & supporters */}
      <section className="bg-slate-50/70 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900" style={{ fontFamily: "'Libre Baskerville', 'Kantumruy Pro', serif" }}>
              ដៃគូ និងអ្នកគាំទ្រ (Partners and supporters)
            </h2>
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto">
              PITHI is incubated by the CamboVerse Center at the National University of Management.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {partners.map((p) => <PartnerCard key={p.logo} partner={p} />)}
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

export default AboutUs;
