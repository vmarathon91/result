// Main Module Components
export { CertificateLookup } from './components/CertificateLookup';
export type { CertificateLookupProps } from './components/CertificateLookup';

// Subcomponents
export { CertificateCanvas } from './components/CertificateCanvas';
export { SearchRunner } from './components/SearchRunner';
export { RunnerDetailsCard } from './components/RunnerDetailsCard';
export { RaceSelectorHome } from './components/RaceSelectorHome';
export { RaceRankingTop50 } from './components/RaceRankingTop50';
export { AdminPlacementStudio } from './components/AdminPlacementStudio';
export { PlacementEditorPanel } from './components/PlacementEditorPanel';
export { RacePhotosSelector } from './components/RacePhotosSelector';

// Types & Data
export * from './types';
export * from './data/races';
export * from './data/certificatePlacements';
export * from './data/mockRunners';
export * from './data/raceStorage';
export * from './services/sheetService';
export * from './services/supabaseService';
export * from './utils/canvasDrawer';

// Default export
export { CertificateLookup as default } from './components/CertificateLookup';
