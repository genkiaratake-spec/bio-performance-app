import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  CheckCircle,
  MapPin,
  Clock,
  Calendar,
  ChevronRight,
  Building2,
  Navigation,
} from 'lucide-react';
import {
  PLAN_PRICES,
  MOCK_CLINICS,
  savePlan,
  getSavedPlan,
  saveBooking,
  getBookings,
  getRemainingTests,
} from '../lib/clinicBooking';
import type { TestPlan } from '../types/healthCheck';

type ClinicStep = 'plan' | 'how' | 'search' | 'booking' | 'confirmed' | 'myplan';

export default function ClinicTest() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<ClinicStep>('plan');
  const [selectedPlan, setSelectedPlan] = useState<TestPlan | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<(typeof MOCK_CLINICS)[number] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('9:30');

  useEffect(() => {
    const saved = getSavedPlan();
    if (saved) {
      setSelectedPlan(saved);
      setStep('myplan');
    }
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      setSelectedDate(d);
    }
  }, [selectedDate]);

  const handleSelectPlan = (plan: TestPlan) => {
    setSelectedPlan(plan);
    savePlan(plan);
    setStep('how');
  };

  const handleSelectClinic = (clinic: (typeof MOCK_CLINICS)[number]) => {
    setSelectedClinic(clinic);
    setStep('booking');
  };

  const handleConfirmBooking = () => {
    if (!selectedClinic || !selectedDate || !selectedTime || !selectedPlan) return;
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    saveBooking({
      clinicName: selectedClinic.name,
      date: dateStr,
      time: selectedTime,
      plan: selectedPlan,
      status: 'scheduled',
    });
    setStep('confirmed');
  };

  const calendarDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return { year, month, daysInMonth, days };
  }, []);

  const isDateAvailable = (day: number) => {
    const now = new Date();
    const d = new Date(calendarDays.year, calendarDays.month, day);
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 1 && d.getDay() !== 0;
  };

  const timeSlots = ['9:00', '9:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'];
  const unavailableTimes = ['9:00', '11:00'];

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];

  const formatPrice = (n: number) => n.toLocaleString();

  const bookings = getBookings();
  const remaining = getRemainingTests();

  const renderPlanStep = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>BiO 検査プラン</h1>
        <p style={{ fontSize: 13, color: '#aaa', marginBottom: 4 }}>提携クリニック採血</p>
        <p style={{ fontSize: 12, color: '#888', lineHeight: 1.6, marginTop: 8 }}>
          提携クリニックで採血→75項目を測定→AIがサプリ・食事を最適化します
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {(['1', '2', '4', '6'] as TestPlan[]).map((plan) => {
          const info = PLAN_PRICES[plan];
          const isPopular = plan === '2';
          return (
            <div key={plan} style={{ paddingTop: 14, position: 'relative' }}>
              {isPopular && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#185FA5',
                    color: '#E6F1FB',
                    fontSize: 10,
                    fontWeight: 500,
                    padding: '3px 14px',
                    borderRadius: 10,
                    whiteSpace: 'nowrap',
                    zIndex: 1,
                  }}
                >
                  人気
                </div>
              )}
              <div
                style={{
                  border: isPopular ? '2px solid #185FA5' : '1px solid #222',
                  borderRadius: 14,
                  padding: 16,
                  textAlign: 'center',
                  background: '#111118',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{info.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                  ¥{formatPrice(info.perTest)}
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#aaa' }}>/回</span>
                </div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>
                  年間 ¥{formatPrice(info.annual)}
                </div>
                <button
                  onClick={() => handleSelectPlan(plan)}
                  style={{
                    width: '100%',
                    padding: '8px 0',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: isPopular ? 'none' : '1px solid #444',
                    background: isPopular ? '#185FA5' : 'transparent',
                    color: isPopular ? '#fff' : '#ccc',
                  }}
                >
                  選択する
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 28 }}>
        {[
          '75項目を測定（標準健診の4倍以上）',
          'VitD・フェリチン・hs-CRP・O3Iなど健診外の重要項目を網羅',
          '結果に基づいてサプリ・食事推奨を自動更新',
          '前回との比較で改善トレンドを可視化',
          '全国提携クリニックで採血（予約はアプリから）',
        ].map((text, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
            <Check size={16} style={{ color: '#22c55e', flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 12, color: '#ccc', lineHeight: 1.5 }}>{text}</span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: '#666', textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
        健診結果のアップロード（無料）でも基本的なサプリ推奨を受けられますが、
        提携クリニックでの採血検査ではより多くのバイオマーカーを測定し、
        精度の高いパーソナライズが可能です。
      </p>
    </motion.div>
  );

  const renderHowStep = () => {
    const steps = [
      { label: 'プランを選択', desc: selectedPlan ? PLAN_PRICES[selectedPlan].label : '', status: 'completed' as const },
      { label: '提携クリニックを選ぶ', desc: '', status: 'active' as const },
      { label: '採血・検査', desc: '', status: 'pending' as const },
      { label: '結果をアプリで確認', desc: '', status: 'pending' as const },
    ];

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => setStep('plan')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>検査の流れ</h1>
        </div>

        <div style={{ position: 'relative', paddingLeft: 28 }}>
          {steps.map((s, i) => {
            const colors = {
              completed: { circle: '#22c55e', border: '#22c55e', line: '#22c55e', text: '#fff' },
              active: { circle: '#185FA5', border: '#185FA5', line: '#333', text: '#fff' },
              pending: { circle: 'transparent', border: '#444', line: '#333', text: '#888' },
            };
            const c = colors[s.status];
            return (
              <div key={i} style={{ position: 'relative', marginBottom: i < steps.length - 1 ? 32 : 0 }}>
                <div
                  style={{
                    position: 'absolute',
                    left: -28,
                    top: 0,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: c.circle,
                    border: `2px solid ${c.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {s.status === 'completed' && <Check size={12} style={{ color: '#fff' }} />}
                  {s.status === 'active' && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: -19,
                      top: 22,
                      width: 2,
                      height: 30,
                      background: c.line,
                    }}
                  />
                )}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{s.label}</div>
                  {s.desc && <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{s.desc}</div>}
                  {s.status === 'active' && (
                    <button
                      onClick={() => setStep('search')}
                      style={{
                        marginTop: 10,
                        background: '#185FA5',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 16px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      クリニックを探す <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 11, color: '#666', textAlign: 'center', marginTop: 32, lineHeight: 1.6 }}>
          この検査は医療診断ではなく健康増進を目的とした情報提供サービスです。
        </p>
      </motion.div>
    );
  };

  const renderSearchStep = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setStep('how')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}>
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>クリニックを探す</h1>
      </div>

      {/* Mock map area */}
      <div
        style={{
          height: 180,
          borderRadius: 14,
          background: '#1a1a24',
          marginBottom: 16,
          position: 'relative',
          overflow: 'hidden',
          backgroundImage:
            'linear-gradient(#222 1px, transparent 1px), linear-gradient(90deg, #222 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      >
        {/* Current location pin */}
        <div style={{ position: 'absolute', top: '45%', left: '40%' }}>
          <Navigation size={18} style={{ color: '#ef4444' }} />
        </div>
        {/* Clinic pins */}
        <div style={{ position: 'absolute', top: '30%', left: '55%' }}>
          <MapPin size={18} style={{ color: '#3b82f6' }} />
        </div>
        <div style={{ position: 'absolute', top: '55%', left: '65%' }}>
          <MapPin size={18} style={{ color: '#3b82f6' }} />
        </div>
        <div style={{ position: 'absolute', top: '25%', left: '30%' }}>
          <MapPin size={18} style={{ color: '#3b82f6' }} />
        </div>
        <div style={{ position: 'absolute', top: '60%', left: '20%' }}>
          <MapPin size={18} style={{ color: '#3b82f6' }} />
        </div>
        <div style={{ position: 'absolute', top: '70%', left: '50%' }}>
          <MapPin size={18} style={{ color: '#3b82f6', opacity: 0.4 }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {MOCK_CLINICS.map((clinic) => (
          <div
            key={clinic.id}
            style={{
              background: '#111118',
              borderRadius: 12,
              padding: 14,
              border: '1px solid #222',
              opacity: clinic.available ? 1 : 0.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#1a1a2e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Building2 size={18} style={{ color: '#888' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{clinic.name}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{clinic.distance}</div>
                </div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{clinic.address}</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{clinic.hours}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  {clinic.available ? (
                    <>
                      <span style={{ fontSize: 11, color: '#22c55e' }}>予約可</span>
                      <button
                        onClick={() => handleSelectClinic(clinic)}
                        style={{
                          background: '#185FA5',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '6px 14px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        予約する
                      </button>
                    </>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        color: '#888',
                        background: '#222',
                        padding: '2px 10px',
                        borderRadius: 6,
                      }}
                    >
                      満員
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );

  const renderBookingStep = () => {
    if (!selectedClinic || !selectedDate) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setStep('search')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>日時を選択</h1>
        </div>

        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={16} style={{ color: '#aaa' }} />
          {selectedClinic.name}
        </div>

        {/* Calendar */}
        <div style={{ background: '#111118', borderRadius: 14, padding: 16, border: '1px solid #222', marginBottom: 16 }}>
          <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            {currentYear}年{monthNames[currentMonth]}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
            {dayLabels.map((d) => (
              <div key={d} style={{ fontSize: 10, color: '#666', padding: '4px 0' }}>
                {d}
              </div>
            ))}
            {calendarDays.days.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} />;
              }
              const available = isDateAvailable(day);
              const isSelected =
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === currentMonth &&
                selectedDate.getFullYear() === currentYear;
              return (
                <button
                  key={day}
                  disabled={!available}
                  onClick={() => {
                    if (available) {
                      setSelectedDate(new Date(currentYear, currentMonth, day));
                    }
                  }}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: '50%',
                    border: 'none',
                    fontSize: 12,
                    fontWeight: isSelected ? 700 : 400,
                    cursor: available ? 'pointer' : 'default',
                    background: isSelected ? '#185FA5' : 'transparent',
                    color: isSelected ? '#fff' : available ? '#ccc' : '#444',
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} style={{ color: '#aaa' }} />
            時間帯
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {timeSlots.map((time) => {
              const unavailable = unavailableTimes.includes(time);
              const isSelected = selectedTime === time && !unavailable;
              return (
                <button
                  key={time}
                  disabled={unavailable}
                  onClick={() => {
                    if (!unavailable) setSelectedTime(time);
                  }}
                  style={{
                    padding: '10px 0',
                    borderRadius: 8,
                    border: isSelected ? '2px solid #185FA5' : '1px solid #333',
                    background: unavailable ? '#1a1a1a' : isSelected ? 'rgba(24,95,165,0.15)' : '#111118',
                    color: unavailable ? '#555' : isSelected ? '#fff' : '#ccc',
                    fontSize: 13,
                    fontWeight: isSelected ? 600 : 400,
                    cursor: unavailable ? 'default' : 'pointer',
                    position: 'relative',
                  }}
                >
                  {time}
                  {unavailable && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 6,
                        fontSize: 9,
                        color: '#666',
                      }}
                    >
                      満
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirmation card */}
        <div style={{ background: '#111118', borderRadius: 14, padding: 16, border: '1px solid #222', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>予約内容</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#888' }}>クリニック</span>
              <span>{selectedClinic.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#888' }}>日時</span>
              <span>
                {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 {selectedTime}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#888' }}>検査内容</span>
              <span>75項目</span>
            </div>
            {selectedPlan && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#888' }}>料金</span>
                <span>¥{formatPrice(PLAN_PRICES[selectedPlan].perTest)}</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleConfirmBooking}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 12,
            border: 'none',
            background: '#185FA5',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          予約を確定する
        </button>
      </motion.div>
    );
  };

  const renderConfirmedStep = () => {
    if (!selectedClinic || !selectedDate || !selectedPlan) return null;

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
        <div style={{ textAlign: 'center', marginBottom: 24, paddingTop: 20 }}>
          <CheckCircle size={56} style={{ color: '#22c55e', marginBottom: 12 }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>予約が完了しました</h1>
        </div>

        {/* Confirmation card */}
        <div style={{ background: '#111118', borderRadius: 14, padding: 16, border: '1px solid #222', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>予約内容</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#888' }}>クリニック</span>
              <span>{selectedClinic.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#888' }}>日時</span>
              <span>
                {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 {selectedTime}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#888' }}>検査内容</span>
              <span>75項目</span>
            </div>
            {selectedPlan && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#888' }}>料金</span>
                <span>¥{formatPrice(PLAN_PRICES[selectedPlan].perTest)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Belongings card */}
        <div style={{ background: '#111118', borderRadius: 14, padding: 16, border: '1px solid #222', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>当日の持ち物</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              'アプリの予約画面（このページを提示）',
              '健康保険証（本人確認用）',
              '空腹での来院を推奨（採血精度向上のため）',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Check size={14} style={{ color: '#22c55e', flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 12, color: '#ccc', lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 11, color: '#888', textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
          検査結果は7〜10営業日後にアプリに届きます。サプリ・食事推奨が自動的に更新されます。
        </p>

        <button
          onClick={() => setStep('myplan')}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 12,
            border: 'none',
            background: '#185FA5',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          マイプランを見る
        </button>
      </motion.div>
    );
  };

  const renderMyPlanStep = () => {
    if (!selectedPlan) return null;
    const planInfo = PLAN_PRICES[selectedPlan];
    const total = parseInt(selectedPlan);
    const completed = bookings.filter((b) => b.status === 'completed').length;
    const scheduled = bookings.filter((b) => b.status === 'scheduled').length;
    const used = completed + scheduled;
    const progressPct = total > 0 ? (completed / total) * 100 : 0;

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 3, 1);
    const nextMonthLabel = `${nextMonth.getMonth() + 1}月`;

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => setLocation('/')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>マイプラン</h1>
        </div>

        {/* Plan status card */}
        <div style={{ background: '#111118', borderRadius: 14, padding: 16, border: '1px solid #222', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{planInfo.label}プラン</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                {completed}回完了 / {total}回中
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#aaa' }}>残り{remaining}回</div>
          </div>
          <div style={{ background: '#222', borderRadius: 6, height: 6, overflow: 'hidden' }}>
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                background: '#185FA5',
                borderRadius: 6,
                transition: 'width 0.3s',
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>
            次回推奨：{nextMonthLabel}頃
          </div>
        </div>

        {/* Next recommended card */}
        <div
          style={{
            background: 'rgba(34,197,94,0.1)',
            borderRadius: 14,
            padding: 16,
            border: '1px solid rgba(34,197,94,0.25)',
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: '#22c55e', marginBottom: 4 }}>
            次回推奨時期：{nextMonthLabel}頃
          </div>
          <div style={{ fontSize: 11, color: '#aaa', marginBottom: 12 }}>
            定期的な測定で改善トレンドを確認しましょう
          </div>
          <button
            onClick={() => setStep('search')}
            style={{
              background: '#22c55e',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            次回の予約をする
          </button>
        </div>

        {/* Booking history */}
        {bookings.length > 0 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>予約履歴</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bookings.map((b) => (
                <div
                  key={b.id}
                  style={{
                    background: '#111118',
                    borderRadius: 12,
                    padding: 14,
                    border: '1px solid #222',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{b.clinicName}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} />
                      {b.date} {b.time}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: 8,
                      background:
                        b.status === 'scheduled'
                          ? 'rgba(24,95,165,0.2)'
                          : b.status === 'completed'
                            ? 'rgba(34,197,94,0.2)'
                            : 'rgba(136,136,136,0.2)',
                      color:
                        b.status === 'scheduled'
                          ? '#5b9ee8'
                          : b.status === 'completed'
                            ? '#22c55e'
                            : '#888',
                    }}
                  >
                    {b.status === 'scheduled' ? '予約済' : b.status === 'completed' ? '完了' : 'キャンセル'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div
      style={{
        height: '100vh',
        overflowY: 'auto',
        background: '#0a0a0f',
        color: '#fff',
        padding: '52px 20px 100px',
      }}
    >
      <AnimatePresence mode="wait">
        {step === 'plan' && <motion.div key="plan">{renderPlanStep()}</motion.div>}
        {step === 'how' && <motion.div key="how">{renderHowStep()}</motion.div>}
        {step === 'search' && <motion.div key="search">{renderSearchStep()}</motion.div>}
        {step === 'booking' && <motion.div key="booking">{renderBookingStep()}</motion.div>}
        {step === 'confirmed' && <motion.div key="confirmed">{renderConfirmedStep()}</motion.div>}
        {step === 'myplan' && <motion.div key="myplan">{renderMyPlanStep()}</motion.div>}
      </AnimatePresence>
    </div>
  );
}
