import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Search, 
  Plus, 
  Download, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  UserPlus, 
  X, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  DollarSign,
  AlertCircle,
  FileSpreadsheet,
  Check,
  CreditCard,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  EventDoc, 
  AppUser, 
  createEvent, 
  updateEvent, 
  deleteEvent, 
  registerForEvent, 
  subscribeToAllEvents,
  fetchAllUsers
} from '../lib/firebase';

interface EventsViewProps {
  currentUser: AppUser;
}

export const EventsView: React.FC<EventsViewProps> = ({ currentUser }) => {
  // Global states
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('All');
  const [myEventsOnly, setMyEventsOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Upcoming' | 'Live' | 'Completed'>('All');
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<EventDoc | null>(null);
  const [selectedEventForRegistrations, setSelectedEventForRegistrations] = useState<EventDoc | null>(null);
  const [isEditingEvent, setIsEditingEvent] = useState<EventDoc | null>(null);
  const [checkoutEvent, setCheckoutEvent] = useState<EventDoc | null>(null);
  
  // Checkout sequence state
  const [paymentStep, setPaymentStep] = useState<'idle' | 'processing' | 'success'>('idle');
  const [paymentPhone, setPaymentPhone] = useState('');
  
  // Create / Edit Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEventType, setFormEventType] = useState<'Tournament' | 'Workshop' | 'Camp'>('Tournament');
  const [formAcademyId, setFormAcademyId] = useState(''); 
  const [formAcademyName, setFormAcademyName] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formEntryFee, setFormEntryFee] = useState(0);
  const [formMaxPlayers, setFormMaxPlayers] = useState(100);
  const [formBannerImage, setFormBannerImage] = useState('');
  
  const [formWinnerName, setFormWinnerName] = useState('');
  const [formWinnerPhoto, setFormWinnerPhoto] = useState('');
  const [formStatus, setFormStatus] = useState<'Upcoming' | 'Live' | 'Completed'>('Upcoming');

  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Preset gorgeous chess graphics banners for seamless creation
  const PRESET_BANNERS = [
    { name: 'Dark Metallic Pieces', url: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&auto=format&fit=crop&q=70' },
    { name: 'Warm Wooden Chessboard', url: 'https://images.unsplash.com/photo-1523821741446-edb2b68bb7a0?w=800&auto=format&fit=crop&q=70' },
    { name: 'Bokeh Strategy Focus', url: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800&auto=format&fit=crop&q=70' },
    { name: 'Neon Cyber Tactics', url: 'https://images.unsplash.com/photo-1586165368502-1bad197a64e1?w=800&auto=format&fit=crop&q=70' }
  ];

  // Subscribe to real-time events and fetch all users for registrations back-references
  useEffect(() => {
    const unsubscribe = subscribeToAllEvents((list) => {
      setEvents(list);
    });

    fetchAllUsers().then((users) => {
      setAllUsers(users);
    });

    return () => unsubscribe();
  }, []);

  // Filter list
  const filteredEvents = events.filter(evt => {
    const matchesSearch = evt.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          evt.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          evt.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          evt.academyName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = eventTypeFilter === 'All' || evt.eventType === eventTypeFilter;
    
    const matchesMyEvents = !myEventsOnly || evt.registeredPlayers.includes(currentUser.uid);

    const matchesStatus = statusFilter === 'All' || evt.status === statusFilter;

    // Academy role only sees own academy events or global events (academyId is empty)
    const matchesRoleAccess = true; // All see all, but academy role handles own specifically in creations

    return matchesSearch && matchesType && matchesMyEvents && matchesStatus && matchesRoleAccess;
  });

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDescription || !formStartDate || !formEndDate || !formLocation) {
      showNotification('error', 'Please fill in all mandatory text fields.');
      return;
    }

    // Determine hosting academy details
    let resolvedAcademyId = '';
    let resolvedAcademyName = 'All Academies';

    if (currentUser.role === 'academy') {
      resolvedAcademyId = currentUser.uid;
      resolvedAcademyName = currentUser.academyName || 'Sumeet Rasela Academy';
    } else {
      // Admin is creating
      resolvedAcademyId = formAcademyId; // From dropdown
      if (resolvedAcademyId === '') {
        resolvedAcademyName = 'All Academies';
      } else {
        const found = allUsers.find(u => u.uid === resolvedAcademyId);
        resolvedAcademyName = found?.academyName || 'Elite Academy';
      }
    }

    const payload: Omit<EventDoc, 'id'> = {
      title: formTitle,
      description: formDescription,
      eventType: formEventType,
      academyId: resolvedAcademyId,
      academyName: resolvedAcademyName,
      startDate: new Date(formStartDate).toISOString(),
      endDate: new Date(formEndDate).toISOString(),
      location: formLocation,
      entryFee: Number(formEntryFee) || 0,
      maxPlayers: Number(formMaxPlayers) || 100,
      registeredPlayers: [],
      status: formStatus,
      bannerImage: formBannerImage || PRESET_BANNERS[0].url,
      createdBy: currentUser.uid,
      createdAt: new Date().toISOString(),
      winnerName: formWinnerName,
      winnerPhoto: formWinnerPhoto
    };

    try {
      await createEvent(payload);
      showNotification('success', 'New Chess Event published successfully!');
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err: any) {
      showNotification('error', 'Failed saving event details: ' + err.message);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingEvent) return;

    let resolvedAcademyId = isEditingEvent.academyId;
    let resolvedAcademyName = isEditingEvent.academyName;

    if (currentUser.role === 'admin') {
      resolvedAcademyId = formAcademyId;
      if (resolvedAcademyId === '') {
        resolvedAcademyName = 'All Academies';
      } else {
        const found = allUsers.find(u => u.uid === resolvedAcademyId);
        resolvedAcademyName = found?.academyName || 'Elite Academy';
      }
    }

    try {
      await updateEvent(isEditingEvent.id, {
        title: formTitle,
        description: formDescription,
        eventType: formEventType,
        academyId: resolvedAcademyId,
        academyName: resolvedAcademyName,
        startDate: new Date(formStartDate).toISOString(),
        endDate: new Date(formEndDate).toISOString(),
        location: formLocation,
        entryFee: Number(formEntryFee) || 0,
        maxPlayers: Number(formMaxPlayers) || 100,
        status: formStatus,
        bannerImage: formBannerImage || PRESET_BANNERS[0].url,
        winnerName: formWinnerName,
        winnerPhoto: formWinnerPhoto
      });

      showNotification('success', 'Chess Event updated successfully!');
      setIsEditingEvent(null);
      resetForm();
    } catch (err: any) {
      showNotification('error', 'Failed updating event details: ' + err.message);
    }
  };

  const handleDeleteClick = async (eventId: string) => {
    if (window.confirm('Are you absolutely sure you want to terminate this chess event?')) {
      try {
        await deleteEvent(eventId);
        showNotification('success', 'Chess Event successfully deleted.');
      } catch (err: any) {
        showNotification('error', 'Error deleting event: ' + err.message);
      }
    }
  };

  const startEdit = (evt: EventDoc) => {
    setIsEditingEvent(evt);
    setFormTitle(evt.title);
    setFormDescription(evt.description);
    setFormEventType(evt.eventType);
    setFormAcademyId(evt.academyId);
    setFormAcademyName(evt.academyName);
    // Convert to datetime-local format 'YYYY-MM-DDThh:mm'
    const sDate = new Date(evt.startDate);
    sDate.setMinutes(sDate.getMinutes() - sDate.getTimezoneOffset());
    setFormStartDate(sDate.toISOString().slice(0, 16));
    
    const eDate = new Date(evt.endDate);
    eDate.setMinutes(eDate.getMinutes() - eDate.getTimezoneOffset());
    setFormEndDate(eDate.toISOString().slice(0, 16));
    
    setFormLocation(evt.location);
    setFormEntryFee(evt.entryFee);
    setFormMaxPlayers(evt.maxPlayers);
    setFormBannerImage(evt.bannerImage);
    setFormWinnerName(evt.winnerName || '');
    setFormWinnerPhoto(evt.winnerPhoto || '');
    setFormStatus(evt.status);
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormEventType('Tournament');
    setFormAcademyId('');
    setFormAcademyName('');
    setFormStartDate('');
    setFormEndDate('');
    setFormLocation('');
    setFormEntryFee(0);
    setFormMaxPlayers(100);
    setFormBannerImage('');
    setFormWinnerName('');
    setFormWinnerPhoto('');
    setFormStatus('Upcoming');
  };

  // Register Handler: Handles both free and paid entry pathways
  const handleRegisterClick = async (evt: EventDoc) => {
    if (evt.registeredPlayers.includes(currentUser.uid)) {
      showNotification('error', 'You are already registered for this event!');
      return;
    }

    if (evt.registeredPlayers.length >= evt.maxPlayers) {
      showNotification('error', 'This event is currently full!');
      return;
    }

    if (evt.entryFee > 0) {
      // Trigger pay flow placeholder
      setCheckoutEvent(evt);
      setPaymentStep('idle');
      setPaymentPhone(currentUser.phone || '');
    } else {
      // Free registration
      try {
        await registerForEvent(evt.id, currentUser.uid);
        showNotification('success', `Congratulations! Registered successfully for "${evt.title}"`);
        // Refresh detail view if open
        if (selectedEventForDetails && selectedEventForDetails.id === evt.id) {
          setSelectedEventForDetails({
            ...selectedEventForDetails,
            registeredPlayers: [...selectedEventForDetails.registeredPlayers, currentUser.uid]
          });
        }
      } catch (err: any) {
        showNotification('error', 'Registration failed: ' + err.message);
      }
    }
  };

  // Perform Simulated Razorpay Payment Call
  const triggerSimulatedRazorpay = async () => {
    if (!checkoutEvent) return;
    setPaymentStep('processing');
    
    // Simulate API delay
    setTimeout(async () => {
      try {
        await registerForEvent(checkoutEvent.id, currentUser.uid);
        setPaymentStep('success');
        showNotification('success', `Simulated Razorpay transaction OK. Registered for ${checkoutEvent.title}!`);
        
        // Update details if selected
        if (selectedEventForDetails && selectedEventForDetails.id === checkoutEvent.id) {
          setSelectedEventForDetails({
            ...selectedEventForDetails,
            registeredPlayers: [...selectedEventForDetails.registeredPlayers, currentUser.uid]
          });
        }
        setTimeout(() => {
          setCheckoutEvent(null);
          setPaymentStep('idle');
        }, 3000);
      } catch (err: any) {
        showNotification('error', 'Payment processed but record saving failed: ' + err.message);
        setPaymentStep('idle');
      }
    }, 2000);
  };

  // Compile player registrations metadata for specific Academy or Admin views
  const getRegPlayersInfo = (event: EventDoc) => {
    return event.registeredPlayers.map(playerId => {
      const p = allUsers.find(u => u.uid === playerId);
      return {
        uid: playerId,
        fullName: p?.fullName || 'Anonymous Competitor',
        email: p?.email || 'N/A',
        phone: p?.phone || 'N/A',
        age: p?.age || 'N/A',
        eloRating: p?.eloRating || 1000,
        academyName: p?.academyName || 'Independent Freelance'
      };
    });
  };

  // CSV Generator downloader assistant: Compile details cleanly and export to host OS
  const downloadRegisteredCSV = (evt: EventDoc) => {
    const list = getRegPlayersInfo(evt);
    if (list.length === 0) {
      alert("No students registered for this event yet!");
      return;
    }

    const headers = ['UID', 'Full Name', 'Email ID', 'Phone Number', 'Age', 'ELO Rating', 'Affiliation Academy'];
    const rows = list.map(item => [
      item.uid,
      item.fullName,
      item.email,
      item.phone,
      item.age,
      item.eloRating,
      item.academyName
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CheckMatePro_${evt.title.replace(/\s+/g, '_')}_Enrolled_Students.csv`);
    document.body.appendChild(link); // Required for FF
    
    link.click();
    document.body.removeChild(link);
    showNotification('success', 'CSV report generated & downloaded successfully.');
  };

  // Check if current user is organizer of this event or admin
  const canManageEvent = (evt: EventDoc) => {
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'academy' && evt.academyId === currentUser.uid) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic top notifications */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl border flex items-center gap-3 transition-all max-w-sm animate-bounce ${
          notification.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
        }`}>
          <span>{notification.type === 'success' ? '✔' : '⚠'}</span>
          <p className="text-3xs font-bold leading-tight uppercase font-mono">{notification.text}</p>
        </div>
      )}

      {/* Segment Header bar */}
      <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black uppercase text-neutral-900 dark:text-white flex items-center gap-2">
            <span className="p-1 px-2.5 bg-amber-500/15 text-amber-500 text-4xs font-mono rounded font-normal">PORTAL</span>
            CheckMate Events Hub
          </h3>
          <p className="text-5xs font-mono text-neutral-400 mt-1 uppercase">Live Tournaments, Training Camps & Masterclass Workshops</p>
        </div>

        {/* Action Button: Create Event (available only for admin & academy role) */}
        {(currentUser.role === 'admin' || currentUser.role === 'academy') && (
          <button
            onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-3xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-neutral-950" />
            <span>Create Event</span>
          </button>
        )}
      </div>

      {/* Filtering Operations Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Search Input bar */}
        <div className="md:col-span-4 relative">
          <input
            type="text"
            className="w-full text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-2.5 pl-9.5 rounded-xl focus:outline-none focus:border-amber-500 text-neutral-950 dark:text-neutral-100 placeholder-neutral-450 font-mono"
            placeholder="Search title, description, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
        </div>

        {/* Status filters */}
        <div className="md:col-span-4 flex items-center gap-1.5 overflow-x-auto">
          {(['All', 'Upcoming', 'Live', 'Completed'] as const).map((stat) => (
            <button
              key={stat}
              onClick={() => setStatusFilter(stat)}
              className={`px-3 py-2 text-4xs uppercase font-extrabold tracking-wider rounded-xl transition-all border cursor-pointer shrink-0 ${
                statusFilter === stat
                  ? 'bg-neutral-950 text-white dark:bg-amber-500 dark:text-neutral-950 border-transparent shadow'
                  : 'bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200/50 dark:border-neutral-800'
              }`}
            >
              {stat === 'Live' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1 animate-pulse" />}
              {stat} Events
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <div className="md:col-span-2">
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="w-full text-4xs uppercase tracking-wider font-extrabold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-neutral-550 dark:text-neutral-300"
          >
            <option value="All">All Types</option>
            <option value="Tournament">Tournaments</option>
            <option value="Workshop">Workshops</option>
            <option value="Camp">Camps</option>
          </select>
        </div>

        {/* Player Filters */}
        {currentUser.role === 'player' && (
          <div className="md:col-span-2 flex items-center justify-end">
            <button
              onClick={() => setMyEventsOnly(!myEventsOnly)}
              className={`w-full px-3 py-2.5 text-4xs uppercase tracking-widest font-black rounded-xl transition-all border cursor-pointer text-center leading-none ${
                myEventsOnly
                  ? 'bg-neutral-950 text-amber-500 border-transparent dark:bg-amber-500/10 dark:text-amber-500 dark:border-amber-500/20'
                  : 'bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-800'
              }`}
            >
              {myEventsOnly ? '★ Showing My Events' : '☆ Show My Events'}
            </button>
          </div>
        )}

        {/* Admin registrations dashboard filter banner */}
        {currentUser.role === 'admin' && (
          <div className="md:col-span-2">
            <button
              onClick={() => {
                // Open table of global registrations
                setSelectedEventForRegistrations({
                  id: 'global_audits',
                  title: 'All Active Event Registrations',
                  description: 'Viewing combined registered list for verification audit.',
                  eventType: 'Tournament',
                  academyId: '',
                  academyName: 'All Academies',
                  startDate: '',
                  endDate: '',
                  location: '',
                  entryFee: 0,
                  maxPlayers: 0,
                  registeredPlayers: Array.from(new Set(events.flatMap(e => e.registeredPlayers))),
                  status: 'Upcoming',
                  bannerImage: '',
                  createdBy: '',
                  createdAt: ''
                });
              }}
              className="w-full py-2.5 px-3.5 bg-neutral-950 dark:bg-neutral-900 hover:bg-neutral-850 dark:hover:bg-neutral-800 text-neutral-200 text-4xs font-mono font-black uppercase tracking-wider rounded-xl border border-neutral-200/20 dark:border-neutral-800 space-x-1 cursor-pointer flex justify-center items-center"
            >
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span>All Registrations</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid Lists */}
      <div className="space-y-8">
        
        {/* Sections: UPCOMING EVENTS */}
        {filteredEvents.filter(e => e.status === 'Upcoming').length > 0 && (
          <div className="space-y-4">
            <h4 className="font-extrabold text-xs text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-3 bg-blue-500 rounded" />
              Upcoming Events ({filteredEvents.filter(e => e.status === 'Upcoming').length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.filter(e => e.status === 'Upcoming').map((evt) => (
                <div key={evt.id} className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-205 dark:border-neutral-800 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group">
                  <div className="h-40 relative bg-neutral-200 dark:bg-neutral-950 overflow-hidden shrink-0">
                    <img 
                      src={evt.bannerImage || PRESET_BANNERS[0].url} 
                      alt={evt.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <span className="px-2 py-0.5 bg-blue-500 text-white text-[9px] font-mono tracking-wider font-extrabold rounded uppercase">
                        {evt.eventType}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className={`px-2 py-0.5 font-mono text-[9px] font-extrabold rounded uppercase shadow ${
                        evt.registeredPlayers.includes(currentUser.uid)
                          ? 'bg-emerald-500 text-white'
                          : evt.registeredPlayers.length >= evt.maxPlayers
                            ? 'bg-red-500 text-white'
                            : 'bg-neutral-900/80 text-amber-500 backdrop-blur-sm'
                      }`}>
                        {evt.registeredPlayers.includes(currentUser.uid) 
                          ? '✓ Registered' 
                          : evt.registeredPlayers.length >= evt.maxPlayers 
                            ? 'Full' 
                            : evt.entryFee === 0 ? 'Free' : `₹${evt.entryFee}`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4.5 flex-1 flex flex-col justify-between space-y-4 text-left">
                    <div className="space-y-1.5">
                      <h5 className="font-extrabold text-xs text-neutral-900 dark:text-white line-clamp-1">{evt.title}</h5>
                      <span className="text-[10px] font-mono text-amber-500 block">Host: {evt.academyName}</span>
                      <p className="text-5xs text-neutral-450 line-clamp-2 leading-relaxed">{evt.description}</p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-neutral-100 dark:border-neutral-800/60 text-[10px] text-neutral-450 font-mono">
                      <p className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{new Date(evt.startDate).toLocaleDateString()} at {new Date(evt.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                      <p className="flex items-center gap-2 line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 text-red-400" />
                        <span>{evt.location}</span>
                      </p>
                      <div className="flex justify-between items-center text-4xs font-bold leading-none mt-1 pt-1 text-neutral-500 dark:text-neutral-400">
                        <span>Slots: {evt.registeredPlayers.length} / {evt.maxPlayers}</span>
                        <span>{evt.maxPlayers - evt.registeredPlayers.length} remaining</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1 font-sans shrink-0">
                      <button
                        onClick={() => setSelectedEventForDetails(evt)}
                        className="flex-1 py-2 px-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-800 dark:text-neutral-200 text-3xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1 leading-none"
                      >
                        Details
                      </button>
                      
                      {currentUser.role === 'player' && (
                        <button
                          onClick={() => handleRegisterClick(evt)}
                          disabled={evt.registeredPlayers.length >= evt.maxPlayers && !evt.registeredPlayers.includes(currentUser.uid)}
                          className={`flex-1 py-2 px-3 font-black text-3xs uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center shadow flex items-center justify-center gap-1 leading-none ${
                            evt.registeredPlayers.includes(currentUser.uid)
                              ? 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border border-emerald-500/20'
                              : evt.registeredPlayers.length >= evt.maxPlayers
                                ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed shadow-none'
                                : 'bg-amber-500 hover:bg-amber-600 text-neutral-950 shadow'
                          }`}
                        >
                          {evt.registeredPlayers.includes(currentUser.uid) ? 'Registered' : evt.registeredPlayers.length >= evt.maxPlayers ? 'Full' : 'Register'}
                        </button>
                      )}

                      {canManageEvent(evt) && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => startEdit(evt)}
                            className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 hover:text-amber-500 rounded-xl transition-all cursor-pointer"
                            title="Edit Event"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedEventForRegistrations(evt)}
                            className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 hover:text-emerald-500 rounded-xl transition-all cursor-pointer"
                            title="Enrolled Players List"
                          >
                            <Users className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(evt.id)}
                            className="p-2 bg-neutral-100 hover:bg-rose-500/10 dark:bg-neutral-800 hover:text-red-500 rounded-xl transition-all cursor-pointer"
                            title="Delete Event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sections: LIVE EVENTS */}
        {filteredEvents.filter(e => e.status === 'Live').length > 0 && (
          <div className="space-y-4">
            <h4 className="font-extrabold text-xs text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 animate-pulse"></span>
              </span>
              Live Events Now ({filteredEvents.filter(e => e.status === 'Live').length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.filter(e => e.status === 'Live').map((evt) => (
                <div key={evt.id} className="bg-white dark:bg-neutral-900 rounded-3xl border border-rose-500/30 dark:border-rose-500/20 overflow-hidden shadow-lg hover:shadow-xl transition-all flex flex-col group relative ring-1 ring-red-500/10">
                  
                  <div className="h-40 relative bg-neutral-200 dark:bg-neutral-950 overflow-hidden shrink-0">
                    <img 
                      src={evt.bannerImage || PRESET_BANNERS[0].url} 
                      alt={evt.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <span className="px-2 py-0.5 bg-red-500 text-white text-[9px] font-mono tracking-wider font-extrabold rounded uppercase animate-pulse">
                        LIVE NOW
                      </span>
                      <span className="px-2 py-0.5 bg-neutral-900/85 backdrop-blur-sm text-neutral-200 text-[9px] font-mono tracking-wider font-bold rounded uppercase">
                        {evt.eventType}
                      </span>
                    </div>
                  </div>

                  <div className="p-4.5 flex-1 flex flex-col justify-between space-y-4 text-left">
                    <div className="space-y-1.5">
                      <h5 className="font-extrabold text-xs text-neutral-900 dark:text-white line-clamp-1">{evt.title}</h5>
                      <span className="text-[10px] font-mono text-amber-500 block">Host: {evt.academyName}</span>
                      <p className="text-5xs text-neutral-450 line-clamp-2 leading-relaxed">{evt.description}</p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-neutral-100 dark:border-neutral-800/60 text-[10px] text-neutral-450 font-mono">
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                        <span className="font-bold text-neutral-700 dark:text-neutral-300">Venue: {evt.location}</span>
                      </p>
                      <div className="flex justify-between items-center text-4xs font-bold leading-none mt-1 pt-1 text-neutral-500">
                        <span>Participants: {evt.registeredPlayers.length} Members</span>
                        <span>Capacity: {evt.maxPlayers} Max</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1 font-sans shrink-0">
                      <button
                        onClick={() => setSelectedEventForDetails(evt)}
                        className="flex-1 py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-850 dark:text-neutral-200 text-3xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center leading-none"
                      >
                        Description
                      </button>
                      <a
                        href="/live"
                        className="flex-1 py-2.5 px-3 bg-red-500 hover:bg-red-650 text-white text-3xs font-black uppercase tracking-widest rounded-xl transition-all shadow text-center flex items-center justify-center gap-1.5 leading-none"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        <span>Watch Live</span>
                      </a>

                      {canManageEvent(evt) && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => startEdit(evt)}
                            className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 hover:text-amber-500 rounded-xl transition-all cursor-pointer"
                            title="Edit Event"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedEventForRegistrations(evt)}
                            className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 hover:text-emerald-500 rounded-xl transition-all cursor-pointer"
                            title="Registration List"
                          >
                            <Users className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sections: PAST EVENTS */}
        {filteredEvents.filter(e => e.status === 'Completed').length > 0 && (
          <div className="space-y-4">
            <h4 className="font-extrabold text-xs text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-3 bg-amber-500 rounded" />
              Past Completed Events ({filteredEvents.filter(e => e.status === 'Completed').length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.filter(e => e.status === 'Completed').map((evt) => (
                <div key={evt.id} className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/50 dark:border-neutral-850 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group opacity-85 hover:opacity-100">
                  <div className="h-40 relative bg-neutral-200 dark:bg-neutral-950 overflow-hidden shrink-0 filter grayscale group-hover:grayscale-0 transition-all duration-500">
                    <img 
                      src={evt.bannerImage || PRESET_BANNERS[0].url} 
                      alt={evt.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-0.5 bg-neutral-600 text-white text-[9px] font-mono tracking-wider font-extrabold rounded uppercase">
                        FINISHED
                      </span>
                    </div>
                  </div>

                  <div className="p-4.5 flex-1 flex flex-col justify-between space-y-4 text-left">
                    <div className="space-y-1.5">
                      <h5 className="font-extrabold text-xs text-neutral-900 dark:text-neutral-450 line-clamp-1">{evt.title}</h5>
                      <span className="text-[10px] font-mono text-neutral-400 block pb-1 border-b border-neutral-100 dark:border-neutral-800">Host: {evt.academyName}</span>
                    </div>

                    {/* Winner announcement sub-card (Premium Visual Flair) */}
                    {evt.winnerName ? (
                      <div className="p-2.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/40 dark:border-neutral-850 rounded-xl flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 overflow-hidden flex items-center justify-center shrink-0">
                          {evt.winnerPhoto ? (
                            <img src={evt.winnerPhoto} alt={evt.winnerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-3xs font-black text-amber-500">🏆</span>
                          )}
                        </div>
                        <div>
                          <p className="text-[9px] font-mono uppercase text-amber-500 font-extrabold flex items-center gap-1">
                            <span>🏆 CHAMPION RESOLVED</span>
                          </p>
                          <h6 className="text-[10px] font-black text-neutral-800 dark:text-white mt-0.5">{evt.winnerName}</h6>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-neutral-50/50 dark:bg-neutral-950/40 border border-dashed border-neutral-200 dark:border-neutral-850 rounded-xl text-center">
                        <p className="text-[10px] font-mono text-neutral-400 italic">No official champion logged.</p>
                      </div>
                    )}

                    <div className="flex gap-2 font-sans shrink-0">
                      <button
                        onClick={() => setSelectedEventForDetails(evt)}
                        className="flex-1 py-1.5 px-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-800 dark:text-neutral-200 text-3xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center leading-none"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => setSelectedEventForDetails(evt)}
                        className="flex-1 py-1.5 px-3 bg-neutral-950 hover:bg-neutral-850 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-amber-400 text-3xs font-black uppercase tracking-extrawide rounded-xl transition-all cursor-pointer text-center border border-amber-500/10 leading-none"
                      >
                        View Results
                      </button>

                      {canManageEvent(evt) && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => startEdit(evt)}
                            className="p-1 px-2.5 bg-neutral-150 hover:bg-neutral-200 dark:bg-neutral-800 hover:text-amber-500 rounded-lg transition-all cursor-pointer text-xs"
                            title="Edit Event"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EMPTY STATE BLOCK */}
        {filteredEvents.length === 0 && (
          <div className="py-16 text-center border border-dashed border-neutral-300 dark:border-neutral-800 rounded-3xl bg-white dark:bg-neutral-900/40 max-w-xl mx-auto space-y-4">
            <Layers className="w-10 h-10 text-neutral-405 mx-auto animate-pulse" />
            <div className="space-y-1">
              <h5 className="text-xs font-black text-neutral-800 dark:text-white uppercase tracking-wider">No Chess Events cataloged</h5>
              <p className="text-4xs text-neutral-450 font-mono">Modify search variables or create an administrative event to populate database.</p>
            </div>
            <button
              onClick={() => { setSearchQuery(''); setEventTypeFilter('All'); setStatusFilter('All'); setMyEventsOnly(false); }}
              className="py-1.5 px-4 bg-neutral-950 hover:bg-neutral-900 text-white dark:bg-neutral-800 text-5xs font-mono font-bold rounded-lg uppercase tracking-wider cursor-pointer border border-neutral-200/20"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* MODAL 1: Create or Edit Event Dialog */}
      {(isCreateModalOpen || isEditingEvent) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="w-full max-w-xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-220 dark:border-neutral-800 overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200">
            
            {/* Header */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200/60 dark:border-neutral-805 flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-xs text-neutral-950 dark:text-white uppercase tracking-wider">
                  {isEditingEvent ? 'Modify Event Variables' : 'Publish Chess Event'}
                </h4>
                <p className="text-[9px] font-mono text-neutral-400 mt-0.5">Define metadata matching parameters for live parent checkups.</p>
              </div>
              <button 
                onClick={() => { setIsCreateModalOpen(false); setIsEditingEvent(null); resetForm(); }}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={isEditingEvent ? handleEditSubmit : handleCreateSubmit} className="p-5 space-y-4 text-left max-h-[75vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-mono uppercase text-neutral-400 mb-1">Event Title *</label>
                  <input
                    type="text"
                    required
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-neutral-950 dark:text-neutral-100"
                    placeholder="Winter Championship 2026"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono uppercase text-neutral-400 mb-1">Event Type *</label>
                  <select
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-neutral-950 dark:text-neutral-100"
                    value={formEventType}
                    onChange={(e) => setFormEventType(e.target.value as any)}
                  >
                    <option value="Tournament">Tournament (Standard Bracket)</option>
                    <option value="Workshop">Workshop (Technical Session)</option>
                    <option value="Camp">Camp (Developmental Coaching)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono uppercase text-neutral-400 mb-1">Event Description *</label>
                <textarea
                  required
                  rows={3}
                  className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-neutral-950 dark:text-neutral-100 resize-none"
                  placeholder="Detailed layout of rules, rewards, and eligibility..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-mono uppercase text-neutral-400 mb-1">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-neutral-950 dark:text-neutral-100 font-mono"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono uppercase text-neutral-400 mb-1">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-neutral-950 dark:text-neutral-100 font-mono"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] font-mono uppercase text-neutral-400 mb-1">Venue Location *</label>
                  <input
                    type="text"
                    required
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-neutral-950 dark:text-neutral-100"
                    placeholder="Parasia Center / Zoom"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono uppercase text-neutral-400 mb-1">Entry Fee (INR) *</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-neutral-950 dark:text-neutral-100 font-mono"
                    value={formEntryFee}
                    onChange={(e) => setFormEntryFee(Number(e.target.value) || 0)}
                  />
                  <span className="text-[8px] text-neutral-400 mt-0.5 block font-mono">0 = Free Entry</span>
                </div>
                <div>
                  <label className="block text-[9px] font-mono uppercase text-neutral-400 mb-1">Max Player Slots *</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-neutral-950 dark:text-neutral-100 font-mono"
                    value={formMaxPlayers}
                    onChange={(e) => setFormMaxPlayers(Number(e.target.value) || 100)}
                  />
                </div>
              </div>

              {/* Banner Selector presets */}
              <div>
                <label className="block text-[9px] font-mono uppercase text-neutral-400 mb-1">Banner Image URL</label>
                <input
                  type="text"
                  className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-neutral-950 dark:text-neutral-100 font-mono"
                  placeholder="Paste URL or click preset below..."
                  value={formBannerImage}
                  onChange={(e) => setFormBannerImage(e.target.value)}
                />
                
                {/* Visual Preset selectors */}
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_BANNERS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setFormBannerImage(preset.url)}
                      className={`h-11 bg-neutral-100 dark:bg-neutral-950 border rounded-lg overflow-hidden relative cursor-pointer group flex items-center justify-center ${
                        formBannerImage === preset.url 
                          ? 'border-amber-500 ring-1 ring-amber-500/30' 
                          : 'border-neutral-100 dark:border-neutral-800'
                      }`}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" referrerPolicy="no-referrer" />
                      <span className="absolute bottom-1 bg-neutral-950/80 text-[8px] font-mono text-white px-1 leading-tight py-0.5 rounded uppercase font-black truncate max-w-[90%]">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin-only selection of academies */}
              {currentUser.role === 'admin' && (
                <div>
                  <label className="block text-[9px] font-mono uppercase text-neutral-400 mb-1">Academy Affiliation Category</label>
                  <select
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-neutral-950 dark:text-neutral-100"
                    value={formAcademyId}
                    onChange={(e) => setFormAcademyId(e.target.value)}
                  >
                    <option value="">All Academies (Global Public Event)</option>
                    {allUsers.filter(u => u.role === 'academy').map(aca => (
                      <option key={aca.uid} value={aca.uid}>{aca.academyName} ({aca.city})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status & Past Event Details Panel */}
              <div className="border-t border-neutral-150 dark:border-neutral-800/80 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-mono uppercase text-neutral-400 mb-1">Event Status</label>
                  <select
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-neutral-950 dark:text-neutral-100"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                  >
                    <option value="Upcoming">Upcoming (Open/Full)</option>
                    <option value="Live">Live (In Progress)</option>
                    <option value="Completed">Completed (Finalized)</option>
                  </select>
                </div>
                
                {formStatus === 'Completed' && (
                  <>
                    <div>
                      <label className="block text-[9px] font-mono uppercase text-neutral-400 mb-1 font-bold text-amber-500 flex items-center gap-1">
                        <span>🏆 Winner Name</span>
                      </label>
                      <input
                        type="text"
                        className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-neutral-950 dark:text-neutral-100"
                        placeholder="e.g. Siddharth Sharma"
                        value={formWinnerName}
                        onChange={(e) => setFormWinnerName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono uppercase text-neutral-400 mb-1">Winner Photo URL</label>
                      <input
                        type="text"
                        className="w-full text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 p-2.5 rounded-xl focus:outline-none focus:border-amber-500 text-neutral-950 dark:text-neutral-100 font-mono"
                        placeholder="Image Web URL..."
                        value={formWinnerPhoto}
                        onChange={(e) => setFormWinnerPhoto(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Submit Buttons */}
              <button
                type="submit"
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-2xs uppercase tracking-widest rounded-xl transition-all shadow cursor-pointer mt-2 text-center"
              >
                {isEditingEvent ? 'SAVE MODIFIED SETTINGS' : 'PUBLISH INTER-ACADEMY EVENT'}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Event Details Interactive Card */}
      {selectedEventForDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="w-full max-w-xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-2xl relative animate-in zoom-in duration-200 text-left">
            <div className="h-44 relative bg-neutral-100 dark:bg-neutral-950">
              <img 
                src={selectedEventForDetails.bannerImage || PRESET_BANNERS[0].url} 
                alt={selectedEventForDetails.title} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 to-transparent flex items-end p-5">
                <div>
                  <span className="px-2 py-0.5 bg-amber-500 text-neutral-950 text-[9px] font-mono tracking-wider font-extrabold rounded uppercase">
                    {selectedEventForDetails.eventType}
                  </span>
                  <h4 className="font-extrabold text-sm text-white uppercase mt-1 leading-tight tracking-wide">{selectedEventForDetails.title}</h4>
                  <p className="text-[10px] font-mono text-neutral-300 mt-1">Staged by: {selectedEventForDetails.academyName}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEventForDetails(null)}
                className="absolute top-4 right-4 p-2 bg-neutral-950/70 hover:bg-neutral-950 text-white rounded-full backdrop-blur-sm transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              
              {/* Core description details */}
              <div className="space-y-2">
                <h5 className="font-extrabold text-[10px] font-mono text-neutral-400 uppercase tracking-widest">ABOUT THE EVENT</h5>
                <p className="text-4xs text-neutral-600 dark:text-neutral-350 leading-relaxed font-sans">{selectedEventForDetails.description}</p>
              </div>

              {/* Data specifications */}
              <div className="grid grid-cols-2 gap-4 border-t border-b border-neutral-100 dark:border-neutral-800/60 py-4.5 text-[10px] text-neutral-450 font-mono">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-black text-neutral-700 dark:text-neutral-300">START DATE:</span>
                      <span className="text-4xs mt-0.5 block">{new Date(selectedEventForDetails.startDate).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-black text-neutral-700 dark:text-neutral-300">END DATE:</span>
                      <span className="text-4xs mt-0.5 block">{new Date(selectedEventForDetails.endDate).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-black text-neutral-700 dark:text-neutral-300">VENUE:</span>
                      <span className="text-4xs mt-0.5 block">{selectedEventForDetails.location}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-black text-neutral-700 dark:text-neutral-300">ENTRY FEES:</span>
                      <span className="text-4xs mt-0.5 block">{selectedEventForDetails.entryFee === 0 ? 'FREE ENTRY' : `₹${selectedEventForDetails.entryFee}`}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="flex items-center justify-between p-3.5 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/50 dark:border-neutral-850">
                <div className="flex items-center gap-2">
                  <Users className="w-4.5 h-4.5 text-neutral-400" />
                  <div>
                    <p className="text-[10px] font-mono text-neutral-450 leading-none">REGISTRATIONS LOAD</p>
                    <p className="text-xs font-black text-neutral-800 dark:text-white mt-1 leading-none">{selectedEventForDetails.registeredPlayers.length} / {selectedEventForDetails.maxPlayers} Registered</p>
                  </div>
                </div>

                {selectedEventForDetails.status === 'Completed' && selectedEventForDetails.winnerName && (
                  <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl text-right">
                    <span className="text-[8px] font-mono text-amber-500 font-extrabold uppercase">🏆 Winner: {selectedEventForDetails.winnerName}</span>
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="pt-2 font-sans">
                {currentUser.role === 'player' && (
                  <button
                    onClick={() => { handleRegisterClick(selectedEventForDetails); }}
                    disabled={selectedEventForDetails.registeredPlayers.length >= selectedEventForDetails.maxPlayers && !selectedEventForDetails.registeredPlayers.includes(currentUser.uid)}
                    className={`w-full py-3 px-4 font-black text-xs uppercase tracking-widest rounded-xl transition-all text-center shadow flex items-center justify-center gap-2 ${
                      selectedEventForDetails.registeredPlayers.includes(currentUser.uid)
                        ? 'bg-emerald-500 dark:bg-emerald-500 text-white'
                        : selectedEventForDetails.registeredPlayers.length >= selectedEventForDetails.maxPlayers
                          ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed shadow-none'
                          : 'bg-amber-500 hover:bg-amber-600 text-neutral-950 shadow'
                    }`}
                  >
                    {selectedEventForDetails.registeredPlayers.includes(currentUser.uid) ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>Congratulations! You are Registered</span>
                      </>
                    ) : selectedEventForDetails.registeredPlayers.length >= selectedEventForDetails.maxPlayers ? (
                      'Event Full'
                    ) : (
                      <span>REGISTER AND ACQUIRE SLOT ({selectedEventForDetails.entryFee === 0 ? 'FREE' : `Pay ₹${selectedEventForDetails.entryFee}`})</span>
                    )}
                  </button>
                )}

                {canManageEvent(selectedEventForDetails) && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSelectedEventForRegistrations(selectedEventForDetails); setSelectedEventForDetails(null); }}
                      className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer text-center"
                    >
                      <Users className="w-4 h-4" />
                      <span>Enrolled Student List</span>
                    </button>
                    <button
                      onClick={() => { startEdit(selectedEventForDetails); setSelectedEventForDetails(null); }}
                      className="py-3 px-5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-800 dark:text-neutral-200 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
                    >
                      Edit variables
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Registered Students / Registrations table */}
      {selectedEventForRegistrations && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="w-full max-w-3xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-2xl relative animate-in zoom-in duration-200 text-left">
            
            {/* Header */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200/60 dark:border-neutral-805 flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-xs text-neutral-950 dark:text-white uppercase tracking-wider">
                  {selectedEventForRegistrations.id === 'global_audits' ? 'Global Registration Roster' : `Registered Players list: ${selectedEventForRegistrations.title}`}
                </h4>
                <p className="text-[9px] font-mono text-neutral-400 mt-0.5 uppercase">
                  {selectedEventForRegistrations.id === 'global_audits' ? 'Audit nodes database registrations' : `Directly lists registered accounts containing ELO, phone numbers, and ages.`}
                </p>
              </div>
              <button 
                onClick={() => setSelectedEventForRegistrations(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List Table */}
            <div className="p-5 space-y-4">
              
              {/* Academy CSV Action button */}
              {selectedEventForRegistrations.id !== 'global_audits' && (
                <div className="flex justify-between items-center">
                  <p className="text-3xs text-neutral-450 font-mono">
                    Students Enrolled: <span className="text-neutral-850 dark:text-white font-bold">{selectedEventForRegistrations.registeredPlayers.length} / {selectedEventForRegistrations.maxPlayers}</span>
                  </p>
                  
                  <button
                    onClick={() => downloadRegisteredCSV(selectedEventForRegistrations)}
                    className="py-1.5 px-3.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-black text-[10px] tracking-wider uppercase rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5 font-sans"
                  >
                    <Download className="w-3.5 h-3.5 text-neutral-950" />
                    <span>Download CSV Report</span>
                  </button>
                </div>
              )}

              {/* Table rendering */}
              <div className="border border-neutral-200/60 dark:border-neutral-800 rounded-2xl overflow-hidden max-h-[40vh] overflow-y-auto">
                <table className="w-full text-left border-collapse text-[10px] font-mono">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200/50 dark:border-neutral-800 text-neutral-450">
                      <th className="p-3">Player Name</th>
                      <th className="p-3">Email ID / Phone</th>
                      <th className="p-3">Age</th>
                      <th className="p-3">ELO rating</th>
                      <th className="p-3">Affiliation Academy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                    {getRegPlayersInfo(selectedEventForRegistrations).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center italic text-neutral-400">
                          {selectedEventForRegistrations.id === 'global_audits' ? 'No system registrations found.' : 'No players have registered yet.'}
                        </td>
                      </tr>
                    ) : (
                      getRegPlayersInfo(selectedEventForRegistrations).map((p, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-950/20 text-neutral-750 dark:text-neutral-300">
                          <td className="p-3 font-bold font-sans text-neutral-900 dark:text-white">{p.fullName}</td>
                          <td className="p-3 leading-tight">
                            <span className="block">{p.email}</span>
                            <span className="text-neutral-400 text-4xs">{p.phone}</span>
                          </td>
                          <td className="p-3">{p.age}</td>
                          <td className="p-3 font-bold text-amber-500">{p.eloRating}</td>
                          <td className="p-3 opacity-90">{p.academyName}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedEventForRegistrations(null)}
                  className="py-2 px-4 bg-neutral-950 text-white dark:bg-neutral-800 text-3xs font-black uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  Close Drawer
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Razorpay checkout simulation */}
      {checkoutEvent && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex justify-center items-center p-4">
          <div className="w-full max-w-sm bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            
            {/* Payment Header */}
            <div className="p-5 bg-neutral-950 border-b border-neutral-850 text-center relative">
              <span className="block text-4xs font-mono uppercase tracking-widest text-emerald-500 font-bold">Secure Gateway Payment</span>
              <h4 className="font-extrabold text-sm text-white uppercase mt-1 leading-tight">CheckMate Razorpay Node</h4>
              <p className="text-[10px] text-neutral-400 mt-1 font-mono">{checkoutEvent.title}</p>
              
              {paymentStep !== 'processing' && (
                <button 
                  onClick={() => setCheckoutEvent(null)}
                  className="absolute top-4 right-4 p-1 rounded hover:bg-neutral-850 text-neutral-400 hover:text-white cursor-pointer transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Payment Container */}
            <div className="p-6 text-center space-y-5">
              {paymentStep === 'idle' && (
                <div className="space-y-4">
                  <div className="py-4 bg-neutral-950 border border-neutral-800 rounded-2xl">
                    <span className="text-[9px] font-mono text-neutral-500 uppercase">AMOUNT PAYABLE</span>
                    <p className="text-xl font-black text-emerald-400 mt-1">₹{checkoutEvent.entryFee}.00</p>
                    <span className="text-[8px] font-mono text-neutral-450 mt-1 block">Includes standard GST + Franchise processing</span>
                  </div>

                  <div className="text-left space-y-1.5">
                    <label className="block text-[8px] font-mono uppercase text-neutral-400">CONTACT MOBILE FOR RECEIPT</label>
                    <input
                      type="text"
                      className="w-full text-xs bg-neutral-950 border border-neutral-800 p-2.5 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                      value={paymentPhone}
                      onChange={(e) => setPaymentPhone(e.target.value)}
                      placeholder="e.g. +91 9999.."
                    />
                  </div>

                  <p className="text-[8px] font-mono text-neutral-550 leading-relaxed text-left">
                    By confirming this simulated transaction, you authorize Sumeet Rasela network to add your userId to the active registrations database.
                  </p>

                  <button
                    onClick={triggerSimulatedRazorpay}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-650 text-neutral-950 font-black text-3xs uppercase tracking-widest rounded-xl transition-all shadow cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>CONFIRM SIMULATED Rs. {checkoutEvent.entryFee} PAY</span>
                  </button>
                </div>
              )}

              {paymentStep === 'processing' && (
                <div className="py-10 space-y-4">
                  <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-white uppercase tracking-wider animate-pulse">authorizing payment...</p>
                    <p className="text-5xs font-mono text-neutral-400">PINGING RAZORPAY SERVER GATEWAY INTERFACE</p>
                  </div>
                </div>
              )}

              {paymentStep === 'success' && (
                <div className="py-8 space-y-4 animate-in zoom-in duration-300">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6 text-[1.5rem] font-bold text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-black text-emerald-400 uppercase tracking-widest">TRANSACTION VERIFIED</h5>
                    <p className="text-5xs font-mono text-neutral-450 mt-1 leading-relaxed">Receipt dispatched. Your registry matches have been synced with checkmate core.</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
