import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SearchRunner } from './SearchRunner';
import { CertificateCanvas } from './CertificateCanvas';
import { RunnerDetailsCard } from './RunnerDetailsCard';
import { AdminPlacementStudio } from './AdminPlacementStudio';
import { RaceSelectorHome } from './RaceSelectorHome';
import { Runner, CertificateConfig, DataSourceSettings } from '../types';
import { Race, DEFAULT_RACE } from '../data/races';
import { INITIAL_RUNNERS, DEMO_RUNNERS, DEMO_PHOTOS, getDemoPhoto } from '../data/mockRunners';
import {
  fetchAllRaces,
  getLocalRaces,
  resolveRaceFromPath,
} from '../data/raceStorage';
import {
  DEFAULT_NGHE_AN_PLACEMENTS,
  fetchServerDefaultPlacements,
} from '../data/certificatePlacements';
import {
  getSavedDataSourceSettings,
  fetchRunnersFromSource,
  getDirectGoogleDriveImageUrl,
  getCachedRunners,
} from '../services/sheetService';
import { getGlobalSupabaseConfig } from '../services/supabaseService';
import { AlertCircle, ArrowLeft, Trophy } from 'lucide-react';

const DEFAULT_CONFIG: CertificateConfig = {
  bgMode: 'custom',
  customBgDataUrl: '/NA26.png',
  nameY: 32.84,
  distanceY: 36.63,
  statsY: 48.2,
  statsLayout: 'vertical',
  showStatsCard: false,
  statsLineSpacing: 1.25,
  fontSizeMultiplier: 1.0,
  textColor: '#042738',
  nameColor: '#042738',
  distanceColor: '#042738',
  showDistanceUnderline: false,
  statsLabelColor: '#FFFFFF',
  statsValueColor: '#fff100',
  accentColor: '#fff100',
  uppercaseName: true,
};

export interface CertificateLookupProps {
  /**
   * Mã slug hoặc ID của giải chạy muốn hiển thị (ví dụ: 'vpbank-hanoi-international-marathon-2026', 'nghe-an-2026').
   * Nếu truyền vào, component sẽ khóa hoặc ưu tiên giải này.
   */
  raceSlug?: string;

  /**
   * Số BIB mặc định cần tra cứu và chọn ngay khi tải trang.
   */
  initialBib?: string;

  /**
   * Vận động viên mặc định kích hoạt ngay khi tải trang.
   */
  initialRunner?: Runner;

  /**
   * Danh sách vận động viên nạp sẵn từ ngoài.
   */
  initialRunners?: Runner[];

  /**
   * Danh sách giải chạy tùy biến truyền từ ngoài vào.
   * Nếu không truyền, component sẽ tự động tải từ API / public files / bộ nhớ đệm.
   */
  races?: Race[];

  /**
   * Có hiển thị nút quay lại hay không (mặc định: true nếu có nhiều giải hoặc có onBack).
   */
  showBackButton?: boolean;

  /**
   * Callback khi người dùng nhấn nút quay lại.
   * Nếu không truyền và allowRaceSelection = true, component sẽ quay lại danh sách chọn giải.
   */
  onBack?: () => void;

  /**
   * Cho phép chuyển sang màn hình chọn giải (RaceSelectorHome) khi ở trang chủ (mặc định: true).
   * Đặt thành false nếu nhúng vào trang con chỉ phục vụ 1 giải cụ thể.
   */
  allowRaceSelection?: boolean;

  /**
   * Bật/tắt chế độ quản trị Admin Placement Studio (/admin) (mặc định: true).
   */
  enableAdmin?: boolean;

  /**
   * Đồng bộ đường dẫn lên URL trình duyệt bằng window.history.pushState (mặc định: false khi làm component con).
   * Đặt thành true khi chạy như một ứng dụng độc lập.
   */
  syncUrl?: boolean;

  /**
   * Ẩn thanh header trên cùng của component (hữu ích khi trang cha đã có Header/Navbar riêng).
   */
  hideHeader?: boolean;

