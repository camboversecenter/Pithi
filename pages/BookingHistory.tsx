
import { useEffect, useState } from 'react';
import { getCurrentUser } from '../services/authService';
import { getBookings } from '../services/dataService';
import { Booking } from '../types';
import { Card, Badge, Pagination } from '../components/UIComponents';
import { ArrowLeft, Calendar, Clock, Eye, FileText, History, CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BookingHistory = () => {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'PAST'>('UPCOMING');
  const itemsPerPage = 10;

  useEffect(() => {
    if (user) {
      loadData(currentPage, activeTab);
    }
  }, [user, currentPage, activeTab]);

  const loadData = async (page: number, timeFilter: 'UPCOMING' | 'PAST') => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await getBookings(user.id, user.role, page, itemsPerPage, timeFilter);
      setBookings(response.data);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error("Error loading booking history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
      navigate('/');
  };

  const handleTabChange = (tab: 'UPCOMING' | 'PAST') => {
      setActiveTab(tab);
      setCurrentPage(1); // Reset to first page when switching tabs
  };

  if (!user) return null;

  const renderTable = (data: Booking[], emptyMsg: string) => (
       <div className="overflow-x-auto">
             <table className="w-full text-sm text-left border-collapse">
               <thead className="text-slate-500 border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm">
                 <tr>
                   <th className="px-6 py-5 font-semibold min-w-[250px]">កម្មវិធី</th>
                   <th className="px-6 py-5 font-semibold min-w-[200px]">សេវាកម្ម</th>
                   <th className="px-6 py-5 font-semibold min-w-[180px]">កាលបរិច្ឆេទ & ម៉ោង</th>
                   <th className="px-6 py-5 font-semibold min-w-[120px]">តម្លៃ</th>
                   <th className="px-6 py-5 font-semibold text-right min-w-[140px]">ស្ថានភាព</th>
                   <th className="px-6 py-5 font-semibold text-right w-20">លម្អិត</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 bg-white">
                 {data.length > 0 ? (
                   data.map(booking => (
                     <tr key={booking.id} className="hover:bg-rose-50/30 transition-colors group">
                       <td className="px-6 py-5 font-medium text-slate-900 align-top">
                         <div className="flex items-start gap-3">
                            <div className="mt-1 p-2 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-100 transition-colors">
                                <FileText size={16} />
                            </div>
                            <span className="leading-relaxed">{booking.ceremonyTitle || 'Unknown'}</span>
                         </div>
                       </td>
                       <td className="px-6 py-5 text-slate-600 font-medium align-top leading-relaxed">
                         {booking.serviceName}
                       </td>
                       <td className="px-6 py-5 text-slate-600 align-top">
                         <div className="flex items-center gap-2 mb-1.5">
                             <Calendar size={14} className="text-slate-400"/>
                             <span className="font-medium">{booking.date}</span>
                         </div>
                         <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md w-fit">
                             <Clock size={12}/>
                             {booking.startTime} - {booking.endTime}
                         </div>
                       </td>
                       <td className="px-6 py-5 font-bold text-slate-800 align-top">
                         ${booking.price}
                       </td>
                       <td className="px-6 py-5 text-right align-top">
                         <Badge status={booking.status} />
                       </td>
                       <td className="px-6 py-5 text-right align-top">
                         <button 
                            onClick={() => navigate(`/booking/${booking.id}`)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-rose-100"
                            title="មើលលម្អិត"
                         >
                            <Eye size={18} />
                         </button>
                       </td>
                     </tr>
                   ))
                 ) : (
                   <tr>
                     <td colSpan={6} className="text-center py-16 text-slate-400 italic bg-slate-50/30">
                        {emptyMsg}
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-6 gap-4">
        <div className="flex items-center gap-4">
            <button onClick={handleBack} className="p-3 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-100 rounded-full transition-all text-slate-500">
                <ArrowLeft size={24} />
            </button>
            <div>
                <h1 className="text-3xl font-bold text-slate-900 font-serif">ប្រវត្តិការកក់</h1>
                <p className="text-slate-500 mt-1">គ្រប់គ្រង និងតាមដានរាល់សេវាកម្មដែលអ្នកបានកក់។</p>
            </div>
        </div>
      </div>

      <div className="space-y-6">
            {/* Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
                <button 
                    onClick={() => handleTabChange('UPCOMING')}
                    className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'UPCOMING' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <CalendarClock className="w-4 h-4 mr-2" />
                    ការកក់បច្ចុប្បន្ន
                </button>
                <button 
                    onClick={() => handleTabChange('PAST')}
                    className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'PAST' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <History className="w-4 h-4 mr-2" />
                    ការកក់ចាស់ៗ
                </button>
            </div>

            {loading ? (
                <Card className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
                </Card>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                     <Card className="overflow-hidden border border-slate-200 shadow-lg shadow-slate-100 p-0" noPadding>
                        {renderTable(
                            bookings, 
                            activeTab === 'UPCOMING' ? "មិនទាន់មានការកក់សម្រាប់ពេលខាងមុខទេ។" : "មិនទាន់មានប្រវត្តិការកក់ចាស់ៗទេ។"
                        )}
                     </Card>
                     <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
            )}
      </div>
    </div>
  );
};

export default BookingHistory;
