import React, { useState, useMemo } from 'react';
import { Runner } from '../types';
import { Race } from '../data/races';
import { getDemoPhoto } from '../data/mockRunners';
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
} from 'lucide-react';

interface RaceRankingTop50Props {
  activeRace: Race;
  allRaces: Race[];
  runners: Runner[];
  isLoadingRunners: boolean;
  onSelectRunner: (runner: Runner) => void;
  onNavigateToResult: (bib?: string) => void;
  onBackToHome: () => void;
  onSelectRace: (race: Race) => void;
  onRefreshData?: () => void;
}

type DistanceCategory = '42K' | '21K' | '10K' | '5K';

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

  // Extract all distinct age groups present in runners for this distance
  const availableAgeGroups = useMemo(() => {
    const agSet = new Set<string>();
    for (const r of runners) {
      if (r.ag && r.ag !== '-' && r.ag !== 'null') {
        // Clean AG, e.g. "M40-49" -> "40-49" or keep as is
        const cleanAg = r.ag.replace(/^[MF]/i, '').trim();
        if (cleanAg) agSet.add(cleanAg);
      }
    }
    return Array.from(agSet).sort();
  }, [runners]);

  // Filter runners by distance
  const distanceRunners = useMemo(() => {
    return runners.filter((r) => matchesDistance(r.distance, selectedDistance, r.bib));
  }, [runners, selectedDistance]);

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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-[#9F224E] selection:text-white">
      {/* Top Header Bar */}
      <header className="w-full bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onBackToHome}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Quay lại danh sách giải đấu"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chọn giải khác</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                {activeRace.name}
              </span>
              {activeRace.code && (
                <span className="px-2 py-0.5 rounded-md bg-rose-50 text-[#9F224E] border border-rose-200 text-[10px] font-mono font-bold shrink-0">
                  {activeRace.code}
                </span>
              )}
            </div>
          </div>

          {/* Navigation Action: View Certificate / Search Result Page */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateToResult()}
              className="px-3 py-1.5 rounded-xl bg-[#0F2847] hover:bg-[#1E3A5F] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
            >
              <FileCheck className="w-3.5 h-3.5 text-[#FFD100]" />
              <span>Tra cứu cá nhân</span>
              <ArrowRight className="w-3 h-3 text-slate-300" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Ranking Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Title: BẢNG XẾP HẠNG TOP 50 (Exactly like image.png) */}
        <div className="text-center space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-wide">
            BẢNG XẾP HẠNG TOP 50
          </h1>
          <p className="text-xs text-slate-500">
            {activeRace.name} • Cập nhật thành tích thi đấu theo Chip Time
          </p>
        </div>

        {/* Distance Selector Boxes: 42km, 21km, 10km, 5km (Matching image.png) */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
          {(['42K', '21K', '10K', '5K'] as DistanceCategory[]).map((dist) => {
            const isSelected = selectedDistance === dist;
            const distNumber = dist.replace('K', '');

            return (
              <button
                key={dist}
                type="button"
                onClick={() => setSelectedDistance(dist)}
                className={`relative w-18 h-18 sm:w-22 sm:h-22 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer shadow-xs ${
                  isSelected
                    ? 'bg-white border-2 border-[#9F224E] shadow-md ring-2 ring-[#9F224E]/20 scale-105'
                    : 'bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 opacity-70 hover:opacity-100'
                }`}
                title={`Cự ly ${dist}`}
              >
                <div className="flex items-baseline justify-center">
                  <span
                    className={`font-black tracking-tighter text-2xl sm:text-3xl italic ${
                      isSelected ? 'text-[#9F224E]' : 'text-slate-400'
                    }`}
                    style={{ fontFamily: "'Neue Plak Bold', 'Montserrat', sans-serif" }}
                  >
                    {distNumber}
                  </span>
                  <span
                    className={`text-[10px] sm:text-xs font-bold ml-0.5 ${
                      isSelected ? 'text-[#9F224E]' : 'text-slate-400'
                    }`}
                  >
                    km
                  </span>
                </div>
                <div
                  className={`w-6 h-0.5 mt-1 rounded-full ${
                    isSelected ? 'bg-[#9F224E]' : 'bg-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Filter Controls: Age Group Selector & Live Search Input */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Age Group Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
            <span className="text-xs font-semibold text-slate-500 shrink-0 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Lứa tuổi:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedAgeGroup('all')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                selectedAgeGroup === 'all'
                  ? 'bg-[#0F2847] text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Tất cả lứa tuổi
            </button>

            {availableAgeGroups.map((ag) => (
              <button
                key={ag}
                type="button"
                onClick={() => setSelectedAgeGroup(ag)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedAgeGroup === ag
                    ? 'bg-[#0F2847] text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {ag}
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
              placeholder="Tìm theo BIB hoặc Họ tên..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#9F224E] rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
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

        {/* Main Ranking Grid: 2 Columns (♂ NAM & ♀ NỮ) exactly like image.png */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {/* ================= COLUMN 1: ♂ NAM ================= */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs flex flex-col">
            {/* Header: ♂ NAM */}
            <div className="px-4 py-3 bg-[#F4F4F5] border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 font-bold text-sm flex items-center justify-center">
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

            {/* Rows List */}
            <div className="divide-y divide-slate-100 flex-1">
              {topMale.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {isLoadingRunners ? 'Đang tải danh sách...' : 'Không tìm thấy vận động viên phù hợp.'}
                </div>
              ) : (
                topMale.map((runner, index) => {
                  const rankNumber = index + 1;
                  const isTop3 = rankNumber <= 3;
                  const demoPhoto = getDemoPhoto(runner.bib) || getDemoPhoto(runner.name);
                  const displayPhoto = runner.photoUrl || demoPhoto;
                  const initialLetter = (runner.name || 'V').trim().charAt(0).toUpperCase();

                  return (
                    <div
                      key={`${runner.bib}-${index}`}
                      onClick={() => onSelectRunner(runner)}
                      className="group px-3 sm:px-4 py-3 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                      title={`Xem chi tiết & chứng nhận của ${runner.name} (BIB: ${runner.bib})`}
                    >
                      {/* Left side: Rank + Avatar + Name/BIB */}
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        {/* Rank Medal (1, 2, 3) or Shield Badge (4..50) */}
                        {isTop3 ? (
                          <LaurelWreathMedal rank={rankNumber as 1 | 2 | 3} />
                        ) : (
                          <RankBadge rank={rankNumber} />
                        )}

                        {/* Avatar */}
                        {displayPhoto ? (
                          <img
                            src={displayPhoto}
                            alt={runner.name}
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                            {initialLetter}
                          </div>
                        )}

                        {/* Name and BIB */}
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#9F224E] transition-colors truncate">
                            {runner.name}
                          </h4>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono">BIB: {runner.bib}</span>
                            {runner.ag && runner.ag !== '-' && (
                              <>
                                <span>•</span>
                                <span className="text-[10px] px-1 py-0.2 bg-slate-100 rounded text-slate-600">
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
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 group-hover:text-[#9F224E] group-hover:translate-x-0.5 transition-all">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ================= COLUMN 2: ♀ NỮ ================= */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs flex flex-col">
            {/* Header: ♀ NỮ */}
            <div className="px-4 py-3 bg-[#F4F4F5] border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rose-100 text-[#9F224E] font-bold text-sm flex items-center justify-center">
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

            {/* Rows List */}
            <div className="divide-y divide-slate-100 flex-1">
              {topFemale.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {isLoadingRunners ? 'Đang tải danh sách...' : 'Không tìm thấy vận động viên phù hợp.'}
                </div>
              ) : (
                topFemale.map((runner, index) => {
                  const rankNumber = index + 1;
                  const isTop3 = rankNumber <= 3;
                  const demoPhoto = getDemoPhoto(runner.bib) || getDemoPhoto(runner.name);
                  const displayPhoto = runner.photoUrl || demoPhoto;
                  const initialLetter = (runner.name || 'N').trim().charAt(0).toUpperCase();

                  return (
                    <div
                      key={`${runner.bib}-${index}`}
                      onClick={() => onSelectRunner(runner)}
                      className="group px-3 sm:px-4 py-3 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                      title={`Xem chi tiết & chứng nhận của ${runner.name} (BIB: ${runner.bib})`}
                    >
                      {/* Left side: Rank + Avatar + Name/BIB */}
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        {/* Rank Medal (1, 2, 3) or Shield Badge (4..50) */}
                        {isTop3 ? (
                          <LaurelWreathMedal rank={rankNumber as 1 | 2 | 3} />
                        ) : (
                          <RankBadge rank={rankNumber} />
                        )}

                        {/* Avatar */}
                        {displayPhoto ? (
                          <img
                            src={displayPhoto}
                            alt={runner.name}
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                            {initialLetter}
                          </div>
                        )}

                        {/* Name and BIB */}
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#9F224E] transition-colors truncate">
                            {runner.name}
                          </h4>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono">BIB: {runner.bib}</span>
                            {runner.ag && runner.ag !== '-' && (
                              <>
                                <span>•</span>
                                <span className="text-[10px] px-1 py-0.2 bg-slate-100 rounded text-slate-600">
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
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 group-hover:text-[#9F224E] group-hover:translate-x-0.5 transition-all">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
