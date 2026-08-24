const fs = require('fs');
const report = JSON.parse(fs.readFileSync('C:/Users/danyt/AppData/Local/Temp/opencode/final_report.json', 'utf8'));
const orphans = report.orphan_missing_in_es.filter(k => k.startsWith('forms.') || k.startsWith('userSettings.'));

let es = fs.readFileSync('D:/03. MATRIZ DAFO/src/locales/es.ts', 'utf8');

function humanize(key) {
  const leaf = key.split('.').pop();
  // Split camelCase and replace
  const words = leaf.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const fallbacks = {
  'forms.assistanceForm': 'Formulario de asistencia',
  'forms.assistanceFormDesc': 'Describe tu solicitud de asistencia',
  'forms.billingQuery': 'Consulta de facturación',
  'forms.department': 'Departamento',
  'forms.howCanWeHelp': '¿Cómo podemos ayudarte?',
  'forms.selectDepartment': 'Seleccionar departamento',
  'forms.selectPriority': 'Seleccionar prioridad',
  'forms.selectRequestType': 'Seleccionar tipo de solicitud',
  'forms.successMessage': 'Mensaje enviado con éxito',
  'userSettings.avatar': 'Avatar',
  'userSettings.displayName': 'Nombre para mostrar',
  'userSettings.language': 'Idioma',
  'userSettings.username': 'Nombre de usuario',
};

let addedInterface = 0, addedValue = 0;
for (const key of orphans) {
  const [ns, ...rest] = key.split('.');
  const leaf = rest.join('.');
  const val = fallbacks[key] || humanize(key);

  // Interface: find "  ns: {" in the first 1000 lines (type definition) - before "export const es"
  const typeSectionEnd = es.indexOf('export const es');
  const beforeEs = es.slice(0, typeSectionEnd);
  const afterEs = es.slice(typeSectionEnd);

  // Check if already in interface
  if (!beforeEs.includes(`${leaf}: string`)) {
    const nsInterfaceRegex = new RegExp(`(${ns}:\\s*\\{[^}]*)(\\n\\s*\\})`, 'm');
    if (nsInterfaceRegex.test(beforeEs)) {
      const newBefore = beforeEs.replace(nsInterfaceRegex, `$1    ${leaf}: string\n  $2`);
      es = newBefore + afterEs;
      addedInterface++;
    }
  } else {
    // already there
  }

  // For value: need to find the second occurrence (after export const es)
  // Re-read afterEs for value
  const valueSection = es.slice(es.indexOf('export const es'));
  if (!valueSection.includes(`${leaf}:`) && !valueSection.includes(`"${leaf}":`)) {
    const nsValueRegex = new RegExp(`(${ns}:\\s*\\{[^}]*)(\\n\\s*\\},)`, 'm');
    // Find in the value part only
    const valueStart = es.indexOf('export const es');
    const beforeValue = es.slice(0, valueStart);
    let valuePart = es.slice(valueStart);
    if (nsValueRegex.test(valuePart)) {
      const newValuePart = valuePart.replace(nsValueRegex, `$1    ${leaf}: '${val.replace(/'/g, "\\'")}',\n  $2`);
      es = beforeValue + newValuePart;
      addedValue++;
    }
  }
}

fs.writeFileSync('D:/03. MATRIZ DAFO/src/locales/es.ts', es, 'utf8');
console.log(`Added interface: ${addedInterface}, value: ${addedValue}, total orphans ${orphans.length}`);
