
import { getServices, createBooking, getCeremonies, getReviews, addReview, getBookingsByService, ServiceFilters, resolveBookingTotals } from '../services/dataService';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/authService';
import { Service, UserRole, Ceremony, Review, Booking, BookingStatus } from '../types';
import { Button, Card, Modal, Input, Pagination, CalendarView, SearchableSelect } from '../components/UIComponents';
import { Search, MapPin, Star, Calendar, AlertCircle, Clock, Globe, Loader2, SlidersHorizontal, X, MessagesSquare, Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useGlobalDialog } from '../contexts/GlobalDialogContext';

const Marketplace = () => {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useGlobalDialog();
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Advanced Filters
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [locationTypeFilter, setLocationTypeFilter] = useState<'ALL' | 'FIXED' | 'FLEXIBLE'>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC'>('NEWEST');
  const hasActiveFilters = minPrice !== '' || maxPrice !== '' || locationTypeFilter !== 'ALL' || sortBy !== 'NEWEST';
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Booking State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingStartTime, setBookingStartTime] = useState('08:00');
  const [bookingEndTime, setBookingEndTime] = useState('12:00');
  // Vendors price per unit (a table, a day). The booking has to carry how many.
  const [bookingQuantity, setBookingQuantity] = useState(1);
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [serviceBookings, setServiceBookings] = useState<Booking[]>([]);

  // Schedule View State
  const [selectedServiceForSchedule, setSelectedServiceForSchedule] = useState<Service | null>(null);
  const [scheduleBookings, setScheduleBookings] = useState<Booking[]>([]);
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);
  const [dummyDate, setDummyDate] = useState(new Date().toISOString().split('T')[0]);

  // Review State
  const [selectedServiceForReview, setSelectedServiceForReview] = useState<Service | null>(null);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Context for Booking (General User vs Organizer)
  const [userCeremonies, setUserCeremonies] = useState<Ceremony[]>([]); // For both General User and Organizer
  const [selectedCeremonyId, setSelectedCeremonyId] = useState<string>(''); // Selected for booking

  // --- Search & Price Debounce Logic ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
        setCurrentPage(1); // Reset to page 1 on new search
        loadData();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, minPrice, maxPrice]);

  // --- Filter/Pagination Change Logic ---
  useEffect(() => {
    loadData();
  }, [user, currentPage, filterRole, locationTypeFilter, sortBy]);

  // Fetch provider schedule when a service is selected for booking
  useEffect(() => {
      if (selectedService) {
          getBookingsByService(selectedService.id).then(setServiceBookings);
      }
  }, [selectedService]);

  const loadData = async () => {
      setIsDataLoading(true);
      const roleArg = filterRole !== 'ALL' ? filterRole as UserRole : undefined;
      const filters: ServiceFilters = {
          minPrice: minPrice !== '' ? Number(minPrice) : undefined,
          maxPrice: maxPrice !== '' ? Number(maxPrice) : undefined,
          locationType: locationTypeFilter !== 'ALL' ? locationTypeFilter : undefined,
          sort: sortBy
      };
      const srvRes = await getServices(roleArg, currentPage, 9, searchQuery, filters);
      setServices(srvRes.data);
      setTotalPages(srvRes.totalPages);

      const rev = await getReviews();
      setReviews(rev);

      if (user) {
          const roleToFetch = user.role === UserRole.ORGANIZER ? UserRole.ORGANIZER : UserRole.GENERAL_USER;
          const c = await getCeremonies(user.id, roleToFetch, 1, 100, 'ALL'); // Fetch all ceremonies for dropdown
          setUserCeremonies(c.data);
          if (c.data.length > 0 && !selectedCeremonyId) {
              setSelectedCeremonyId(c.data[0].id);
          }
      }
      setIsDataLoading(false);
  }

  const handleViewSchedule = async (service: Service) => {
      setSelectedServiceForSchedule(service);
      setIsScheduleLoading(true);
      try {
          const bookings = await getBookingsByService(service.id);
          setScheduleBookings(bookings);
      } catch (e) {
          console.error(e);
      } finally {
          setIsScheduleLoading(false);
      }
  };

  const getServiceRating = (serviceId: string) => {
      const serviceReviews = reviews.filter(r => r.serviceId === serviceId);
      if (serviceReviews.length === 0) return { average: 0, count: 0 };
      const sum = serviceReviews.reduce((acc, r) => acc + r.rating, 0);
      return { average: (sum / serviceReviews.length).toFixed(1), count: serviceReviews.length };
  };

  const getTodayDate = () => {
      const today = new Date();
      return today.toISOString().split('T')[0];
  };

  const handleBook = async () => {
      if (!selectedService || !user || !bookingDate) return;
      if (!selectedCeremonyId) {
          await showAlert("ព័ត៌មានមិនគ្រប់គ្រាន់", "សូមជ្រើសរើសកម្មវិធីដើម្បីបន្តការកក់។", "warning");
          return;
      }
      if (!bookingStartTime || !bookingEndTime) {
          await showAlert("ព័ត៌មានមិនគ្រប់គ្រាន់", "សូមជ្រើសរើសម៉ោងចាប់ផ្តើម និងម៉ោងបញ្ចប់។", "warning");
          return;
      }
      if (bookingStartTime >= bookingEndTime) {
          await showAlert("ព័ត៌មានមិនត្រឹមត្រូវ", "ម៉ោងបញ្ចប់ត្រូវតែក្រោយម៉ោងចាប់ផ្តើម។", "warning");
          return;
      }

      // Time-clash checks against the provider's existing bookings that day
      const overlapping = serviceBookings.filter(b =>
          b.date === bookingDate && b.startTime < bookingEndTime && b.endTime > bookingStartTime
      );
      const confirmedClash = overlapping.find(b => b.status === BookingStatus.CONFIRMED);
      if (confirmedClash) {
          await showAlert(
              "ម៉ោងជាប់រវល់",
              `ម៉ោងនេះត្រូវបានកក់ និងបញ្ជាក់រួចហើយ (${confirmedClash.startTime} - ${confirmedClash.endTime})។ សូមជ្រើសរើសម៉ោង ឬថ្ងៃផ្សេង។`,
              "warning"
          );
          return;
      }
      const pendingClash = overlapping.find(b => b.status === BookingStatus.PENDING);
      if (pendingClash) {
          const proceed = await showConfirm(
              "មានសំណើកក់ជាន់គ្នា",
              `មានអតិថិជនផ្សេងបានស្នើកក់ម៉ោងនេះរួចហើយ (${pendingClash.startTime} - ${pendingClash.endTime}) ប៉ុន្តែមិនទាន់ត្រូវបានបញ្ជាក់ទេ។ តើអ្នកចង់បន្តស្នើកក់ដែរឬទេ?`,
              "warning"
          );
          if (!proceed) return;
      }

      setIsBookingLoading(true);
      try {
          await createBooking({
            serviceId: selectedService.id,
            ceremonyId: selectedCeremonyId,
            bookedByUserId: user.id,
            bookedByUserName: user.name,
            providerId: selectedService.providerId,
            providerName: selectedService.providerName,
            date: bookingDate,
            startTime: bookingStartTime,
            endTime: bookingEndTime,
            serviceName: selectedService.name,
            quantity: bookingQuantity,
            unitPrice: selectedService.price
        });

        setIsBookingLoading(false);
        setSelectedService(null);
        setBookingDate('');
        setBookingStartTime('08:00');
        setBookingEndTime('12:00');
        setBookingQuantity(1);
        await showAlert(
            "ជោគជ័យ",
            `សំណើកក់ត្រូវបានផ្ញើដោយជោគជ័យ! សរុប $${bookingTotal.toLocaleString('en-US')}។ អ្នកអាចមើលលម្អិត និងចរចាជាមួយអ្នកផ្តល់សេវាក្នុងទំព័រ "ការកក់"។`,
            "success"
        );

      } catch (error: any) {
          setIsBookingLoading(false);
          await showAlert("បរាជ័យ", error.message || "ការកក់បរាជ័យ។ សូមព្យាយាមម្តងទៀត។", "danger");
      }
  };

  const handleSubmitReview = async () => {
      if (!selectedServiceForReview || !user) return;
      setIsSubmittingReview(true);
      try {
          const newReview = await addReview({
              serviceId: selectedServiceForReview.id,
              userId: user.id,
              userName: user.name,
              rating: newReviewRating,
              comment: newReviewComment
          });
          
          setReviews([...reviews, newReview]);
          setNewReviewComment('');
          setNewReviewRating(5);
          setSelectedServiceForReview(null);
          await showAlert("ជោគជ័យ", "មតិយោបល់របស់អ្នកត្រូវបានរក្សាទុកដោយជោគជ័យ។", "success");
      } catch (error: any) {
          await showAlert("បរាជ័យ", error.message || "មិនអាចផ្ញើមតិយោបល់បានឡើយ។", "danger");
      } finally {
          setIsSubmittingReview(false);
      }
  };

  const roleLabels: {[key: string]: string} = {
      'ALL': 'ទាំងអស់',
      [UserRole.BEAUTY_SALON]: 'សម្អាងការ',
      [UserRole.CHEF]: 'ចុងភៅ',
      [UserRole.HALL]: 'ទីតាំង',
      [UserRole.MUSIC_BAND]: 'ក្រុមតន្ត្រី',
      // Organizers list their coordination service here too, so clients can
      // actually find one instead of being told the platform has none.
      [UserRole.ORGANIZER]: 'អ្នករៀបចំកម្មវិធី'
  };

  const currentServiceReviews = selectedServiceForReview 
      ? reviews.filter(r => r.serviceId === selectedServiceForReview.id) 
      : [];

  const existingBookingsOnSelectedDate = bookingDate
      ? serviceBookings.filter(b => b.date === bookingDate)
      : [];

  const bookingTotal = resolveBookingTotals(
      { quantity: bookingQuantity, unitPrice: selectedService?.price || 0 }
  ).price;
  const depositPercent = selectedService?.depositPercent ?? 50;
  const depositAmount = Number((bookingTotal * depositPercent / 100).toFixed(2));

  return (
    <div className="space-y-8">
        {/* Header & Filter */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className={`absolute left-3 top-3 w-5 h-5 ${isDataLoading ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
                    <input
                        type="text"
                        placeholder="ស្វែងរកចុងភៅ, សម្អាងការ..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar items-center">
                    {['ALL', UserRole.ORGANIZER, UserRole.BEAUTY_SALON, UserRole.CHEF, UserRole.HALL, UserRole.MUSIC_BAND].map(role => (
                        <button
                            key={role}
                            onClick={() => { setFilterRole(role); setCurrentPage(1); }}
                            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                                filterRole === role ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {roleLabels[role]}
                        </button>
                    ))}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`relative p-2 rounded-full transition-all flex-shrink-0 ${
                            showFilters || hasActiveFilters ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-transparent'
                        }`}
                        title="តម្រង"
                    >
                        <SlidersHorizontal size={18} />
                        {hasActiveFilters && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>}
                    </button>
                </div>
            </div>

            {showFilters && (
                <div className="flex flex-col md:flex-row gap-4 md:items-end pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex-1 flex gap-3">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">តម្លៃចាប់ពី ($)</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500 transition-all text-sm"
                                value={minPrice}
                                onChange={e => setMinPrice(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">តម្លៃដល់ ($)</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="គ្មានកំណត់"
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500 transition-all text-sm"
                                value={maxPrice}
                                onChange={e => setMaxPrice(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">ប្រភេទទីតាំង</label>
                        <div className="flex gap-1.5">
                            {([['ALL', 'ទាំងអស់'], ['FIXED', 'ទីតាំងថេរ'], ['FLEXIBLE', 'ចល័ត']] as const).map(([value, label]) => (
                                <button
                                    key={value}
                                    onClick={() => { setLocationTypeFilter(value); setCurrentPage(1); }}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                        locationTypeFilter === value ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">តម្រៀបតាម</label>
                        <select
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500 transition-all text-sm bg-white"
                            value={sortBy}
                            onChange={e => { setSortBy(e.target.value as any); setCurrentPage(1); }}
                        >
                            <option value="NEWEST">ថ្មីបំផុត</option>
                            <option value="PRICE_ASC">តម្លៃ៖ ទាបទៅខ្ពស់</option>
                            <option value="PRICE_DESC">តម្លៃ៖ ខ្ពស់ទៅទាប</option>
                        </select>
                    </div>
                    {hasActiveFilters && (
                        <button
                            onClick={() => { setMinPrice(''); setMaxPrice(''); setLocationTypeFilter('ALL'); setSortBy('NEWEST'); setCurrentPage(1); }}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 px-3 py-2.5 rounded-lg hover:bg-rose-50 transition-colors whitespace-nowrap"
                        >
                            <X size={14} /> សម្អាតតម្រង
                        </button>
                    )}
                </div>
            )}
        </div>

        {/* Services Grid */}
        <div className="relative">
            {isDataLoading && services.length === 0 && (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-rose-600 w-10 h-10"/></div>
            )}
            
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity ${isDataLoading ? 'opacity-50' : 'opacity-100'}`}>
                {services.map(service => {
                    const { average, count } = getServiceRating(service.id);
                    const isFlexible = service.locationType === 'FLEXIBLE';
                    
                    return (
                        <Card key={service.id} className="p-0 overflow-hidden flex flex-col h-full hover:shadow-lg transition-all duration-300 group" noPadding>
                            <div className="relative h-48 overflow-hidden">
                                <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
                                    {roleLabels[service.role] || service.role}
                                </div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <h3 className="font-bold text-lg text-slate-900 truncate">{service.name}</h3>
                                        <div className="text-sm text-slate-500 flex items-center mt-1">
                                            {isFlexible ? (
                                                 <>
                                                    <Globe className="w-3 h-3 mr-1 text-emerald-500 flex-shrink-0"/> 
                                                    <span className="text-emerald-600 font-medium truncate">សេវាកម្មចល័ត</span>
                                                 </>
                                            ) : (
                                                 <>
                                                    <MapPin className="w-3 h-3 mr-1 flex-shrink-0"/> 
                                                    <span className="line-clamp-1">{service.location}</span>
                                                 </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end flex-shrink-0">
                                        <span className="font-bold text-rose-600 text-lg">
                                            ${service.price}{service.unitLabel ? <span className="text-xs font-bold text-slate-400"> / {service.unitLabel}</span> : null}
                                        </span>
                                        {service.priceNote && <span className="text-[10px] text-slate-400 font-medium line-clamp-1 text-right">{service.priceNote}</span>}
                                    </div>
                                </div>
                                <p className="text-slate-600 text-sm mb-4 flex-1 line-clamp-3 leading-relaxed">{service.description}</p>
                                <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto gap-4">
                                    <button 
                                        onClick={() => setSelectedServiceForReview(service)}
                                        className="flex items-center text-amber-500 text-sm hover:bg-amber-50 px-2 py-1 rounded-lg transition-colors group/star"
                                    >
                                        <Star className="w-4 h-4 fill-current mr-1 group-hover/star:scale-110 transition-transform" /> 
                                        <span className="font-bold">{average}</span> 
                                        <span className="text-slate-400 ml-1">({count})</span>
                                    </button>
                                    <div className="flex gap-2 flex-1 justify-end">
                                        <Button variant="outline" onClick={() => handleViewSchedule(service)} className="text-sm py-1.5 px-3" title="មើលកាលវិភាគ">
                                            <Calendar size={16} />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => navigate(`/messages?with=${service.providerId}`)}
                                            className="text-sm py-1.5 px-3"
                                            title="ផ្ញើសារ / ចរចាតម្លៃ"
                                        >
                                            <MessagesSquare size={16} />
                                        </Button>
                                        <Button
                                            onClick={() => { setSelectedService(service); setBookingQuantity(1); }}
                                            className="text-sm py-1.5 px-4 flex-1 whitespace-nowrap shadow-sm"
                                        >
                                            កក់ឥឡូវ
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
            
            {!isDataLoading && services.length === 0 && (
                <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                     <Search size={40} className="mx-auto mb-4 opacity-20"/>
                     <p className="font-medium">រកមិនឃើញសេវាកម្មដែលអ្នកកំពុងស្វែងរកទេ។</p>
                </div>
            )}
        </div>
        
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

        {/* Schedule Modal */}
        <Modal isOpen={!!selectedServiceForSchedule} onClose={() => setSelectedServiceForSchedule(null)} title={`កាលវិភាគ៖ ${selectedServiceForSchedule?.name}`}>
            {isScheduleLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-rose-600 w-10 h-10"/></div>
            ) : (
                <div className="space-y-6">
                    <CalendarView 
                        bookings={scheduleBookings}
                        selectedDate={dummyDate}
                        onDateSelect={setDummyDate}
                    />
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 text-slate-700 font-bold mb-2">
                             <Calendar className="w-4 h-4 text-rose-600"/>
                             <span>ការកក់នៅថ្ងៃទី {new Date(dummyDate).toLocaleDateString('km-KH')}</span>
                        </div>
                        {scheduleBookings.filter(b => b.date === dummyDate).length > 0 ? (
                            <div className="space-y-2">
                                {scheduleBookings.filter(b => b.date === dummyDate).map(b => (
                                    <div key={b.id} className="bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                                            <span className="text-sm font-medium text-slate-600">{b.startTime} - {b.endTime}</span>
                                        </div>
                                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase border border-emerald-100">បានកក់</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic">មិនមានការកក់នៅថ្ងៃនេះទេ។</p>
                        )}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-center gap-2 pt-2 border-t border-slate-100 uppercase tracking-widest font-bold">
                        <div className="w-2 h-2 rounded-full bg-rose-400"></div>
                        <span>បញ្ជាក់ថាមានការកក់រួចហើយ</span>
                    </div>
                </div>
            )}
        </Modal>

        {/* Booking Modal */}
        <Modal isOpen={!!selectedService} onClose={() => setSelectedService(null)} title={`កក់សេវាកម្ម ${selectedService?.name}`}>
            <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg mb-4 border border-slate-100 space-y-3">
                    <div className="flex justify-between items-center">
                         <span className="text-sm text-slate-500">អ្នកផ្តល់សេវា</span>
                         <span className="font-medium text-slate-800">{selectedService?.providerName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                         <span className="text-sm text-slate-500">តម្លៃ</span>
                         <div className="flex flex-col items-end">
                            <span className="font-bold text-rose-600">
                                ${selectedService?.price}{selectedService?.unitLabel ? ` / ${selectedService.unitLabel}` : ''}
                            </span>
                            {selectedService?.priceNote && <span className="text-[10px] text-slate-400">{selectedService.priceNote}</span>}
                         </div>
                    </div>

                    {/* Quantity — a caterer at $200/table needs to know it's 30 tables. */}
                    <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                        <div>
                            <span className="text-sm text-slate-500 block">
                                ចំនួន{selectedService?.unitLabel ? ` (${selectedService.unitLabel})` : ''}
                            </span>
                            <span className="text-[10px] text-slate-400">សូមបញ្ជាក់ចំនួនដែលអ្នកត្រូវការ</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setBookingQuantity(q => Math.max(1, q - 1))}
                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center"
                            >
                                <Minus size={14} />
                            </button>
                            <input
                                type="number"
                                min={1}
                                value={bookingQuantity}
                                onChange={e => setBookingQuantity(Math.max(1, Math.round(Number(e.target.value) || 1)))}
                                className="w-16 text-center px-2 py-1.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-rose-100 font-bold text-slate-800"
                            />
                            <button
                                onClick={() => setBookingQuantity(q => q + 1)}
                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                        <span className="text-sm font-bold text-slate-700">សរុប</span>
                        <div className="text-right">
                            <span className="font-bold text-lg text-rose-600">${bookingTotal.toLocaleString('en-US')}</span>
                            {depositAmount > 0 && (
                                <p className="text-[10px] text-slate-500">
                                    ប្រាក់កក់ {depositPercent}%៖ ${depositAmount.toLocaleString('en-US')}
                                    {selectedService?.paymentQrUrl ? ' (មាន QR ក្នុងទំព័រការកក់)' : ''}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">សម្រាប់កម្មវិធី</label>
                    {userCeremonies.length > 0 ? (
                        <SearchableSelect
                            options={userCeremonies.map(c => ({ value: c.id, label: `${c.title} (${c.date})` }))}
                            value={selectedCeremonyId}
                            onChange={(val) => setSelectedCeremonyId(val)}
                            placeholder="ជ្រើសរើសកម្មវិធី..."
                        />
                    ) : (
                        <div className="flex items-start p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                            <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                            អ្នកមិនទាន់មានកម្មវិធីទេ។ សូមបង្កើតកម្មវិធីជាមុនសិន។
                        </div>
                    )}
                </div>

                {/* Calendar Input */}
                <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2">កាលបរិច្ឆេទ</label>
                     <CalendarView 
                        bookings={serviceBookings} 
                        selectedDate={bookingDate} 
                        onDateSelect={setBookingDate}
                        minDate={getTodayDate()}
                     />
                     {bookingDate && (
                         <div className="mt-3 bg-slate-50 p-3 rounded-lg text-sm border border-slate-100">
                             <div className="font-bold text-slate-700 mb-2 flex items-center">
                                <Calendar className="w-4 h-4 mr-1 text-rose-500"/>
                                {bookingDate}
                             </div>
                             {existingBookingsOnSelectedDate.length > 0 ? (
                                 <div className="space-y-1">
                                     <p className="text-xs text-amber-600 font-medium mb-1">ម៉ោងដែលជាប់រវល់:</p>
                                     <div className="flex flex-wrap gap-2">
                                        {existingBookingsOnSelectedDate.map(b => (
                                            <span key={b.id} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                                                {b.startTime} - {b.endTime}
                                            </span>
                                        ))}
                                     </div>
                                 </div>
                             ) : (
                                 <p className="text-xs text-emerald-600 font-medium flex items-center"><Clock className="w-3 h-3 mr-1"/> ទំនេរពេញមួយថ្ងៃ</p>
                             )}
                         </div>
                     )}
                </div>

                <div className="flex gap-4">
                    <div className="flex-1">
                        <Input 
                            label="ម៉ោងចាប់ផ្តើម" 
                            type="time" 
                            value={bookingStartTime} 
                            onChange={e => setBookingStartTime(e.target.value)} 
                        />
                    </div>
                    <div className="flex-1">
                        <Input 
                            label="ម៉ោងបញ្ចប់" 
                            type="time" 
                            value={bookingEndTime} 
                            onChange={e => setBookingEndTime(e.target.value)} 
                        />
                    </div>
                </div>
                
                <Button 
                    className="w-full mt-2" 
                    onClick={handleBook} 
                    isLoading={isBookingLoading}
                    disabled={!selectedCeremonyId || !bookingDate}
                >
                    បញ្ជាក់ការកក់
                </Button>
            </div>
        </Modal>

        {/* Reviews Modal */}
        <Modal isOpen={!!selectedServiceForReview} onClose={() => setSelectedServiceForReview(null)} title="ការវាយតម្លៃ">
            <div className="space-y-6">
                {/* Summary */}
                <div className="flex items-center justify-center space-x-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-slate-800">
                            {getServiceRating(selectedServiceForReview?.id || '').average}
                        </div>
                        <div className="flex text-amber-400 mt-1">
                             {[1,2,3,4,5].map(star => (
                                 <Star key={star} size={20} className={star <= Number(getServiceRating(selectedServiceForReview?.id || '').average) ? "fill-current" : "text-slate-300"} />
                             ))}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-bold">{getServiceRating(selectedServiceForReview?.id || '').count} ការវាយតម្លៃ</div>
                    </div>
                </div>

                {/* Add Review Form */}
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                    <h4 className="font-bold text-slate-800 mb-4 text-center">ដាក់ពិន្ទុ & វាយតម្លៃ</h4>
                    <div className="flex justify-center space-x-3 mb-6">
                        {[1,2,3,4,5].map(star => (
                            <button key={star} onClick={() => setNewReviewRating(star)} className="transition-all hover:scale-125 transform">
                                <Star size={32} className={star <= newReviewRating ? "text-amber-400 fill-current" : "text-slate-200"} />
                            </button>
                        ))}
                    </div>
                    <textarea 
                        className="w-full p-4 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none mb-4 transition-all"
                        placeholder="សរសេរមតិយោបល់របស់អ្នក..."
                        rows={3}
                        value={newReviewComment}
                        onChange={e => setNewReviewComment(e.target.value)}
                    />
                    <Button onClick={handleSubmitReview} isLoading={isSubmittingReview} disabled={!newReviewComment.trim() || isSubmittingReview} className="w-full py-3 shadow-md shadow-rose-100">បញ្ជូនមតិ</Button>
                </div>

                {/* Reviews List */}
                <div className="space-y-4 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                    <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">មតិយោបល់ ({currentServiceReviews.length})</h4>
                    {currentServiceReviews.length > 0 ? (
                        currentServiceReviews.map(review => (
                            <div key={review.id} className="border-b border-slate-50 pb-4 last:border-0">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-slate-800 text-sm">{review.userName}</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{review.date}</span>
                                </div>
                                <div className="flex text-amber-400 mb-2">
                                    {[1,2,3,4,5].map(star => (
                                        <Star key={star} size={12} className={star <= review.rating ? "fill-current" : "text-slate-200"} />
                                    ))}
                                </div>
                                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100/50">{review.comment}</p>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-slate-400 py-6 text-sm italic">មិនទាន់មានការវាយតម្លៃនៅឡើយទេ។</div>
                    )}
                </div>
            </div>
        </Modal>
    </div>
  );
};

export default Marketplace;
