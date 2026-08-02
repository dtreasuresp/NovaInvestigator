import { ORIENTATIONS, QUADRANTS, formatNumber, formatPercent, relationStatusForStrength } from '../domain.js';
import { TYPE_LABELS } from '../app/constants.js';

export const WORKSPACE_STORAGE_KEY = 'matriz-dafo-workspace-v1';

export function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}

export function normalizeStoredState(value) {
  const next = cloneState(value);
  next.metadata = {
    ...(next.metadata || {}),
    status: next.metadata?.status || next.metadata?.validation || 'borrador',
    validation: next.metadata?.validation || next.metadata?.status || 'borrador',
    archivedAt: next.metadata?.archivedAt || null
  };
  next.history = Array.isArray(next.history) ? next.history : [];
  next.relationships = Array.isArray(next.relationships)
    ? next.relationships.map(relation => ({
      ...relation,
      status: relation.status === 'evaluated' ? relationStatusForStrength(relation.strength) : relation.status || relationStatusForStrength(relation.strength)
    }))
    : [];
  return next;
}

export function readWorkspace() {
  if (typeof window === 'undefined') return { active: null, items: [] };
  try {
    const stored = JSON.parse(window.localStorage.getItem(WORKSPACE_STORAGE_KEY) || '{}');
    const items = Array.isArray(stored.items) ? stored.items : [];
    const normalizedItems = items.map(normalizeStoredState);
    const availableItems = normalizedItems.filter(item => !item.metadata?.archivedAt);
    return {
      active: availableItems.find(item => item.metadata?.id === stored.activeId) || availableItems[0] || normalizedItems[0] || null,
      items: normalizedItems
    };
  } catch {
    return { active: null, items: [] };
  }
}

export function persistWorkspace(activeId, items) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({ activeId, items }));
}

