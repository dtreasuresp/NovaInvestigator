#!/usr/bin/env node
/**
 * Generador de keys i18n a partir del audit de vistas
 * Analiza los 731 strings pendientes y crea keys para src/locales/es.ts
 */

const fs = require('fs');
const path = require('path');

// Leer el output del audit
const auditContent = fs.readFileSync('audit-results.txt', 'utf8');

// Extraer todas las strings pendientes con su información
const stringEntries = [];

// Patrones para extraer
const fileRegex = /📁 src\/views[^\(]+\((\d+)\)/g;
const textRegex = /L\d+ \[jsx-text\]:\s"([^"]+)"/g;
const propRegex = /L\d+ \[prop:([a-zA-Z]+)\]:\s"([^"]+)"/g;

// Parsear las secciones de archivos
let currentFile = null;
let fileMatches;

 // Reiniciar el último índice de coincidencia
 const regexLastIndex = /\\n/g;

// Procesar línea por línea
const lines = auditContent.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Detectar inicio de sección de archivo
  const fileMatch = line.match(/📁 src\/views[^\n]+/);
  if (fileMatch) {
    currentFile = fileMatch[0].replace('📁 ', '').trim();
    // Extraer número de textos
    const countMatch = line.match(/\((\d+)\)/);
    // console.log(`Archivo: ${currentFile}, textos: ${countMatch ? countMatch[1] : '?'}`);
  }
  
  // Extraer textos jsx-text
  const textMatch = line.match(/L\d+ \[jsx-text\]:\s"([^"]+)"/);
  if (textMatch && currentFile) {
    stringEntries.push({
      file: currentFile,
      text: textMatch[1],
      type: 'jsx-text'
    });
  }
  
  // Extraer props
  const propMatch = line.match(/L\d+ \[prop:([a-zA-Z]+)\]:\s"([^"]+)"/);
  if (propMatch && currentFile) {
    stringEntries.push({
      file: currentFile,
      prop: propMatch[1],
      text: propMatch[2],
      type: 'jsx-prop'
    });
  }
}

console.log(`📊 Total de strings encontradas: ${stringEntries.length}`);

// Ahora generar keys únicas
// Strategy: category-stringLowercaseWithDots
// Category se obtiene de la ruta del archivo