  /**
   * Class tùy biến cho thẻ container bao ngoài cùng.
   */
  className?: string;

  /**
   * Callback khi người dùng chọn một VĐV.
   */
  onSelectRunner?: (runner: Runner) => void;

  /**
   * Callback khi người dùng bấm quay lại hoặc chuyển sang trang Bảng xếp hạng Top 50
   */
  onNavigateToRanking?: () => void;

  /**
   * Có hiển thị nút chuyển sang trang Bảng xếp hạng Top 50 hay không
   */
  showRankingButton?: boolean;
}

export function CertificateLookup({
  raceSlug,
  initialBib,
  initialRunner,
  initialRunners,
  races: customRaces,
  showBackButton,
  onBack,
  allowRaceSelection = true,
  enableAdmin = true,
  syncUrl = false,
  hideHeader = false,
  className = '',
  onSelectRunner,
  onNavigateToRanking,
  showRankingButton = true,
}: CertificateLookupProps) {
  // Danh sách giải chạy
  const [allRaces, setAllRaces] = useState<Race[]>(() => customRaces || getLocalRaces());
  const [isRacesLoaded, setIsRacesLoaded] = useState<boolean>(Boolean(customRaces));

  // Nhớ URL ban đầu khi mount
  const targetPathOnMount = React.useRef<string>(
    typeof window !== 'undefined'
      ? window.location.pathname + window.location.search + window.location.hash
      : ''
  );

  // Xác định giải đang kích hoạt
  const [activeRace, setActiveRace] = useState<Race>(() => {
    const list = customRaces || getLocalRaces();
    if (raceSlug) {
      const match = list.find(
        (r) => r.slug.toLowerCase() === raceSlug.toLowerCase() || r.id.toLowerCase() === raceSlug.toLowerCase()
      );
      if (match) return match;
    }
    if (typeof window !== 'undefined' && syncUrl) {
      return resolveRaceFromPath(
        window.location.pathname + window.location.search + window.location.hash,
        list
      );
    }
    return list[0] || DEFAULT_RACE;
  });

  // Cập nhật khi raceSlug từ props thay đổi
  useEffect(() => {
    if (raceSlug && allRaces.length > 0) {
      const match = allRaces.find(
        (r) => r.slug.toLowerCase() === raceSlug.toLowerCase() || r.id.toLowerCase() === raceSlug.toLowerCase()
      );
      if (match && match.id !== activeRace.id) {
        setActiveRace(match);
      }
    }
  }, [raceSlug, allRaces, activeRace.id]);

  // Refresh danh sách giải từ API nếu không có customRaces
  const refreshRacesList = useCallback(async () => {
    if (customRaces && customRaces.length > 0) {
      setAllRaces(customRaces);
      setIsRacesLoaded(true);
      return;
    }
    const list = await fetchAllRaces();
    setAllRaces(list);
    setIsRacesLoaded(true);
    setActiveRace((prev) => {
      if (raceSlug) {
        const found = list.find(
          (r) => r.slug.toLowerCase() === raceSlug.toLowerCase() || r.id.toLowerCase() === raceSlug.toLowerCase()
        );
        if (found) return found;
      }
      if (syncUrl && targetPathOnMount.current) {
        const fromPath = resolveRaceFromPath(targetPathOnMount.current, list);
        const cleanReq = targetPathOnMount.current.replace(/^\/+|\/+$/g, '').toLowerCase().split('?')[0].split('#')[0];
        if (cleanReq && cleanReq !== 'admin' && cleanReq !== 'api') {
          if (fromPath && (
            fromPath.slug.toLowerCase() === cleanReq ||
            fromPath.id.toLowerCase() === cleanReq ||
            (fromPath.code && fromPath.code.toLowerCase() === cleanReq)
          )) {
            return fromPath;
          }
        }
      }
      const match = list.find((r) => r.id === prev.id || r.slug === prev.slug);
      return match ? match : (list[0] || prev);
    });
  }, [customRaces, raceSlug, syncUrl]);

  useEffect(() => {
    refreshRacesList();
  }, [refreshRacesList]);

  // Danh sách VĐV
  const [runners, setRunners] = useState<Runner[]>(() => {
    if (initialRunners && initialRunners.length > 0) return initialRunners;
    const cached = getCachedRunners(activeRace.storageKeyPrefix);
    if (cached && cached.length > 0) return cached;
    return activeRace.initialRunners && activeRace.initialRunners.length > 0
      ? activeRace.initialRunners
      : INITIAL_RUNNERS;
  });

  // Đồng bộ runners khi initialRunners prop cập nhật
  useEffect(() => {
    if (initialRunners && initialRunners.length > 0) {
      setRunners(initialRunners);
    }
  }, [initialRunners]);

  // VĐV đang được chọn
  const [selectedRunner, setSelectedRunner] = useState<Runner>(() => {
    if (initialRunner) {
      const photo = getDemoPhoto(initialRunner.bib) || getDemoPhoto(initialRunner.name) || (activeRace.demoPhotos || DEMO_PHOTOS)[initialRunner.bib] || initialRunner.photoUrl;
      return photo ? { ...initialRunner, photoUrl: photo } : initialRunner;
    }

    const def =
      (activeRace.demoRunners && activeRace.demoRunners[0]) ||
      (activeRace.initialRunners && activeRace.initialRunners[0]) ||
      DEMO_RUNNERS[0] ||
      INITIAL_RUNNERS[0];

    // Kiểm tra initialBib từ props hoặc URL params
    const bibToFind = initialBib || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('bib') : null);
    if (bibToFind) {
      const cached = getCachedRunners(activeRace.storageKeyPrefix);
      const pool = (cached && cached.length > 0)
        ? cached
        : ((activeRace.initialRunners && activeRace.initialRunners.length > 0)
          ? activeRace.initialRunners
          : (activeRace.demoRunners || DEMO_RUNNERS));
      const cleanBib = bibToFind.trim().toLowerCase();
      const match = pool?.find((r) => r.bib.trim().toLowerCase() === cleanBib || r.name.trim().toLowerCase() === cleanBib);
      if (match) {
        const photo = getDemoPhoto(match.bib) || getDemoPhoto(match.name) || (activeRace.demoPhotos || DEMO_PHOTOS)[match.bib];
        return photo ? { ...match, photoUrl: photo } : match;
      }
    }

    const photo = getDemoPhoto(def.bib) || getDemoPhoto(def.name) || (activeRace.demoPhotos || DEMO_PHOTOS)[def.bib] || def.photoUrl;
    return photo ? { ...def, photoUrl: photo } : def;
  });

  // Tự động kích hoạt VĐV khi initialRunner thay đổi
  useEffect(() => {
    if (initialRunner) {
      const photoMap = activeRace.demoPhotos || DEMO_PHOTOS;
      const demoPhoto = getDemoPhoto(initialRunner.bib) || getDemoPhoto(initialRunner.name) || photoMap[initialRunner.bib];
      const withPhoto = demoPhoto ? { ...initialRunner, photoUrl: demoPhoto } : initialRunner;
      setSelectedRunner(withPhoto);
    }
  }, [initialRunner, activeRace.demoPhotos]);

  const [isLoadingRunners, setIsLoadingRunners] = useState<boolean>(false);
  const [config, setConfig] = useState<CertificateConfig>(() => ({
    ...DEFAULT_CONFIG,
    bgMode: 'custom',
    customBgDataUrl: activeRace.defaultBgUrl || '/race_logo.png',
    placements: activeRace.placements || DEFAULT_NGHE_AN_PLACEMENTS,
  }));

  const [dataSourceSettings, setDataSourceSettings] = useState<DataSourceSettings>(() =>
    getSavedDataSourceSettings(activeRace.storageKeyPrefix)
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(activeRace.defaultLogoUrl);

  // Admin Route state
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    if (!enableAdmin) return false;
    if (typeof window !== 'undefined' && syncUrl) {
      return (
        window.location.pathname.startsWith('/admin') ||
        window.location.hash.startsWith('#admin') ||
        window.location.search.includes('admin=true')
      );
    }
    return false;
  });

  // Home View state
  const [isHomeView, setIsHomeView] = useState<boolean>(() => {
    if (!allowRaceSelection || raceSlug) return false;
    if (typeof window !== 'undefined' && syncUrl) {
      const clean = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase().split('?')[0].split('#')[0];
      const atAdmin =
        window.location.pathname.startsWith('/admin') ||
        window.location.hash.startsWith('#admin') ||
        window.location.search.includes('admin=true');
      return !atAdmin && (clean === '' || clean === 'home');
    }
    return false;
  });

  // Popstate navigation
  useEffect(() => {
    if (!syncUrl) return;

    const handlePopState = () => {
      const clean = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase().split('?')[0].split('#')[0];
      const atAdmin =
        window.location.pathname.startsWith('/admin') ||
        window.location.hash.startsWith('#admin') ||
        window.location.search.includes('admin=true');
      if (enableAdmin) {
        setIsAdminRoute(atAdmin);
      }

      if (allowRaceSelection) {
        const atHome = !atAdmin && (clean === '' || clean === 'home');
        setIsHomeView(atHome);
        if (!atHome && !atAdmin) {
          const detected = resolveRaceFromPath(
            window.location.pathname + window.location.search + window.location.hash,
            allRaces
          );
          setActiveRace(detected);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [allRaces, syncUrl, allowRaceSelection, enableAdmin]);

  // Fetch server default placements
  useEffect(() => {
    async function loadServerDefaults() {
      const serverPlacements = await fetchServerDefaultPlacements();
      if (serverPlacements) {
        setConfig((prev) => ({
          ...prev,
          placements: serverPlacements,
        }));
      }
    }
    loadServerDefaults();
  }, []);

  // Update placements when activeRace changes
  useEffect(() => {
    const targetPlacements = activeRace.placements || DEFAULT_NGHE_AN_PLACEMENTS;
    setConfig((prev) => ({
      ...prev,
      placements: targetPlacements,
      customBgDataUrl: activeRace.defaultBgUrl || prev.customBgDataUrl,
    }));
  }, [activeRace.id, activeRace.placements, activeRace.defaultBgUrl]);

  // Switch active race
  const handleSelectRace = useCallback((race: Race) => {
    setActiveRace(race);
    setIsHomeView(false);
    if (syncUrl && typeof window !== 'undefined') {
      const search = window.location.search;
      window.history.pushState(null, '', `/${race.slug}${search}`);
    }
  }, [syncUrl]);

  // Load runners for race
  const loadRunnersForRace = useCallback(
    async (settings: DataSourceSettings, targetRace: Race, forceRefresh: boolean = false) => {
      setIsLoadingRunners(true);
      try {
        const globalSb = getGlobalSupabaseConfig();
        const hasRaceSb = Boolean(targetRace.supabaseUrl && targetRace.supabaseAnonKey);
        const hasGlobalSb = Boolean(globalSb.url && globalSb.anonKey);

        let raceSpecificSettings: DataSourceSettings;

        if (hasRaceSb || hasGlobalSb || settings.type === 'supabase' || settings.supabase?.url) {
          raceSpecificSettings = {
            ...settings,
            type: 'supabase',
            url: '',
            supabase: {
              url: targetRace.supabaseUrl || settings.supabase?.url || globalSb.url || '',
              anonKey: targetRace.supabaseAnonKey || settings.supabase?.anonKey || globalSb.anonKey || '',
              table: targetRace.supabaseTable || settings.supabase?.table || globalSb.table || 'runners',
              raceColumn: targetRace.supabaseRaceColumn || settings.supabase?.raceColumn || globalSb.raceColumn || 'Race',
              raceValue: targetRace.supabaseRaceFilter || settings.supabase?.raceValue || globalSb.raceValue || targetRace.code || targetRace.slug || '',
            },
          };
        } else {
          raceSpecificSettings = {
            ...settings,
            url: targetRace.appsScriptUrl || settings.url || '/api/marathon-data',
            type: 'appsScript',
          };
        }

        const res = await fetchRunnersFromSource(
          raceSpecificSettings,
          targetRace.storageKeyPrefix,
          targetRace.initialRunners,
          forceRefresh
        );

        if (res.backgroundUrl) {
          const directBg = getDirectGoogleDriveImageUrl(res.backgroundUrl) || res.backgroundUrl;
          if (!directBg.includes('QN26') && !directBg.includes('quynhon') && !directBg.includes('17cfwL9HAxh2_tRgvdMp66URxzh6wLj46')) {
            setConfig((prev) => ({
              ...prev,
              bgMode: 'custom',
              customBgDataUrl: directBg,
            }));
          } else {
            setConfig((prev) => ({
              ...prev,
              bgMode: 'custom',
              customBgDataUrl: targetRace.defaultBgUrl || '/NA26.png',
            }));
          }
        }

        if (res.logoUrl) {
          const directLogo = getDirectGoogleDriveImageUrl(res.logoUrl) || res.logoUrl;
          setLogoUrl(directLogo);
        }

        if (res.runners && res.runners.length > 0) {
          setRunners(res.runners);
          setSelectedRunner((current) => {
            const photoMap = targetRace.demoPhotos || DEMO_PHOTOS;
            if (!current) {
              const def =
                (targetRace.demoRunners && targetRace.demoRunners[0]) ||
                (targetRace.initialRunners && targetRace.initialRunners[0]) ||
                DEMO_RUNNERS[0] ||
                INITIAL_RUNNERS[0];
              const p = getDemoPhoto(def.bib) || getDemoPhoto(def.name) || photoMap[def.bib] || def.photoUrl;
              return p ? { ...def, photoUrl: p } : def;
            }
            const found = res.runners.find((r) => r.bib.toLowerCase() === current.bib.toLowerCase());
            if (found) {
              const p = current.photoUrl || getDemoPhoto(found.bib) || getDemoPhoto(found.name) || photoMap[found.bib];
              return p ? { ...found, photoUrl: p } : found;
            }
            return current;
          });
        }

        if (res.error) {
          setSyncError(res.error);
        } else {
          setSyncError(null);
        }
      } finally {
        setIsLoadingRunners(false);
      }
    },
    []
  );

  // Sync state on activeRace change
  useEffect(() => {
    if (isHomeView) {
      if (syncUrl) document.title = 'Tra Cứu Chứng Nhận VnExpress Marathon - Chọn Giải Chạy';
      return;
    }

    if (syncUrl && isRacesLoaded && !isAdminRoute) {
      const currentPath = window.location.pathname.replace(/^\/+/, '').split('?')[0].split('#')[0];
      if (currentPath && currentPath !== activeRace.slug) {
        window.history.replaceState(null, '', `/${activeRace.slug}${window.location.search}`);
      }
    }

    if (syncUrl) {
      document.title = `Tra Cứu Chứng Nhận ${activeRace.name}`;
    }

    setConfig((prev) => ({
      ...prev,
      bgMode: 'custom',
      customBgDataUrl: activeRace.defaultBgUrl || '/NA26.png',
    }));

    try {
      const savedLogo = localStorage.getItem(`${activeRace.storageKeyPrefix}_logo_url`);
      setLogoUrl(savedLogo && !savedLogo.includes('error') ? savedLogo : activeRace.defaultLogoUrl);
    } catch {
      setLogoUrl(activeRace.defaultLogoUrl);
    }

    const currentSettings = getSavedDataSourceSettings(activeRace.storageKeyPrefix);
    setDataSourceSettings(currentSettings);

    const cached = getCachedRunners(activeRace.storageKeyPrefix);
    if (cached && cached.length > 0) {
      setRunners(cached);
      setSelectedRunner((current) => {
        if (!current) return cached[0];
        const photoMap = activeRace.demoPhotos || DEMO_PHOTOS;
        const found = cached.find((r) => r.bib.toLowerCase() === current.bib.toLowerCase());
        if (found) {
          const p = current.photoUrl || getDemoPhoto(found.bib) || getDemoPhoto(found.name) || photoMap[found.bib];
          return p ? { ...found, photoUrl: p } : found;
        }
        return current;
      });
    }

    loadRunnersForRace(currentSettings, activeRace);
  }, [activeRace, isRacesLoaded, isHomeView, isAdminRoute, loadRunnersForRace, syncUrl]);

  // Initial BIB or URL BIB selection
  useEffect(() => {
    const bibToSearch = initialBib || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('bib') : null);
    if (bibToSearch && runners.length > 0) {
      const cleanBib = bibToSearch.trim().toLowerCase();
      const match = runners.find(
        (r) => r.bib.trim().toLowerCase() === cleanBib || r.name.trim().toLowerCase() === cleanBib
      );
      if (match) {
        const photoMap = activeRace.demoPhotos || DEMO_PHOTOS;
        const demoPhoto = getDemoPhoto(match.bib) || getDemoPhoto(match.name) || photoMap[match.bib];
        const res = demoPhoto ? { ...match, photoUrl: demoPhoto } : match;
        setSelectedRunner(res);
        if (onSelectRunner) onSelectRunner(res);
      }
    }
  }, [runners, activeRace, initialBib, onSelectRunner]);

  // Handle runner selection
  const handleSelectRunner = useCallback((runner: Runner) => {
    const photoMap = activeRace.demoPhotos || DEMO_PHOTOS;
    const demoPhoto = getDemoPhoto(runner.bib) || getDemoPhoto(runner.name) || photoMap[runner.bib];
    const withPhoto = demoPhoto ? { ...runner, photoUrl: demoPhoto } : runner;
    setSelectedRunner(withPhoto);
    if (onSelectRunner) onSelectRunner(withPhoto);
  }, [activeRace.demoPhotos, onSelectRunner]);

  // Should back button show?
  const shouldShowBack = useMemo(() => {
    if (showBackButton !== undefined) return showBackButton;
    if (onBack) return true;
    if (allowRaceSelection && allRaces.length > 1) return true;
    return false;
  }, [showBackButton, onBack, allowRaceSelection, allRaces.length]);

  const handleBackClick = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    if (onNavigateToRanking) {
      onNavigateToRanking();
      return;
    }
    if (allowRaceSelection) {
      setIsHomeView(true);
      if (syncUrl && typeof window !== 'undefined') {
        window.history.pushState(null, '', '/');
      }
    }
  }, [onBack, onNavigateToRanking, allowRaceSelection, syncUrl]);

  // Render Admin View
  if (enableAdmin && isAdminRoute) {
    return (
      <AdminPlacementStudio
        runners={runners}
        activeRace={activeRace}
        allRaces={allRaces}
        dataSourceSettings={dataSourceSettings}
        onSelectRace={handleSelectRace}
        onRefreshRaces={refreshRacesList}
        onRunnersUpdated={(newRunners) => {
          setRunners(newRunners);
        }}
        onConfigUpdated={setConfig}
        onLogoUpdated={setLogoUrl}
        onBackToUserView={() => {
          if (syncUrl && typeof window !== 'undefined') {
            window.history.pushState({}, '', '/');
          }
          setIsHomeView(true);
          setIsAdminRoute(false);
        }}
        onNavigateToRace={(slug) => {
          const found = allRaces.find((r) => r.slug === slug);
          if (found) setActiveRace(found);
          if (syncUrl && typeof window !== 'undefined') {
            window.history.pushState({}, '', `/${slug}`);
          }
          setIsHomeView(false);
          setIsAdminRoute(false);
        }}
      />
    );
  }

  // Render Home Selector View
  if (allowRaceSelection && isHomeView) {
    return (
      <RaceSelectorHome
        races={allRaces}
        onSelectRace={(race) => {
          setActiveRace(race);
          setIsHomeView(false);
          if (syncUrl && typeof window !== 'undefined') {
            window.history.pushState(null, '', `/${race.slug}`);
          }
        }}
        onGoToAdmin={() => {
          if (enableAdmin) {
            if (syncUrl && typeof window !== 'undefined') {
              window.history.pushState({}, '', '/admin');
            }
            setIsAdminRoute(true);
          }
        }}
      />
    );
  }

  // Render Certificate Lookup Page
  return (
    <div className={`min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans ${className}`}>
      {/* Top Bar with dynamic race branding */}
      {!hideHeader && (
        <header
          className="w-full text-white sticky top-0 z-20 shadow-md transition-colors"
          style={{ backgroundColor: activeRace.accentColor || '#009A44' }}
        >
          <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-3">
            {shouldShowBack ? (
              <button
                type="button"
                onClick={handleBackClick}
                className="px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-white/20 shrink-0 whitespace-nowrap"
                title="Quay lại"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">{onBack ? 'Quay lại' : onNavigateToRanking ? 'Bảng xếp hạng' : 'Chọn giải khác'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 shrink-0">
              {showRankingButton && onNavigateToRanking && (
                <button
                  type="button"
                  onClick={onNavigateToRanking}
                  className="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                  style={{ color: activeRace.accentColor || '#009A44' }}
                  title="Chuyển sang Bảng xếp hạng Top 50"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="hidden sm:inline whitespace-nowrap">Bảng xếp hạng Top 50</span>
                  <span className="sm:hidden whitespace-nowrap">Xếp hạng</span>
                </button>
              )}

              <span className="text-xs font-bold text-white line-clamp-1" title={activeRace.name}>
                {activeRace.name}
              </span>
              {activeRace.code && (
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30 text-[10px] font-mono font-bold shrink-0">
                  {activeRace.code}
                </span>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 py-6 sm:py-8 space-y-5">
        {/* Sync Warning Banner if error */}
        {syncError && (
          <div className="w-full p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{syncError}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-2">
              <button
                type="button"
                onClick={() => loadRunnersForRace(dataSourceSettings, activeRace, true)}
                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0"
              >
                <span className="whitespace-nowrap">Tải lại ngay</span>
              </button>
            </div>
          </div>
        )}

        {/* 1. Search Bar Section */}
        <section className="w-full bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#009A44]"></span>
                Tra cứu kết quả & Chứng nhận
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tìm kiếm theo số BIB hoặc Họ tên vận động viên
              </p>
            </div>
            {activeRace.code && (
              <span className="self-start sm:self-auto text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#009A44] border border-emerald-200/80 font-bold">
                Giải: {activeRace.code}
              </span>
            )}
          </div>

          <SearchRunner
            runners={runners}
            selectedRunner={selectedRunner}
            isLoading={isLoadingRunners}
            demoRunners={activeRace.demoRunners}
            demoPhotos={activeRace.demoPhotos}
            onSelectRunner={handleSelectRunner}
          />
        </section>

        {/* 2. Certificate Display Section */}
        <section className="w-full bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Bản xem trước chứng nhận & Ảnh ghép Finisher
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#009A44] text-white font-bold tracking-wide shadow-2xs">
                Chuẩn in 300 DPI
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              {activeRace.name}
            </span>
          </div>

          <CertificateCanvas
            runner={selectedRunner}
            config={config}
            onChangeConfig={setConfig}
            raceName={activeRace.name}
            defaultBgUrl={activeRace.defaultBgUrl}
            raceId={activeRace.id}
            activeRace={activeRace}
          />
        </section>

        {/* 3. Runner Details Breakdown */}
        <RunnerDetailsCard runner={selectedRunner} />
      </main>
    </div>
  );
}

export default CertificateLookup;
