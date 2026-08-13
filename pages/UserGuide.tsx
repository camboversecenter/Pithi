
import React from 'react';
import { ArrowLeft, BookOpen, User, ShoppingBag, AlertTriangle, Database, MessageSquare, Sparkles, QrCode, ShieldAlert, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/UIComponents';

const Section = ({ title, icon: Icon, children }: { title: string, icon: any, children?: React.ReactNode }) => (
  <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-8">
      <div className="flex items-center gap-3 mb-4 border-b border-slate-50 pb-3">
          <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <Icon size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 font-serif">{title}</h2>
      </div>
      <div className="text-slate-600 space-y-4 leading-relaxed text-sm md:text-base font-normal">
          {children}
      </div>
  </section>
);

const UserGuide = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
             <Button variant="secondary" onClick={() => navigate(-1)} className="rounded-full w-12 h-12 p-0 flex items-center justify-center">
                <ArrowLeft size={24} />
            </Button>
            <div>
                <h1 className="text-3xl font-bold font-serif text-slate-900">សៀវភៅណែនាំការប្រើប្រាស់</h1>
                <p className="text-slate-500">PITHI Comprehensive User Manual (Khmer)</p>
            </div>
        </div>

        <div className="space-y-6">
            <Section title="១. សេចក្តីផ្តើម និងការសាកល្បង" icon={BookOpen}>
                <p>
                    <strong>PITHI (ពិធី)</strong> គឺជាប្រព័ន្ធគ្រប់គ្រងកម្មវិធីបុណ្យបែបទំនើប ដែលប្រើប្រាស់បច្ចេកវិទ្យា <strong>Generative AI</strong> ដើម្បីជួយសម្រួលដល់ការរៀបចំកម្មវិធីគ្រប់ប្រភេទ។ 
                </p>
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                    <p className="text-amber-800 font-bold flex items-center gap-2">
                        <AlertTriangle size={18}/> ចំណាំសម្រាប់ការសាកល្បង (Public Testing)
                    </p>
                    <p className="text-amber-700 text-sm mt-1">
                        បច្ចុប្បន្នប្រព័ន្ធស្ថិតក្នុងដំណាក់កាលសាកល្បងសាធារណៈ។ រាល់ទិន្នន័យដែលអ្នកបានបញ្ចូលនឹងត្រូវបាន <strong>Reset (លុបចោល)</strong> នៅដើមខែក្រោយ។ សូមកុំបញ្ចូលព័ត៌មានសម្ងាត់បំផុត។
                    </p>
                </div>
            </Section>

            <Section title="២. ការជ្រើសរើសតួនាទី" icon={User}>
                <p>រាល់អ្នកប្រើប្រាស់ដែលចូលតាមរយៈ Google ជាលើកដំបូង ត្រូវជ្រើសរើសតួនាទីមួយក្នុងចំណោមតួនាទីទាំង ៦៖</p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <li className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="font-bold text-rose-600 block">អ្នកប្រើប្រាស់ទូទៅ:</span> ម្ចាស់កម្មវិធីដែលចង់កក់សេវាកម្ម និងគ្រប់គ្រងភ្ញៀវ Tune ក្នុងកម្មវិធី។
                    </li>
                    <li className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="font-bold text-blue-600 block">អ្នករៀបចំកម្មវិធី (Organizer):</span> អ្នកអាជីពដែលទទួលរៀបចំកម្មវិធីឱ្យអ្នកដទៃ។
                    </li>
                    <li className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="font-bold text-amber-600 block">អ្នកផ្តល់សេវា (Vendors):</span> ចុងភៅ, ក្រុមតន្ត្រី, សម្អាងការ, ឬ ម្ចាស់ទីតាំង។
                    </li>
                </ul>
            </Section>

            <Section title="៣. សហគមន៍ និងការបញ្ចេញមតិ" icon={MessageSquare}>
                <p>ទំព័រ <strong>"សហគមន៍"</strong> គឺជាកន្លែងសម្រាប់ចែករំលែកបទពិសោធន៍។ ដើម្បីរក្សានូវគុណភាពនៃខ្លឹមសារ យើងបានកំណត់ច្បាប់ដូចខាងក្រោម៖</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>ការត្រួតពិនិត្យដោយ AI:</strong> រាល់អត្ថបទដែលអ្នកបង្ហោះ នឹងត្រូវបានពិនិត្យដោយ AI ជាមុន។ ប្រសិនបើមានពាក្យអសុរស ឬស្ប៉ាម AI នឹងមិនអនុញ្ញាតឱ្យបង្ហោះឡើយ។</li>
                    <li><strong>លក្ខខណ្ឌបើកមតិយោបល់:</strong> មុខងារបញ្ចេញមតិ (Comments) នឹងត្រូវ <strong>ចាក់សោ</strong> ជាបណ្តោះអាសន្ន។ វានឹងបើកឱ្យប្រើប្រាស់បាន លុះត្រាតែអត្ថបទនោះទទួលបានការចុច <strong>"មានប្រយោជន៍ (Useful)"</strong> ចំនួន <strong>១០០</strong> ដងពីអ្នកដទៃ។</li>
                    <li><strong>ការរក្សាទុក:</strong> អ្នកអាចចុច Bookmark ដើម្បីរក្សាទុកអត្ថបទល្អៗសម្រាប់មើលនៅពេលក្រោយ។</li>
                </ul>
            </Section>

            <Section title="៤. ជំនួយការ AI (PITHI AI)" icon={Sparkles}>
                <p>អ្នកអាចប្រើប្រាស់ប៊ូតុង "ផ្កាយ" នៅផ្នែកខាងលើនៃអេក្រង់ ដើម្បីជជែកជាមួយ AI ជំនួយការ៖</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>រៀបចំផែនការ:</strong> សុំឱ្យ AI បង្កើតតារាងសកម្មភាពសម្រាប់មង្គលការ ឬបុណ្យផ្សេងៗ។</li>
                    <li><strong>កក់សេវាកម្ម:</strong> អ្នកអាចនិយាយថា "ជួយកក់ចុងភៅឱ្យខ្ញុំនៅថ្ងៃទី ២០" AI នឹងព្យាយាមស្វែងរក និងបង្កើតការកក់ជូន។</li>
                    <li><strong>ការបង្កើតរូបភាព:</strong> នៅក្នុងទំព័រគ្រប់គ្រង អ្នកអាចប្រើ AI ដើម្បីបង្កើតរូបភាព Banner កម្មវិធី ឬ រូបភាពសេវាកម្មរបស់អ្នកបានយ៉ាងស្រស់ស្អាត។</li>
                </ul>
            </Section>

            <Section title="៥. ការផ្ទេរប្រាក់ និងការរាយការណ៍ (Gifts)" icon={QrCode}>
                <p>សម្រាប់ភ្ញៀវដែលចង់ជូនចំណងដៃតាមរយៈធនាគារ៖</p>
                <ol className="list-decimal pl-5 space-y-2">
                    <li><strong>ស្កេន QR:</strong> នៅក្នុងលិខិតអញ្ជើញ ចុចលើ "ជូនកាដូ / ចំណងដៃ" ដើម្បីមើល KHQR របស់ម្ចាស់កម្មវិធី។</li>
                    <li><strong>បញ្ចូលវិក្កយបត្រ:</strong> បន្ទាប់ពីផ្ទេររួច សូមថតរូប ឬបញ្ចូលរូបភាពវិក្កយបត្រ (Receipt)។</li>
                    <li><strong>ការអានដោយ AI:</strong> ប្រព័ន្ធនឹងប្រើ AI ដើម្បី <strong>Scan</strong> អានចំនួនទឹកប្រាក់ ឈ្មោះអ្នកផ្ញើ និងកាលបរិច្ឆេទដោយស្វ័យប្រវត្តិចេញពីវិក្កយបត្រ។</li>
                    <li><strong>ការបញ្ជាក់:</strong> ម្ចាស់កម្មវិធីនឹងទទួលបានការរាយការណ៍នេះ ហើយអាចចុច "ទទួល" ដើម្បីបញ្ជូលទៅក្នុងបញ្ជីថវិកា។</li>
                </ol>
            </Section>

            <Section title="៦. ការគ្រប់គ្រងសេវាកម្ម និងការកក់" icon={ShoppingBag}>
                <p>សម្រាប់អ្នកផ្តល់សេវា និងអ្នករៀបចំ៖</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>កាលវិភាគ:</strong> ពិនិត្យមើលកាលវិភាគការងារក្នុងប្រតិទិន ដើម្បីជៀសវាងការកក់ជាន់គ្នា។</li>
                    <li><strong>ការពិភាក្សា:</strong> ក្នុងរាល់ការកក់នីមួយៗ មានមុខងារ "ជជែកពិភាក្សា" ដើម្បីឱ្យម្ចាស់កម្មវិធី និងអ្នកផ្តល់សេវាអាចសាកសួរព័ត៌មានបន្ថែម។</li>
                    <li><strong>ស្ថានភាពការកក់:</strong> ត្រូវតែប្តូរស្ថានភាពពី "រង់ចាំ" ទៅជា "បានបញ្ជាក់" ដើម្បីឱ្យអតិថិជនដឹងថាអ្នកទទួលយកការងារនោះ។</li>
                </ul>
            </Section>

            <Section title="៧. សុវត្ថិភាព និងការការពារស្ប៉ាម" icon={ShieldAlert}>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Captcha:</strong> ភ្ញៀវដែលមិនមានគណនី ត្រូវឆ្លើយសំណួរគណិតវិទ្យាងាយៗមុននឹងអាចចុច RSVP ចូលរួមកម្មវិធី។</li>
                    <li><strong>Rate Limit:</strong> អ្នកមិនអាចចុចបញ្ជូនទិន្នន័យដដែលៗច្រើនដងក្នុងរយៈពេលខ្លីបានទេ។</li>
                    <li><strong>អាជ្ញាប័ណ្ណ:</strong> កូដ និងបច្ចេកវិទ្យាត្រូវបានរក្សាសិទ្ធិដោយក្រុមហ៊ុន E-KHMER Technology។</li>
                </ul>
            </Section>

            <Section title="៨. ការសម្អាតទិន្នន័យតាមកាលកំណត់" icon={Database}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                        <h4 className="font-bold text-rose-800 mb-2">៩០ ថ្ងៃ (90 Days)</h4>
                        <p className="text-xs text-rose-600">រាល់រូបភាពវិក្កយបត្រធនាគារ នឹងត្រូវបានលុបចេញជាអចិន្ត្រៃយ៍ ដើម្បីការពារឯកជនភាព និងកាត់បន្ថយទំហំផ្ទុក។</p>
                    </div>
                    <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                        <h4 className="font-bold text-slate-800 mb-2">៦០ ថ្ងៃ (60 Days)</h4>
                        <p className="text-xs text-slate-600">រាល់ប្រវត្តិការកក់ដែលត្រូវបាន "បោះបង់" នឹងត្រូវបានលុបចេញពីប្រព័ន្ធ។</p>
                    </div>
                </div>
            </Section>
        </div>

        {/* Support Footer */}
        <div className="mt-12 p-8 bg-white rounded-[2.5rem] border border-slate-100 text-center shadow-sm">
            <h3 className="text-xl font-bold text-slate-800 mb-2 font-serif">តើអ្នកមានសំណួរផ្សេងទៀត?</h3>
            <p className="text-slate-500 text-sm mb-6">ក្រុមការងារយើងខ្ញុំរីករាយនឹងជួយអ្នកជានិច្ច តាមរយៈប៉ុស្តិ៍ខាងក្រោម៖</p>
            <div className="flex flex-wrap justify-center gap-4">
                <a href="https://t.me/+7yovMjlQzw04OWI1" target="_blank" rel="noopener noreferrer" className="px-8 py-3 bg-[#24A1DE] text-white rounded-full text-sm font-bold hover:bg-[#1f87ba] transition-all flex items-center gap-2 shadow-lg shadow-blue-100">
                    <Send size={18} className="-rotate-12" /> Telegram Support Group
                </a>
                <a href="mailto:support@pithi.com" className="px-6 py-3 bg-slate-900 text-white rounded-full text-sm font-bold hover:bg-slate-800 transition-all">ផ្ញើអ៊ីមែល</a>
                <button onClick={() => navigate('/community')} className="px-6 py-3 bg-rose-600 text-white rounded-full text-sm font-bold hover:bg-rose-700 transition-all shadow-md shadow-rose-200">សួរក្នុងសហគមន៍</button>
            </div>
        </div>

        <div className="py-10 text-center text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em]">
            PITHI Platform • Document Version 1.0.2
        </div>
      </div>
    </div>
  );
};

export default UserGuide;
