import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, ShieldCheck, AlertTriangle, CheckCircle, HelpCircle, Landmark, Award, ArrowRight } from 'lucide-react';
import MotionButton from '../ui/MotionButton';

interface NeetLearningCentreProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NeetLearningCentre({ isOpen, onClose }: NeetLearningCentreProps) {
  const [activeTab, setActiveTab] = useState<'mcc' | 'ysruhs' | 'knruhs' | 'aaccc' | 'deposits'>('mcc');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-lg text-slate-900">
                Official NEET UG Counselling Rules Guide
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                MCC • Dr. YSRUHS (AP) • KNRUHS (Telangana) • AACCC (AYUSH)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
            aria-label="Close guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6 gap-2 overflow-x-auto shrink-0 py-2">
          {[
            { id: 'mcc', label: 'MCC (All India & AIIMS)', icon: Award },
            { id: 'ysruhs', label: 'Dr. YSRUHS (AP)', icon: Landmark },
            { id: 'knruhs', label: 'KNRUHS (Telangana)', icon: Landmark },
            { id: 'aaccc', label: 'AACCC (AYUSH)', icon: ShieldCheck },
            { id: 'deposits', label: 'Security Deposits & Fees', icon: HelpCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {activeTab === 'mcc' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <h4 className="font-bold text-emerald-950 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  MCC Counselling Scope & Round Architecture
                </h4>
                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                  The Medical Counselling Committee (MCC), Directorate General of Health Services (DGHS), conducts online counselling for <strong>15% All India Quota (AIQ)</strong> seats in all Government medical and dental colleges across India, <strong>100% seats in AIIMS, JIPMER, Central Universities (DU, AMU, BHU, Jamia)</strong>, ESIC insured persons quota, and Deemed Universities.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <h5 className="font-bold text-slate-900 text-xs uppercase font-mono tracking-wider text-emerald-700">
                    Round 1 — Free Exit Rule
                  </h5>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    If you are allotted a seat in <strong>Round 1</strong>, you can either report and join or avail <strong>Free Exit</strong> without forfeiting your refundable security deposit. You can also join and opt for seat willingness to upgrade in Round 2.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <h5 className="font-bold text-slate-900 text-xs uppercase font-mono tracking-wider text-amber-700">
                    Round 2 — Exit with Forfeiture
                  </h5>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    If allotted a seat in <strong>Round 2</strong> and you do not wish to join, you can exit with <strong>forfeiture of your security deposit</strong> within the stipulated exit window. Once you join a Round 2 allotted seat, you cannot vacate it.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <h5 className="font-bold text-slate-900 text-xs uppercase font-mono tracking-wider text-rose-700">
                    Round 3 (Mop-Up) — Strict Locking
                  </h5>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Candidates who join a Round 3 allotted seat are <strong>not permitted to resign or participate</strong> in subsequent Stray Vacancy rounds or State Quota counselling. Unjoined seats result in forfeiture of deposit and debarment.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <h5 className="font-bold text-slate-900 text-xs uppercase font-mono tracking-wider text-purple-700">
                    Stray Vacancy Round — Online Centralized
                  </h5>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Conducted completely online by MCC without offline college-level manipulation. Candidates not holding any seat anywhere across India are eligible. If allotted a seat, you must join; failing to join debars you from NEET for 1–2 years.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ysruhs' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <h4 className="font-bold text-blue-950 flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-blue-600 shrink-0" />
                  Andhra Pradesh Medical Admissions — Dr. YSRUHS Rules
                </h4>
                <p className="text-xs text-blue-800 mt-1 leading-relaxed">
                  Admissions to 85% State Quota in Government and Private Medical/Dental Colleges in Andhra Pradesh are governed by Dr. YSR University of Health Sciences, Vijayawada.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 border border-slate-200 rounded-xl">
                  <h5 className="font-bold text-slate-900 text-sm">1. Competent Authority Quota (CQ) — 85% State Seats</h5>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Divided into <strong>Andhra University (AU) Area</strong> (Districts: Srikakulam, Vizianagaram, Visakhapatnam, East Godavari, West Godavari, Krishna, Guntur, Prakasam) and <strong>Sri Venkateswara University (SVU) Area</strong> (Districts: Nellore, Chittoor, Kadapa, Anantapur, Kurnool). Candidates must have studied at least 4 consecutive years in the local area to claim local quota.
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl">
                  <h5 className="font-bold text-slate-900 text-sm">2. Management Quota (MQ) — Category B & Category C (NRI)</h5>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Private un-aided medical colleges offer <strong>Category-B (S1 Sub-category)</strong> seats open to all Indian candidates irrespective of domicile at government-fixed annual tuition fees (₹13,20,000/yr). Category-C (NRI) seats are earmarked for NRI candidates/wards.
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl">
                  <h5 className="font-bold text-slate-900 text-sm">3. Discontinuation Bond & Service Rules</h5>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Candidates who discontinue their MBBS course after the final phase of CQ counselling are liable to pay a <strong>penalty of ₹3,00,000 + GST</strong> and are debarred from MBBS admissions in AP for 3 years.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'knruhs' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <h4 className="font-bold text-amber-950 flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-amber-600 shrink-0" />
                  Telangana Medical Admissions — KNRUHS Rules
                </h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Admissions to 85% State Quota in Government, Private, and Minority Medical/Dental Colleges in Telangana are governed by Kaloji Narayana Rao University of Health Sciences (KNRUHS), Warangal.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 border border-slate-200 rounded-xl">
                  <h5 className="font-bold text-slate-900 text-sm">1. Local vs. Unreserved Quota (G.O.Ms. 114 & G.O.Ms. 72)</h5>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    In Government Medical Colleges established before 2014, <strong>85% seats are reserved for Osmania University (OU) local candidates</strong>, and 15% are open unreserved seats for both AP and Telangana candidates. In new GMCs established post-2014, 100% seats are exclusively reserved for Telangana local candidates.
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl">
                  <h5 className="font-bold text-slate-900 text-sm">2. Free Exit & Upgradation Protocols</h5>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Candidates can exercise Free Exit in Phase 1 without penalty. If admitted in Phase 2, candidates who wish to discontinue must do so before the notification date; otherwise, a <strong>discontinuation penalty of ₹3,00,000 + GST</strong> applies, and they are debarred for 3 years.
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl">
                  <h5 className="font-bold text-slate-900 text-sm">3. Minority Medical Colleges (Muslim Minority)</h5>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Institutions like <strong>Deccan College of Medical Sciences</strong> and <strong>Shadan Institute of Medical Sciences</strong> reserve seats primarily for Muslim Minority candidates under both CQ and MQ streams.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'aaccc' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
                <h4 className="font-bold text-teal-950 flex items-center gap-2">
                  <Award className="w-5 h-5 text-teal-600 shrink-0" />
                  AACCC AYUSH Central Counselling (BAMS, BHMS, BUMS, BSMS)
                </h4>
                <p className="text-xs text-teal-800 mt-1 leading-relaxed">
                  Conducted by the Ayush Admissions Central Counseling Committee under the Ministry of Ayush for <strong>15% All India Quota seats</strong> in Government/Govt-aided AYUSH colleges and <strong>100% seats in National Institutes & Central Universities</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded-xl">
                  <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">BAMS</span>
                  <h5 className="font-bold text-slate-900 text-sm mt-2">Ayurvedic Medicine & Surgery</h5>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Apex institutes include <strong>National Institute of Ayurveda (NIA Jaipur)</strong>, <strong>All India Institute of Ayurveda (AIIA New Delhi)</strong>, and IMS-BHU. Highly competitive with cutoffs often below AIR 25,000 for National Institutes.
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">BHMS</span>
                  <h5 className="font-bold text-slate-900 text-sm mt-2">Homoeopathic Medicine & Surgery</h5>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Apex institute is the <strong>National Institute of Homoeopathy (NIH Kolkata)</strong>. State government colleges like JSPS Hyderabad and Dr. Gururaju Gudivada offer excellent clinical training.
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl">
                  <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">BUMS</span>
                  <h5 className="font-bold text-slate-900 text-sm mt-2">Unani Medicine & Surgery</h5>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Apex body is the <strong>National Institute of Unani Medicine (NIUM Bengaluru)</strong> and Government Nizamia Tibbi College, Hyderabad. Requires passing 10th/12th Urdu/Arabic or equivalent.
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl">
                  <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">BSMS</span>
                  <h5 className="font-bold text-slate-900 text-sm mt-2">Siddha Medicine & Surgery</h5>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Apex body is the <strong>National Institute of Siddha (NIS Chennai)</strong>. Emphasizes traditional southern Indian herbal formulations.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'deposits' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-slate-600 shrink-0" />
                  Statutory Security Deposits & Counselling Fees (MCC & States)
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Fees and refundable security deposits must be paid during choice registration. Refundable amounts are returned to the same bank account after counseling concludes.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-800 font-mono text-[11px] uppercase">
                    <tr>
                      <th className="p-3 border-b border-slate-200">Counselling Pool</th>
                      <th className="p-3 border-b border-slate-200">Non-Refundable Registration Fee</th>
                      <th className="p-3 border-b border-slate-200">Refundable Security Deposit</th>
                      <th className="p-3 border-b border-slate-200">Total Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">MCC AIQ / Central Univ (UR / EWS)</td>
                      <td className="p-3 font-mono">₹1,000</td>
                      <td className="p-3 font-mono text-emerald-700 font-bold">₹10,000</td>
                      <td className="p-3 font-mono font-bold text-slate-900">₹11,000</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">MCC AIQ / Central Univ (SC / ST / OBC / PwD)</td>
                      <td className="p-3 font-mono">₹500</td>
                      <td className="p-3 font-mono text-emerald-700 font-bold">₹5,000</td>
                      <td className="p-3 font-mono font-bold text-slate-900">₹5,500</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">Deemed Universities (All Categories)</td>
                      <td className="p-3 font-mono">₹5,000</td>
                      <td className="p-3 font-mono text-amber-700 font-bold">₹2,00,000</td>
                      <td className="p-3 font-mono font-bold text-slate-900">₹2,05,000</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">AACCC AYUSH Govt / Central Institutes</td>
                      <td className="p-3 font-mono">₹1,000 (UR) / ₹500 (Res)</td>
                      <td className="p-3 font-mono text-emerald-700 font-bold">₹10,000 (UR) / ₹10,000</td>
                      <td className="p-3 font-mono font-bold text-slate-900">₹11,000 / ₹10,500</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Crucial Security Deposit Rules:
                </p>
                <p>• If you do not join a Round 2 allotted seat, your security deposit is <strong>forfeited</strong>.</p>
                <p>• If you join an upgraded seat in Round 2 or Round 3, your security deposit is refunded to your bank account after completion of all rounds.</p>
                <p>• If no seat is allotted across all rounds, your security deposit is <strong>100% refunded</strong>.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-mono">
            Sources: mcc.nic.in • drysruhs.edu.in • knruhs.telangana.gov.in • aaccc.gov.in
          </span>
          <MotionButton
            variant="primary"
            size="sm"
            onClick={onClose}
          >
            Got It, Close Guide
          </MotionButton>
        </div>
      </motion.div>
    </div>
  );
}

