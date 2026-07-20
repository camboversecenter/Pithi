
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBookingById, getCeremonyById, getServiceById, getBookingComments, getBookingLogs, addBookingComment, updateBookingSchedule, updateBookingStatus, deleteBooking, getReviews, addReview } from '../services/dataService';
import { getCurrentUser } from '../services/authService';
import { Booking, Ceremony, Service, BookingComment, BookingLog, UserRole, BookingStatus, Review } from '../types';
import { Badge, Card, Button, Input, Modal } from '../components/UIComponents';
import { ArrowLeft, Calendar, Clock, MapPin, User, DollarSign, FileText, Send, History, Edit2, AlertCircle, Globe, ExternalLink, CheckCircle, XCircle, CheckSquare, Trash2, Star } from 'lucide-react';
import { useGlobalDialog } from '../contexts/GlobalDialogContext';

const BookingDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const currentUser = getCurrentUser();
    const { showAlert, showConfirm } = useGlobalDialog();
    
    const [booking, setBooking] = useState<Booking | null>(null);
    const [ceremony, setCeremony] = useState<Ceremony | null>(null);
    const [service, setService] = useState<Service | null>(null);
    const [comments, setComments] = useState<BookingComment[]>([]);
    const [logs, setLogs] = useState<BookingLog[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    
    // Edit Schedule State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editData, setEditData] = useState({ date: '', startTime: '', endTime: '' });
    const [updating, setUpdating] = useState(false);
    const [updateError, setUpdateError] = useState('');

    // Review State
    const [myReview, setMyReview] = useState<Review | null>(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    useEffect(() => {
        if (id) {
            loadData(id);
        }
    }, [id]);

    const loadData = async (bookingId: string) => {
        setLoading(true);
        const b = await getBookingById(bookingId);
        setBooking(b);
        if (b) {
            const [c, s, cmts, lgs] = await Promise.all([
                getCeremonyById(b.ceremonyId),
                getServiceById(b.serviceId),
                getBookingComments(bookingId),
                getBookingLogs(bookingId)
            ]);
            setCeremony(c);
            setService(s);
            setComments(cmts);
            setLogs(lgs);

            // Find the current user's existing review of this service
            if (currentUser && currentUser.id === b.bookedByUserId) {
                const reviews = await getReviews();
                setMyReview(reviews.find(r => String(r.serviceId) === String(b.serviceId) && r.userId === currentUser.id) || null);
            }

            // Init Edit Data
            setEditData({
                date: b.date,
                startTime: b.startTime,
                endTime: b.endTime
            });
        }
        setLoading(false);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !currentUser || !booking) return;
        setSending(true);
        await addBookingComment(booking.id, currentUser.id, currentUser.name, currentUser.role, newMessage);
        setNewMessage('');
        // Refresh comments
        const freshComments = await getBookingComments(booking.id);
        setComments(freshComments);
        setSending(false);
    };

    const handleUpdateSchedule = async () => {
        if (!currentUser || !booking) return;
        setUpdateError('');
        setUpdating(true);
        try {
            const updatedBooking = await updateBookingSchedule(
                booking.id, 
                editData.date, 
                editData.startTime, 
                editData.endTime, 
                currentUser.id, 
                currentUser.name
            );
            setBooking(updatedBooking);
            
            // Refresh logs
            const freshLogs = await getBookingLogs(booking.id);
            setLogs(freshLogs);
            
            setIsEditModalOpen(false);
        } catch (error: any) {
            setUpdateError(error.message || 'ការកែប្រែបរាជ័យ។');
        } finally {
            setUpdating(false);
        }
    }

    const handleStatusUpdate = async (newStatus: BookingStatus) => {
        if (!booking) return;
        if (newStatus === BookingStatus.CANCELLED) {
            const confirmed = await showConfirm(
                "បញ្ជាក់ការបដិសេធ/បោះបង់",
                "តើអ្នកពិតជាចង់បដិសេធ ឬលុបចោលការកក់នេះមែនទេ?",
                "danger"
            );
            if (!confirmed) return;
        }
        
        setLoading(true);
        try {
            await updateBookingStatus(booking.id, newStatus);
            await loadData(booking.id); // Reload all data
            await showAlert("ជោគជ័យ", "ស្ថានភាពការកក់ត្រូវបានអាប់ដេតដោយជោគជ័យ។", "success");
        } catch (error: any) {
            await showAlert("បរាជ័យ", error.message || "មិនអាចអាប់ដេតស្ថានភាពបានឡើយ។", "danger");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!booking) return;
        const confirmed = await showConfirm(
            "លុបការកក់",
            "តើអ្នកប្រាកដជាចង់លុបការកក់នេះមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។",
            "danger"
        );

        if (confirmed) {
            try {
                await deleteBooking(booking.id);
                await showAlert("ជោគជ័យ", "ការកក់ត្រូវបានលុបដោយជោគជ័យ។", "success");
                navigate(-1); // Go back
            } catch (error: any) {
                await showAlert("បរាជ័យ", error.message, "danger");
            }
        }
    };

    const handleGoToCeremony = () => {
        if (!ceremony || !currentUser) return;
        
        if (currentUser.role === UserRole.ORGANIZER) {
            navigate(`/organizer?ceremonyId=${ceremony.id}`);
        } else if (currentUser.role === UserRole.GENERAL_USER) {
            navigate(`/owner?ceremonyId=${ceremony.id}`);
        } else {
            // Fallback for vendors or others: go to public invitation view
            navigate(`/invitation/${ceremony.id}`);
        }
    };

    const handleSubmitReview = async () => {
        if (!currentUser || !booking || !reviewComment.trim()) return;
        setSubmittingReview(true);
        try {
            const newReview = await addReview({
                serviceId: booking.serviceId,
                userId: currentUser.id,
                userName: currentUser.name,
                rating: reviewRating,
                comment: reviewComment.trim()
            });
            setMyReview(newReview);
            await showAlert("អរគុណ!", "ការវាយតម្លៃរបស់អ្នកត្រូវបានរក្សាទុក។", "success");
        } catch (error: any) {
            await showAlert("បរាជ័យ", error.message || "មិនអាចរក្សាទុកការវាយតម្លៃបានទេ។", "danger");
        } finally {
            setSubmittingReview(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">កំពុងផ្ទុក...</div>;
    if (!booking) return <div className="p-8 text-center text-slate-500">រកមិនឃើញការកក់នេះទេ។</div>;

    // Permissions & Rules
    const isProvider = currentUser?.id === booking.providerId;
    const isPastBooking = booking.date < new Date().toISOString().split('T')[0];
    // The client may rate the service once the vendor marked the booking completed
    const canReview = currentUser?.id === booking.bookedByUserId && booking.status === BookingStatus.COMPLETED;
    
    // Merge Comments and Logs for Activity Feed
    const activityFeed = [
        ...comments.map(c => ({ ...c, type: 'COMMENT' as const })),
        ...logs.map(l => ({ ...l, type: 'LOG' as const }))
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors font-medium">
                <ArrowLeft className="w-4 h-4 mr-2"/> ត្រឡប់ក្រោយ
            </button>

            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-slate-900">ព័ត៌មានការកក់ #{booking.id.slice(-4)}</h1>
                        <Badge status={booking.status} />
                        {isPastBooking && (
                            <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-300">
                                បានបញ្ចប់
                            </span>
                        )}
                    </div>
                    <p className="text-slate-500">កាលបរិច្ឆេទបង្កើត: {new Date(booking.createdAt || Date.now()).toLocaleDateString('km-KH')}</p>
                </div>
                
                {/* Provider Actions */}
                {isProvider && !isPastBooking && (
                    <div className="flex flex-wrap gap-2">
                         {booking.status === BookingStatus.PENDING && (
                            <>
                                <Button onClick={() => handleStatusUpdate(BookingStatus.CONFIRMED)} className="bg-emerald-600 hover:bg-emerald-700 border-transparent">
                                    <CheckCircle className="w-4 h-4 mr-2"/> ទទួល
                                </Button>
                                <Button onClick={() => handleStatusUpdate(BookingStatus.CANCELLED)} variant="danger">
                                    <XCircle className="w-4 h-4 mr-2"/> បដិសេធ
                                </Button>
                            </>
                         )}
                         
                         {booking.status === BookingStatus.CONFIRMED && (
                            <>
                                <Button onClick={() => handleStatusUpdate(BookingStatus.COMPLETED)} className="bg-blue-600 hover:bg-blue-700 border-transparent">
                                    <CheckSquare className="w-4 h-4 mr-2"/> បញ្ចប់
                                </Button>
                                <Button onClick={() => handleStatusUpdate(BookingStatus.CANCELLED)} variant="secondary" className="text-red-600 hover:bg-red-50 hover:border-red-100">
                                    <XCircle className="w-4 h-4 mr-2"/> បោះបង់
                                </Button>
                            </>
                         )}

                        <Button onClick={() => setIsEditModalOpen(true)} variant="outline">
                            <Edit2 className="w-4 h-4 mr-2"/> កែប្រែកាលវិភាគ
                        </Button>
                    </div>
                )}

                {/* Booker Actions (e.g., Delete) */}
                {!isProvider && !isPastBooking && (
                    <div className="flex flex-wrap gap-2">
                        {booking.status === BookingStatus.PENDING && (
                            <Button onClick={handleDelete} variant="danger">
                                <Trash2 className="w-4 h-4 mr-2"/> លុបការកក់
                            </Button>
                        )}
                        {booking.status === BookingStatus.CONFIRMED && (
                             <Button onClick={() => handleStatusUpdate(BookingStatus.CANCELLED)} variant="secondary" className="text-red-600 hover:bg-red-50 hover:border-red-100">
                                <XCircle className="w-4 h-4 mr-2"/> បោះបង់
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT: INFO */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-3">
                            <FileText className="w-5 h-5 mr-2 text-rose-500"/> ព័ត៌មានសេវាកម្ម
                        </h3>
                        <div className="flex gap-4 mb-6">
                            {service?.imageUrl && (
                                <img src={service.imageUrl} alt={booking.serviceName} className="w-24 h-24 object-cover rounded-lg shadow-sm" />
                            )}
                            <div>
                                <h4 className="font-bold text-lg text-slate-900">{booking.serviceName}</h4>
                                <p className="text-slate-600 text-sm mb-2 line-clamp-2">{service?.description || 'គ្មានការពិពណ៌នា'}</p>
                                <div className="text-sm text-slate-500">
                                    {service?.locationType === 'FLEXIBLE' ? (
                                        <div className="flex items-center text-emerald-600">
                                            <Globe className="w-4 h-4 mr-1"/> សេវាកម្មចល័ត
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center">
                                                <MapPin className="w-4 h-4 mr-1"/> {service?.location || 'មិនបញ្ជាក់'}
                                            </div>
                                            {service?.mapUrl && (
                                                <a href={service.mapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs text-rose-500 hover:underline ml-5">
                                                    មើលផែនទី <ExternalLink size={10} className="ml-1"/>
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl border border-slate-100 bg-white">
                                <p className="text-slate-500 text-sm mb-1">កាលបរិច្ឆេទ</p>
                                <div className="flex items-center font-medium text-slate-800">
                                    <Calendar className="w-4 h-4 mr-2 text-rose-500"/>
                                    {booking.date}
                                </div>
                            </div>
                            <div className="p-4 rounded-xl border border-slate-100 bg-white">
                                <p className="text-slate-500 text-sm mb-1">ម៉ោង</p>
                                <div className="flex items-center font-medium text-slate-800">
                                    <Clock className="w-4 h-4 mr-2 text-rose-500"/>
                                    {booking.startTime} - {booking.endTime}
                                </div>
                            </div>
                            <div className="p-4 rounded-xl border border-slate-100 bg-white">
                                <p className="text-slate-500 text-sm mb-1">តម្លៃសរុប</p>
                                <div className="flex items-center font-bold text-xl text-rose-600">
                                    <DollarSign className="w-5 h-5 mr-1"/>
                                    {booking.price}
                                </div>
                            </div>
                            
                            {/* Conditional Info Card: Customer for Provider, Provider for Customer */}
                            <div className="p-4 rounded-xl border border-slate-100 bg-white">
                                <p className="text-slate-500 text-sm mb-1">
                                    {isProvider ? 'អតិថិជន' : 'អ្នកផ្តល់សេវា'}
                                </p>
                                <div className="flex items-center font-medium text-slate-800">
                                    <User className="w-4 h-4 mr-2 text-rose-500"/>
                                    {isProvider ? (booking.bookedByUserName || 'N/A') : booking.providerName}
                                </div>
                            </div>
                            
                             {/* Show "Booked By" if viewer is not the booker and not provider (e.g. Owner viewing Organizer's booking) */}
                            {(!isProvider && booking.bookedByUserId !== currentUser?.id) && (
                                <div className="p-4 rounded-xl border border-slate-100 bg-white col-span-2">
                                    <p className="text-slate-500 text-sm mb-1">អ្នកកក់</p>
                                    <div className="flex items-center font-medium text-slate-800">
                                        <User className="w-4 h-4 mr-2 text-rose-500"/>
                                        {booking.bookedByUserName || 'N/A'}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Activity Feed */}
                    <Card title="ការពិភាក្សា & ប្រវត្តិ">
                        <div className="space-y-4">
                            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 max-h-96 overflow-y-auto space-y-4">
                                {activityFeed.length === 0 ? (
                                    <div className="text-center text-slate-400 text-sm py-4">មិនទាន់មានសកម្មភាព។</div>
                                ) : (
                                    activityFeed.map((item) => {
                                        if (item.type === 'LOG') {
                                            const log = item as BookingLog & { type: 'LOG' };
                                            return (
                                                <div key={log.id} className="flex justify-center">
                                                    <div className="bg-slate-200 text-slate-600 text-xs px-3 py-1 rounded-full flex items-center">
                                                        <History className="w-3 h-3 mr-1"/>
                                                        <span className="font-bold mr-1">{log.userName}</span>
                                                        {log.details}
                                                        <span className="ml-2 text-slate-400">
                                                            {new Date(log.timestamp).toLocaleDateString('km-KH')} {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        } else {
                                            const cmt = item as BookingComment & { type: 'COMMENT' };
                                            const isMe = currentUser?.id === cmt.userId;
                                            return (
                                                <div key={cmt.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[80%] rounded-xl p-3 ${isMe ? 'bg-rose-100 text-rose-900' : 'bg-white border border-slate-200 text-slate-800'}`}>
                                                        <div className="flex items-center justify-between gap-4 mb-1">
                                                            <span className="text-xs font-bold">{cmt.userName}</span>
                                                            <span className="text-[10px] opacity-60">
                                                                {new Date(cmt.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm">{cmt.content}</p>
                                                    </div>
                                                </div>
                                            )
                                        }
                                    })
                                )}
                            </div>
                            
                            {/* Chat Input */}
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-50">
                                <input 
                                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-100 focus:border-rose-500 outline-none transition-all placeholder:text-slate-400 text-sm shadow-inner" 
                                    placeholder={isPastBooking ? "ការពិភាក្សាត្រូវបានបិទសម្រាប់កម្មវិធីដែលបានបញ្ចប់" : "សរសេរសារ..."}
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    disabled={isPastBooking || sending}
                                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                />
                                <Button 
                                    onClick={handleSendMessage} 
                                    disabled={isPastBooking || !newMessage.trim() || sending} 
                                    isLoading={sending}
                                    className="px-4 py-2.5 rounded-xl shadow-none"
                                >
                                    <Send className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* RIGHT: SIDE INFO */}
                <div className="space-y-6">
                    <Card title="សម្រាប់កម្មវិធី">
                        {ceremony ? (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">ឈ្មោះកម្មវិធី</p>
                                    <p className="font-medium text-slate-900">{ceremony.title}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">ប្រភេទ</p>
                                    <span className="bg-rose-100 text-rose-700 text-xs px-2 py-1 rounded-full">{ceremony.type}</span>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">ទីតាំងកម្មវិធី</p>
                                    <p className="text-sm text-slate-600">{ceremony.location}</p>
                                </div>
                                <Button variant="outline" className="w-full text-xs" onClick={handleGoToCeremony}>
                                    ទៅកាន់កម្មវិធី
                                </Button>
                            </div>
                        ) : (
                            <div className="text-slate-500 text-sm italic">មិនមានព័ត៌មានកម្មវិធី</div>
                        )}
                    </Card>

                    {/* Review prompt for completed bookings */}
                    {canReview && (
                        <Card title="វាយតម្លៃសេវាកម្មនេះ">
                            {myReview ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-1 text-amber-400">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star key={star} size={20} className={star <= myReview.rating ? "fill-current" : "text-slate-200"} />
                                        ))}
                                    </div>
                                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100/50">{myReview.comment}</p>
                                    <p className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
                                        <CheckCircle size={12} className="text-emerald-500" />
                                        អ្នកបានវាយតម្លៃរួចរាល់ ({myReview.date})
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-500">សេវាកម្មនេះបានបញ្ចប់ហើយ។ ចែករំលែកបទពិសោធន៍របស់អ្នក ដើម្បីជួយអ្នកប្រើប្រាស់ផ្សេងទៀត។</p>
                                    <div className="flex justify-center gap-1">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button key={star} onClick={() => setReviewRating(star)} className="transition-all hover:scale-125 transform">
                                                <Star size={30} className={star <= reviewRating ? "text-amber-400 fill-current" : "text-slate-200"} />
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        className="w-full px-4 py-3 bg-slate-100 border border-transparent rounded-lg focus:bg-white focus:border-rose-300 focus:ring-4 focus:ring-rose-50 outline-none transition-all placeholder:text-slate-400 text-slate-900 text-sm font-medium resize-none"
                                        rows={3}
                                        placeholder="សរសេរមតិយោបល់របស់អ្នក..."
                                        value={reviewComment}
                                        onChange={e => setReviewComment(e.target.value)}
                                    />
                                    <Button
                                        onClick={handleSubmitReview}
                                        isLoading={submittingReview}
                                        disabled={!reviewComment.trim() || submittingReview}
                                        className="w-full"
                                    >
                                        បញ្ជូនការវាយតម្លៃ
                                    </Button>
                                </div>
                            )}
                        </Card>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="កែប្រែកាលវិភាគ">
                <div className="space-y-4">
                    {updateError && (
                         <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" /> {updateError}
                        </div>
                    )}
                    <Input 
                        label="កាលបរិច្ឆេទ" 
                        type="date" 
                        value={editData.date}
                        onChange={e => setEditData({...editData, date: e.target.value})}
                    />
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Input 
                                label="ម៉ោងចាប់ផ្តើម" 
                                type="time"
                                value={editData.startTime}
                                onChange={e => setEditData({...editData, startTime: e.target.value})}
                            />
                        </div>
                        <div className="flex-1">
                             <Input 
                                label="ម៉ោងបញ្ចប់" 
                                type="time"
                                value={editData.endTime}
                                onChange={e => setEditData({...editData, endTime: e.target.value})}
                            />
                        </div>
                    </div>
                    <Button className="w-full" onClick={handleUpdateSchedule} isLoading={updating}>រក្សាទុកការកែប្រែ</Button>
                    <p className="text-xs text-slate-400 text-center mt-2">ការកែប្រែនេះនឹងត្រូវបានកត់ត្រាក្នុងប្រវត្តិ។</p>
                </div>
            </Modal>
        </div>
    );
};

export default BookingDetail;
