export const NAV_ITEMS = [
  { id: 'summary', index: '01', label: 'Resumen', detail: 'Lectura ejecutiva' },
  { id: 'efi', index: '02', label: 'EFI', detail: 'Factores internos' },
  { id: 'efe', index: '03', label: 'EFE', detail: 'Entorno estratégico' },
  { id: 'dafo', index: '04', label: 'DAFO', detail: 'Cruces y relaciones' },
  { id: 'qspm', index: '05', label: 'QSPM', detail: 'Selección estratégica' },
  { id: 'came', index: '06', label: 'CAME', detail: 'Plan de acción' }
];

export const STAGE_ROUTES = {
  context: '/app/context',
  summary: '/app/summary',
  efi: '/app/efi',
  efe: '/app/efe',
  dafo: '/app/dafo',
  qspm: '/app/qspm',
  came: '/app/came'
};

export const TYPE_LABELS = {
  F: 'Fortaleza',
  D: 'Debilidad',
  O: 'Oportunidad',
  A: 'Amenaza'
};

export const CAME_LABELS = {
  C: 'Corregir',
  A: 'Afrontar',
  M: 'Mantener',
  E: 'Explotar'
};
