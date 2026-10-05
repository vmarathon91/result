import React, { useState, useMemo, useEffect } from 'react';
import { Runner } from '../types';
import { Race } from '../data/races';
import { SearchRunner } from './SearchRunner';
import {
  Trophy,
  ArrowRight,
  Search,
  ArrowLeft,
  Calendar,
  MapPin,
  RefreshCw,
  FileCheck,
  User,
  Filter,
  Check,
  ChevronDown,
  Crown,
  Medal,
} from 'lucide-react';

interface RaceRankingTop50Props {
  activeRace: Race;
  allRaces: Race[];
  runners: Runner[];
  isLoadingRunners: boolean;
  onSelectRunner: (runner: Runner) => void;
  onNavigateToResult: (bib?: string, runner?: Runner) => void;
  onBackToHome: () => void;
  onSelectRace: (race: Race) => void;
  onRefreshData?: () => void;
}

type DistanceCategory = '42K' | '21K' | '10K' | '5K';

// VPBank International Marathon Distance Styles & Labels (from official brand identity)
const VPBANK_DISTANCES: Record<
  DistanceCategory,
  {
    num: string;
    label: string;
    color: string;
    borderActive: string;
    textActive: string;
    bgActive: string;
    ringActive: string;
  }
> = {
  '42K': {
    num: '42',
    label: 'FULL MARATHON',
    color: '#00A3A6', // Cyan from official 42km
    borderActive: 'border-[#00A3A6]',
    textActive: 'text-[#00A3A6]',
    bgActive: 'bg-cyan-50/70',
    ringActive: 'ring-[#00A3A6]/25',
  },
  '21K': {
    num: '21',
    label: 'HALF MARATHON',
    color: '#00A850', // VPBank Green from official 21km
    borderActive: 'border-[#00A850]',
    textActive: 'text-[#00A850]',
    bgActive: 'bg-emerald-50/70',
    ringActive: 'ring-[#00A850]/25',
  },
  '10K': {
    num: '10',
    label: '10 KILOMET',
    color: '#FFA800', // Gold/Amber from official 10km
    borderActive: 'border-[#FFA800]',
    textActive: 'text-[#FFA800]',
    bgActive: 'bg-amber-50/70',
    ringActive: 'ring-[#FFA800]/25',
  },
  '5K': {
    num: '5',
    label: '5 KILOMET',
    color: '#70C800', // Lime Green from official 5km
    borderActive: 'border-[#70C800]',
    textActive: 'text-[#70C800]',
    bgActive: 'bg-lime-50/70',
    ringActive: 'ring-[#70C800]/25',
  },
};

// SVG Laurel Wreath Medal for Top 1, 2, 3 exactly matching image.png
const LaurelWreathMedal: React.FC<{ rank: 1 | 2 | 3 }> = ({ rank }) => {
  const colors = {
    1: {
      circle: '#CA8A04',
      leaves: '#EAB308',
      text: '#A16207',
      bg: 'from-amber-100 to-amber-50',
    },
    2: {
      circle: '#64748B',
      leaves: '#94A3B8',
      text: '#475569',
      bg: 'from-slate-100 to-slate-50',
    },
    3: {
      circle: '#B45309',
      leaves: '#D97706',
      text: '#92400E',
      bg: 'from-orange-100 to-orange-50',
    },
  }[rank];

  return (
    <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 relative flex items-center justify-center select-none" title={`Hạng ${rank}`}>
      <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-xs">
        {/* Left Laurel Branch */}
        <path
          d="M17 38 C 11 34, 7 26, 9 17 C 10 13, 13 10, 15 8 C 13 13, 13 19, 16 24 C 18 27, 21 30, 22 34 Z"
          fill={colors.leaves}
          opacity="0.9"
        />
        <path
          d="M13 22 C 8 20, 6 15, 8 11 C 11 13, 13 17, 14 21 Z"
          fill={colors.leaves}
        />
        <path
          d="M14 30 C 8 28, 7 23, 9 19 C 12 21, 14 25, 15 29 Z"
          fill={colors.leaves}
        />

        {/* Right Laurel Branch */}
        <path
          d="M31 38 C 37 34, 41 26, 39 17 C 38 13, 35 10, 33 8 C 35 13, 35 19, 32 24 C 30 27, 27 30, 26 34 Z"
          fill={colors.leaves}
          opacity="0.9"
        />
        <path
          d="M35 22 C 40 20, 42 15, 40 11 C 37 13, 35 17, 34 21 Z"
          fill={colors.leaves}
        />
        <path
          d="M34 30 C 40 28, 41 23, 39 19 C 36 21, 34 25, 33 29 Z"
          fill={colors.leaves}
        />

        {/* Bottom Ribbon / Tie & Stars */}
        <circle cx="24" cy="40" r="2" fill={colors.circle} />
        <circle cx="19" cy="40" r="1.5" fill={colors.circle} />
        <circle cx="29" cy="40" r="1.5" fill={colors.circle} />

        {/* Center Rank Number */}
        <text
          x="24"
          y="28"
          textAnchor="middle"
          fontSize="18"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={colors.text}
        >
          {rank}
        </text>
      </svg>
    </div>
  );
};