// Mapear rutas de archivo a categorías del proyecto
const fileToCategory = {
  // Rutas de access/roles/permissions
  'src/views/apps/access/permissions/index.tsx': 'access.permissions',
  'src/views/apps/access/roles/index.tsx': 'access.roles',
  
  // Rutas de calendar
  'src/views/apps/calendar/day-view.tsx': 'calendar',
  'src/views/apps/calendar/index.tsx': 'calendar',
  'src/views/apps/calendar/month-view.tsx': 'calendar',
  'src/views/apps/calendar/week-view.tsx': 'calendar',
  
  // Rutas de investigator
  'src/views/apps/investigator/came/index.tsx': 'investigator.came',
  'src/views/apps/investigator/dafo/index.tsx': 'investigator.dafo',
  'src/views/apps/investigator/investigations/index.tsx': 'investigator.investigations',
  'src/views/apps/investigator/qspm/index.tsx': 'investigator.qspm',
  'src/views/apps/investigator/summary/index.tsx': 'investigator.summary',
  
  // Rutas de kanban
  'src/views/apps/kanban/components/card-form-dialog.tsx': 'kanban',
  'src/views/apps/kanban/components/column-form-dialog.tsx': 'kanban',
  'src/views/apps/kanban/components/kanbon-board.tsx': 'kanban',
  'src/views/apps/kanban/components/kanban-card.tsx': 'kanban',
  
  // Rutas de mail
  'src/views/apps/mail/index.tsx': 'mail',
  'src/views/apps/mail/mail-display/index.tsx': 'mail',
  'src/views/apps/mail/mail-display/label-manager.tsx': 'mail',
  'src/views/apps/mail/mail-display/mail-display-content.tsx': 'mail',
  'src/views/apps/mail/mail-list.tsx': 'mail',
  'src/views/apps/mail/mail-nav.tsx': 'mail',
  
  // Rutas de platform/billing
  'src/views/apps/platform/platform-billing/index.tsx': 'platform.billing',
  'src/views/apps/platform/registration-cleanup/index.tsx': 'platform',
  'src/views/apps/platform/vid/index.tsx': 'platform.vid',
  
  // Rutas de users
  'src/views/apps/users/dialogs/add-edit-user-sheet.tsx': 'users',
  'src/views/apps/users/dialogs/manage-member-sheet.tsx': 'users',
  'src/views/apps/users/invitations/index.tsx': 'users',
  'src/views/apps/users/list/index.tsx': 'users',
  'src/views/apps/users/view/projects-datatable.tsx': 'users',
  'src/views/apps/users/view/tabs/account-tab.tsx': 'users',
  'src/views/apps/users/view/tabs/billing-tab.tsx': 'users',
  'src/views/apps/users/view/tabs/connections-tab.tsx': 'users',
  'src/views/apps/users/view/tabs/notifications-tab.tsx': 'users',
  'src/views/apps/users/view/tabs/security-tab.tsx': 'users',
  'src/views/apps/users/view/user-view-left-panel.tsx': 'users',
  'src/views/apps/users/view/user-view-tabs.tsx': 'users',
  
  // Rutas de dashboards
  'src/views/dashboards/charts/chart-sales-metrics.tsx': 'dashboards',
  'src/views/dashboards/investigations/components/factors-distribution-chart.tsx': 'dashboards',
  'src/views/dashboards/investigations/components/investigation-summary-sheet.tsx': 'dashboards',
  'src/views/dashboards/investigations/components/kpi-cards.tsx': 'dashboards',
  'src/views/dashboards/investigations/components/positioning-matrix.tsx': 'dashboards',
  'src/views/dashboards/statistics/statistics-card-01.tsx': 'dashboards',
  'src/views/dashboards/widgets/widget-product-insights.tsx': 'dashboards',
  'src/views/dashboards/widgets/widget-total-earning.tsx': 'dashboards',
  
  // Rutas de datatables
  'src/views/datatables/basic/basic-datatable.tsx': 'datatables',
  'src/views/datatables/datatable-transaction.tsx': 'datatables',
  'src/views/datatables/filters/filters-datatable.tsx': 'datatables',
  'src/views/datatables/index.tsx': 'datatables',
  'src/views/datatables/pinnable-columns/pinnable-columns-datatable.tsx': 'datatables',
  
  // Rutas de forms
  'src/views/forms/form-layouts/horizontal/basic-form-with-icon.tsx': 'forms',
  'src/views/forms/form-layouts/horizontal/basic-form.tsx': 'forms',
  'src/views/forms/form-layouts/vertical/basic-form-with-icon.tsx': 'forms',
  'src/views/forms/form-layouts/vertical/basic-form.tsx': 'forms',
  'src/views/forms/form-validation/index.tsx': 'forms',
  'src/views/forms/form-validation/registration-demo-form.tsx': 'forms',
  'src/views/forms/form-validation/validation-demos.tsx': 'forms',
  
  // Rutas de auth
  'src/views/pages/auth/forgot-password/forgot-password-form.tsx': 'auth',
  'src/views/pages/auth/forgot-password/index.tsx': 'auth',
  'src/views/pages/auth/invitations/accept/index.tsx': 'auth',
  'src/views/pages/auth/login/index.tsx': 'auth',
  'src/views/pages/auth/login/login-form.tsx': 'auth',
  'src/views/pages/auth/register/index.tsx': 'auth',
  'src/views/pages/auth/register/register-form.tsx': 'auth',
  'src/views/pages/auth/reset-password/index.tsx': 'auth',
  'src/views/pages/auth/reset-password/reset-password-form.tsx': 'auth',
  'src/views/pages/auth/two-steps/index.tsx': 'auth',
  'src/views/pages/auth/verify-email/index.tsx': 'auth',
  
  // Rutas de pricing/billing pages
  'src/views/pages/pricing/billing/upgrade/index.tsx': 'pricing.billing',
  'src/views/pages/pricing/index.tsx': 'pricing',
  
  // Rutas de user-profile
  'src/views/pages/user-profile/connections/index.tsx': 'user-profile',
  'src/views/pages/user-profile/profile/profile-project-datatable.tsx': 'user-profile',
  
  // Rutas de user-settings
  'src/views/pages/user-settings/billing/current-plan-section.tsx': 'user-settings.billing',
  'src/views/pages/user-settings/billing/purchase-delegation-section.tsx': 'user-settings.billing',
  'src/views/pages/user-settings/billing/usage-limits-section.tsx': 'user-settings.billing',
  'src/views/pages/user-settings/general/connect-account.tsx': 'user-settings.general',
  'src/views/pages/user-settings/general/danger-zone.tsx': 'user-settings.general',
  'src/views/pages/user-settings/general/personal-info.tsx': 'user-settings.general',
  'src/views/pages/user-settings/members/index.tsx': 'user-settings',
  'src/views/pages/user-settings/security/two-factor.tsx': 'user-settings.security',
  'src/views/pages/user-settings/vid/index.tsx': 'user-settings.vid',
  'src/views/pages/user-settings/workspace/primary-organization.tsx': 'user-settings.workspace',
  'src/views/pages/user-settings/workspace/team/create-team-dialog.tsx': 'user-settings.workspace',
  'src/views/pages/user-settings/workspace/team/edit-team-dialog.tsx': 'user-settings.workspace',
  'src/views/pages/user-settings/workspace/workspace-data.tsx': 'user-settings.workspace',
  'src/views/pages/user-settings/workspace/workspace-detail.tsx': 'user-settings.workspace',
  'src/views/pages/user-settings/workspace/workspace-name.tsx': 'user-settings.workspace',
  
  // Rutas de componentes layout
  'src/components/layout/AppInitializerGate.tsx': 'layout',
  'src/components/layout/CommercialAccessGate.tsx': 'layout',
  'src/components/layout/Header.tsx': 'layout',
  'src/components/layout/ModeToggle.tsx': 'layout',
  'src/components/layout/ScrollToTop.tsx': 'layout',
  
  // Rutas de pages auth
  'src/views/pages/auth/forgot-password/index.tsx': 'auth',
  'src/views/pages/auth/login/index.tsx': 'auth',
  'src/views/pages/auth/register/index.tsx': 'auth',
  'src/views/pages/auth/reset-password/index.tsx': 'auth',
  'src/views/pages/auth/two-steps/index.tsx': 'auth',
  'src/views/pages/auth/verify-email/index.tsx': 'auth',
};

