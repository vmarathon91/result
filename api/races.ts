import fs from 'fs';
import path from 'path';

// Serverless function for Vercel: /api/races
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Try reading public/races-data.json
    const racesDataPath = path.join(process.cwd(), 'public', 'races-data.json');
    if (fs.existsSync(racesDataPath)) {
      const content = fs.readFileSync(racesDataPath, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return res.status(200).json(parsed);
      }
    }

    // 2. Try scanning src/races and public/races directories
    const scanDirs = [
      path.join(process.cwd(), 'src', 'races'),
      path.join(process.cwd(), 'public', 'races'),
    ];
    const races: any[] = [];
    for (const racesDir of scanDirs) {
      if (fs.existsSync(racesDir)) {
        const files = fs.readdirSync(racesDir).filter((f) => f.endsWith('.json'));
        for (const file of files) {
          try {
            const raw = fs.readFileSync(path.join(racesDir, file), 'utf8');
            const data = JSON.parse(raw);
            if (data && (data.id || data.slug)) {
              if (!races.some((r) => r.id === data.id || r.slug === data.slug)) {
                races.push(data);
              }
            }
          } catch {}
        }
      }
    }
    if (races.length > 0) {
      return res.status(200).json(races);
    }
  } catch (err: any) {
    console.error('Error serving /api/races:', err);
  }

  // Fallback default list containing both races
  return res.status(200).json([
    {
      id: 'vpbank-hanoi-international-marathon-2026',
      slug: 'vpbank-hanoi-international-marathon-2026',
      code: 'VPIM26',
      name: 'VPBank Hanoi International Marathon 2026',
      shortName: 'VPBank Hanoi International Marathon 2026',
      locationFull: 'TP. Hà Nội',
      date: '18/10/2026',
      officialUrl: 'https://vpbankmarathon.com',
      defaultLogoUrl: '/race_logo.png',
      defaultBgUrl: '/backgrounds/vnexpress-marathon-grand-tour-nghe-an-2026.png',
      accentColor: '#00A850',
      themeBadgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
      themeDotBg: 'bg-[#00A850]',
      storageKeyPrefix: 'vm_vpbankhanoiinternationalmarathon2026',
      supabaseUrl: 'https://bwywgifhugulsehkgdjq.supabase.co',
      supabaseAnonKey: 'sb_publishable_iH29WLGKQYUhaCMq4Rbqdw_uWtkNg3Q',
      supabaseTable: 'result',
      supabaseRaceFilter: 'VPIM26',
      supabaseRaceColumn: 'Race',
      description: 'Tra cứu kết quả & Chứng nhận điện tử VPBank Hanoi International Marathon 2026',
    },
    {
      id: 'vnexpress-marathon-grand-tour-nghe-an-2026',
      slug: 'vnexpress-marathon-grand-tour-nghe-an-2026',
      code: 'NA26',
      name: 'VnExpress Marathon Grand Tour Nghe An 2026',
      shortName: 'VnExpress Marathon Grand Tour Nghe An 2026',
      locationFull: 'TP. Vinh, Nghệ An',
      date: '13/09/2026',
      officialUrl: 'https://vm.vnexpress.net/vnexpress-marathon-grand-tour-nghe-an-2026',
      defaultLogoUrl: '/race_logo.png',
      defaultBgUrl: '/backgrounds/vnexpress-marathon-grand-tour-nghe-an-2026.png',
      accentColor: '#0369a1',
      themeBadgeBg: 'bg-sky-50 text-sky-700 border-sky-200/80',
      themeDotBg: 'bg-sky-600',
      storageKeyPrefix: 'vm_vnexpressmarathongrandtournghean2026',
      supabaseUrl: 'https://bwywgifhugulsehkgdjq.supabase.co',
      supabaseAnonKey: 'sb_publishable_iH29WLGKQYUhaCMq4Rbqdw_uWtkNg3Q',
      supabaseTable: 'result',
      supabaseRaceFilter: 'NA26',
      supabaseRaceColumn: 'Race',
      description: 'Tra cứu kết quả & Chứng nhận điện tử VnExpress Marathon Grand Tour Nghe An 2026',
    },
  ]);
}