// Rounded Shield Badge for Rank 4 to 50
const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  return (
    <div
      className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl bg-[#EFE8E1] border border-[#E3D9CF] flex items-center justify-center text-xs font-bold text-[#57534E] shadow-2xs select-none"
      title={`Hạng ${rank}`}
    >
      {rank}
    </div>
  );
};

// Podium component for Top 1 - 3 runners matching authentic athletic sports podium stand (No Avatars)
const Top3Podium: React.FC<{
  runners: Runner[];
  onSelectRunner: (runner: Runner) => void;
  gender: 'M' | 'F';
}> = ({ runners, onSelectRunner }) => {
  const runner1 = runners[0];
  const runner2 = runners[1];
  const runner3 = runners[2];

  if (!runner1) return null;

  return (
    <div className="w-full pt-5 pb-4 px-2 sm:px-4 bg-gradient-to-b from-slate-50/80 via-white to-slate-50/60 border-b border-slate-100 flex flex-col items-center select-none">
      {/* 3-Step Podium Grid */}
      <div className="w-full max-w-xs sm:max-w-md grid grid-cols-3 gap-1.5 sm:gap-2.5 items-end justify-center">
        {/* ================= 2ND PLACE (LEFT - SILVER) ================= */}
        {runner2 ? (
          <div
            onClick={() => onSelectRunner(runner2)}
            className="group flex flex-col items-center cursor-pointer transition-all duration-200 hover:-translate-y-1.5"
            title={`Hạng 2: ${runner2.name} (BIB: ${runner2.bib}) • Bấm để xem kết quả & chứng nhận`}
          >
            {/* Runner Info Above Pedestal */}
            <div className="flex flex-col items-center text-center space-y-1 mb-2.5 w-full px-1 min-w-0">
              <div className="scale-90 sm:scale-100 transition-transform group-hover:scale-110">
                <LaurelWreathMedal rank={2} />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#009A44] transition-colors truncate max-w-full leading-tight">
                {runner2.name}
              </h4>
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-mono font-medium truncate max-w-full">
                <span>BIB: {runner2.bib}</span>
                {runner2.ag && runner2.ag !== '-' && <span>• {runner2.ag}</span>}
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-700 font-neue-plak bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200/60 shadow-2xs">
                {runner2.chipTime || '--:--:--'}
              </div>
            </div>

            {/* Pedestal 2 (Silver Block with 3D Bevel & Bold Number) */}
            <div className="w-full h-20 sm:h-28 rounded-t-xl sm:rounded-t-2xl bg-gradient-to-b from-[#E2E8F0] via-[#CBD5E1] to-[#94A3B8] group-hover:from-[#EDF2F7] group-hover:via-[#D5DEE9] shadow-xs flex flex-col items-center justify-between p-2 pt-2.5 transition-colors border-t-2 border-x border-white/80 relative overflow-hidden">
              <div className="flex flex-col items-center">
                <span className="text-3xl sm:text-4xl font-black font-neue-plak text-slate-700 tracking-tight drop-shadow-2xs leading-none">
                  2
                </span>
                <span className="text-[9px] sm:text-[10px] font-extrabold tracking-wider text-slate-600 uppercase mt-0.5">
                  HẠNG 2
                </span>
              </div>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/50 backdrop-blur-xs flex items-center justify-center shadow-2xs">
                <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
              </div>
            </div>
          </div>
        ) : (
          <div />
        )}

        {/* ================= 1ST PLACE (CENTER - GOLD / TALLEST) ================= */}
        {runner1 && (
          <div
            onClick={() => onSelectRunner(runner1)}
            className="group flex flex-col items-center cursor-pointer transition-all duration-200 hover:-translate-y-1.5 z-10"
            title={`Hạng 1 - Quán quân: ${runner1.name} (BIB: ${runner1.bib}) • Bấm để xem kết quả & chứng nhận`}
          >
            {/* Runner Info Above Pedestal */}
            <div className="flex flex-col items-center text-center space-y-1 mb-2.5 w-full px-1 min-w-0">
              <div className="relative scale-95 sm:scale-105 transition-transform group-hover:scale-115">
                <Crown className="w-4 h-4 text-amber-500 fill-amber-400 absolute -top-3 left-1/2 -translate-x-1/2 drop-shadow-xs animate-bounce" />
                <LaurelWreathMedal rank={1} />
              </div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-[#009A44] transition-colors truncate max-w-full leading-tight">
                {runner1.name}
              </h4>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold truncate max-w-full shadow-2xs">
                <span>BIB: {runner1.bib}</span>
                {runner1.ag && runner1.ag !== '-' && <span>• {runner1.ag}</span>}
              </div>
              <div className="text-xs sm:text-sm font-black text-amber-800 font-neue-plak bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200/80 shadow-2xs">
                {runner1.chipTime || '--:--:--'}
              </div>
            </div>

            {/* Pedestal 1 (Gold Block with 3D Bevel & Bold Number - Tallest) */}
            <div className="w-full h-28 sm:h-36 rounded-t-xl sm:rounded-t-2xl bg-gradient-to-b from-[#FCD34D] via-[#F59E0B] to-[#D97706] group-hover:from-[#FDE68A] group-hover:via-[#FBBF24] shadow-md flex flex-col items-center justify-between p-2 pt-3 transition-colors border-t-2 border-x border-amber-200/90 relative overflow-hidden ring-1 ring-amber-400/30">
              <div className="flex flex-col items-center">
                <span className="text-4xl sm:text-5xl font-black font-neue-plak text-white tracking-tight drop-shadow-sm leading-none">
                  1
                </span>
                <span className="text-[9px] sm:text-[10px] font-extrabold tracking-widest text-amber-100 uppercase mt-0.5">
                  QUÁN QUÂN
                </span>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/40 backdrop-blur-xs flex items-center justify-center shadow-2xs">
                <Trophy className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white drop-shadow-xs" />
              </div>
            </div>
          </div>
        )}

        {/* ================= 3RD PLACE (RIGHT - BRONZE / ORANGE) ================= */}
        {runner3 ? (
          <div
            onClick={() => onSelectRunner(runner3)}
            className="group flex flex-col items-center cursor-pointer transition-all duration-200 hover:-translate-y-1.5"
            title={`Hạng 3: ${runner3.name} (BIB: ${runner3.bib}) • Bấm để xem kết quả & chứng nhận`}
          >
            {/* Runner Info Above Pedestal */}
            <div className="flex flex-col items-center text-center space-y-1 mb-2.5 w-full px-1 min-w-0">
              <div className="scale-90 sm:scale-100 transition-transform group-hover:scale-110">
                <LaurelWreathMedal rank={3} />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#009A44] transition-colors truncate max-w-full leading-tight">
                {runner3.name}
              </h4>
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-200 text-[10px] font-mono font-medium truncate max-w-full">
                <span>BIB: {runner3.bib}</span>
                {runner3.ag && runner3.ag !== '-' && <span>• {runner3.ag}</span>}
              </div>
              <div className="text-xs sm:text-sm font-bold text-orange-700 font-neue-plak bg-orange-50/80 px-2 py-0.5 rounded border border-orange-200/60 shadow-2xs">
                {runner3.chipTime || '--:--:--'}
              </div>
            </div>

            {/* Pedestal 3 (Bronze / Orange Block with 3D Bevel & Bold Number) */}
            <div className="w-full h-16 sm:h-22 rounded-t-xl sm:rounded-t-2xl bg-gradient-to-b from-[#FDBA74] via-[#FB923C] to-[#EA580C] group-hover:from-[#FED7AA] group-hover:via-[#FDBA74] shadow-xs flex flex-col items-center justify-between p-2 pt-2.5 transition-colors border-t-2 border-x border-orange-200/80 relative overflow-hidden">
              <div className="flex flex-col items-center">
                <span className="text-3xl sm:text-4xl font-black font-neue-plak text-white tracking-tight drop-shadow-2xs leading-none">
                  3
                </span>
                <span className="text-[9px] sm:text-[10px] font-extrabold tracking-wider text-orange-100 uppercase mt-0.5">
                  HẠNG 3
                </span>
              </div>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/40 backdrop-blur-xs flex items-center justify-center shadow-2xs">
                <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white drop-shadow-xs" />
              </div>
            </div>
          </div>
        ) : (
          <div />
        )}
      </div>

      {/* Shared Podium Platform Stage (Bục đế vinh danh kết nối 3 vị trí) */}
      <div className="w-full max-w-xs sm:max-w-md h-3 sm:h-3.5 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 rounded-b-xl shadow-md border-t border-slate-600 flex items-center justify-center relative -mt-0.5">
        <div className="w-20 sm:w-28 h-0.5 bg-[#00A850] rounded-full opacity-90" />
      </div>

      {/* Interactive Helper Hint */}
      <p className="text-[10px] text-slate-400 mt-2 text-center">
        Nhấn vào vận động viên trên bục để tra cứu chi tiết & chứng nhận
      </p>
    </div>
  );
};

// Row item for runners ranked 4 to 50
const RunnerRankRow: React.FC<{
  runner: Runner;
  rankNumber: number;
  onSelectRunner: (runner: Runner) => void;
}> = ({ runner, rankNumber, onSelectRunner }) => {
  return (
    <div
      onClick={() => onSelectRunner(runner)}
      className="group px-3 sm:px-4 py-3 hover:bg-emerald-50/50 flex items-center justify-between gap-3 transition-colors cursor-pointer"
      title={`Hạng ${rankNumber}: ${runner.name} (BIB: ${runner.bib}) - Xem chi tiết & chứng nhận`}
    >
      {/* Left side: Rank Badge + Name/BIB */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <RankBadge rank={rankNumber} />

        {/* Name and BIB */}
        <div className="min-w-0">
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#009A44] transition-colors truncate">
            {runner.name}
          </h4>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
            <span className="font-mono">BIB: {runner.bib}</span>
            {runner.ag && runner.ag !== '-' && (
              <>
                <span>•</span>
                <span className="text-[10px] px-1 py-0.2 bg-slate-100 rounded text-slate-600 font-medium">
                  {runner.ag}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Chip time + Arrow */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-bold text-xs sm:text-sm text-slate-900 font-neue-plak">
          {runner.chipTime || '--:--:--'}
        </span>
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 group-hover:text-[#009A44] group-hover:translate-x-0.5 transition-all">
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};

// Convert chipTime string (HH:MM:SS) to total seconds for reliable sorting
function parseTimeToSeconds(timeStr?: string): number {
  if (!timeStr) return 9999999;
  const clean = timeStr.trim();
  if (clean === '--:--:--' || clean === '-' || !clean) return 9999999;
  const parts = clean.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 3 && !parts.some(isNaN)) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2 && !parts.some(isNaN)) {
    return parts[0] * 60 + parts[1];
  }
  return 9999999;
}

// Distance matcher
function matchesDistance(runnerDist: string, category: DistanceCategory, bib: string): boolean {
  const d = (runnerDist || '').toUpperCase();
  const b = (bib || '').trim();

  if (category === '42K') {
    if (d.includes('42') || d.includes('FULL') || d.includes('FM')) return true;
    if (b.startsWith('9')) return true;
    return false;
  }
  if (category === '21K') {
    if (d.includes('21') || d.includes('HALF') || d.includes('HM')) return true;
    if (b.startsWith('8') || b.startsWith('2')) return true;
    return false;
  }
  if (category === '10K') {
    if (d.includes('10')) return true;
    if (b.startsWith('6') || b.startsWith('1')) return true;
    return false;
  }
  if (category === '5K') {
    if (d.includes('5')) return true;
    if (b.startsWith('5')) return true;
    return false;
  }
  return false;
}

/**
 * Kiểm tra xem VĐV có phải là Pacer hoặc không có thông tin lứa tuổi (No age)
 * để loại bỏ hoàn toàn khỏi Bảng Xếp Hạng (BXH) theo yêu cầu.
 */
export function isPacerOrNoAge(runner: Runner): boolean {
  const ag = (runner.ag || '').toLowerCase().trim();
  const name = (runner.name || '').toLowerCase().trim();
  const bib = String(runner.bib || '').toLowerCase().trim();

  // 1. Kiểm tra Pacer (ở cột AG, Tên, hoặc BIB)
  if (
    ag === 'pacer' ||
    ag.includes('pacer') ||
    name.includes('pacer') ||
    bib.includes('pacer')
  ) {
    return true;
  }

  // 2. Kiểm tra No age / Không có nhóm tuổi
  if (
    !ag ||
    ag === '-' ||
    ag === 'null' ||
    ag === 'none' ||
    ag === 'no age' ||
    ag === 'noage' ||
    ag === 'no_age' ||
    ag.includes('no age')
  ) {
    return true;
  }

  return false;
}

export const RaceRankingTop50: React.FC<RaceRankingTop50Props> = ({
  activeRace,
  allRaces,
  runners,
  isLoadingRunners,
  onSelectRunner,
  onNavigateToResult,
  onBackToHome,
  onSelectRace,
  onRefreshData,
}) => {
  // Active Distance Tab: 42K | 21K | 10K | 5K
  const [selectedDistance, setSelectedDistance] = useState<DistanceCategory>('42K');

  // Age group filter
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('all');

  // Search input inside ranking
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Lọc VĐV theo cự ly và loại bỏ triệt để Pacer & No age khỏi BXH
  const distanceRunners = useMemo(() => {
    return runners.filter((r) => {
      if (isPacerOrNoAge(r)) return false;
      return matchesDistance(r.distance, selectedDistance, r.bib);
    });
  }, [runners, selectedDistance]);

  // Trích xuất danh sách lứa tuổi có mặt trong cự ly này (đã loại bỏ Pacer và No age)
  const availableAgeGroups = useMemo(() => {
    const agSet = new Set<string>();
    for (const r of distanceRunners) {
      if (isPacerOrNoAge(r)) continue;
      if (r.ag && r.ag !== '-' && r.ag !== 'null') {
        // Làm sạch AG, e.g. "M40-49" -> "40-49", "F01-30" -> "01-30"
        const cleanAg = r.ag.replace(/^[MF]/i, '').trim();
        const lower = cleanAg.toLowerCase();
        if (
          cleanAg &&
          lower !== 'pacer' &&
          !lower.includes('pacer') &&
          lower !== 'no age' &&
          lower !== 'noage' &&
          !lower.includes('no age')
        ) {
          agSet.add(cleanAg);
        }
      }
    }
    // Sắp xếp thứ tự lứa tuổi tự nhiên: 01-30, 31-39, 40-49, 50-59, 60+
    return Array.from(agSet).sort((a, b) => {
      const numA = parseInt(a.split('-')[0], 10) || 0;
      const numB = parseInt(b.split('-')[0], 10) || 0;
      return numA - numB;
    });
  }, [distanceRunners]);

  // Nếu lứa tuổi đang chọn không tồn tại trong cự ly hiện tại, tự động chuyển về 'all'
  useEffect(() => {
    if (selectedAgeGroup !== 'all' && !availableAgeGroups.includes(selectedAgeGroup)) {
      setSelectedAgeGroup('all');
    }
  }, [availableAgeGroups, selectedAgeGroup]);

  // Split and rank Male (Nam) and Female (Nữ) Top 50
  const { topMale, topFemale } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filterAndSort = (gender: 'M' | 'F') => {
      let filtered = distanceRunners.filter((r) => {
        const g = (r.gender || 'M').toUpperCase();
        const matchesGender = gender === 'M' ? (g.startsWith('M') || g.includes('NAM')) : (g.startsWith('F') || g.includes('NỮ') || g.includes('NU'));
        if (!matchesGender) return false;

        // Age group filter if selected
        if (selectedAgeGroup !== 'all') {
          const rAg = (r.ag || '').replace(/^[MF]/i, '').trim().toLowerCase();
          if (rAg !== selectedAgeGroup.toLowerCase() && !(r.ag || '').toLowerCase().includes(selectedAgeGroup.toLowerCase())) {
            return false;
          }
        }

        // Search query filter
        if (query) {
          const matchBib = r.bib.toLowerCase().includes(query);
          const matchName = r.name.toLowerCase().includes(query);
          return matchBib || matchName;
        }

        return true;
      });

      // Sort runners: If Age Group is filtered and ageGroupRank exists, sort by ageGroupRank;
      // otherwise sort by chipTime ascending (fastest first)
      filtered.sort((a, b) => {
        if (selectedAgeGroup !== 'all') {
          const agRankA = parseInt(String(a.ageGroupRank || ''), 10);
          const agRankB = parseInt(String(b.ageGroupRank || ''), 10);
          if (!isNaN(agRankA) && !isNaN(agRankB) && agRankA > 0 && agRankB > 0) {
            return agRankA - agRankB;
          }
        }

        // Overall Gender Rank
        const gRankA = parseInt(String(a.genderRank || ''), 10);
        const gRankB = parseInt(String(b.genderRank || ''), 10);
        if (!isNaN(gRankA) && !isNaN(gRankB) && gRankA > 0 && gRankB > 0) {
          return gRankA - gRankB;
        }

        // Fallback to chipTime
        const secA = parseTimeToSeconds(a.chipTime);
        const secB = parseTimeToSeconds(b.chipTime);
        return secA - secB;
      });

      return filtered.slice(0, 50);
    };

    return {
      topMale: filterAndSort('M'),
      topFemale: filterAndSort('F'),
    };
  }, [distanceRunners, selectedAgeGroup, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Header Bar dynamically styled with active race branding */}
      <header
        className="w-full text-white sticky top-0 z-30 shadow-md transition-colors"
        style={{ backgroundColor: activeRace.accentColor || '#009A44' }}
      >
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackToHome}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-white/20 whitespace-nowrap shrink-0"
              title="Quay lại danh sách giải đấu"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Chọn giải khác</span>
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              {activeRace.defaultLogoUrl ? (
                <img
                  src={activeRace.defaultLogoUrl}
                  alt={activeRace.name}
                  className="h-8 w-auto max-w-[85px] object-contain shrink-0 bg-white/10 rounded px-1 hidden xs:block"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : null}
              <div
                className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black shadow-xs shrink-0 text-[11px] tracking-tighter"
                style={{ color: activeRace.accentColor || '#009A44' }}
              >
                {activeRace.code || activeRace.shortName?.slice(0, 4).toUpperCase() || 'RACE'}
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-white truncate max-w-[200px] xs:max-w-[300px] sm:max-w-[450px]"
                  title={activeRace.name}
                >
                  {activeRace.name}
                </span>
                <span className="text-[10px] text-white/85 font-medium hidden sm:inline truncate">
                  {(activeRace.city || activeRace.locationFull || 'Việt Nam')} {activeRace.date ? `• ${activeRace.date}` : ''} • Cổng tra cứu kết quả & Chứng nhận điện tử
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Action: View Certificate / Search Result Page */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-white/20 text-white border border-white/30 text-[11px] font-mono font-bold shrink-0">
              {activeRace.code || 'RACE'}
            </span>

            <button
              type="button"
              onClick={() => onNavigateToResult()}
              className="px-4 py-1.5 rounded-full bg-white hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95 shrink-0 whitespace-nowrap"
              style={{ color: activeRace.accentColor || '#009A44' }}
            >
              <FileCheck className="w-3.5 h-3.5 shrink-0" style={{ color: activeRace.accentColor || '#009A44' }} />
              <span className="hidden sm:inline whitespace-nowrap">Tra cứu cá nhân</span>
              <span className="sm:hidden whitespace-nowrap">Tra cứu</span>
              <ArrowRight className="w-3 h-3 shrink-0" style={{ color: activeRace.accentColor || '#009A44' }} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Ranking Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* ========================================================= */}
        {/* 1. BOX TRA CỨU KẾT QUẢ & CHỨNG NHẬN                       */}
        {/* ========================================================= */}
        <section
          className="w-full bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-xs space-y-4"
          id="race-lookup-box"
        >
          {/* Title & Lead đồng nhất style với Bảng xếp hạng */}
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-wide">
              TRA CỨU KẾT QUẢ & CHỨNG NHẬN
            </h2>
            <p className="text-xs text-slate-500">
              {activeRace.name} • Nhập số BIB hoặc Họ tên vận động viên để tra cứu thành tích và tải chứng nhận điện tử
            </p>
          </div>

          <div className="max-w-2xl mx-auto w-full">
            <SearchRunner
              runners={runners}
              selectedRunner={null}
              isLoading={isLoadingRunners}
              demoRunners={activeRace.demoRunners}
              demoPhotos={activeRace.demoPhotos}
              showDemoChips={false}
              onSelectRunner={(runner) => {
                onSelectRunner(runner);
                onNavigateToResult(runner.bib, runner);
              }}
            />
          </div>
        </section>

        {/* ========================================================= */}
        {/* 2. BOX BẢNG XẾP HẠNG TOP 50                               */}
        {/* ========================================================= */}
        <section
          className="w-full bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6"
          id="race-ranking-box"
        >
          {/* Title & Lead đồng nhất style với Box Tra cứu */}
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-wide">
              BẢNG XẾP HẠNG TOP 50
            </h2>
            <p className="text-xs text-slate-500">
              {activeRace.name} • Cập nhật thành tích thi đấu theo Chip Time
            </p>
          </div>

          {/* Distance Selector Boxes with VPBank authentic colors (42K Cyan, 21K Green, 10K Amber, 5K Lime) */}
          <div className="flex items-center justify-center gap-2.5 sm:gap-4 flex-wrap">
            {(['42K', '21K', '10K', '5K'] as DistanceCategory[]).map((dist) => {
              const isSelected = selectedDistance === dist;
              const info = VPBANK_DISTANCES[dist];

              return (
                <button
                  key={dist}
                  type="button"
                  onClick={() => {
                    setSelectedDistance(dist);
                    setSelectedAgeGroup('all');
                  }}
                  className={`relative px-4 py-2.5 sm:px-6 sm:py-3.5 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer shadow-xs min-w-[85px] sm:min-w-[125px] ${
                    isSelected
                      ? `bg-white border-2 ${info.borderActive} shadow-md ring-4 ${info.ringActive} scale-105`
                      : 'bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 opacity-75 hover:opacity-100'
                  }`}
                  title={`Cự ly ${dist} - ${info.label}`}
                >
                  <div className="flex items-baseline justify-center">
                    <span
                      className={`font-black tracking-tighter text-2xl sm:text-3xl italic font-stat-value ${
                        isSelected ? info.textActive : 'text-slate-400'
                      }`}
                    >
                      {info.num}
                    </span>
                    <span
                      className={`text-[10px] sm:text-xs font-bold ml-0.5 ${
                        isSelected ? info.textActive : 'text-slate-400'
                      }`}
                    >
                      km
                    </span>
                  </div>
                  <span
                    className={`text-[9px] sm:text-[10px] font-extrabold tracking-tight mt-0.5 uppercase whitespace-nowrap shrink-0 ${
                      isSelected ? info.textActive : 'text-slate-400'
                    }`}
                  >
                    {info.label}
                  </span>
                  <div
                    className="w-7 sm:w-9 h-1 mt-1.5 rounded-full transition-all"
                    style={{ backgroundColor: isSelected ? info.color : 'transparent' }}
                  />
                </button>
              );
            })}
          </div>

          {/* Filter Controls: Age Group Selector & Live Search Input */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Age Group Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
              <span className="text-xs font-semibold text-slate-500 shrink-0 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Lứa tuổi:</span>
              </span>

              <button
                type="button"
                onClick={() => setSelectedAgeGroup('all')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                  selectedAgeGroup === 'all'
                    ? 'bg-[#009A44] text-white shadow-2xs font-bold'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span className="whitespace-nowrap">Tất cả lứa tuổi</span>
              </button>

              {availableAgeGroups.map((ag) => (
                <button
                  key={ag}
                  type="button"
                  onClick={() => setSelectedAgeGroup(ag)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                    selectedAgeGroup === ag
                      ? 'bg-[#009A44] text-white shadow-2xs font-bold'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span className="whitespace-nowrap">{ag}</span>
                </button>
              ))}
            </div>

            {/* Search Runner by BIB or Name */}
            <div className="relative sm:w-64 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Lọc nhanh trong bảng Top 50..."
                className="w-full pl-8 pr-3 py-1.5 bg-white hover:bg-white focus:bg-white border border-slate-200 focus:border-[#00A850] focus:ring-2 focus:ring-[#00A850]/20 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Main Ranking Grid: 2 Columns (♂ NAM & ♀ NỮ) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* ================= COLUMN 1: ♂ NAM ================= */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs flex flex-col">
              {/* Header: ♂ NAM */}
              <div className="px-4 py-3 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#009A44] text-white font-bold text-sm flex items-center justify-center shadow-2xs">
                    ♂
                  </span>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-wide">
                    NAM
                  </h3>
                  <span className="text-[11px] text-slate-500 font-normal">
                    ({topMale.length} VĐV)
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider pr-5">
                  Chip time
                </span>
              </div>

              {/* Top 1-3 Podium Stand (Đứng bục vinh danh - Không avatar) */}
              {topMale.length >= 3 && (
                <Top3Podium
                  runners={topMale.slice(0, 3)}
                  onSelectRunner={onSelectRunner}
                  gender="M"
                />
              )}

              {/* Rows List */}
              <div className="divide-y divide-slate-100 flex-1">
                {topMale.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    {isLoadingRunners ? 'Đang tải danh sách...' : 'Không tìm thấy vận động viên phù hợp.'}
                  </div>
                ) : topMale.length < 3 ? (
                  topMale.map((runner, index) => (
                    <RunnerRankRow
                      key={`${runner.bib}-${index}`}
                      runner={runner}
                      rankNumber={index + 1}
                      onSelectRunner={onSelectRunner}
                    />
                  ))
                ) : (
                  topMale.slice(3).map((runner, index) => (
                    <RunnerRankRow
                      key={`${runner.bib}-${index + 4}`}
                      runner={runner}
                      rankNumber={index + 4}
                      onSelectRunner={onSelectRunner}
                    />
                  ))
                )}
              </div>
            </div>

            {/* ================= COLUMN 2: ♀ NỮ ================= */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs flex flex-col">
              {/* Header: ♀ NỮ */}
              <div className="px-4 py-3 bg-rose-50/80 border-b border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-500 text-white font-bold text-sm flex items-center justify-center shadow-2xs">
                    ♀
                  </span>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-wide">
                    NỮ
                  </h3>
                  <span className="text-[11px] text-slate-500 font-normal">
                    ({topFemale.length} VĐV)
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider pr-5">
                  Chip time
                </span>
              </div>

              {/* Top 1-3 Podium Stand (Đứng bục vinh danh - Không avatar) */}
              {topFemale.length >= 3 && (
                <Top3Podium
                  runners={topFemale.slice(0, 3)}
                  onSelectRunner={onSelectRunner}
                  gender="F"
                />
              )}

              {/* Rows List */}
              <div className="divide-y divide-slate-100 flex-1">
                {topFemale.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    {isLoadingRunners ? 'Đang tải danh sách...' : 'Không tìm thấy vận động viên phù hợp.'}
                  </div>
                ) : topFemale.length < 3 ? (
                  topFemale.map((runner, index) => (
                    <RunnerRankRow
                      key={`${runner.bib}-${index}`}
                      runner={runner}
                      rankNumber={index + 1}
                      onSelectRunner={onSelectRunner}
                    />
                  ))
                ) : (
                  topFemale.slice(3).map((runner, index) => (
                    <RunnerRankRow
                      key={`${runner.bib}-${index + 4}`}
                      runner={runner}
                      rankNumber={index + 4}
                      onSelectRunner={onSelectRunner}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