export function historyEntryFor(state, reason) {
  return {
    id: `VER-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    version: (state.history?.length || 0) + 1,
    timestamp: new Date().toISOString(),
    reason,
    snapshot: cloneState({ ...state, history: [] })
  };
}

export function withHistory(current, next, reason) {
  return {
    ...next,
    history: [...(current.history || []), historyEntryFor(current, reason)].slice(-20)
  };
}

export function statusForChange(current, reason) {
  if (reason === 'exportación') return 'exportada';
  if (reason === 'cierre') return 'cerrada';
  if (reason === 'validación') return 'validada';
  if (reason === 'contexto actualizado' && current.metadata?.status === 'nueva') return 'borrador';
  if (current.metadata?.status === 'nueva') return 'borrador';
  return 'en análisis';
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
}

export function reportValue(value) {
  return escapeHtml(value === null || value === undefined || value === '' ? '—' : value);
}

export function reportFactorRows(factors) {
  return factors.map(factor => `<tr><td><code>${reportValue(factor.id)}</code></td><td><strong>${reportValue(factor.name || 'Factor sin describir')}</strong><small>${reportValue(factor.description)}</small><small>Evidencia: ${reportValue(factor.evidence)}</small></td><td>${reportValue(TYPE_LABELS[factor.type])}</td><td>${formatNumber(factor.weight)}</td><td>${reportValue(factor.rating)}</td><td>${formatNumber(factor.weight * factor.rating)}</td></tr>`).join('');
}

export function createReportModel(state, analysis) {
  const selectedStrategy = state.strategies.find(strategy => strategy.id === state.selectedStrategyId);
  const chartData = {
    fortalezas: analysis.efi.strengths.map(factor => ({ nombre: factor.name || factor.id, puntaje: factor.score })),
    debilidades: analysis.efi.weaknesses.map(factor => ({ nombre: factor.name || factor.id, puntaje: factor.score })),
    oportunidades: analysis.efe.opportunities.map(factor => ({ nombre: factor.name || factor.id, puntaje: factor.score })),
    amenazas: analysis.efe.threats.map(factor => ({ nombre: factor.name || factor.id, puntaje: factor.score })),
    dafo: { fo: analysis.dafo.FO, fa: analysis.dafo.FA, do: analysis.dafo.DO, da: analysis.dafo.DA },
    efi_score: analysis.efi.total,
    efe_score: analysis.efe.total
  };
  return { state, analysis, selectedStrategy, chartData };
}

export function renderReportHtml(model) {
  const { state, analysis, selectedStrategy, chartData } = model;
  const metadata = state.metadata || {};
  const relations = state.relationships || [];
  const strategyRows = analysis.qspm.results.map(result => `<tr><td><code>${reportValue(result.strategyId)}</code></td><td>${reportValue(result.name)}</td><td>${reportValue(result.quadrant)}</td><td>${formatNumber(result.totalTas)}</td><td>${result.evaluated}/${analysis.qspm.factors.length}</td><td>${result.complete ? 'Completa' : 'Provisional'}</td></tr>`).join('');
  const cameRows = analysis.came.actions.map(action => `<tr><td><code>${reportValue(action.id)}</code></td><td>${reportValue(action.factor)}</td><td>${reportValue(action.action)}</td><td>${formatNumber(action.priority)}</td><td>${reportValue(action.responsible)}</td><td>${reportValue(action.indicator)}</td><td>${reportValue(action.status)}</td></tr>`).join('');
  const relationRows = relations.map(relation => `<tr><td><code>${reportValue(relation.internalId)} + ${reportValue(relation.externalId)}</code></td><td>${reportValue(relation.quadrant)}</td><td>${reportValue(relation.strength)}</td><td>${reportValue(relation.justification)}</td><td>${reportValue(relation.evidence)}</td><td>${reportValue(relation.evaluator)}</td></tr>`).join('');
  const quadrantCards = QUADRANTS.map(quadrant => {
    const item = analysis.relations.summary[quadrant];
    return `<article class="quadrant-card quadrant-${quadrant.toLowerCase()}"><div><strong>${quadrant}</strong><span>${reportValue(ORIENTATIONS[quadrant].name)}</span></div><b>${formatNumber(item.index)}</b><p>${item.evaluated}/${item.available} pares · ${formatPercent(item.coverage)} cobertura</p><small>Potencial exploratorio: ${formatNumber(analysis.dafo[quadrant])}</small></article>`;
  }).join('');
  const matrixCells = QUADRANTS.map(quadrant => {
    const item = analysis.relations.summary[quadrant];
    const highlights = item.mainRelations.map(relation => `<li><code>${reportValue(relation.internalId)} + ${reportValue(relation.externalId)}</code> · ${formatNumber(relation.contribution)}</li>`).join('');
    return `<article class="matrix-cell matrix-${quadrant.toLowerCase()}"><h3>${quadrant} · ${reportValue(ORIENTATIONS[quadrant].name)}</h3><strong>${formatNumber(item.index)}</strong><p>${reportValue(ORIENTATIONS[quadrant].action)}</p><ul>${highlights || '<li>Sin relaciones evaluadas.</li>'}</ul></article>`;
  }).join('');
  const criteriaRows = state.cameCriteria.map(criterion => `<tr><td>${reportValue(criterion.name)}</td><td>${formatNumber(criterion.weight)}</td></tr>`).join('');
  const styles = `
    @page { size: A4 landscape; margin: 12mm; @bottom-center { content: "Página " counter(page) " de " counter(pages); color: #68777a; font-size: 8pt; } }
    * { box-sizing: border-box; }
    body { margin: 0; color: #1a3035; background: #fff; font-family: "Inter", "Segoe UI", Arial, sans-serif; font-size: 9pt; line-height: 1.35; }
    h1, h2, h3, p { margin-top: 0; }
    h1 { margin-bottom: 8px; font-size: 27pt; line-height: 1.05; }
    h2 { margin-bottom: 5px; color: #087f78; font-size: 17pt; }
    h3 { margin-bottom: 7px; font-size: 11pt; }
    code, th, .eyebrow, .metric b { font-family: "JetBrains Mono", Consolas, monospace; }
    .report-cover { min-height: 170mm; display: grid; align-content: center; padding: 18mm; border-left: 8px solid #087f78; background: #f3f8f6; page-break-after: always; }
    .eyebrow { margin-bottom: 8px; color: #b25d38; font-size: 8pt; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
    .cover-subtitle { max-width: 620px; color: #53676b; font-size: 13pt; }
    .cover-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 24mm; }
    .cover-meta div { padding-top: 8px; border-top: 1px solid #b9cbc7; }
    .cover-meta span { display: block; color: #68777a; font-size: 7pt; text-transform: uppercase; }
    .cover-meta strong { display: block; margin-top: 3px; font-size: 10pt; }
    .report-section { padding-top: 2mm; page-break-before: always; }
    .report-section:first-of-type { page-break-before: avoid; }
    .section-kicker { margin-bottom: 3px; color: #b25d38; font: 600 8pt "JetBrains Mono", Consolas, monospace; text-transform: uppercase; }
    .section-intro { max-width: 760px; margin-bottom: 13px; color: #53676b; }
    .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; margin: 13px 0; }
    .metric { padding: 11px; border-top: 3px solid #087f78; background: #f3f8f6; }
    .metric:nth-child(2) { border-top-color: #c28a2c; }
    .metric:nth-child(3) { border-top-color: #4d7891; }
    .metric:nth-child(4) { border-top-color: #b25d38; }
    .metric span { display: block; color: #68777a; font-size: 7pt; text-transform: uppercase; }
    .metric b { display: block; margin: 4px 0; font-size: 18pt; font-weight: 500; }
    .metric small { color: #53676b; }
    .two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .info-block { padding: 11px 13px; border: 1px solid #d6e1de; }
    .info-block p { margin-bottom: 7px; }
    .info-block p:last-child { margin-bottom: 0; }
    table { width: 100%; border-collapse: collapse; margin: 9px 0 14px; font-size: 7.5pt; }
    th, td { padding: 5px 6px; border: 1px solid #d6e1de; text-align: left; vertical-align: top; }
    th { color: #304d52; background: #eaf2ef; font-size: 7pt; text-transform: uppercase; }
    tr:nth-child(even) td { background: #fbfcfc; }
    td strong, td small { display: block; }
    td small { margin-top: 3px; color: #68777a; font-size: 6.5pt; }
    .table-compact td, .table-compact th { padding: 4px 5px; }
    .chart-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; align-items: start; }
    .chart-box { min-height: 60mm; padding: 8px; border: 1px solid #d6e1de; }
    .chart-box h3 { color: #53676b; font-size: 9pt; }
    .chart-box img { display: block; width: 100%; max-height: 70mm; object-fit: contain; }
    .quadrant-grid, .matrix-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; }
    .quadrant-card, .matrix-cell { padding: 11px; border-left: 4px solid #087f78; background: #f3f8f6; }
    .quadrant-card:nth-child(2), .matrix-do { border-left-color: #c28a2c; background: #fffaf1; }
    .quadrant-card:nth-child(3), .matrix-fa { border-left-color: #4d7891; background: #f2f7fa; }
    .quadrant-card:nth-child(4), .matrix-da { border-left-color: #b25d38; background: #fff6f1; }
    .quadrant-card div { display: flex; justify-content: space-between; color: #53676b; }
    .quadrant-card b, .matrix-cell > strong { display: block; margin: 6px 0; font: 500 18pt "JetBrains Mono", Consolas, monospace; }
    .quadrant-card p, .quadrant-card small, .matrix-cell p { margin-bottom: 0; color: #53676b; }
    .matrix-cell ul { margin: 8px 0 0; padding-left: 16px; color: #53676b; font-size: 7.5pt; }
    .matrix-cell li { margin-bottom: 3px; }
    .selection { padding: 12px; border: 1px solid #b9cbc7; border-left: 4px solid #087f78; background: #f3f8f6; }
    .selection strong { display: block; margin-bottom: 3px; font-size: 12pt; }
    .selection p { margin-bottom: 0; color: #53676b; }
    .page-note { margin-top: 10px; color: #68777a; font-size: 7.5pt; }
  `;
  return `<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>${reportValue(metadata.title)}</title><style>${styles}</style></head><body>
    <article class="report-cover"><p class="eyebrow">Expediente estratégico · informe completo</p><h1>${reportValue(metadata.title)}</h1><p class="cover-subtitle">EFI / EFE / DAFO / QSPM / CAME</p><div class="cover-meta"><div><span>Organización</span><strong>${reportValue(metadata.organization)}</strong></div><div><span>Unidad analizada</span><strong>${reportValue(metadata.unit)}</strong></div><div><span>Expediente</span><strong>${reportValue(metadata.id)}</strong></div><div><span>Evaluación</span><strong>${reportValue(metadata.evaluationDate)}</strong></div></div></article>
    <section class="report-section"><p class="section-kicker">00 · Contexto y síntesis</p><h2>Lectura ejecutiva</h2><p class="section-intro">${reportValue(metadata.objective)}</p><div class="metric-grid"><div class="metric"><span>EFI · interno</span><b>${formatNumber(analysis.efi.total)}</b><small>Peso ${formatNumber(analysis.efi.weightTotal)}</small></div><div class="metric"><span>EFE · entorno</span><b>${formatNumber(analysis.efe.total)}</b><small>Peso ${formatNumber(analysis.efe.weightTotal)}</small></div><div class="metric"><span>Orientación</span><b>${reportValue(analysis.relations.dominant || '—')}</b><small>${reportValue(analysis.relations.confidence)}</small></div><div class="metric"><span>Selección QSPM</span><b>${formatNumber(analysis.qspm.results[0]?.totalTas)}</b><small>${reportValue(selectedStrategy?.id)}</small></div></div><div class="two-columns"><div class="info-block"><p class="eyebrow">Problema central</p><p>${reportValue(metadata.problem)}</p><p class="eyebrow">Supuestos y observaciones</p><p>${reportValue(metadata.assumptions)}</p></div><div class="info-block"><p class="eyebrow">Decisión documentada</p><p>${reportValue(selectedStrategy?.name)}</p><p>${reportValue(state.selectionJustification)}</p><p class="page-note">Autor/equipo: ${reportValue(metadata.author)} · Versión metodológica: ${reportValue(metadata.methodologicalVersion)}</p></div></div></section>
    <section class="report-section"><p class="section-kicker">01 · EFI / EFE</p><h2>Factores internos y externos</h2><p class="section-intro">La ponderación expresa importancia relativa; la calificación documenta la respuesta observada en escala de 1 a 4.</p><h3>EFI · Factores internos</h3><table><thead><tr><th>Código</th><th>Factor, descripción y evidencia</th><th>Tipo</th><th>Peso</th><th>Calif.</th><th>Puntaje</th></tr></thead><tbody>${reportFactorRows(analysis.efi.factors)}</tbody><tfoot><tr><th colspan="3">Total</th><th>${formatNumber(analysis.efi.weightTotal)}</th><th>—</th><th>${formatNumber(analysis.efi.total)}</th></tr></tfoot></table><h3>EFE · Entorno estratégico</h3><table><thead><tr><th>Código</th><th>Factor, descripción y evidencia</th><th>Tipo</th><th>Peso</th><th>Calif.</th><th>Puntaje</th></tr></thead><tbody>${reportFactorRows(analysis.efe.factors)}</tbody><tfoot><tr><th colspan="3">Total</th><th>${formatNumber(analysis.efe.weightTotal)}</th><th>—</th><th>${formatNumber(analysis.efe.total)}</th></tr></tfoot></table></section>
    <section class="report-section"><p class="section-kicker">02 · Evidencia cuantitativa</p><h2>Gráficos de lectura</h2><div class="chart-grid"><div class="chart-box"><h3>Perfil de factores</h3>{{GRAFICO_RADAR}}</div><div class="chart-box"><h3>Intensidad DAFO</h3>{{GRAFICO_BARRAS}}</div><div class="chart-box"><h3>EFI frente a EFE</h3>{{GRAFICO_COMPARATIVO}}</div></div></section>
    <section class="report-section"><p class="section-kicker">03 · DAFO</p><h2>Cruces y orientación</h2><p class="section-intro">El índice exploratorio muestra potencial; la orientación operativa se apoya en relaciones evaluadas, fuerza y cobertura.</p><div class="quadrant-grid">${quadrantCards}</div><h3 style="margin-top:14px">Matriz de cruces</h3><div class="matrix-grid">${matrixCells}</div><p class="page-note">Relaciones evaluadas: ${analysis.relations.evaluatedCount} · Cobertura dominante: ${formatPercent(analysis.relations.coverage)} · Confianza: ${reportValue(analysis.relations.confidence)}</p></section>
    <section class="report-section"><p class="section-kicker">04 · QSPM</p><h2>Selección estratégica</h2><table class="table-compact"><thead><tr><th>Alternativa</th><th>Descripción</th><th>Cuadrante</th><th>TAS</th><th>Evaluados</th><th>Estado</th></tr></thead><tbody>${strategyRows}</tbody></table><div class="selection"><p class="eyebrow">Decisión del equipo</p><strong>${reportValue(selectedStrategy?.id)} · ${reportValue(selectedStrategy?.name)}</strong><p>${reportValue(state.selectionJustification)}</p></div></section>
    <section class="report-section"><p class="section-kicker">05 · CAME</p><h2>Plan operativo y prioridades</h2><table class="table-compact"><thead><tr><th>Criterio</th><th>Peso</th></tr></thead><tbody>${criteriaRows}</tbody></table><table><thead><tr><th>Ficha</th><th>Factor</th><th>Acción</th><th>Prioridad</th><th>Responsable</th><th>Indicador</th><th>Estado</th></tr></thead><tbody>${cameRows}</tbody></table></section>
    <section class="report-section"><p class="section-kicker">06 · Trazabilidad</p><h2>Mesa de evidencia</h2><p class="section-intro">Cada relación conserva fuerza, justificación, evidencia, evaluador y fecha para permitir revisión posterior.</p><table class="table-compact"><thead><tr><th>Par</th><th>Cuadrante</th><th>Fuerza</th><th>Justificación</th><th>Evidencia</th><th>Evaluador</th></tr></thead><tbody>${relationRows}</tbody></table></section>
  </body></html>`;
}
