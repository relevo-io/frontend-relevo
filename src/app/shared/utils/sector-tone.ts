const SECTOR_TONE_MAP: Record<string, string> = {
  healthcare: 'healthcare',
  health: 'healthcare',
  salud: 'healthcare',
  sanitario: 'healthcare',
  education: 'education',
  educacion: 'education',
  educación: 'education',
  technology: 'technology',
  tech: 'technology',
  tecnologia: 'technology',
  tecnología: 'technology',
  hospitality: 'hospitality',
  hosteleria: 'hospitality',
  hostelería: 'hospitality',
  retail: 'retail',
  comercio: 'retail',
  logistics: 'logistics',
  logistica: 'logistics',
  logística: 'logistics',
  services: 'services',
  servicios: 'services',
  industry: 'industry',
  industria: 'industry'
};

export function getSectorToneClass(sector?: string): string {
  const normalized = sector
    ?.trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!normalized) {
    return 'sector-tone--default';
  }

  return `sector-tone--${SECTOR_TONE_MAP[normalized] || 'default'}`;
}
