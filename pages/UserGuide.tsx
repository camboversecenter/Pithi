
import React from 'react';
import {
  ArrowLeft, BookOpen, LogIn, Users, Calendar, Mail, Wallet, Search,
  Briefcase, MessagesSquare, Bell, MessageSquare, Sparkles, ShieldAlert,
  Database, Scale, Send, QrCode, Smartphone, AlertTriangle, Megaphone,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/UIComponents';

/** One numbered chapter of the manual. `id` powers the quick-nav links. */
const Section = ({ id, no, title, en, icon: Icon, children }: {
  id: string, no: string, title: string, en: string, icon: any, children?: React.ReactNode
}) => (
  <section id={id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm scroll-mt-6">
    <div className="flex items-start gap-3 mb-4 border-b border-slate-50 pb-3">
      <div className="p-2 bg-rose-50 text-rose-600 rounded-lg flex-shrink-0">
        <Icon size={22} />
      </div>
      <div>
        <h2 className="text-lg md:text-xl font-bold text-slate-800 font-serif leading-snug">{no}. {title}</h2>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-0.5">{en}</p>
      </div>
    </div>
    <div className="text-slate-600 space-y-4 leading-relaxed text-sm md:text-base font-normal">
      {children}
    </div>
  </section>
);

/** Highlighted step list used for the "how do I actually do it" walkthroughs. */
const Steps = ({ items }: { items: React.ReactNode[] }) => (
  <ol className="space-y-2.5">
    {items.map((t, i) => (
      <li key={i} className="flex gap-3">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-rose-50 text-rose-600 text-xs font-bold flex items-center justify-center mt-0.5">
          {i + 1}
        </span>
        <span className="flex-1">{t}</span>
      </li>
    ))}
  </ol>
);

const Note = ({ tone = 'amber', title, children }: { tone?: 'amber' | 'rose' | 'blue', title: string, children: React.ReactNode }) => {
  const tones = {
    amber: 'bg-amber-50 border-amber-500 text-amber-800',
    rose: 'bg-rose-50 border-rose-500 text-rose-800',
    blue: 'bg-blue-50 border-blue-500 text-blue-800',
  }[tone];
  return (
    <div className={`${tones} border-l-4 p-4 rounded-r-xl`}>
      <p className="font-bold flex items-center gap-2 text-sm">
        <AlertTriangle size={16} /> {title}
      </p>
      <div className="text-sm mt-1.5 opacity-90 space-y-1.5">{children}</div>
    </div>
  );
};

const chapters = [
  { id: 'intro', no: '១', label: 'សេចក្តីផ្តើម' },
  { id: 'start', no: '២', label: 'ការចាប់ផ្តើម' },
  { id: 'roles', no: '៣', label: 'តួនាទី' },
  { id: 'ceremony', no: '៤', label: 'កម្មវិធី' },
  { id: 'guests', no: '៥', label: 'ភ្ញៀវ & លិខិតអញ្ជើញ' },
  { id: 'budget', no: '៦', label: 'ថវិកា & ចំណងដៃ' },
  { id: 'market', no: '៧', label: 'ទីផ្សារ & ការកក់' },
  { id: 'vendor', no: '៨', label: 'អ្នកផ្តល់សេវា' },
  { id: 'inbox', no: '៩', label: 'ការទំនាក់ទំនង' },
  { id: 'community', no: '១០', label: 'សហគមន៍' },
  { id: 'ai', no: '១១', label: 'ជំនួយការ AI' },
  { id: 'security', no: '១២', label: 'សុវត្ថិភាព' },
  { id: 'cleanup', no: '១៣', label: 'ការសម្អាតទិន្នន័យ' },
  { id: 'license', no: '១៤', label: 'អាជ្ញាប័ណ្ណ' },
];

const UserGuide = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="secondary" onClick={() => navigate(-1)} className="rounded-full w-12 h-12 p-0 flex items-center justify-center flex-shrink-0">
            <ArrowLeft size={24} />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-serif text-slate-900">សៀវភៅណែនាំការប្រើប្រាស់</h1>
            <p className="text-slate-500 text-sm">PITHI User Manual · ជាភាសាខ្មែរ</p>
          </div>
        </div>

        {/* Quick navigation */}
        <nav className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">មាតិកា · Contents</p>
          <div className="flex flex-wrap gap-2">
            {chapters.map(c => (
              <a
                key={c.id}
                href={`#${c.id}`}
                className="text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 border border-slate-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                {c.no}. {c.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="space-y-6">

          <Section id="intro" no="១" title="សេចក្តីផ្តើម" en="Introduction" icon={BookOpen}>
            <p>
              <strong>PITHI (ពិធី)</strong> គឺជាវេទិកាសម្រាប់រៀបចំ និងគ្រប់គ្រងពិធីខ្មែរប្រពៃណី — មង្គលការ ខួបកំណើត
              ឡើងផ្ទះ បុណ្យសព និងបុណ្យផ្សេងៗ។ វាភ្ជាប់ <strong>ម្ចាស់កម្មវិធី</strong> <strong>អ្នករៀបចំ</strong> និង
              <strong> អ្នកផ្តល់សេវាកម្ម</strong> នៅក្នុងទីផ្សារតែមួយជាភាសាខ្មែរ។
            </p>
            <p>
              PITHI ជា <strong>គម្រោងសហគមន៍ ឥតគិតថ្លៃសម្រាប់អ្នកប្រើប្រាស់</strong>។ គម្រោងនេះត្រូវបានបណ្តុះបណ្តាលដោយ
              <strong> CamboVerse</strong> នៅ <strong>សាកលវិទ្យាល័យជាតិគ្រប់គ្រង (NUM)</strong>។
            </p>
            <p className="text-sm text-slate-500">
              PITHI is a free, community-built platform for planning traditional Cambodian ceremonies, connecting
              hosts, organizers and vendors in one Khmer-language marketplace.
            </p>
          </Section>

          <Section id="start" no="២" title="ការចាប់ផ្តើម" en="Getting started" icon={LogIn}>
            <Steps items={[
              <><strong>ចូលគណនីជាមួយ Google</strong> — បច្ចុប្បន្ន PITHI ប្រើ <strong>តែការចូលដោយ Google</strong>ប៉ុណ្ណោះ។ មិនមានការចុះឈ្មោះដោយអ៊ីមែល/លេខសម្ងាត់ទេ។</>,
              <><strong>ជ្រើសរើសតួនាទី</strong> — អ្នកប្រើថ្មីនឹងឃើញអេក្រង់ជ្រើសរើសតួនាទី។ សូមជ្រើសរើសដោយប្រុងប្រយ័ត្ន ព្រោះតួនាទីនេះកំណត់មុខងារដែលអ្នកនឹងឃើញ។</>,
              <><strong>ចាប់ផ្តើមប្រើប្រាស់</strong> — បន្ទាប់មកអ្នកនឹងចូលទៅកាន់ <strong>ផ្ទាំងព័ត៌មាន (Dashboard)</strong> ដែលបង្ហាញប្រតិទិន សកម្មភាពថ្មីៗ និងសកម្មភាពរហ័ស។</>,
            ]} />
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-start gap-3">
              <Smartphone size={18} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                <strong>ដំឡើងជាកម្មវិធីទូរស័ព្ទ (PWA):</strong> PITHI អាចដំឡើងលើទូរស័ព្ទ ឬកុំព្យូទ័របាន។
                នៅពេលបើកគេហទំព័រ សូមចុច <em>"Add to Home screen"</em> ឬប៊ូតុងដំឡើងដែលលេចឡើង។
              </p>
            </div>
            <Note tone="rose" title="តួនាទីមិនអាចប្តូរដោយខ្លួនឯងបានទេ">
              <p>បន្ទាប់ពីជ្រើសរើសរួច អ្នកមិនអាចប្តូរតួនាទីដោយខ្លួនឯងបានទេ។ បើជ្រើសរើសខុស សូមទាក់ទងអ្នកគ្រប់គ្រង (Admin)។</p>
            </Note>
          </Section>

          <Section id="roles" no="៣" title="តួនាទីនានា" en="Roles" icon={Users}>
            <p>PITHI មានតួនាទីសរុប <strong>៧</strong>។ ប្រាំមួយអាចជ្រើសរើសបាននៅពេលចុះឈ្មោះ ហើយ <strong>Admin</strong> ត្រូវបានកំណត់ដោយប្រព័ន្ធ។</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ['អ្នកប្រើប្រាស់ទូទៅ (ម្ចាស់កម្មវិធី)', 'text-rose-600', 'បង្កើតកម្មវិធីផ្ទាល់ខ្លួន គ្រប់គ្រងភ្ញៀវ ថវិកា និងកក់សេវាកម្ម។'],
                ['អ្នករៀបចំកម្មវិធី (Organizer)', 'text-blue-600', 'អ្នកអាជីពដែលរៀបចំកម្មវិធីជូនអតិថិជន និងអាចលក់សេវាកម្មរៀបចំក្នុងទីផ្សារ។'],
                ['ចុងភៅ / ម្ហូបអាហារ (Chef)', 'text-amber-600', 'ផ្តល់សេវាកម្មម្ហូបអាហារ និងទទួលការកក់។'],
                ['ទីតាំង / សាល (Hall)', 'text-emerald-600', 'ម្ចាស់សាលពិធី ឬទីតាំងរៀបចំកម្មវិធី។'],
                ['ក្រុមតន្ត្រី (Music Band)', 'text-purple-600', 'ក្រុមតន្ត្រី និងសិល្បករ។'],
                ['សម្អាងការ (Beauty Salon)', 'text-pink-600', 'សេវាកម្មតុបតែងមុខ សក់ និងសម្លៀកបំពាក់។'],
                ['អ្នកគ្រប់គ្រង (Admin)', 'text-slate-800', 'គ្រប់គ្រងប្រព័ន្ធ អ្នកប្រើប្រាស់ និងស្ថិតិទាំងមូល។'],
              ].map(([name, color, desc]) => (
                <div key={name} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className={`font-bold block ${color}`}>{name}</span>
                  <span className="text-sm text-slate-500">{desc}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-500">
              ម៉ឺនុយនៅខាងឆ្វេង (ឬខាងក្រោមលើទូរស័ព្ទ) ផ្លាស់ប្តូរតាមតួនាទីរបស់អ្នក ដូច្នេះអ្នកឃើញតែអ្វីដែលពាក់ព័ន្ធ។
            </p>
          </Section>

          <Section id="ceremony" no="៤" title="ការបង្កើត និងគ្រប់គ្រងកម្មវិធី" en="Ceremonies" icon={Calendar}>
            <p>ម្ចាស់កម្មវិធីប្រើ <strong>"កម្មវិធីរបស់ខ្ញុំ"</strong> ហើយអ្នករៀបចំប្រើ <strong>"គ្រប់គ្រងកម្មវិធី"</strong>។</p>
            <Steps items={[
              <>ចុច <strong>"បង្កើតកម្មវិធីថ្មី"</strong> រួចបំពេញឈ្មោះ ប្រភេទ កាលបរិច្ឆេទ ទីតាំង និងថវិកាព្យាករណ៍។</>,
              <>បន្ថែម <strong>តំណ Google Maps</strong> ដើម្បីឱ្យភ្ញៀវរកទីតាំងបានងាយស្រួល។</>,
              <>ប្រើ <strong>AI</strong> ដើម្បីបង្កើតរូបភាព Banner និងសាររៀបរាប់សម្រាប់លិខិតអញ្ជើញ។</>,
              <>បើកផ្ទាំង <strong>"ផែនការ"</strong> ដើម្បីឱ្យ AI បង្កើតជំហានរៀបចំពិធីតាមប្រពៃណីខ្មែរ។</>,
              <>អ្នករៀបចំអាចភ្ជាប់កម្មវិធីទៅ <strong>ម្ចាស់កម្មវិធី</strong> មួយ ដើម្បីឱ្យគាត់មើលឃើញផងដែរ។</>,
            ]} />
          </Section>

          <Section id="guests" no="៥" title="ភ្ញៀវ លិខិតអញ្ជើញ និងការឆែកចូល" en="Guests, invitations & check-in" icon={Mail}>
            <Steps items={[
              <><strong>បញ្ចូលបញ្ជីភ្ញៀវ</strong> — បន្ថែមម្នាក់ៗ ឬស្កេន <strong>នាមប័ណ្ណ (business card)</strong> ដើម្បីឱ្យ AI អានឈ្មោះ និងលេខទូរស័ព្ទ។</>,
              <><strong>បង្កើតលិខិតអញ្ជើញ</strong> — កែសាររៀបរាប់ និងរូបភាព រួចចែករំលែកតំណទៅភ្ញៀវ។</>,
              <><strong>ភ្ញៀវឆ្លើយតប (RSVP)</strong> — ភ្ញៀវចុចចូលរួម ឬបដិសេធ។ អ្នកនឹងទទួលការជូនដំណឹងភ្លាមៗ។</>,
              <><strong>ឆែកចូលដោយ QR</strong> — ភ្ញៀវដែលទទួលយកនឹងទទួលបាន <strong>QR ប័ណ្ណចូល</strong> នៅលើលិខិតអញ្ជើញ។ នៅថ្ងៃពិធី សូមស្កេន QR នៅច្រកចូល។</>,
            ]} />
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-start gap-3">
              <QrCode size={18} className="text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                កម្មវិធីស្កេនប្រើកាមេរ៉ា ហើយបើកាមេរ៉ាមានបញ្ហា អ្នកអាចបញ្ចូលដោយដៃបាន។ ចំនួនភ្ញៀវដែលចូលរួមរួចនឹងបង្ហាញផ្ទាល់។
              </p>
            </div>
          </Section>

          <Section id="budget" no="៦" title="ថវិកា និងចំណងដៃ" en="Budget & gifts" icon={Wallet}>
            <p>ផ្ទាំង <strong>"ថវិកា"</strong> ជួយតាមដានចំណូល ចំណាយ និងចំណងដៃ។</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>ចំណូល / ចំណាយ:</strong> កត់ត្រារាល់ប្រតិបត្តិការ ហើយប្រព័ន្ធប្រៀបធៀបនឹងថវិកាព្យាករណ៍ និងព្រមានពេលចំណាយលើស។</li>
              <li><strong>កំណត់ចំណងដៃ:</strong> បញ្ជីចំណងដៃបែបប្រពៃណី អាចបោះពុម្ព ឬនាំចេញជា <strong>CSV</strong>។</li>
            </ul>
            <p className="font-semibold text-slate-700 pt-1">ការជូនចំណងដៃតាមធនាគារ (KHQR)៖</p>
            <Steps items={[
              <>ភ្ញៀវចុច <strong>"ជូនចំណងដៃ"</strong> នៅលើលិខិតអញ្ជើញ ដើម្បីមើល <strong>KHQR</strong> របស់ម្ចាស់កម្មវិធី។</>,
              <>បន្ទាប់ពីផ្ទេររួច ភ្ញៀវបញ្ចូល <strong>រូបភាពវិក្កយបត្រ</strong>។</>,
              <><strong>AI ស្កេន</strong> អានចំនួនទឹកប្រាក់ រូបិយប័ណ្ណ ឈ្មោះអ្នកផ្ញើ និងកាលបរិច្ឆេទដោយស្វ័យប្រវត្តិ។</>,
              <>ម្ចាស់កម្មវិធីទទួលការជូនដំណឹង រួចចុច <strong>"បញ្ជាក់"</strong> ដើម្បីបញ្ចូលទៅក្នុងបញ្ជីថវិកា (KHR បម្លែងទៅ USD)។</>,
            ]} />
          </Section>

          <Section id="market" no="៧" title="ទីផ្សារ និងការកក់សេវាកម្ម" en="Marketplace & bookings" icon={Search}>
            <Steps items={[
              <>បើក <strong>"ទីផ្សារសេវាកម្ម"</strong> រួចស្វែងរក ឬច្រោះតាមតម្លៃ និងប្រភេទទីតាំង។</>,
              <>ជ្រើសរើសសេវាកម្ម ពិនិត្យ <strong>ការវាយតម្លៃ (★)</strong> និង <strong>ប្រតិទិនទំនេរ</strong> របស់អ្នកផ្តល់សេវា។</>,
              <>ចុច <strong>"កក់"</strong> ជ្រើសកម្មវិធី កាលបរិច្ឆេទ ម៉ោង និង <strong>បរិមាណ</strong> (ឧ. ៣០ តុ × $២០០)។</>,
              <>ការកក់ចាប់ផ្តើមជា <strong>"រង់ចាំ"</strong> រហូតដល់អ្នកផ្តល់សេវាចុច <strong>"បញ្ជាក់"</strong>។</>,
              <>ក្នុងទំព័រការកក់ មាន <strong>ការជជែក</strong> (អាចផ្ញើរូបភាព និងសារជាសំឡេង) និង <strong>កំណត់ហេតុសកម្មភាព</strong>។</>,
              <>បន្ទាប់ពីកម្មវិធីបញ្ចប់ អ្នកអាចផ្តល់ <strong>ការវាយតម្លៃ និងមតិយោបល់</strong>។</>,
            ]} />
            <Note tone="blue" title="ការការពារការកក់ជាន់គ្នា">
              <p>ប្រព័ន្ធនឹង <strong>បដិសេធ</strong> ការបញ្ជាក់ការកក់ពីរដែលម៉ោងជាន់គ្នាសម្រាប់សេវាកម្មតែមួយក្នុងថ្ងៃតែមួយ។ ការស្នើសុំ (រង់ចាំ) អាចជាន់គ្នាបាន ដើម្បីឱ្យអ្នកផ្តល់សេវាជ្រើសរើស។</p>
            </Note>
          </Section>

          <Section id="vendor" no="៨" title="សម្រាប់អ្នកផ្តល់សេវាកម្ម" en="For vendors" icon={Briefcase}>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>បង្កើតសេវាកម្ម:</strong> បញ្ចូលឈ្មោះ តម្លៃ ឯកតា (ឧ. ក្នុងមួយតុ) ទីតាំង និងរូបភាព។ AI អាចជួយសរសេរការពិពណ៌នា និងបង្កើតរូបភាព។</li>
              <li><strong>QR ប្រាក់កក់:</strong> អ្នកអាចបញ្ចូល QR ទូទាត់ និងកំណត់ភាគរយប្រាក់កក់។</li>
              <li><strong>គ្រប់គ្រងការកក់:</strong> ប្តូរស្ថានភាពពី <em>រង់ចាំ → បញ្ជាក់ → បញ្ចប់</em> ដើម្បីឱ្យអតិថិជនដឹងច្បាស់។</li>
              <li><strong>កាលវិភាគ:</strong> ពិនិត្យប្រតិទិនការងារ ដើម្បីជៀសវាងការកក់ជាន់គ្នា។</li>
              <li><strong>ការវាយតម្លៃ:</strong> ពិន្ទុផ្កាយពីអតិថិជនបង្ហាញនៅលើសេវាកម្មរបស់អ្នកក្នុងទីផ្សារ។</li>
            </ul>
          </Section>

          <Section id="inbox" no="៩" title="ការទំនាក់ទំនង" en="Messages, notifications & announcements" icon={MessagesSquare}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-800 flex items-center gap-2 mb-1.5"><MessagesSquare size={16} className="text-rose-600" /> សារផ្ទាល់</p>
                <p className="text-sm">ជជែកផ្ទាល់រវាង ម្ចាស់កម្មវិធី ⇄ អ្នករៀបចំ ⇄ អ្នកផ្តល់សេវា។ សារថ្មីបង្ហាញភ្លាមៗ ហើយមានលេខរាប់សារមិនទាន់អាន។</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-800 flex items-center gap-2 mb-1.5"><Bell size={16} className="text-rose-600" /> ការជូនដំណឹង</p>
                <p className="text-sm">ប្រអប់ជូនដំណឹងផ្ទាល់ខ្លួន សម្រាប់ការកក់ថ្មី ការប្តូរស្ថានភាព មតិយោបល់ RSVP ការវាយតម្លៃ និងការរាយការណ៍ចំណងដៃ។</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-800 flex items-center gap-2 mb-1.5"><Megaphone size={16} className="text-rose-600" /> សេចក្តីជូនដំណឹង</p>
                <p className="text-sm">ផ្ញើសារជាក្រុមតែម្តង — ដល់ <strong>ភ្ញៀវទាំងអស់</strong> នៃកម្មវិធីមួយ ឬដល់ <strong>អតិថិជនរបស់អ្នក</strong>។ ស័ក្តិសមសម្រាប់ការប្តូរម៉ោង ឬទីតាំង។</p>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              ផ្ទាំង <strong>"ផ្សាយសេចក្តីជូនដំណឹង"</strong> មាននៅក្នុងទំព័រគ្រប់គ្រងកម្មវិធី កម្មវិធីរបស់ខ្ញុំ និងសេវាកម្ម។
              អ្នកទទួលនឹងឃើញវាក្នុងប្រអប់ជូនដំណឹងរបស់ពួកគេ ហើយអ្នកអាចលុបសេចក្តីជូនដំណឹងចាស់បាន។
            </p>
          </Section>

          <Section id="community" no="១០" title="សហគមន៍" en="Community feed" icon={MessageSquare}>
            <p>ទំព័រ <strong>"សហគមន៍"</strong> ជាកន្លែងចែករំលែកបទពិសោធន៍ និងសួរសំណួរ។</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>ការត្រួតពិនិត្យដោយ AI:</strong> អត្ថបទត្រូវពិនិត្យដោយ AI មុនបង្ហោះ។ ខ្លឹមសារស្ប៉ាម ឬពាក្យអសុរស នឹងមិនត្រូវអនុញ្ញាតទេ។</li>
              <li><strong>ប្រតិកម្ម:</strong> អ្នកអាចចុច <em>ចូលចិត្ត</em> · <em>មានប្រយោជន៍</em> · <em>មិនពិត</em> — មួយប្រតិកម្មក្នុងមួយអត្ថបទ។</li>
              <li><strong>មតិយោបល់:</strong> ការបញ្ចេញមតិនឹងបើកនៅពេលអត្ថបទទទួលបាន <strong>"មានប្រយោជន៍" លើសពី ១០០</strong> ដង។</li>
              <li><strong>រក្សាទុក:</strong> ចុច Bookmark ដើម្បីរក្សាទុកអត្ថបទសម្រាប់អានពេលក្រោយ។</li>
            </ul>
          </Section>

          <Section id="ai" no="១១" title="ជំនួយការ AI" en="AI assistant" icon={Sparkles}>
            <p>ចុចប៊ូតុង <strong>ផ្កាយ (✨)</strong> នៅផ្ទាំងព័ត៌មាន ដើម្បីជជែកជាភាសាខ្មែរ។ ជំនួយការដឹងអំពីកម្មវិធី ការកក់ និងថវិការបស់អ្នក។</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>បង្កើតកម្មវិធី និងកក់សេវាកម្ម</strong> តាមរយៈការសន្ទនា (ឧ. "បង្កើតមង្គលការថ្ងៃ ១៨ ធ្នូ")។</li>
              <li><strong>ផែនការពិធី និងសារអញ្ជើញ</strong> — សំឡេងសរសេរផ្លាស់ប្តូរតាមប្រភេទពិធី (រីករាយសម្រាប់មង្គលការ សុភាពរាបសាសម្រាប់បុណ្យសព)។</li>
              <li><strong>បង្កើតរូបភាព</strong> Banner កម្មវិធី និងរូបភាពសេវាកម្ម។</li>
              <li><strong>ស្កេនឯកសារ</strong> — វិក្កយបត្រធនាគារ និងនាមប័ណ្ណ។</li>
              <li><strong>ផ្ញើរូបភាព ឬសារជាសំឡេង</strong> ទៅជំនួយការដោយផ្ទាល់។</li>
            </ul>
          </Section>

          <Section id="security" no="១២" title="សុវត្ថិភាព និងឯកជនភាព" en="Security & privacy" icon={ShieldAlert}>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>ការការពារទិន្នន័យ:</strong> ទិន្នន័យត្រូវបានការពារនៅកម្រិតមូលដ្ឋានទិន្នន័យ (Row-Level Security) ដូច្នេះអ្នកឃើញតែទិន្នន័យដែលអ្នកមានសិទ្ធិ។</li>
              <li><strong>តួនាទី:</strong> គ្មានអ្នកប្រើប្រាស់ណាអាចតម្លើងខ្លួនឯងជា Admin បានទេ។</li>
              <li><strong>ការពារស្ប៉ាម:</strong> ភ្ញៀវដែលមិនមានគណនីត្រូវឆ្លើយសំណួរគណិតវិទ្យាងាយៗ និងមានការកំណត់ល្បឿនមុនពេល RSVP។</li>
              <li><strong>ការចូលគណនី:</strong> ប្រើ Google Sign-In ដូច្នេះ PITHI មិនរក្សាទុកលេខសម្ងាត់របស់អ្នកទេ។</li>
            </ul>
          </Section>

          <Section id="cleanup" no="១៣" title="ការសម្អាតទិន្នន័យស្វ័យប្រវត្តិ" en="Automatic data cleanup" icon={Database}>
            <p className="text-sm">ដើម្បីការពារឯកជនភាព និងកាត់បន្ថយទំហំផ្ទុក ប្រព័ន្ធលុបទិន្នន័យចាស់ដូចខាងក្រោម៖</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                <h4 className="font-bold text-rose-800 mb-1.5">៩០ ថ្ងៃ · 90 days</h4>
                <p className="text-xs text-rose-700">រូបភាពវិក្កយបត្រធនាគារ និងកំណត់ត្រារាយការណ៍ចំណងដៃ ត្រូវលុបជាអចិន្ត្រៃយ៍។</p>
              </div>
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-1.5">៦០ ថ្ងៃ · 60 days</h4>
                <p className="text-xs text-slate-600">ការកក់ដែលបាន "បោះបង់ (Cancelled)" ត្រូវលុបចេញពីប្រព័ន្ធ។</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              អត្ថបទក្នុងសហគមន៍ក៏ត្រូវលុបផងដែរ ប្រសិនបើត្រូវបានរាយការណ៍ថា "មិនពិត" ច្រើនពេក
              ឬចាស់ជាងមួយឆ្នាំ ហើយគ្មានអ្នកចាប់អារម្មណ៍។
            </p>
          </Section>

          <Section id="license" no="១៤" title="អាជ្ញាប័ណ្ណ និងការទទួលស្គាល់" en="License & credits" icon={Scale}>
            <p>
              PITHI ជាកម្មវិធី <strong>ប្រភពបើកចំហ (Open Source)</strong> ក្រោមអាជ្ញាប័ណ្ណ <strong>Apache License 2.0</strong>។
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>បណ្តុះបណ្តាលដោយ:</strong> CamboVerse Center នៅសាកលវិទ្យាល័យជាតិគ្រប់គ្រង (NUM)។</li>
              <li><strong>ដៃគូបច្ចេកវិទ្យា:</strong> E-KHMER Technology Co., Ltd.</li>
              <li><strong>ឥតគិតថ្លៃ:</strong> យើងមិនគិតថ្លៃពីអ្នកប្រើប្រាស់ទេ។</li>
            </ul>
            <button
              onClick={() => navigate('/about')}
              className="text-sm font-bold text-rose-600 hover:text-rose-700 underline"
            >
              មើលក្រុមការងារ និងដៃគូទាំងអស់ →
            </button>
          </Section>
        </div>

        {/* Support Footer */}
        <div className="mt-10 p-8 bg-white rounded-[2.5rem] border border-slate-100 text-center shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-2 font-serif">តើអ្នកមានសំណួរផ្សេងទៀត?</h3>
          <p className="text-slate-500 text-sm mb-6">ក្រុមការងារយើងខ្ញុំរីករាយនឹងជួយអ្នកជានិច្ច តាមរយៈប៉ុស្តិ៍ខាងក្រោម៖</p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="https://t.me/+7yovMjlQzw04OWI1" target="_blank" rel="noopener noreferrer" className="px-8 py-3 bg-[#24A1DE] text-white rounded-full text-sm font-bold hover:bg-[#1f87ba] transition-all flex items-center gap-2 shadow-lg shadow-blue-100">
              <Send size={18} className="-rotate-12" /> Telegram Support Group
            </a>
            <a href="mailto:pithi.deva@gmail.com" className="px-6 py-3 bg-slate-100 text-slate-700 rounded-full text-sm font-bold hover:bg-slate-200 transition-all flex items-center gap-2">
              <Mail size={16} /> ផ្ញើអ៊ីមែល
            </a>
            <button onClick={() => navigate('/community')} className="px-6 py-3 bg-rose-600 text-white rounded-full text-sm font-bold hover:bg-rose-700 transition-all shadow-md shadow-rose-200">
              សួរក្នុងសហគមន៍
            </button>
            <button onClick={() => navigate('/about')} className="px-6 py-3 bg-slate-900 text-white rounded-full text-sm font-bold hover:bg-slate-800 transition-all">
              អំពីយើង
            </button>
          </div>
        </div>

        <div className="py-10 text-center text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em]">
          PITHI Platform • Document Version 2.0
        </div>
      </div>
    </div>
  );
};

export default UserGuide;
