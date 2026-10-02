import React, { useState, useEffect, useCallback } from 'react';
import { Race, DEFAULT_RACE } from './data/races';
import { Runner, DataSourceSettings, CertificateConfig } from './types';
import { INITIAL_RUNNERS, DEMO_RUNNERS, DEMO_PHOTOS, getDemoPhoto } from './data/mockRunners';
import {
  fetchAllRaces,
  getLocalRaces,
  resolveRaceFromPath,
  parseSubRouteFromPath,
} from './data/raceStorage';
import {
  getSavedDataSourceSettings,
  fetchRunnersFromSource,
  getCachedRunners,
} from './services/sheetService';
import { getGlobalSupabaseConfig } from './services/supabaseService';
import { RaceSelectorHome } from './components/RaceSelectorHome';
import { RaceRankingTop50 } from './components/RaceRankingTop50';
import { CertificateLookup } from './components/CertificateLookup';
import { AdminPlacementStudio } from './components/AdminPlacementStudio';

type AppRoute = 'home' | 'admin' | 'ranking' | 'result';

export default function App() {
  // All races loaded from server / public files / cache
  const [allRaces, setAllRaces] = useState<Race[]>(() => getLocalRaces());
  const [isRacesLoaded, setIsRacesLoaded] = useState<boolean>(false);

  // Active race
  const [activeRace, setActiveRace] = useState<Race>(() => {
    if (typeof window !== 'undefined') {
      return resolveRaceFromPath(
        window.location.pathname + window.location.search + window.location.hash,
        getLocalRaces()
      );
    }
    return DEFAULT_RACE;
  });

  // Current route
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const search = window.location.search;
      if (pathname.startsWith('/admin') || search.includes('admin=true')) {
        return 'admin';
      }
      return parseSubRouteFromPath(pathname);
    }
    return 'home';
  });

  // Selected BIB (e.g. from ?bib=)
  const [selectedBib, setSelectedBib] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('bib');
    }
    return null;
  });

  // Selected runner object for instant activation in result view
  const [selectedRunner, setSelectedRunner] = useState<Runner | null>(null);

  // Runners data
  const [runners, setRunners] = useState<Runner[]>(() => {
    const cached = getCachedRunners(activeRace.storageKeyPrefix);
    if (cached && cached.length > 0) return cached;
    return activeRace.initialRunners && activeRace.initialRunners.length > 0
      ? activeRace.initialRunners
      : INITIAL_RUNNERS;
  });
  const [isLoadingRunners, setIsLoadingRunners] = useState<boolean>(false);

  // Settings
  const [dataSourceSettings, setDataSourceSettings] = useState<DataSourceSettings>(() =>
    getSavedDataSourceSettings(activeRace.storageKeyPrefix)
  );

  // Refresh races list
  const refreshRacesList = useCallback(async () => {
    const list = await fetchAllRaces();
    setAllRaces(list);
    setIsRacesLoaded(true);

    if (typeof window !== 'undefined') {
      const fromPath = resolveRaceFromPath(window.location.pathname, list);
      setActiveRace(fromPath);
    }
  }, []);

  useEffect(() => {
    refreshRacesList();
  }, [refreshRacesList]);

  // Load runners for active race
  const loadRunners = useCallback(
    async (targetRace: Race, forceRefresh: boolean = false) => {
      setIsLoadingRunners(true);
      try {
        const settings = getSavedDataSourceSettings(targetRace.storageKeyPrefix);
        setDataSourceSettings(settings);

        const globalSb = getGlobalSupabaseConfig();
        const hasRaceSb = Boolean(targetRace.supabaseUrl && targetRace.supabaseAnonKey);
        const hasGlobalSb = Boolean(globalSb.url && globalSb.anonKey);

        let raceSettings: DataSourceSettings;
        if (hasRaceSb || hasGlobalSb || settings.type === 'supabase' || settings.supabase?.url) {
          raceSettings = {
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
          raceSettings = {
            ...settings,
            url: targetRace.appsScriptUrl || settings.url || '/api/marathon-data',
            type: 'appsScript',
          };
        }

        const res = await fetchRunnersFromSource(
          raceSettings,
          targetRace.storageKeyPrefix,
          targetRace.initialRunners,
          forceRefresh
        );

        if (res.runners && res.runners.length > 0) {
          setRunners(res.runners);
        }
      } catch (err) {
        console.warn('Lỗi tải danh sách VĐV:', err);
      } finally {
        setIsLoadingRunners(false);
      }
    },
    []
  );

  // Sync runners when activeRace changes
  useEffect(() => {
    const cached = getCachedRunners(activeRace.storageKeyPrefix);
    if (cached && cached.length > 0) {
      setRunners(cached);
    }
    loadRunners(activeRace);
  }, [activeRace, loadRunners]);

  // Handle Browser Back/Forward Navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname;
      const search = window.location.search;

      if (pathname.startsWith('/admin') || search.includes('admin=true')) {
        setCurrentRoute('admin');
        return;
      }

      const subRoute = parseSubRouteFromPath(pathname);
      setCurrentRoute(subRoute);

      const detected = resolveRaceFromPath(pathname + search, allRaces);
      setActiveRace(detected);

      const bibParam = new URLSearchParams(search).get('bib');
      setSelectedBib(bibParam);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [allRaces]);

  // URL normalization on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '');
    // If user typed only /vpbank-hanoi-international-marathon-2026 without /ranking or /result
    if (pathname && !pathname.includes('/') && pathname !== 'admin' && pathname !== 'home') {
      const matched = resolveRaceFromPath(pathname, allRaces);
      if (matched && (matched.slug === pathname || matched.id === pathname || matched.code?.toLowerCase() === pathname.toLowerCase())) {
        window.history.replaceState(null, '', `/${matched.slug}/ranking${window.location.search}`);
        setCurrentRoute('ranking');
      }
    }
  }, [allRaces]);

  // Navigate to Ranking of a race
  const handleNavigateToRanking = (race: Race = activeRace) => {
    setActiveRace(race);
    setCurrentRoute('ranking');
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/${race.slug}/ranking`);
      document.title = `Bảng Xếp Hạng Top 50 - ${race.name}`;
    }
  };

  // Navigate to Result (Certificate) of a runner or general search
  const handleNavigateToResult = (bib?: string, race: Race = activeRace, runner?: Runner) => {
    setActiveRace(race);
    setSelectedBib(bib || null);
    if (runner) {
      setSelectedRunner(runner);
    } else if (bib) {
      const match = runners.find((r) => r.bib.trim().toLowerCase() === bib.trim().toLowerCase());
      if (match) setSelectedRunner(match);
    }
    setCurrentRoute('result');
    if (typeof window !== 'undefined') {
      const search = bib ? `?bib=${encodeURIComponent(bib)}` : '';
      window.history.pushState(null, '', `/${race.slug}/result${search}`);
      document.title = `Tra Cứu Kết Quả & Chứng Nhận - ${race.name}`;
    }
  };

  // Navigate to Home Race Selector
  const handleNavigateToHome = () => {
    setCurrentRoute('home');
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/');
      document.title = 'Tra Cứu Chứng Nhận VnExpress Marathon - Chọn Giải Chạy';
    }
  };

  // Navigate to Admin
  const handleNavigateToAdmin = () => {
    setCurrentRoute('admin');
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/admin');
    }
  };

  // 1. ROUTE: ADMIN STUDIO
  if (currentRoute === 'admin') {
    return (
      <AdminPlacementStudio
        runners={runners}
        activeRace={activeRace}
        allRaces={allRaces}
        dataSourceSettings={dataSourceSettings}
        onSelectRace={(race) => {
          setActiveRace(race);
        }}
        onRefreshRaces={refreshRacesList}
        onBackToUserView={() => handleNavigateToRanking(activeRace)}
        onNavigateToRace={(slug) => {
          const found = allRaces.find((r) => r.slug === slug || r.id === slug);
          if (found) {
            handleNavigateToRanking(found);
          }
        }}
        onRunnersUpdated={(newRunners) => setRunners(newRunners)}
        onConfigUpdated={() => {}}
        onLogoUpdated={() => {}}
      />
    );
  }

  // 2. ROUTE: HOMEPAGE (RACE SELECTOR)
  if (currentRoute === 'home') {
    return (
      <RaceSelectorHome
        races={allRaces}
        onSelectRace={(race) => handleNavigateToRanking(race)}
        onGoToAdmin={handleNavigateToAdmin}
      />
    );
  }

  // 3. ROUTE: RANKING (BẢNG XẾP HẠNG TOP 50 THEO GIẢI ĐẤU)
  if (currentRoute === 'ranking') {
    return (
      <RaceRankingTop50
        activeRace={activeRace}
        allRaces={allRaces}
        runners={runners}
        isLoadingRunners={isLoadingRunners}
        onSelectRunner={(runner) => {
          setSelectedRunner(runner);
          handleNavigateToResult(runner.bib, activeRace, runner);
        }}
        onNavigateToResult={(bib, runner) => handleNavigateToResult(bib, activeRace, runner)}
        onBackToHome={handleNavigateToHome}
        onSelectRace={(race) => handleNavigateToRanking(race)}
        onRefreshData={() => loadRunners(activeRace, true)}
      />
    );
  }

  // 4. ROUTE: RESULT (TRA CỨU & XUẤT CHỨNG NHẬN ĐIỆN TỬ)
  return (
    <CertificateLookup
      raceSlug={activeRace.slug}
      initialBib={selectedBib || undefined}
      initialRunner={selectedRunner || undefined}
      initialRunners={runners}
      races={allRaces}
      showBackButton={true}
      onBack={() => handleNavigateToRanking(activeRace)}
      onNavigateToRanking={() => handleNavigateToRanking(activeRace)}
      showRankingButton={true}
      allowRaceSelection={false}
      enableAdmin={true}
      syncUrl={false}
      onSelectRunner={(runner) => {
        setSelectedRunner(runner);
        setSelectedBib(runner.bib);
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', `/${activeRace.slug}/result?bib=${runner.bib}`);
        }
      }}
    />
  );
}