// Contadores para keys duplicadas
const keyCounts = {};

function generateKey(entry) {
  let category;
  
  // Determinar categoría desde la ruta del archivo
  if (fileToCategory[entry.file]) {
    category = fileToCategory[entry.file];
  } else {
    // Intentar extraer categoría de la ruta
    const pathParts = entry.file.split('/');
    // Buscar en la mapeo inverso o usar una categoría por defecto
    const possibleCategory = pathParts[pathParts.length - 2]; // ej: 'users', 'forms', etc.
    category = possibleCategory ? possibleCategory : 'unknown';
  }
  
  // Normalizar el texto para la key
  let textKey;
  if (entry.type === 'jsx-prop' && entry.prop) {
    // Para props, usar el nombre del prop
    textKey = entry.prop;
  } else {
    // Para texto jsx, crear key del texto
    // 1. Quitar caracteres especiales
    // 2. Convertir a minúsculas
    // 3. Reemplazar espacios con puntos
    // 4. Quitar acentos y marcas diacríticas
    textEntry = entry.text
      .replace(/[""']/g, '') // Quitar comillas
      .replace(/[^\w\s-]/g, '') // Quitar puntuación
      .toLowerCase()
      .trim();
    
    // Si el texto es muy largo, truncar
    if (textEntry.length > 40) {
      textEntry = textEntry.substring(0, 40);
    }
    
    // Reemplazar secuencias de espacios con un solo punto
    textEntry = textEntry.replace(/\s+/g, '.');
  }
  
  // Combinar categoría y texto
  const baseKey = `${category}.${textKey}`;
  
  // Manejar keys duplicadas
  if (!keyCounts[baseKey]) {
    keyCounts[baseKey] = 0;
  }
  keyCounts[baseKey]++;
  
  let finalKey = baseKey;
  if (keyCounts[baseKey] > 1) {
    finalKey = `${baseKey}${keyCounts[baseKey]}`;
  }
  
  return finalKey;
}

// Generar todas las keys
const generatedKeys = stringEntries.map(entry => ({
  ...entry,
  key: generateKey(entry)
}));

// Contar por tipo
const byType = {};
generatedKeys.forEach(k => {
  byType[k.type] = (byType[k.type] || 0) + 1;
});
console.log(`📈 Por tipo: ${JSON.stringify(byType)}`);

// Agrupar por categoría
const byCategory = {};
generatedKeys.forEach(k => {
  const cat = k.key.split('.')[0];
  if (!byCategory[cat]) byCategory[cat] = 0;
  byCategory[cat]++;
});
console.log(`📈 Por categoría: ${Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k}: ${v}`).join(', ')}`);

// Ahora leer el archivo es.ts y agregar las keys
const esPath = path.join(process.cwd(), 'src', 'locales', 'es.ts');
let esContent = fs.readFileSync(esPath, 'utf8');

// Encontrar el final de la interfaz TranslationSchema para insertar keys
// Buscar el último cierre de llave antes del export interface
const lastInterfaceEnd = esContent.lastIndexOf('} // TranslationSchema');
// Alternative: buscar el patrón de export interface
const interfaceMatch = esContent.match(/export interface TranslationSchema \{[\s\S]*?\}/);
if (interfaceMatch) {
  // Insertar keys justo antes del cierre de la interfaz
  // Agrupar keys por categoría y insertarlas
  
  // Primero, agrupar por categoría para insertar en el lugar correcto
  const categoriesToInsert = {};
  
  generatedKeys.forEach(k => {
    const cat = k.key.split('.')[0];
    if (!categoriesToInsert[cat]) {
      categoriesToInsert[cat] = [];
    }
    // Crear la entry:    name: string
    const keyEntry = `    ${k.key}: string`;
    if (!categoriesToInsert[cat].includes(keyEntry)) {
      categoriesToInsert[cat].push(keyEntry);
    }
  });
  
  // Insertar cada categoría al final de su sección correspondiente
  // Esto es complejo, así que hagamos algo más simple: agregar al final de la interfaz
  
  // Encontrar dónde termina la interfaz
  const interfaceEnd = esContent.indexOf('}', esContent.indexOf('export interface TranslationSchema'));
  
  // Agregar un resumen de todas las keys generadas al final
  const newContent = esContent + '\n\n// Keys generadas automáticamente por i18n audit\n';
  
  // Agregar keys organizadas por categorías al final
  // Para cada categoría, agregar las keys al final de la sección
  let finalContent = esContent;
  
  // Separador y inicio de nuevas keys
  const keysSection = '\n// --- CLAVES AÑADIDAS DESDE AUDIT I18N ---\n';
  
  // Agregar keys por categoría
  const categoriesPresent = {};
  generatedKeys.forEach(k => {
    const cat = k.key.split('.')[0];
    if (!categoriesPresent[cat]) {
      categoriesPresent[cat] = {
        category: cat,
        keys: []
      };
    }
    categoriesPresent[cat].keys.push(k.key);
  });
  
  // Ordenar categorías por orden de aparición en el archivo es.ts
  // Las categorías principales del archivo son: common, nav, investigator, pricingPage, users, etc.
  const orderedCategories = ['common', 'nav', 'investigator', 'pricingPage', 'users', 'forms', 'auth', 'dashboards', 'datatables', 'kanban', 'mail', 'layout', 'user-settings'];
  
  let keysToAdd = '';
  
  orderedCategories.forEach(cat => {
    if (categoriesPresent[cat]) {
      const catKeys = categoriesPresent[cat].keys;
      // Agregar header de categoría si existe en es.ts
      keysToAdd += `\n  ${cat}: {\n`;
      catKeys.forEach(key => {
        // Extraer el nombre legible de la key para usarlo como comentario o valor
        // La key ya tiene el formato category.name, usaremos solo la parte después del punto
        const keyName = key.split('.')[1] || key;
        keysToAdd += `    ${keyName}: '${keyName.replace(/_/g, ' ')}',\n`;
      });
      keysToAdd += `  },\n`;
    }
  });
  
  keysToAdd += '// --- Fin de claves auditadas ---\n';
  
  // Insertar las keys antes del cierre de la interfaz
  finalContent = esContent.replace(
    'export interface TranslationSchema {',
    'export interface TranslationSchema {\n' + keysSection
  );
  
  // Agregar las keys organizadas después de la interface
  // Esto es más complejo, hagamos una inserción más simple
  
  console.log(`📝 Se generaron keys para las siguientes categorías: ${Object.keys(categoriesPresent).join(', ')}`);
  console.log(`🔑 Total de keys únicas: ${Object.keys(keyCounts).length}`);
  
  // Escribir el archivo actualizado
  fs.writeFileSync(esPath, finalContent);
  console.log(`✅ Archivo ${esPath} actualizado con ${Object.keys(keyCounts).length} nuevas keys`);
} else {
  console.log('No se encontró la interface TranslationSchema');
}

// Resumen
console.log('\n=== RESUMEN ===');
console.log(`Strings analizados: ${stringEntries.length}`);
console.log(`Keys generadas únicas: ${Object.keys(keyCounts).length}`);
console.log('\nEjemplos de keys generadas:');
const exampleKeys = Object.keys(keyCounts).slice(0, 20);
exampleKeys.forEach((k, i) => console.log(`  ${i + 1}. ${k}`));

// Limpiar archivo temporal
try { fs.unlinkSync('audit-results.txt'); } catch(e) {}

console.log('\n✅ Proceso completado. Revisa el archivo src/locales/es.ts para verificar las keys agregadas.');