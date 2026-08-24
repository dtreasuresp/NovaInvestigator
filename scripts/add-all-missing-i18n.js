const fs = require('fs');
const report = JSON.parse(fs.readFileSync('C:/Users/danyt/AppData/Local/Temp/opencode/final_report.json', 'utf8'));
const orphans = report.orphan_missing_in_es.filter(k => k !== '.');

let es = fs.readFileSync('D:/03. MATRIZ DAFO/src/locales/es.ts', 'utf8');

function human(k) {
  const leaf = k.split('.').pop();
  return leaf.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

const fallbacks = {
  'pricingPage.catNovai': 'App NovAi',
  'pricingPage.featNovaiAccess': 'Acceso a NovAi',
  'pricingPage.featNovaiAccessDesc': 'Asistente conversacional para toda NovaStore (Investigador, Kanban).',
  'pricingPage.featAiQueriesMonthly': 'Consultas IA mensuales',
  'pricingPage.featAiQueriesMonthlyDesc': 'Cuota de consultas IA al mes por workspace.',
  'pricingPage.featAiQueriesDaily': 'Consultas IA diarias',
  'pricingPage.featAiQueriesDailyDesc': 'Tope diario de consultas IA (24h).',
  'pricingPage.limitUpToDaily': 'Hasta {count} al día',
  'pricingPage.ctaViewPlans': 'Ver planes',
  'novai.welcome': '¡Hola! Soy NovAi, tu asistente de NovaStore. ¿En qué puedo ayudarte?',
  'platform.aiDailyQueries10Preset': '+10/día IA',
  'platform.entitlementsCount': 'capacidades',
  'common.of': 'de',
  'common.page': 'Página',
  'common.code': 'Código',
  'common.completed': 'Completado',
  'common.description': 'Descripción',
  'common.export': 'Exportar',
  'common.manual': 'Manual',
  'forms.assistanceForm': 'Formulario de asistencia',
  'forms.assistanceFormDesc': 'Describe tu solicitud de asistencia',
  'forms.billingQuery': 'Consulta de facturación',
  'forms.department': 'Departamento',
  'forms.deptBilling': 'Dept Billing',
  'forms.deptGovernance': 'Dept Governance',
  'forms.deptSales': 'Dept Sales',
  'forms.deptSupport': 'Dept Support',
  'forms.errorAfterBlurDesc': 'Error After Blur Desc',
  'forms.errorInstantDesc': 'Error Instant Desc',
  'forms.errorOnSubmitOnlyDesc': 'Error On Submit Only Desc',
  'forms.errorTouchedDesc': 'Error Touched Desc',
  'forms.formValidSuccess': 'Form Valid Success',
  'forms.howCanWeHelp': '¿Cómo podemos ayudarte?',
  'forms.modeOnBlur': 'Mode On Blur',
  'forms.modeOnBlurDesc': 'Mode On Blur Desc',
  'forms.modeOnBlurRec': 'Mode On Blur Rec',
  'forms.modeOnBlurTiming': 'Mode On Blur Timing',
  'forms.modeOnChange': 'Mode On Change',
  'forms.modeOnChangeDesc': 'Mode On Change Desc',
  'forms.modeOnChangeRec': 'Mode On Change Rec',
  'forms.modeOnChangeTiming': 'Mode On Change Timing',
  'forms.modeOnSubmit': 'Mode On Submit',
  'forms.modeOnSubmitDesc': 'Mode On Submit Desc',
  'forms.modeOnSubmitRec': 'Mode On Submit Rec',
  'forms.modeOnSubmitTiming': 'Mode On Submit Timing',
  'forms.modeOnTouched': 'Mode On Touched',
  'forms.modeOnTouchedDesc': 'Mode On Touched Desc',
  'forms.modeOnTouchedRec': 'Mode On Touched Rec',
  'forms.modeOnTouchedTiming': 'Mode On Touched Timing',
  'forms.optLicense': 'Opt License',
  'forms.optRefund': 'Opt Refund',
  'forms.optSupport': 'Opt Support',
  'forms.otherIssue': 'Other Issue',
  'forms.priorityHigh': 'Prioridad Alta',
  'forms.priorityLow': 'Prioridad Baja',
  'forms.priorityMedium': 'Prioridad Media',
  'forms.priorityUrgent': 'Prioridad Urgente',
  'forms.productInquiry': 'Consulta de Producto',
  'forms.referenceId': 'ID de Referencia',
  'forms.referenceIdPlaceholder': 'ID de Referencia',
  'forms.requestType': 'Tipo de Solicitud',
  'forms.selectDepartment': 'Seleccionar Departamento',
  'forms.selectPriority': 'Seleccionar Prioridad',
  'forms.selectRequestType': 'Seleccionar Tipo de Solicitud',
  'forms.successMessage': 'Mensaje Enviado con Éxito',
  'forms.techIncident': 'Incidente Técnico',
  'forms.testField': 'Campo de Prueba',
  'forms.validationModesDesc': 'Descripción de Modos de Validación',
  'forms.validationModesTitle': 'Título de Modos de Validación',
  'investigations.export_pdf': 'Exportar PDF',
  'investigations.export_pdf_monthly': 'Exportaciones PDF/mes',
  'investigations.max_active': 'Máx. Investigaciones Activas',
  'investigations.noSearchResults': 'No hay resultados de búsqueda',
  'kanban.addNewItem': 'Añadir Nuevo Elemento',
  'kanban.projects_max': 'Máx. Proyectos Kanban',
  'kanban.tasks_max': 'Máx. Tareas Kanban',
  'limits.ai_queries_daily': 'Consultas IA diarias',
  'limits.ai_queries_monthly': 'Consultas IA mensuales',
  'modules.novai': 'Módulo NovAi',
  'storage.max_bytes': 'Almacenamiento',
  'teams.max_teams': 'Máx. Equipos/Teams',
  'userSettings.activeFactors': 'Factores Activos',
  'userSettings.activePlan': 'Plan Activo',
  'userSettings.authenticatorApp': 'Aplicación de Autenticación',
  'userSettings.avatar': 'Avatar',
  'userSettings.browser': 'Navegador',
  'userSettings.colDate': 'Col Date',
  'userSettings.connectAccountButton': 'Conectar Cuenta',
  'userSettings.deleteImpactData': 'Eliminar Impacto de Datos',
  'userSettings.deleteImpactMemberships': 'Eliminar Impacto de Membresías',
  'userSettings.deleteImpactSession': 'Eliminar Impacto de Sesión',
  'userSettings.device': 'Dispositivo',
  'userSettings.displayName': 'Nombre para Mostrar',
  'userSettings.exportsInUse': 'Exportaciones en Uso',
  'userSettings.investigationsInUse': 'Investigaciones en Uso',
  'userSettings.invoiceHistory': 'Historial de Facturas',
  'userSettings.language': 'Idioma',
  'userSettings.location': 'Ubicación',
  'userSettings.membersAssigned': 'Miembros Asignados',
  'userSettings.mobilePlaceholder': 'Móvil Placeholder',
  'userSettings.noVidRequests': 'Sin Solicitudes VID',
  'userSettings.paidBy': 'Pagado Por',
  'userSettings.paymentMethodsTitle': 'Título de Métodos de Pago',
  'userSettings.pwdRequirementCase': 'Requisito de Mayúsculas',
  'userSettings.pwdRequirementLength': 'Requisito de Longitud',
  'userSettings.pwdRequirementSymbol': 'Requisito de Símbolos',
  'userSettings.recentActivity': 'Actividad Reciente',
  'userSettings.recentDevices': 'Dispositivos Recientes',
  'userSettings.renewPlan': 'Renovar Plan',
  'userSettings.revokeDelegation': 'Revocar Delegación',
  'userSettings.storageInUse': 'Almacenamiento en Uso',
  'userSettings.storageIncluded': 'Almacenamiento Incluido',
  'userSettings.tabAccount': 'Pestaña Cuenta',
  'userSettings.tabConnections': 'Pestaña Conexiones',
  'userSettings.taxId': 'ID Fiscal',
  'userSettings.twoFactorLoadError': 'Error Carga 2FA',
  'userSettings.usageLimitsDesc': 'Descripción de Límites de Uso',
  'userSettings.username': 'Nombre de Usuario',
  'userSettings.vidQueueEmptyDesc': 'Cola VID Vacía',
  'userSettings.vidSubtitle': 'Subtítulo VID',
  'userSettings.vidVerification': 'Verificación VID',
  'users.deactivate': 'Desactivar Usuario',
  'users.max_members': 'Máx. Miembros',
  'users.next': 'Siguiente',
  'users.prev': 'Anterior',
  'users.roleAdmin': 'Rol Admin',
  'users.showing': 'Mostrando',
};

let es = fs.readFileSync('D:/03. MATRIZ DAFO/src/locales/es.ts', 'utf8');

const report = JSON.parse(fs.readFileSync('C:/Users/danyt/AppData/Local/Temp/opencode/final_report.json', 'utf8'));
const orphans = report.orphan_missing_in_es.filter(k => k !== '.');

function human(k) {
  const leaf = k.split('.').pop();
  return leaf.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

for (const key of orphans) {
  if (key === '.') continue;
  const parts = key.split('.');
  const ns = parts[0];
  const leaf = parts.slice(1).join('.');
  const val = fallbacks[key] || key.split('.').pop().replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  // Add to interface (before export const es)
  const exportIdx = es.indexOf('export const es');
  const beforeEs = es.slice(0, exportIdx);
  const afterEs = es.slice(exportIdx);

  const nsInterfaceRegex = new RegExp(`(${ns}:\\s*\\{[^}]*)(\\n\\s*\\})`, 'm');
  if (!es.includes(`${leaf}: string`) && nsInterfaceRegex.test(es)) {
    es = es.replace(nsInterfaceRegex, `$1    ${leaf}: string\n  $2`);
  }

  // Add to value (after export const es)
  const afterExport = es.slice(es.indexOf('export const es'));
  if (!afterEs.includes(`${leaf}:`) && !afterEs.includes(`"${leaf}":`)) {
    const nsValueRegex = new RegExp(`(${ns}:\\s*\\{[^}]*)(\\n\\s*\\},)`, 'g');
    let lastMatch = null;
    let match;
    while ((match = nsValueRegex.exec(es)) !== null) {
      lastMatch = match;
    }
    if (lastMatch) {
      const fullMatch = lastMatch[0];
      const insert = `    ${leaf}: '${val.replace(/'/g, "\\'")}',`;
      const newFull = fullMatch.replace(lastMatch[1], `${lastMatch[1]}\n${insert}`);
      es = es.replace(fullMatch, newFull);
    }
  }
}

fs.writeFileSync('D:/03. MATRIZ DAFO/src/locales/es.ts', es, 'utf8');
console.log('Done adding missing keys to es.ts');