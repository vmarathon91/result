import { Runner, CertificatePlacements } from '../types';
import { INITIAL_RUNNERS, DEMO_RUNNERS, DEMO_PHOTOS } from './mockRunners';
import { CORE_BUILTIN_RACES, VPBANK_HANOI_RACE } from './defaultRaces';

export interface Race {
  id: string;
  slug: string;
  code: string;
  name: string;
  shortName: string;
  city: string;
  province: string;
  locationFull: string;
  date: string;
  officialUrl: string;
  defaultLogoUrl: string;
  defaultBgUrl: string;
  accentColor: string;
  themeBadgeBg: string;
  themeDotBg: string;
  storageKeyPrefix: string;
  initialRunners?: Runner[];
  demoRunners?: Runner[];
  demoPhotos?: Record<string, string>;
  demoRacePhotos?: Record<string, string[]>; // Mảng nhiều ảnh thi đấu cho mỗi BIB
  appsScriptUrl?: string;
  photosScriptUrl?: string; // Link Google Apps Script Web App lấy dữ liệu ảnh từ Google Sheet (Cột BIB & IMG)
  checkingScriptUrl?: string; // Link Google Apps Script Web App ghi log tải ảnh HD (Sheet CHECKING)
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseTable?: string; // default: 'runners'
  supabaseRaceFilter?: string; // Giá trị cột Race để lọc, ví dụ: 'NA26', 'test', 'VM26'
  supabaseRaceColumn?: string; // Tên cột giải trong bảng, mặc định 'Race'
  description: string;
  placements?: CertificatePlacements;
}

// Clone runners for Nghệ An 2026 with consistent date and metadata
const CLONED_NGHE_AN_RUNNERS: Runner[] = INITIAL_RUNNERS.map((runner) => ({
  ...runner,
  date: '13/09/2026',
}));

const CLONED_NGHE_AN_DEMO_RUNNERS: Runner[] = DEMO_RUNNERS.map((runner) => ({
  ...runner,
  date: '13/09/2026',
}));

/**
 * Đảm bảo mọi giải đấu (kể cả tải động từ file .json hay API) luôn có danh sách vận động viên mặc định
 */
export function ensureRaceRunners(race: Race): Race {
  if (!race) return DEFAULT_RACE;
  const raceDate = race.date || '13/09/2026';
  const fallbackList = INITIAL_RUNNERS.map((r) => ({ ...r, date: raceDate }));
  return {
    ...race,
    initialRunners:
      race.initialRunners && Array.isArray(race.initialRunners) && race.initialRunners.length > 0
        ? race.initialRunners
        : fallbackList,
    demoRunners:
      race.demoRunners && Array.isArray(race.demoRunners) && race.demoRunners.length > 0
        ? race.demoRunners
        : fallbackList,
    demoPhotos:
      race.demoPhotos && Object.keys(race.demoPhotos).length > 0 ? race.demoPhotos : DEMO_PHOTOS,
  };
}

// Import all static race json definitions from public/races/ at compile time (100% Client-side compatible for Vercel/GitHub Pages)
const staticRaceModules = import.meta.glob(['/public/races/*.json', '../../public/races/*.json'], { eager: true });

function getBundledRaces(): Race[] {
  // Start with built-in core races so VPBank and Nghe An are 100% guaranteed on any host (Vercel/Static/Cloud)
  const list: Race[] = [...CORE_BUILTIN_RACES];

  for (const path in staticRaceModules) {
    try {
      const mod = staticRaceModules[path] as any;
      const data = mod?.default || mod;
      if (data && (data.id || data.slug)) {
        const raceDate = data.date || '13/09/2026';
        const fallbackList = INITIAL_RUNNERS.map((r) => ({ ...r, date: raceDate }));
        const raceItem: Race = {
          id: data.id || data.slug,
          slug: data.slug || data.id,
          code: data.code || 'VM26',
          name: data.name || data.shortName || 'VnExpress Marathon',
          shortName: data.shortName || data.name || 'Marathon',
          city: data.city || '',
          province: data.province || '',
          locationFull: data.locationFull || `${data.city || ''}, ${data.province || ''}`.replace(/^, |, $/g, ''),
          date: data.date || '2026',
          officialUrl: data.officialUrl || 'https://vm.vnexpress.net',
          defaultLogoUrl: data.defaultLogoUrl || '/race_logo.png',
          defaultBgUrl: data.defaultBgUrl || '/NA26.png',
          accentColor: data.accentColor || '#0369a1',
          themeBadgeBg: data.themeBadgeBg || 'bg-sky-50 text-sky-700 border-sky-200/80',
          themeDotBg: data.themeDotBg || 'bg-sky-600',
          storageKeyPrefix: data.storageKeyPrefix || `vm_${(data.slug || 'race').replace(/[^a-z0-9]/g, '')}`,
          appsScriptUrl: data.appsScriptUrl || '',
          photosScriptUrl: data.photosScriptUrl || '',
          checkingScriptUrl: data.checkingScriptUrl || '',
          supabaseUrl: data.supabaseUrl || '',
          supabaseAnonKey: data.supabaseAnonKey || '',
          supabaseTable: data.supabaseTable === 'runners' ? 'result' : (data.supabaseTable || 'result'),
          supabaseRaceFilter: data.supabaseRaceFilter || data.code || '',
          supabaseRaceColumn: data.supabaseRaceColumn || 'Race',
          description: data.description || '',
          placements: data.placements || undefined,
          initialRunners: data.initialRunners || fallbackList,
          demoRunners: data.demoRunners || fallbackList,
          demoPhotos: data.demoPhotos || DEMO_PHOTOS,
        };

        const existingIndex = list.findIndex(
          (r) => r.id === raceItem.id || r.slug === raceItem.slug || r.code === raceItem.code
        );
        if (existingIndex >= 0) {
          list[existingIndex] = { ...list[existingIndex], ...raceItem };
        } else {
          list.push(raceItem);
        }
      }
    } catch (e) {
      console.warn('Error reading bundled race file', path, e);
    }
  }

  // Sort to make VPBank Hanoi International Marathon the primary active race
  list.sort((a, b) => {
    const aIsVp = (a.id + a.slug + a.code).toLowerCase().includes('vp');
    const bIsVp = (b.id + b.slug + b.code).toLowerCase().includes('vp');
    if (aIsVp && !bIsVp) return -1;
    if (!aIsVp && bIsVp) return 1;
    return 0;
  });
  return list;
}

export const VPBANK_DEFAULT_RACE: Race = VPBANK_HANOI_RACE;

const BUNDLED_RACES = getBundledRaces();

export const RACES: Race[] = BUNDLED_RACES.length > 0 ? BUNDLED_RACES : [VPBANK_DEFAULT_RACE];

export const DEFAULT_RACE: Race = RACES[0] || VPBANK_DEFAULT_RACE;

// Helper to resolve race from pathname or hash or query
export const getRaceFromPath = (_path: string): Race => {
  return RACES[0] || DEFAULT_RACE;
};
