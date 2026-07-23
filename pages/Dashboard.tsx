
import { useState, useEffect, useRef } from 'react';
import { getCurrentUser } from '../services/authService';
import { UserRole, Invitation, GuestStatus, Booking, BookingStatus } from '../types';
import { useNavigate } from 'react-router-dom';
import { CalendarView, Badge, Modal } from '../components/UIComponents';
import { CalendarCheck, List, Sparkles, CheckSquare, ArrowRight, Mail, Briefcase, Wallet, Loader2, Calendar } from 'lucide-react';
import { getMyInvitations, respondToInvitation, getUserCalendarEvents, getBookings, getCeremonies, getRecentActivities } from '../services/dataService';
import { chatWithAI } from '../services/geminiService';
import { useGlobalDialog } from '../contexts/GlobalDialogContext';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const Dashboard = () => {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const { showAlert } = useGlobalDialog();
  
  // State
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<{ id: string; date: string; type: 'OWNED' | 'INVITED'; title: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activities, setActivities] = useState<{id: string, description: string, timestamp: string, isNew: boolean, isExpired?: boolean}[]>([]);
  const [stats, setStats] = useState({ activeCount: 0, clientCount: 0, pendingCount: 0, upcomingBookingCount: 0, income: 0, rating: 5.0 });
  const [vendorBookings, setVendorBookings] = useState<Booking[]>([]);
  
  // AI State
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const vendorRoles = [UserRole.CHEF, UserRole.HALL, UserRole.MUSIC_BAND, UserRole.BEAUTY_SALON];

  useEffect(() => {
      if (user) {
          loadActivities();
          if (user.role === UserRole.GENERAL_USER) {
            loadInvitations();
            loadCalendar();
          } else if (vendorRoles.includes(user.role)) {
            loadVendorBookings();
          } else if (user.role === UserRole.ORGANIZER) {
            loadOrganizerStats();
          }
      }
  }, [user]);

  // AI Scroll Effect
  useEffect(() => {
      if (isAIModalOpen && chatEndRef.current) {
          chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [chatHistory, isAIModalOpen]);

  // AI Logic (Keep functional logic same, just simplified placement)
  const handleOpenAI = () => {
      setIsAIModalOpen(true);
      if (chatHistory.length === 0) {
          setChatHistory([{ role: 'model', text: `សួស្តី ${user?.name}! ខ្ញុំគឺជាជំនួយការ AI របស់អ្នក។ តើអ្នកចង់ឱ្យខ្ញុំជួយអ្វីខ្លះនៅថ្ងៃនេះ?` }]);
      }
  };

  const handleSendAI = async () => {
      if (!aiInput.trim()) return;
      const userMessage = aiInput;
      setAiInput('');
      setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
      setIsAiThinking(true);
      
      const contextData: any = {
          currentUser: { name: user?.name, role: user?.role, email: user?.email },
          currentDate: new Date().toISOString().split('T')[0]
      };
      
      const apiHistory = [...chatHistory, { role: 'user', text: userMessage }].map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));
      const responseText = await chatWithAI(JSON.stringify(contextData), apiHistory);
      setIsAiThinking(false);
      setChatHistory(prev => [...prev, { role: 'model', text: responseText }]);
  };

  // Data Loaders
  const loadActivities = async () => { if (user) setActivities(await getRecentActivities(user.id, user.role)); }
  const loadInvitations = async () => { if (user) setInvitations((await getMyInvitations(user.id, 1, 20)).data); }
  const loadCalendar = async () => { if (user) setCalendarEvents(await getUserCalendarEvents(user.id)); }
  
  const loadOrganizerStats = async () => {
      if (!user) return;
      const upcoming = await getCeremonies(user.id, user.role, 1, 1000, 'UPCOMING');
      const all = await getCeremonies(user.id, user.role, 1, 1000, 'ALL');
      const bookings = await getBookings(user.id, user.role, 1, 1000, 'ALL');
      setStats({
          activeCount: upcoming.total,
          clientCount: all.total, // Simplified logic for demo
          pendingCount: bookings.data.filter(b => b.status === BookingStatus.PENDING).length,
          upcomingBookingCount: 0, income: 0, rating: 0
      });
  };

  const loadVendorBookings = async () => {
      if (!user) return;
      const res = await getBookings(user.id, user.role, 1, 1000, 'ALL');
      setVendorBookings(res.data);
      const today = new Date().toISOString().split('T')[0];
      const income = res.data.filter(b => b.status === BookingStatus.COMPLETED).reduce((sum, b) => sum + b.price, 0);
      setStats({
          activeCount: 0, clientCount: 0, pendingCount: 0,
          upcomingBookingCount: res.data.filter(b => b.date >= today && b.status !== BookingStatus.CANCELLED).length,
          income: income,
          rating: 4.8 // Mock rating
      });
  }

  const handleResponse = async (guestId: string, status: GuestStatus) => {
      try {
          await respondToInvitation(guestId, status);
          loadInvitations();
          loadCalendar();
          await showAlert("ជោគជ័យ", "បានកត់ត្រាការឆ្លើយតបរបស់អ្នកដោយជោគជ័យ។", "success");
      } catch (error: any) {
          await showAlert("បរាជ័យ", error.message || "មិនអាចផ្ញើការឆ្លើយតបបានឡើយ។", "danger");
      }
  }

  if (!user) return null;

  const pendingInvites = invitations.filter(i => i.status === GuestStatus.PENDING);
  const todaysEvents = calendarEvents.filter(e => e.date === selectedDate);

  // Quick Action Component (Clean Square Style)
  const QuickAction = ({ icon: Icon, label, onClick, badge }: any) => (
      <button 
        onClick={onClick} 
        className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-all w-[100px] h-[100px] flex-shrink-0 relative group shadow-sm hover:shadow-md"
      >
          {badge > 0 && (
              <span className="absolute top-2 right-2 w-5 h-5 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {badge}
              </span>
          )}
          <Icon size={24} className="text-slate-600 mb-2 group-hover:text-rose-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-rose-700 text-center leading-tight">{label}</span>
      </button>
  );

  return (
    <div className="space-y-8 pb-10">
        
        {/* --- HEADER --- */}
        <div className="flex justify-between items-end border-b border-slate-200 pb-4">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {new Date().toLocaleDateString('km-KH', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <h1 className="text-3xl font-bold font-serif text-slate-800">
                    សួស្តី, {user.name.split(' ')[0]}
                </h1>
            </div>
            <button 
                onClick={handleOpenAI} 
                className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-lg flex items-center justify-center shadow-lg shadow-rose-200 hover:scale-105 transition-transform"
            >
                <Sparkles size={18} fill="currentColor" />
            </button>
        </div>

        {/* --- HERO STATUS (Celebratory Gradient) --- */}
        {todaysEvents.length > 0 ? (
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 text-white p-6 rounded-2xl shadow-lg shadow-rose-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border border-white/20">ថ្ងៃនេះ</span>
                    </div>
                    <h2 className="text-2xl font-serif font-bold mb-1">{todaysEvents[0].title}</h2>
                    <div className="text-sm text-white/80 flex items-center gap-2 font-medium">
                        <Calendar size={14}/> {new Date().toLocaleDateString('km-KH')}
                    </div>
                </div>
            </div>
        ) : (
            <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">គ្មានកម្មវិធីថ្ងៃនេះទេ។</h2>
                    <p className="text-sm text-slate-500">សម្រាក ឬ រៀបចំផែនការបន្ទាប់។</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-full text-slate-300">
                    <CalendarCheck size={24}/>
                </div>
            </div>
        )}

        {/* --- QUICK ACTIONS --- */}
        <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-3">សកម្មភាពរហ័ស</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {user.role === UserRole.GENERAL_USER && (
                    <QuickAction icon={Wallet} label="កម្មវិធីរបស់ខ្ញុំ" onClick={() => navigate('/owner')} />
                )}
                {user.role === UserRole.ORGANIZER && (
                    <QuickAction icon={Briefcase} label="គ្រប់គ្រង" onClick={() => navigate('/organizer')} />
                )}
                {!vendorRoles.includes(user.role) && (
                    <QuickAction icon={CheckSquare} label="ទីផ្សារ" onClick={() => navigate('/marketplace')} />
                )}
                {vendorRoles.includes(user.role) && (
                    <QuickAction icon={List} label="ការងារ" onClick={() => navigate('/bookings')} badge={stats.upcomingBookingCount} />
                )}
                <QuickAction icon={Mail} label="ការអញ្ជើញ" onClick={() => navigate('/invited')} badge={pendingInvites.length} />
            </div>
        </div>

        {/* --- GRID LAYOUT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left: Feed */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* Pending Invitations */}
                {pendingInvites.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">ការអញ្ជើញ</h3>
                        </div>
                        <div className="space-y-3">
                            {pendingInvites.map(invite => (
                                <div key={invite.id} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600 font-bold text-xl font-serif">
                                            {invite.ceremonyTitle.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm">{invite.ceremonyTitle}</h4>
                                            <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center">
                                                <Calendar size={12} className="mr-1"/> {invite.ceremonyDate}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleResponse(invite.id, GuestStatus.ACCEPTED)} className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-rose-700 transition-colors">
                                        ចូលរួម
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Activity Feed */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">សកម្មភាពថ្មីៗ</h3>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50 shadow-sm">
                        {activities.length > 0 ? (
                            activities.map((act) => (
                                <div key={act.id} className={`p-4 flex gap-4 items-start transition-colors first:rounded-t-xl last:rounded-b-xl ${act.isExpired ? 'bg-slate-50/60 hover:bg-slate-100' : 'hover:bg-slate-50'}`}>
                                    <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${act.isExpired ? 'bg-slate-300' : 'bg-rose-500'}`}></div>
                                    <div className="min-w-0">
                                        <p className={`text-sm font-medium leading-relaxed ${act.isExpired ? 'text-slate-400' : 'text-slate-700'}`}>
                                            {act.description}
                                            {act.isExpired && (
                                                <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wide align-middle">
                                                    ផុតកំណត់
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">{new Date(act.timestamp).toLocaleDateString('km-KH')}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-slate-400 text-sm">មិនទាន់មានសកម្មភាពថ្មីៗទេ។</div>
                        )}
                    </div>
                </section>
            </div>

            {/* Right: Calendar */}
            <div>
                <CalendarView 
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    events={calendarEvents}
                    bookings={vendorBookings}
                />
                <div className="mt-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">កាលវិភាគ • {new Date(selectedDate).toLocaleDateString('km-KH')}</h3>
                    {(todaysEvents.length === 0 && vendorBookings.filter(b=>b.date === selectedDate).length === 0) ? (
                        <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400">
                            ទំនេរ
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {todaysEvents.map((ev, i) => (
                                <div key={i} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-3 shadow-sm">
                                    <div className={`w-1 h-8 rounded-full ${ev.type === 'OWNED' ? 'bg-rose-600' : 'bg-rose-300'}`}></div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-xs line-clamp-1">{ev.title}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{ev.type}</p>
                                    </div>
                                </div>
                            ))}
                             {vendorBookings.filter(b=>b.date === selectedDate).map((b, i) => (
                                <div key={`v-${i}`} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                    <div className="flex justify-between mb-1">
                                        <span className="font-bold text-slate-800 text-xs">{b.serviceName}</span>
                                        <Badge status={b.status} />
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-medium bg-slate-50 px-2 py-1 rounded inline-block">
                                        {b.startTime} - {b.endTime}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* AI Chat Modal */}
        <Modal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} title="PITHI AI">
             <div className="flex flex-col h-[60vh] md:h-[500px]">
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                      {chatHistory.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                                  {msg.text}
                              </div>
                          </div>
                      ))}
                      {isAiThinking && <div className="flex items-center gap-2 text-slate-400 text-xs p-4 justify-center"><Loader2 size={14} className="animate-spin text-rose-500"/> កំពុងគិត...</div>}
                      <div ref={chatEndRef} />
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex gap-2">
                        <input 
                            className="flex-1 bg-slate-100 border-none rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-rose-200 transition-all font-medium text-slate-800 text-sm"
                            value={aiInput}
                            onChange={e => setAiInput(e.target.value)}
                            placeholder="សួរខ្ញុំអ្វីក៏បាន..."
                            onKeyDown={e => e.key === 'Enter' && handleSendAI()}
                        />
                        <button 
                            onClick={handleSendAI} 
                            disabled={!aiInput.trim()} 
                            className="w-10 h-10 bg-rose-600 text-white rounded-lg flex items-center justify-center hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-md shadow-rose-100"
                        >
                            <ArrowRight size={18}/>
                        </button>
                  </div>
             </div>
        </Modal>
    </div>
  );
};

export default Dashboard;
