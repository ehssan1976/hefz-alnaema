import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Users,
  MapPin,
  Clock,
  ShieldCheck,
  Truck,
  QrCode,
  Award,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Utensils,
  Search,
  X,
  Flame,
  Snowflake,
  Package,
  Home,
  Building2,
  UserCheck,
  Smartphone,
  Monitor,
  LayoutGrid,
  ChevronLeft
} from 'lucide-react';
import {
  INITIAL_LISTINGS,
  LEADERBOARD,
  VERIFIED_RECIPIENTS,
  INITIAL_FAMILY_NEEDS,
} from './data/mockData';

export default function App() {
  // Tabs: 'home' | 'explore' | 'families' | 'provider' | 'driver' | 'impact'
  const [activeTab, setActiveTab] = useState('home');
  // Toggle between Mobile Phone Frame simulator (default on desktop for easy preview) and Full Width
  const [isMobileFrame, setIsMobileFrame] = useState(true);

  const [selectedModel, setSelectedModel] = useState('all'); // all | charity | commercial | community | zerowaste
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState(INITIAL_LISTINGS);
  const [familyNeeds, setFamilyNeeds] = useState(INITIAL_FAMILY_NEEDS);
  const [selectedListing, setSelectedListing] = useState(null); // QR Modal
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false);
  const [notification, setNotification] = useState(null);

  // Pre-selected recipient & delivery mode per listing
  const [recipientSelections, setRecipientSelections] = useState({});
  const [deliveryModeSelections, setDeliveryModeSelections] = useState({});

  // Driver verification state (any ONE method is sufficient)
  const [pinInputs, setPinInputs] = useState({});
  const [verificationMethods, setVerificationMethods] = useState({}); // 'pin' | 'contactless' | 'beneficiary_ack'

  // Provider new listing state
  const [newItem, setNewItem] = useState({
    title: '',
    providerName: '',
    providerType: 'مطعم / كافيه',
    modelType: 'charity',
    preselectedRecipient: VERIFIED_RECIPIENTS[0].name,
    quantity: '',
    weightKg: 10,
    originalPrice: 50,
    discountedPrice: 18,
    storageCode: 'hot',
    remainingMinutes: 180,
    district: 'حي الياسمين',
    allergens: 'لا يوجد',
    pickupWindow: 'خلال ساعتين',
    safetyFresh: true,
    safetyPackaged: true,
    safetyTemp: true,
  });

  // New Needy Family Need registration state
  const [newFamilyNeed, setNewFamilyNeed] = useState({
    familyCode: '',
    membersCount: 5,
    district: 'حي الياسمين',
    neededMeal: '',
    verifiedBy: 'جمعية إطعام الخيرية بالحي',
    preferredPickupMode: 'courier',
  });

  // Live countdown every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setListings((prev) =>
        prev.map((item) => ({
          ...item,
          remainingMinutes: Math.max(0, item.remainingMinutes - 1),
        }))
      );
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtered listings
  const filteredListings = listings.filter((item) => {
    const matchesModel = selectedModel === 'all' || item.modelType === selectedModel;
    const matchesSearch =
      item.title.includes(searchQuery) ||
      item.providerName.includes(searchQuery) ||
      item.district.includes(searchQuery);
    return matchesModel && matchesSearch;
  });

  // Impact metrics
  const totalSavedMeals = 14820 + listings.filter((l) => l.status === 'delivered').length * 20;
  const totalWeightKg = 11450 + listings.reduce((acc, item) => acc + Number(item.weightKg || 0), 0);
  const totalCo2SavedKg = Math.round(totalWeightKg * 2.5);

  const getSelectedRecipient = (listing) => {
    return (
      recipientSelections[listing.id] ||
      listing.reservedBy ||
      listing.preselectedRecipient ||
      VERIFIED_RECIPIENTS[0].name
    );
  };

  const getSelectedDeliveryMode = (listing) => {
    return deliveryModeSelections[listing.id] || listing.deliveryMode || 'courier';
  };

  // Reserve / Book meal
  const handleReserve = (listing, explicitBeneficiary = null, explicitMode = null) => {
    const chosenRecipient = explicitBeneficiary || getSelectedRecipient(listing);
    const chosenMode = explicitMode || getSelectedDeliveryMode(listing);

    if (!chosenRecipient) {
      showToast('يرجى تحديد مستلم الوجبة أولاً!', 'error');
      return;
    }

    const assignedCourier =
      chosenMode === 'direct_pickup'
        ? 'استلام مباشر من العائلة من المتبرع (بدون مندوب)'
        : listing.assignedDriver || 'سلمان الحربي (مندوب متطوع)';

    setListings((prev) =>
      prev.map((item) =>
        item.id === listing.id
          ? {
              ...item,
              status: 'reserved',
              preselectedRecipient: chosenRecipient,
              reservedBy: chosenRecipient,
              deliveryMode: chosenMode,
              assignedDriver: assignedCourier,
            }
          : item
      )
    );
    const updated = {
      ...listing,
      status: 'reserved',
      preselectedRecipient: chosenRecipient,
      reservedBy: chosenRecipient,
      deliveryMode: chosenMode,
      assignedDriver: assignedCourier,
    };
    setSelectedListing(updated);
    showToast(
      chosenMode === 'direct_pickup'
        ? `تم الحجز بنجاح! ستستلم (${chosenRecipient}) الوجبة مباشرة من المتبرع.`
        : `تم الحجز للمستلم (${chosenRecipient}) وتفعيل المندوب!`
    );
  };

  // Driver Handover Verification (Any ONE method is sufficient, blocked before booking)
  const handleVerifyDelivery = (listing, overrideMethod = null) => {
    if (listing.status === 'available' || !listing.reservedBy) {
      showToast('لا يمكن تأكيد الاستلام قبل حجز الوجبة وتحديد المستلم أولاً!', 'error');
      return;
    }

    const method = overrideMethod || verificationMethods[listing.id] || 'pin';
    const methodLabels = {
      pin: 'كود الاستلام الرقمي (PIN / QR)',
      contactless: 'تسليم عند الباب (GPS بدون تلامس)',
      beneficiary_ack: 'تأكيد مباشر من جوال العائلة',
    };

    if (method === 'pin') {
      const enteredPin = pinInputs[listing.id] || '';
      if (enteredPin !== listing.verificationCode && enteredPin !== '0000') {
        showToast(`الكود غير صحيح! للتجربة أدخل: ${listing.verificationCode}`, 'error');
        return;
      }
    }

    setListings((prev) =>
      prev.map((item) =>
        item.id === listing.id
          ? {
              ...item,
              status: 'delivered',
              deliveryMethodLabel: methodLabels[method],
            }
          : item
      )
    );
    showToast(`تم توثيق تسليم الوجبة لـ (${listing.reservedBy}) بنجاح! (+150 نقطة)`);
  };

  // Add new listing from Provider
  const handleAddListing = (e) => {
    e.preventDefault();
    if (!newItem.safetyFresh || !newItem.safetyPackaged || !newItem.safetyTemp) {
      showToast('يرجى التأشير على إقرار السلامة الغذائية أولاً.', 'error');
      return;
    }

    const modelLabels = {
      charity: 'تبرع خيري مجاني',
      commercial: 'بيع مخفض',
      community: 'مشاركة الجيران',
      zerowaste: 'صفر هدر (للأسمدة)',
    };

    const storageLabels = {
      hot: 'ساخن (> 60°C)',
      chilled: 'مبرد (4°C)',
      dry: 'جاف / عادي',
    };

    const generatedCode = String(Math.floor(1000 + Math.random() * 9000));
    const created = {
      id: `NMA-${Math.floor(200 + Math.random() * 799)}`,
      title: newItem.title || 'وجبات طازجة فائضة',
      providerName: newItem.providerName || 'مشارك في حفظ النعمة',
      providerType: newItem.providerType,
      modelType: newItem.modelType,
      modelLabel: modelLabels[newItem.modelType],
      quantity: newItem.quantity || '15 وجبة',
      weightKg: Number(newItem.weightKg) || 10,
      originalPrice: Number(newItem.originalPrice) || 0,
      discountedPrice: Number(newItem.discountedPrice) || 0,
      discountPercent: 100,
      storageCondition: storageLabels[newItem.storageCode],
      storageCode: newItem.storageCode,
      remainingMinutes: Number(newItem.remainingMinutes) || 180,
      distanceKm: Number((0.4 + Math.random() * 2.5).toFixed(1)),
      district: newItem.district,
      coordinates: { x: 50, y: 50 },
      safetyVerified: true,
      packagingStatus: 'مغلف صحياً وجاهز للتسليم',
      allergens: newItem.allergens,
      pickupWindow: newItem.pickupWindow,
      verificationCode: generatedCode,
      status: 'available',
      preselectedRecipient: newItem.preselectedRecipient || VERIFIED_RECIPIENTS[0].name,
      reservedBy: null,
      assignedDriver: null,
    };

    setListings([created, ...listings]);
    setNewItem({ ...newItem, title: '', quantity: '' });
    showToast(`تم نشر الوجبة وتحديد المستلم (${created.preselectedRecipient})! كود #${generatedCode}`);
    setActiveTab('explore');
  };

  // Add Family Need
  const handleAddFamilyNeed = (e) => {
    e.preventDefault();
    const createdNeed = {
      id: `FAM-${Math.floor(600 + Math.random() * 399)}`,
      familyCode: newFamilyNeed.familyCode || 'أسرة متعففة بالحي',
      membersCount: Number(newFamilyNeed.membersCount) || 5,
      district: newFamilyNeed.district,
      neededMeal: newFamilyNeed.neededMeal || 'وجبات عشاء ساخنة للأسرة',
      priority: 'عاجل اليوم',
      verifiedBy: newFamilyNeed.verifiedBy,
      preferredPickupMode: newFamilyNeed.preferredPickupMode,
      preferredPickupLabel:
        newFamilyNeed.preferredPickupMode === 'direct_pickup'
          ? 'استلام مباشر من العائلة من المتبرع'
          : 'توصيل لباب المنزل عبر المندوب / الجمعية',
      status: 'waiting',
    };
    setFamilyNeeds([createdNeed, ...familyNeeds]);
    setNewFamilyNeed({ ...newFamilyNeed, familyCode: '', neededMeal: '' });
    setShowAddFamilyModal(false);
    showToast(`تم تسجيل احتياج (${createdNeed.familyCode}) في ${createdNeed.district} بنجاح!`);
  };

  // Match family with an available meal
  const handleMatchFamilyWithMeal = (family) => {
    const availableMeal = listings.find((l) => l.status === 'available');
    if (!availableMeal) {
      showToast('لا توجد وجبة غير محجوزة حالياً؛ أضف وجبة من قسم المطعم أولاً.', 'error');
      return;
    }
    setFamilyNeeds((prev) =>
      prev.map((f) =>
        f.id === family.id ? { ...f, status: 'matched', matchedMealTitle: availableMeal.title } : f
      )
    );
    handleReserve(
      availableMeal,
      `${family.familyCode} (${family.district})`,
      family.preferredPickupMode
    );
  };

  const formatTimeRemaining = (minutes) => {
    if (minutes <= 0) return 'انتهت المهلة';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) return `${hrs} س و ${mins} د`;
    return `${mins} دقيقة`;
  };

  const getStorageBadge = (code, label) => {
    if (code === 'hot') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          <Flame className="w-3 h-3" /> {label}
        </span>
      );
    }
    if (code === 'chilled') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
          <Snowflake className="w-3 h-3" /> {label}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
        <Package className="w-3 h-3" /> {label}
      </span>
    );
  };

  const reservedCount = listings.filter((l) => l.status === 'reserved').length;
  const waitingFamiliesCount = familyNeeds.filter((f) => f.status === 'waiting').length;

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-start ${
        isMobileFrame ? 'bg-slate-900 sm:py-6 sm:px-4' : 'bg-slate-100'
      }`}
    >
      {/* Top Desktop Switcher Bar (allows viewing as Mobile Phone Frame or Full Screen) */}
      <div className="hidden sm:flex items-center justify-between w-full max-w-md mb-3 px-3 py-2 rounded-2xl bg-slate-800/90 text-slate-200 text-xs border border-slate-700">
        <span className="font-bold flex items-center gap-1.5">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          واجهة تطبيق الهاتف النقال
        </span>
        <button
          type="button"
          onClick={() => setIsMobileFrame(!isMobileFrame)}
          className="px-2.5 py-1 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center gap-1 transition-all"
        >
          {isMobileFrame ? (
            <>
              <Monitor className="w-3.5 h-3.5" />
              <span>تكبير للشاشة الكاملة</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5" />
              <span>إطار الجوال</span>
            </>
          )}
        </button>
      </div>

      {/* MOBILE APP SHELL */}
      <div
        className={`w-full flex flex-col bg-slate-50 text-slate-900 relative overflow-hidden ${
          isMobileFrame
            ? 'max-w-[430px] min-h-screen sm:min-h-[820px] sm:max-h-[880px] sm:rounded-[42px] sm:border-[10px] sm:border-slate-800 sm:shadow-2xl'
            : 'max-w-3xl min-h-screen shadow-sm'
        }`}
      >
        {/* Toast Notification inside Mobile Screen */}
        {notification && (
          <div
            className={`fixed sm:absolute top-16 inset-x-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold ${
              notification.type === 'error'
                ? 'bg-rose-950 text-white border-rose-700'
                : 'bg-emerald-950 text-white border-emerald-700'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <p className="leading-relaxed">{notification.msg}</p>
          </div>
        )}

        {/* MOBILE TOP APP BAR */}
        <header className="sticky top-0 z-30 bg-emerald-700 text-white px-4 pt-3 pb-3.5 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {activeTab !== 'home' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('home')}
                  className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center"
                  title="العودة للرئيسية"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
              )}
              <div className="w-9 h-9 rounded-xl bg-white text-emerald-700 flex items-center justify-center font-black shadow-sm">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-black leading-tight">تطبيق «نِعمة»</h1>
                <p className="text-[11px] text-emerald-100">حفظ النعمة وإطعام العوائل المتعففة</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('impact')}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-800/80 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1"
            >
              <Award className="w-3.5 h-3.5 text-amber-300" />
              <span>{totalSavedMeals.toLocaleString('en-US')} وجبة</span>
            </button>
          </div>
        </header>

        {/* SCROLLABLE MOBILE CONTENT BODY */}
        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-4">
          {/* ==================== SCREEN 0: HOME (EASY 4-ROLE LAUNCHER WITH EMBLEMS) ==================== */}
          {activeTab === 'home' && (
            <div className="space-y-4">
              {/* Welcome Banner */}
              <div className="bg-gradient-to-br from-emerald-900 to-teal-900 text-white rounded-3xl p-4 shadow-sm">
                <span className="text-[11px] font-bold text-emerald-300 block mb-1">
                  واجهة سهلة وسريعة للهاتف النقال
                </span>
                <h2 className="text-lg font-black mb-1">اختر القسم الخاص بك للبدء:</h2>
                <p className="text-xs text-emerald-100/90 leading-relaxed">
                  كل قسم يحمل شعاراً واضحاً يربط المتبرع والجمعية الخيرية والمندوب بالعائلة المحتاجة بكل سهولة.
                </p>
              </div>

              {/* 4 Big Emblem Cards for Mobile Touch */}
              <div className="grid grid-cols-1 gap-3">
                {/* 1. Charity / Reserve Meals Emblem */}
                <button
                  type="button"
                  onClick={() => setActiveTab('explore')}
                  className="w-full bg-white hover:bg-emerald-50/60 active:scale-[0.99] p-4 rounded-3xl border-2 border-emerald-200 shadow-sm flex items-center justify-between text-right transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-inner">
                      <Building2 className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-900">
                          الجمعية الخيرية وحجز الوجبات
                        </span>
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {listings.filter((l) => l.status === 'available').length} متاح
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        تصفح الوجبات المتوفرة، حدد العائلة المستلمة، واحجزها بلمسة واحدة
                      </p>
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-slate-400 shrink-0" />
                </button>

                {/* 2. Needy Families Emblem */}
                <button
                  type="button"
                  onClick={() => setActiveTab('families')}
                  className="w-full bg-white hover:bg-rose-50/60 active:scale-[0.99] p-4 rounded-3xl border-2 border-rose-200 shadow-sm flex items-center justify-between text-right transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-inner">
                      <Home className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-900">
                          العوائل المتعففة بالأحياء
                        </span>
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          {waitingFamiliesCount} عائلة بانتظار وجبة
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        إثبات احتياج العوائل بالحي مع خيار التوصيل أو الاستلام المباشر من المتبرع
                      </p>
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-slate-400 shrink-0" />
                </button>

                {/* 3. Restaurant / Donor Emblem */}
                <button
                  type="button"
                  onClick={() => setActiveTab('provider')}
                  className="w-full bg-white hover:bg-amber-50/60 active:scale-[0.99] p-4 rounded-3xl border-2 border-amber-200 shadow-sm flex items-center justify-between text-right transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-inner">
                      <Utensils className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-base font-black text-slate-900 block">
                        المطعم / المتبرع بالوجبات
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        أضف فائض الطعام وحدد المستلم مسبقاً وتابع وصول وجباتك للعوائل
                      </p>
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-slate-400 shrink-0" />
                </button>

                {/* 4. Delivery Courier Emblem */}
                <button
                  type="button"
                  onClick={() => setActiveTab('driver')}
                  className="w-full bg-white hover:bg-indigo-50/60 active:scale-[0.99] p-4 rounded-3xl border-2 border-indigo-200 shadow-sm flex items-center justify-between text-right transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-inner">
                      <Truck className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-900">
                          مندوب التوصيل التطوعي
                        </span>
                        {reservedCount > 0 && (
                          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                            {reservedCount} جاهز للتوصيل
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        استلام الوجبات المحجوزة وتأكيد تسليمها للعائلة بأي وسيلة واحدة تكفي
                      </p>
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-slate-400 shrink-0" />
                </button>
              </div>

              {/* Quick Summary Footer Card */}
              <div className="bg-white rounded-3xl p-4 border border-slate-200 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[11px] text-slate-400 block">وجبات مُنقاذة</span>
                  <span className="text-sm font-black text-emerald-700">
                    {totalSavedMeals.toLocaleString('en-US')}
                  </span>
                </div>
                <div className="border-x border-slate-100">
                  <span className="text-[11px] text-slate-400 block">عوائل مستفيدة</span>
                  <span className="text-sm font-black text-rose-700">{familyNeeds.length} أسر بالحي</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">حماية المناخ</span>
                  <span className="text-sm font-black text-teal-700">{totalCo2SavedKg} كجم</span>
                </div>
              </div>
            </div>
          )}

          {/* ==================== SCREEN 1: EXPLORE & BOOK MEALS (CHARITY / BENEFICIARY) ==================== */}
          {activeTab === 'explore' && (
            <div className="space-y-3.5">
              {/* Section Header Emblem */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-emerald-950">
                    قسم الجمعية الخيرية وحجز الوجبات
                  </h2>
                  <p className="text-[11px] text-emerald-800">
                    حدد العائلة المستلمة وطريقة الاستلام (توصيل بمندوب أو استلام مباشر من العائلة)
                  </p>
                </div>
              </div>

              {/* Search & Quick Filter Pills */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن وجبة أو حي سكني..."
                    className="w-full pr-9 pl-3 py-2.5 text-xs rounded-2xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[
                    { id: 'all', label: 'الكل' },
                    { id: 'charity', label: 'تبرع خيري' },
                    { id: 'community', label: 'جيران الحي' },
                    { id: 'commercial', label: 'مخفض' },
                    { id: 'zerowaste', label: 'للأسمدة' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedModel(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                        selectedModel === tab.id
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simplified Mobile Meal Cards */}
              <div className="space-y-3.5">
                {filteredListings.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {getStorageBadge(item.storageCode, item.storageCondition)}
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {item.district} • {item.distanceKm} كم
                          </span>
                        </div>
                        <h3 className="text-sm font-black text-slate-900">{item.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          المتبرع: <strong className="text-slate-800">{item.providerName}</strong>
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-black text-xs shrink-0 border border-emerald-200">
                        {item.modelType === 'commercial' ? `${item.discountedPrice} ر.س` : 'مجاناً'}
                      </span>
                    </div>

                    {/* Quantity & Time */}
                    <div className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-2xl border border-slate-100">
                      <span className="font-bold text-slate-700">الكمية: {item.quantity}</span>
                      <span className="font-bold text-amber-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        متبقي {formatTimeRemaining(item.remainingMinutes)}
                      </span>
                    </div>

                    {/* Pre-selected Recipient & Delivery Mode Box */}
                    <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5 text-xs">
                      <div>
                        <label className="block font-extrabold text-emerald-950 mb-1">
                          {item.status === 'available'
                            ? '1. حدد المستلم (ليكون معروفاً لدى المتبرع):'
                            : 'المستلم المعتمد لدى المتبرع:'}
                        </label>
                        {item.status === 'available' ? (
                          <select
                            value={getSelectedRecipient(item)}
                            onChange={(e) =>
                              setRecipientSelections({
                                ...recipientSelections,
                                [item.id]: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white font-bold text-emerald-900 text-xs"
                          >
                            {VERIFIED_RECIPIENTS.map((rec) => (
                              <option key={rec.id} value={rec.name}>
                                {rec.name} ({rec.district})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="font-extrabold text-emerald-800 bg-white px-3 py-1.5 rounded-xl border border-emerald-200">
                            {item.reservedBy}
                          </div>
                        )}
                      </div>

                      {/* Delivery Option: Courier vs Direct Pickup by Family */}
                      <div>
                        <span className="block font-extrabold text-emerald-950 mb-1">
                          2. طريقة استلام العائلة للوجبة:
                        </span>
                        {item.status === 'available' ? (
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setDeliveryModeSelections({
                                  ...deliveryModeSelections,
                                  [item.id]: 'courier',
                                })
                              }
                              className={`py-2 px-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 border transition-all ${
                                getSelectedDeliveryMode(item) === 'courier'
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-200'
                              }`}
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>توصيل بمندوب</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeliveryModeSelections({
                                  ...deliveryModeSelections,
                                  [item.id]: 'direct_pickup',
                                })
                              }
                              className={`py-2 px-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 border transition-all ${
                                getSelectedDeliveryMode(item) === 'direct_pickup'
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-200'
                              }`}
                            >
                              <Home className="w-3.5 h-3.5" />
                              <span>استلام مباشر من العائلة</span>
                            </button>
                          </div>
                        ) : (
                          <div className="font-bold text-indigo-900 bg-white px-3 py-1.5 rounded-xl border border-indigo-200">
                            {item.deliveryMode === 'direct_pickup'
                              ? 'استلام مباشر من العائلة من المتبرع'
                              : 'توصيل عبر المندوب / الجمعية'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Big Mobile Action Button */}
                    {item.status === 'available' ? (
                      <button
                        type="button"
                        onClick={() => handleReserve(item)}
                        className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {getSelectedDeliveryMode(item) === 'direct_pickup'
                            ? 'تأكيد الحجز (استلام مباشر من العائلة)'
                            : 'تأكيد حجز الوجبة وتفعيل المندوب'}
                        </span>
                      </button>
                    ) : item.status === 'reserved' ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex-1 py-2.5 px-3 rounded-2xl bg-amber-100 text-amber-900 font-extrabold text-xs text-center">
                          محجوزة لـ ({item.reservedBy})
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedListing(item)}
                          className="py-2.5 px-3 rounded-2xl bg-slate-900 text-white font-bold text-xs flex items-center gap-1"
                        >
                          <QrCode className="w-4 h-4" />
                          <span>الكود</span>
                        </button>
                      </div>
                    ) : (
                      <div className="w-full py-2.5 rounded-2xl bg-emerald-100 text-emerald-800 font-extrabold text-xs text-center">
                        ✓ تم تسليم الوجبة للمستلم ({item.reservedBy})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== SCREEN 2: NEEDY FAMILIES IN DISTRICTS ==================== */}
          {activeTab === 'families' && (
            <div className="space-y-3.5">
              {/* Emblem Header */}
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                    <Home className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-rose-950">العوائل المتعففة بالأحياء</h2>
                    <p className="text-[11px] text-rose-800">
                      تُكتشف بواسطة الجمعية أو المناديب مع خيار الاستلام المباشر
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddFamilyModal(true)}
                  className="px-3 py-2 rounded-xl bg-rose-600 text-white font-extrabold text-xs shrink-0 shadow-sm"
                >
                  + تسجيل عائلة
                </button>
              </div>

              {/* Family Cards */}
              <div className="space-y-3">
                {familyNeeds.map((fam) => (
                  <div
                    key={fam.id}
                    className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                          <Home className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900">{fam.familyCode}</h3>
                          <span className="text-[11px] text-slate-500 font-bold">
                            {fam.district} • {fam.membersCount} أفراد
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          fam.status === 'matched'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {fam.status === 'matched' ? 'تم حجز وجبة لها' : fam.priority}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                      <div>
                        <span className="text-slate-500">احتياج العائلة: </span>
                        <strong className="text-slate-900">{fam.neededMeal}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">تم التوثيق عبر: </span>
                        <strong className="text-emerald-700">{fam.verifiedBy}</strong>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200/70 flex items-center justify-between gap-2">
                        <span className="text-slate-500">طريقة الاستلام:</span>
                        <button
                          type="button"
                          onClick={() =>
                            setFamilyNeeds((prev) =>
                              prev.map((f) =>
                                f.id === fam.id
                                  ? {
                                      ...f,
                                      preferredPickupMode:
                                        f.preferredPickupMode === 'direct_pickup'
                                          ? 'courier'
                                          : 'direct_pickup',
                                      preferredPickupLabel:
                                        f.preferredPickupMode === 'direct_pickup'
                                          ? 'توصيل لباب المنزل عبر المندوب / الجمعية'
                                          : 'استلام مباشر من العائلة من المتبرع',
                                    }
                                  : f
                              )
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] ${
                            fam.preferredPickupMode === 'direct_pickup'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {fam.preferredPickupMode === 'direct_pickup'
                            ? '🏠 استلام مباشر من العائلة من المتبرع (اضغط للتبديل)'
                            : '🚚 توصيل عبر المندوب/الجمعية (اضغط للتبديل)'}
                        </button>
                      </div>
                    </div>

                    {fam.status === 'waiting' ? (
                      <button
                        type="button"
                        onClick={() => handleMatchFamilyWithMeal(fam)}
                        className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>حجز وجبة متوفرة لهذه العائلة الآن</span>
                      </button>
                    ) : (
                      <div className="w-full py-2 rounded-2xl bg-emerald-50 text-emerald-800 font-extrabold text-xs text-center border border-emerald-200">
                        ✓ تم تخصيص: {fam.matchedMealTitle}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== SCREEN 3: RESTAURANT / DONOR PORTAL ==================== */}
          {activeTab === 'provider' && (
            <div className="space-y-4">
              {/* Emblem Header */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <Utensils className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-amber-950">قسم المطعم / المتبرع</h2>
                  <p className="text-[11px] text-amber-800">
                    أضف وجبة فائضة في ثوانٍ وحدد المستلم مسبقاً
                  </p>
                </div>
              </div>

              {/* Simple Mobile Donor Form */}
              <form
                onSubmit={handleAddListing}
                className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-3 text-xs"
              >
                <h3 className="font-black text-sm text-slate-900">إضافة وجبات فائضة جديدة</h3>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم الوجبة والكمية *</label>
                  <input
                    type="text"
                    required
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                    placeholder="مثال: 20 وجبة أرز ودجاج ساخنة ومغلفة"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">اسم المطعم / المتبرع *</label>
                    <input
                      type="text"
                      required
                      value={newItem.providerName}
                      onChange={(e) => setNewItem({ ...newItem, providerName: e.target.value })}
                      placeholder="مثال: مطعم الرومانسية"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">الحي / الموقع *</label>
                    <input
                      type="text"
                      required
                      value={newItem.district}
                      onChange={(e) => setNewItem({ ...newItem, district: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">عدد الوجبات *</label>
                    <input
                      type="text"
                      required
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                      placeholder="مثال: 20 وجبة"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">حالة الحرارة</label>
                    <select
                      value={newItem.storageCode}
                      onChange={(e) => setNewItem({ ...newItem, storageCode: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    >
                      <option value="hot">ساخن (&gt; 60°C)</option>
                      <option value="chilled">مبرد (4°C)</option>
                      <option value="dry">جاف / عادي</option>
                    </select>
                  </div>
                </div>

                {/* Pre-select Recipient */}
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <label className="block font-extrabold text-emerald-950 mb-1">
                    تحديد المستلم مسبقاً (الجمعية أو العائلة المستفيدة):
                  </label>
                  <select
                    value={newItem.preselectedRecipient}
                    onChange={(e) =>
                      setNewItem({ ...newItem, preselectedRecipient: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white font-bold text-emerald-900"
                  >
                    {VERIFIED_RECIPIENTS.map((rec) => (
                      <option key={rec.id} value={rec.name}>
                        {rec.name} ({rec.district})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-sm"
                >
                  نشر الوجبة وإشعار المستلم فوراً
                </button>
              </form>

              {/* Donor's Active Meals & Known Recipients */}
              <div className="bg-white rounded-3xl p-4 border border-slate-200 space-y-2.5">
                <h3 className="font-black text-xs text-slate-900">
                  سجل وجبات المتبرع والمستلم المحدد لكل وجبة:
                </h3>
                {listings.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 line-clamp-1">{item.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          item.status === 'available'
                            ? 'bg-slate-200 text-slate-700'
                            : item.status === 'reserved'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.status === 'available'
                          ? 'متاح للحجز'
                          : item.status === 'reserved'
                          ? 'محجوز'
                          : 'تم التسليم'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      المستلم: <strong className="text-emerald-800">{item.reservedBy || getSelectedRecipient(item)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== SCREEN 4: DRIVER / COURIER PORTAL ==================== */}
          {activeTab === 'driver' && (
            <div className="space-y-3.5">
              {/* Emblem Header */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-indigo-950">قسم مندوب التوصيل</h2>
                  <p className="text-[11px] text-indigo-800">
                    لا يتفعل الاستلام إلا بعد حجز الوجبة • وتكفي أي وسيلة واحدة لتأكيد التسليم
                  </p>
                </div>
              </div>

              {listings.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800">
                      شحنة #{item.id}
                    </span>
                    {getStorageBadge(item.storageCode, item.storageCondition)}
                  </div>

                  <h3 className="text-sm font-black text-slate-900">{item.title}</h3>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">من (المتبرع):</span>
                      <strong className="text-slate-900">{item.providerName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">إلى (المستلم):</span>
                      <strong className="text-emerald-700">
                        {item.reservedBy || `${getSelectedRecipient(item)} (غير محجوز بعد)`}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">طريقة التسليم:</span>
                      <strong className="text-indigo-700">
                        {item.deliveryMode === 'direct_pickup'
                          ? 'استلام مباشر من العائلة من المتبرع'
                          : 'توصيل عبر المندوب'}
                      </strong>
                    </div>
                  </div>

                  {/* Strict Lock if Meal is Not Yet Reserved */}
                  {item.status === 'available' ? (
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-2">
                      <div className="flex items-center gap-1.5 font-extrabold text-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>مقفل: لم يتم حجز الوجبة بعد!</span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        لا يمكن للمندوب استلام أو تسليم الوجبة قبل حجزها وتأكيد مستلمها أولاً.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleReserve(item)}
                        className="w-full py-2 rounded-xl bg-amber-600 text-white font-bold text-xs"
                      >
                        تأكيد حجز الوجبة أولاً لتفعيل الاستلام
                      </button>
                    </div>
                  ) : item.status === 'delivered' ? (
                    <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-900 text-xs text-center space-y-0.5">
                      <div className="font-black flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تم التسليم لـ ({item.reservedBy})</span>
                      </div>
                      {item.deliveryMethodLabel && (
                        <span className="text-[11px] block text-emerald-700">
                          عبر: {item.deliveryMethodLabel}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-800">
                          تأكيد التسليم (اختر طريقة واحدة فقط):
                        </span>
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                          أي واحدة تكفي
                        </span>
                      </div>

                      {/* 3 Flexible Verification Method Tabs */}
                      <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() =>
                            setVerificationMethods({ ...verificationMethods, [item.id]: 'pin' })
                          }
                          className={`py-1.5 rounded-lg ${
                            (verificationMethods[item.id] || 'pin') === 'pin'
                              ? 'bg-white text-emerald-800 shadow-sm'
                              : 'text-slate-600'
                          }`}
                        >
                          1. كود PIN
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setVerificationMethods({
                              ...verificationMethods,
                              [item.id]: 'contactless',
                            })
                          }
                          className={`py-1.5 rounded-lg ${
                            verificationMethods[item.id] === 'contactless'
                              ? 'bg-white text-emerald-800 shadow-sm'
                              : 'text-slate-600'
                          }`}
                        >
                          2. عند الباب
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setVerificationMethods({
                              ...verificationMethods,
                              [item.id]: 'beneficiary_ack',
                            })
                          }
                          className={`py-1.5 rounded-lg ${
                            verificationMethods[item.id] === 'beneficiary_ack'
                              ? 'bg-white text-emerald-800 shadow-sm'
                              : 'text-slate-600'
                          }`}
                        >
                          3. جوال الأسرة
                        </button>
                      </div>

                      {(verificationMethods[item.id] || 'pin') === 'pin' && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>أدخل كود المستلم (4 أرقام):</span>
                            <strong className="text-emerald-700">كود التجربة: {item.verificationCode}</strong>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={4}
                              placeholder="الكود"
                              value={pinInputs[item.id] || ''}
                              onChange={(e) =>
                                setPinInputs({ ...pinInputs, [item.id]: e.target.value })
                              }
                              className="w-24 px-3 py-2 text-center font-mono font-bold text-sm rounded-xl border border-slate-300"
                            />
                            <button
                              type="button"
                              onClick={() => handleVerifyDelivery(item, 'pin')}
                              className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
                            >
                              تأكيد بالكود
                            </button>
                          </div>
                        </div>
                      )}

                      {verificationMethods[item.id] === 'contactless' && (
                        <button
                          type="button"
                          onClick={() => handleVerifyDelivery(item, 'contactless')}
                          className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                        >
                          <MapPin className="w-4 h-4" />
                          <span>تأكيد وضع الوجبة عند الباب (GPS بدون تلامس)</span>
                        </button>
                      )}

                      {verificationMethods[item.id] === 'beneficiary_ack' && (
                        <button
                          type="button"
                          onClick={() => handleVerifyDelivery(item, 'beneficiary_ack')}
                          className="w-full py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>اعتماد تأكيد جوال الأسرة المستفيدة</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ==================== SCREEN 5: IMPACT & CERTIFICATES ==================== */}
          {activeTab === 'impact' && (
            <div className="space-y-3.5">
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-teal-700 text-white flex items-center justify-center shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-teal-950">لوحة الأثر والشهادات</h2>
                    <p className="text-[11px] text-teal-800">أبطال العطاء وحفظ النعمة</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCertificateModal(true)}
                  className="px-3 py-2 rounded-xl bg-teal-700 text-white font-bold text-xs"
                >
                  الشهادة
                </button>
              </div>

              <div className="space-y-2.5">
                {LEADERBOARD.map((row) => (
                  <div
                    key={row.rank}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center">
                        {row.rank}
                      </span>
                      <div>
                        <h4 className="font-extrabold text-slate-900">{row.name}</h4>
                        <span className="text-[11px] text-emerald-700 font-bold">{row.badge}</span>
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="font-black text-slate-900 block">{row.meals} وجبة</span>
                      <span className="text-[11px] text-slate-500">{row.points} نقطة</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR (Thumb-Friendly Native Feel) */}
        <nav className="sticky bottom-0 z-30 bg-white border-t border-slate-200 px-2 py-1.5 grid grid-cols-5 gap-1 shadow-lg">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all ${
              activeTab === 'home' ? 'text-emerald-700 bg-emerald-50 font-black' : 'text-slate-500'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">الأقسام</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('explore')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all ${
              activeTab === 'explore'
                ? 'text-emerald-700 bg-emerald-50 font-black'
                : 'text-slate-500'
            }`}
          >
            <Building2 className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">الجمعية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('families')}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all ${
              activeTab === 'families' ? 'text-rose-700 bg-rose-50 font-black' : 'text-slate-500'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">العوائل</span>
            {waitingFamiliesCount > 0 && (
              <span className="absolute top-1 left-3 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center">
                {waitingFamiliesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('provider')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all ${
              activeTab === 'provider' ? 'text-amber-700 bg-amber-50 font-black' : 'text-slate-500'
            }`}
          >
            <Utensils className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">المتبرع</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('driver')}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all ${
              activeTab === 'driver' ? 'text-indigo-700 bg-indigo-50 font-black' : 'text-slate-500'
            }`}
          >
            <Truck className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">المندوب</span>
            {reservedCount > 0 && (
              <span className="absolute top-1 left-3 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center">
                {reservedCount}
              </span>
            )}
          </button>
        </nav>

        {/* MODAL: ADD NEEDY FAMILY */}
        {showAddFamilyModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-5 border border-slate-200 shadow-2xl space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="font-black text-sm text-slate-900">تسجيل احتياج عائلة متعففة</h3>
                <button
                  type="button"
                  onClick={() => setShowAddFamilyModal(false)}
                  className="p-1.5 rounded-xl bg-slate-100 text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddFamilyNeed} className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رمز / اسم ملف العائلة *</label>
                  <input
                    type="text"
                    required
                    value={newFamilyNeed.familyCode}
                    onChange={(e) =>
                      setNewFamilyNeed({ ...newFamilyNeed, familyCode: e.target.value })
                    }
                    placeholder="مثال: أسرة متعففة (ملف #610)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">الحي *</label>
                    <input
                      type="text"
                      required
                      value={newFamilyNeed.district}
                      onChange={(e) =>
                        setNewFamilyNeed({ ...newFamilyNeed, district: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">عدد الأفراد</label>
                    <input
                      type="number"
                      min="1"
                      value={newFamilyNeed.membersCount}
                      onChange={(e) =>
                        setNewFamilyNeed({ ...newFamilyNeed, membersCount: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الوجبات المطلوبة *</label>
                  <input
                    type="text"
                    required
                    value={newFamilyNeed.neededMeal}
                    onChange={(e) =>
                      setNewFamilyNeed({ ...newFamilyNeed, neededMeal: e.target.value })
                    }
                    placeholder="مثال: 5 وجبات عشاء ساخنة"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">طريقة الاستلام المفضلة</label>
                  <select
                    value={newFamilyNeed.preferredPickupMode}
                    onChange={(e) =>
                      setNewFamilyNeed({
                        ...newFamilyNeed,
                        preferredPickupMode: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 font-bold text-emerald-900"
                  >
                    <option value="courier">1. توصيل عبر المندوب / الجمعية لباب المنزل</option>
                    <option value="direct_pickup">2. استلام مباشر من العائلة من المتبرع</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-rose-600 text-white font-black"
                >
                  حفظ وتوثيق الاحتياج
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: QR CODE & VERIFICATION PASS */}
        {selectedListing && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-5 border border-slate-200 shadow-2xl space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <span className="text-[11px] font-bold text-emerald-700">تذكرة استلام الوجبة</span>
                  <h3 className="text-sm font-extrabold text-slate-900">{selectedListing.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedListing(null)}
                  className="p-1.5 rounded-xl bg-slate-100 text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center text-center">
                <QrCode className="w-20 h-20 text-slate-900" />
                <span className="mt-2 text-[11px] text-slate-500">كود التحقق والاستلام</span>
                <span className="text-xl font-mono font-black tracking-widest text-emerald-700">
                  #{selectedListing.verificationCode}
                </span>
              </div>

              <div className="space-y-1.5 bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100">
                <div className="flex justify-between">
                  <span>المتبرع:</span>
                  <strong className="text-slate-900">{selectedListing.providerName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>المستلم المحدد:</span>
                  <strong className="text-emerald-800">
                    {selectedListing.reservedBy || getSelectedRecipient(selectedListing)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>طريقة التسليم:</span>
                  <strong className="text-indigo-800">
                    {selectedListing.deliveryMode === 'direct_pickup'
                      ? 'استلام مباشر من العائلة من المتبرع'
                      : 'توصيل عبر المندوب'}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedListing(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}

        {/* MODAL: CERTIFICATE */}
        {showCertificateModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-5 border-4 border-emerald-600/20 shadow-2xl text-center space-y-3 text-xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <Award className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-slate-900">شهادة شكر لحفظ النعمة</h3>
              <p className="text-slate-600 leading-relaxed">
                تمنح منصة «نِعمة» هذه الشهادة تقديراً للمساهمة في إطعام الأسر المتعففة والحد من هدر الطعام.
              </p>
              <button
                type="button"
                onClick={() => setShowCertificateModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
