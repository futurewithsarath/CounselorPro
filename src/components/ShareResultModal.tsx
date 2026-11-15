import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  MessageCircle, 
  Send, 
  Instagram, 
  Copy, 
  Check, 
  Download, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ShieldCheck, 
  Heart,
  ExternalLink
} from 'lucide-react';
import { downloadSocialCard, SocialCardData } from '../utils/socialCardGenerator';
import MotionButton from './ui/MotionButton';

export interface ShareResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardData: SocialCardData;
}

export default function ShareResultModal({ isOpen, onClose, cardData }: ShareResultModalProps) {
  const [includeRank, setIncludeRank] = useState(true);
  const [includeCategory, setIncludeCategory] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [isGeneratingSquare, setIsGeneratingSquare] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://counselorpro.in';

  // Construct dynamic prefilled text for WhatsApp and Telegram
  const generateShareMessage = () => {
    let msg = `🎓 *CounselorPro Admissions Counselling Practice Result*\n`;
    msg += `--------------------------------------------------\n`;
    msg += `📌 *Examination:* ${cardData.exam.replace('_', ' ')} (${cardData.stream || 'General'})\n`;
    if (includeRank && cardData.rank) {
      msg += `🏆 *Candidate Rank:* #${Number(cardData.rank).toLocaleString()}\n`;
    }
    if (includeCategory && cardData.category) {
      msg += `📂 *Category:* ${cardData.category}\n`;
    }
    msg += `📋 *Choices Prioritized:* ${cardData.totalChoices} Colleges\n`;
    msg += `--------------------------------------------------\n`;

    if (cardData.allotted && cardData.collegeName) {
      msg += `🏫 *HISTORICAL CUTOFF MATCH:*\n`;
      msg += `   *${cardData.collegeName}* (${cardData.collegeCode || 'UNKN'})\n`;
      msg += `   Branch: ${cardData.branchName || 'CSE'}\n`;
      msg += `   Matched Preference: Choice #${cardData.preferenceNumber || 1}\n`;
      msg += `   Cutoff Proximity: ${cardData.probabilityRange || 'HIGH'} Range Match\n`;
    } else {
      msg += `ℹ️ *Status:* Practiced choice list with historical cutoffs.\n`;
    }

    msg += `--------------------------------------------------\n`;
    msg += `✨ *Check your seat allotment probability & practice choice filling free:*\n`;
    msg += `👉 ${currentOrigin}\n\n`;
    msg += `⚠️ _Note: This is an educational practice simulation, not an official seat allotment._`;
    return msg;
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(generateShareMessage());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleTelegram = () => {
    const text = encodeURIComponent(generateShareMessage());
    window.open(`https://t.me/share/url?url=${encodeURIComponent(currentOrigin)}&text=${text}`, '_blank');
  };

  const handleCopyCaption = () => {
    const caption = generateShareMessage();
    navigator.clipboard.writeText(caption).then(() => {
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2500);
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentOrigin).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `My ${cardData.exam} Counselling Practice Result`,
          text: generateShareMessage(),
          url: currentOrigin
        });
      } catch (e) {
        // User cancelled or aborted
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadStoryCard = async () => {
    try {
      setIsGeneratingStory(true);
      await downloadSocialCard(
        { ...cardData, includeRank, includeCategory },
        'story'
      );
    } catch (err) {
      console.error('Failed to generate story card:', err);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const handleDownloadSquareCard = async () => {
    try {
      setIsGeneratingSquare(true);
      await downloadSocialCard(
        { ...cardData, includeRank, includeCategory },
        'square'
      );
    } catch (err) {
      console.error('Failed to generate square card:', err);
    } finally {
      setIsGeneratingSquare(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-100 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92dvh] flex flex-col overflow-hidden animate-fade-in">
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Share2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-sans font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                Share My Result
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-mono">
                {cardData.exam.replace('_', ' ')} • {cardData.stream || 'Practice Allotment'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6">

          {/* Result Highlight Mini-Card */}
          <div className="bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-200/80 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold uppercase text-emerald-700 tracking-wider text-[10px]">
                {cardData.allotted ? '★ Historical Cutoff Match' : 'Counselling Practice Summary'}
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full font-mono">
                {cardData.totalChoices} Preferences
              </span>
            </div>
            {cardData.allotted && cardData.collegeName ? (
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{cardData.collegeName}</h4>
                <p className="text-slate-500 text-[11px] font-mono">
                  Branch: <strong className="text-slate-700">{cardData.branchName}</strong> • Choice #{cardData.preferenceNumber}
                </p>
              </div>
            ) : (
              <p className="text-slate-600">
                Completed preference ordering practice for {cardData.totalChoices} colleges.
              </p>
            )}
          </div>

          {/* Privacy Controls Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">
                  Privacy Settings
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Control Public Visibility</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <span className="text-slate-700 font-medium">Show Rank</span>
                <input 
                  type="checkbox" 
                  checked={includeRank} 
                  onChange={(e) => setIncludeRank(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
              </label>
              <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <span className="text-slate-700 font-medium">Show Category</span>
                <input 
                  type="checkbox" 
                  checked={includeCategory} 
                  onChange={(e) => setIncludeCategory(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
              </label>
            </div>
          </div>

          {/* Direct Messaging Share (WhatsApp & Telegram) */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono">
              Direct Sharing
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleWhatsApp}
                className="flex items-center justify-center gap-2.5 py-3 px-4 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.99] text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
              >
                <MessageCircle className="w-4.5 h-4.5 fill-white text-[#25D366]" />
                <span>Share on WhatsApp</span>
              </button>

              <button
                onClick={handleTelegram}
                className="flex items-center justify-center gap-2.5 py-3 px-4 bg-[#0088cc] hover:bg-[#0077b3] active:scale-[0.99] text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
              >
                <Send className="w-4.5 h-4.5 fill-white text-[#0088cc]" />
                <span>Share on Telegram</span>
              </button>
            </div>
          </div>

          {/* Instagram & Social Media Result Cards */}
          <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Instagram className="w-4.5 h-4.5 text-pink-400" />
                <h4 className="font-bold text-white text-xs uppercase tracking-wider font-mono">
                  Instagram & Social Cards
                </h4>
              </div>
              <span className="text-[10px] text-pink-300 bg-pink-500/20 border border-pink-500/30 px-2 py-0.5 rounded-full font-mono">
                PNG Export
              </span>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              Browsers cannot post directly to Instagram. Download your branded result graphic and upload it to your Instagram Story or Feed!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={handleDownloadStoryCard}
                disabled={isGeneratingStory}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                title="Download 9:16 vertical card for Instagram Stories"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isGeneratingStory ? 'Exporting...' : 'Story Card (9:16)'}</span>
              </button>

              <button
                onClick={handleDownloadSquareCard}
                disabled={isGeneratingSquare}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                title="Download 1:1 square card for Instagram feed or WhatsApp status"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isGeneratingSquare ? 'Exporting...' : 'Square Post (1:1)'}</span>
              </button>

              <button
                onClick={handleCopyCaption}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-xs font-semibold transition-all cursor-pointer"
                title="Copy ready-to-paste caption for social media"
              >
                {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                <span>{copiedCaption ? 'Copied!' : 'Copy Caption'}</span>
              </button>
            </div>
          </div>

          {/* Copy Link & Native Share Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={handleCopyLink}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copiedLink ? 'Result Link Copied!' : 'Copy Shareable Link'}</span>
            </button>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-emerald-600" />
                <span>Device Share</span>
              </button>
            )}
          </div>

          {/* Educational Disclaimer */}
          <p className="text-[11px] text-slate-400 font-mono text-center pt-2 border-t border-slate-100">
            *CounselorPro practice simulation. Never presents historical comparisons as an official seat guarantee.
          </p>

        </div>
      </div>
    </div>
  );
}
