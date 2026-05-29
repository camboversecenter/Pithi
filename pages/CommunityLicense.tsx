
import React from 'react';
import { ArrowLeft, Heart, Users, AlertTriangle, Lock, FileCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/UIComponents';

const LicensePoint = ({ icon: Icon, title, children }: { icon: any, title: string, children?: React.ReactNode }) => (
    <div className="flex items-start gap-4 p-4 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-shadow">
        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl flex-shrink-0">
            <Icon size={24} />
        </div>
        <div>
            <h3 className="font-bold text-slate-800 text-lg mb-2 font-serif">{title}</h3>
            <div className="text-slate-600 text-sm leading-relaxed font-sans whitespace-pre-line">
                {children}
            </div>
        </div>
    </div>
);

const CommunityLicense = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        
        <div className="mb-8">
             <Button variant="secondary" onClick={() => navigate('/login')} className="mb-6">
                <ArrowLeft size={20} className="mr-2"/> ត្រឡប់ក្រោយ
            </Button>
            
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center p-4 bg-white rounded-full shadow-sm mb-4">
                    <Users size={48} className="text-rose-600" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold font-serif text-slate-900 mb-3">អាជ្ញាប័ណ្ណសហគមន៍</h1>
                <p className="text-lg text-rose-600 font-medium">Community License</p>
                <div className="mt-4 inline-block bg-amber-50 text-amber-800 px-4 py-2 rounded-lg border border-amber-100 text-sm font-bold">
                    ស្ថានភាព៖ ដំណាក់កាលអភិវឌ្ឍន៍
                </div>
            </div>
        </div>

        <div className="space-y-4">
            <LicensePoint icon={Heart} title="១. សិទ្ធិប្រើប្រាស់ និងការគាំទ្រ">
                កម្មវិធីនេះអនុញ្ញាតឱ្យប្រើប្រាស់ដោយ <strong>ឥតគិតថ្លៃ</strong>។ ដើម្បីផ្គត់ផ្គង់ការចំណាយលើប្រតិបត្តិការ និងការអភិវឌ្ឍ ក្រុមហ៊ុន E-KHMER Technology Co., Ltd. ស្វាគមន៍រាល់ការបរិច្ចាគ និងរក្សាសិទ្ធិក្នុងការរកប្រាក់ចំណូលតាមរយៈការផ្សព្វផ្សាយពាណិជ្ជកម្ម ឬសេវាកម្មផ្សេងៗ។
            </LicensePoint>

            <LicensePoint icon={Lock} title="២. កម្មសិទ្ធិបច្ចុប្បន្ន">
                បច្ចុប្បន្ននេះ កម្មវិធីនិងកូដត្រូវបានអភិវឌ្ឍនិងថែរក្សាដោយក្រុមហ៊ុន E-KHMER Technology Co., Ltd.។ ដើម្បីធានាសុវត្ថិភាពមុនពេលលក់ Token កូដត្រូវបានរក្សាទុកជាឯកជន។ ហាមដាច់ខាតការចម្លង ឬបំបែកកូដដោយគ្មានការអនុញ្ញាត។
            </LicensePoint>

            <LicensePoint icon={FileCode} title="៣. ការសន្យាអនាគត & Token Sale">
                នេះជាកិច្ចសន្យារបស់យើង៖ នៅពេលការលក់ Token បានបញ្ចប់ជាស្ថាពរ ក្រុមហ៊ុននឹងដាក់ឱ្យប្រើប្រាស់កូដជាសាធារណៈក្រោមអាជ្ញាប័ណ្ណ Apache License 2.0។ នៅពេលនោះ ការសម្រេចចិត្តនឹងត្រូវធ្វើឡើងតាមរយៈសហគមន៍។
            </LicensePoint>

            <LicensePoint icon={AlertTriangle} title="៤. ការបដិសេធការទទួលខុសត្រូវ">
                កម្មវិធីនេះត្រូវបានផ្តល់ជូន "ដូចដែលបានមាន" ដោយគ្មានការធានាណាមួយឡើយ។ ក្រុមហ៊ុន E-KHMER Technology Co., Ltd. មិនទទួលខុសត្រូវចំពោះការបាត់បង់ទិន្នន័យ ឬទ្រព្យសម្បត្តិណាមួយដែលកើតឡើងពីការប្រើប្រាស់កម្មវិធីនេះឡើយ។ អ្នកប្រើប្រាស់ត្រូវទទួលខុសត្រូវដោយខ្លួនឯង។
            </LicensePoint>
        </div>

        <div className="mt-12 text-center text-slate-400 text-sm">
            <p>Released under Community License.</p>
        </div>

      </div>
    </div>
  );
};

export default CommunityLicense;
