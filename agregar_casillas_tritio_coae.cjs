const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'components', 'MapEditor.tsx');

if (!fs.existsSync(file)) {
  console.error('No se encontró src/components/MapEditor.tsx. Ejecutá este script desde la raíz del proyecto zeus-map-editor.');
  process.exit(1);
}

let src = fs.readFileSync(file, 'utf8');

const requiereLab = src.includes('LABORATORIO_TRITIO') && src.includes('laboratorioTritioRef');
const requiereCoae = src.includes('coaeRef');

if (!requiereLab) {
  console.error('No encontré LABORATORIO_TRITIO/laboratorioTritioRef. Primero incorporá el punto fijo del laboratorio de tritio.');
  process.exit(1);
}

if (!requiereCoae) {
  console.error('No encontré coaeRef. No puedo agregar la casilla del COAe.');
  process.exit(1);
}

const backup = file + '.bak-casillas-tritio-coae-' + Date.now();
fs.copyFileSync(file, backup);
let cambios = [];

function insertarDespues(needle, insert, descripcion) {
  if (!src.includes(needle)) {
    console.error(`No pude ubicar el bloque para: ${descripcion}`);
    console.error('Backup creado en:', backup);
    process.exit(1);
  }
  src = src.replace(needle, needle + insert);
  cambios.push(descripcion);
}

// 1) Estado de visibilidad independiente para laboratorio y COAe.
const stateRegex = /const \[basesVisibles, setBasesVisibles\] = useState<Record<string, boolean>>\([\s\S]*?\n  \);\n/;
const stateMatch = src.match(stateRegex);
if (!stateMatch) {
  console.error('No pude ubicar el bloque de estado basesVisibles.');
  console.error('Backup creado en:', backup);
  process.exit(1);
}

let estadosExtra = '';
if (!src.includes('mostrarLaboratorioTritio')) {
  estadosExtra += `\n  const [mostrarLaboratorioTritio, setMostrarLaboratorioTritio] = useState<boolean>(\n    () =>\n      (ajustesIniciales.mostrarLaboratorioTritio as boolean | undefined) ??\n      true,\n  );\n`;
  cambios.push('estado mostrarLaboratorioTritio');
}
if (!src.includes('mostrarCOAe')) {
  estadosExtra += `\n  const [mostrarCOAe, setMostrarCOAe] = useState<boolean>(\n    () =>\n      (ajustesIniciales.mostrarCOAe as boolean | undefined) ??\n      true,\n  );\n`;
  cambios.push('estado mostrarCOAe');
}
if (estadosExtra) {
  src = src.replace(stateRegex, stateMatch[0] + estadosExtra);
}

// 2) Persistencia de la preferencia dentro de settings.
const settingsNeedle = '          basesVisibles,';
if (!src.includes(settingsNeedle)) {
  console.error('No pude ubicar settings.basesVisibles para guardar preferencias.');
  console.error('Backup creado en:', backup);
  process.exit(1);
}
if (!src.includes('          mostrarLaboratorioTritio,')) {
  insertarDespues(settingsNeedle, '\n          mostrarLaboratorioTritio,', 'guardar mostrarLaboratorioTritio');
}
if (!src.includes('          mostrarCOAe,')) {
  insertarDespues(settingsNeedle, '\n          mostrarCOAe,', 'guardar mostrarCOAe');
}

// 3) Efectos de visibilidad para marcadores fijos.
const basesEffectRegex = /  useEffect\(\(\) => \{\n    \[\.\.\.BASES_PROPIAS, \.\.\.BASES_ENEMIGAS\]\.forEach\(\(base\) => \{[\s\S]*?\n  \}, \[mostrarBases, vistaFuerzas, basesVisibles, mapReady\]\);\n/;
const basesEffectMatch = src.match(basesEffectRegex);
if (!basesEffectMatch) {
  console.error('No pude ubicar el efecto de visibilidad de bases.');
  console.error('Backup creado en:', backup);
  process.exit(1);
}
let efectosExtra = '';
if (!src.includes('const visibleCOAe =')) {
  efectosExtra += `\n  useEffect(() => {\n    const marcador = coaeRef.current;\n    if (!marcador) return;\n\n    const visibleCOAe =\n      mostrarBases &&\n      mostrarCOAe &&\n      bandoVisible("propio", vistaFuerzas);\n\n    marcador.getElement().style.display = visibleCOAe ? "flex" : "none";\n  }, [mostrarBases, mostrarCOAe, vistaFuerzas, mapReady]);\n`;
  cambios.push('efecto visibilidad COAe');
}
if (!src.includes('const visibleLaboratorioTritio =')) {
  efectosExtra += `\n  useEffect(() => {\n    const marcador = laboratorioTritioRef.current;\n    if (!marcador) return;\n\n    const visibleLaboratorioTritio =\n      mostrarBases &&\n      mostrarLaboratorioTritio &&\n      bandoVisible("enemigo", vistaFuerzas);\n\n    marcador.getElement().style.display = visibleLaboratorioTritio ? "flex" : "none";\n  }, [mostrarBases, mostrarLaboratorioTritio, vistaFuerzas, mapReady]);\n`;
  cambios.push('efecto visibilidad laboratorio');
}
if (efectosExtra) {
  src = src.replace(basesEffectRegex, basesEffectMatch[0] + efectosExtra);
}

// 4) Texto explicativo del COAe.
src = src.replace(
  'El COAe de Río Cuarto permanece visible como punto fijo.',
  'El COAe de Río Cuarto puede mostrarse u ocultarse desde Bases y estaciones visibles → Propias.'
);

// 5) Casilla COAe dentro de Bases y estaciones visibles > Propias.
if (!src.includes('checked={mostrarCOAe}')) {
  const propiasBlockNeedle = `              {BASES_PROPIAS.map((base) => (\n                <label key={base.nombre} className="mb-2 flex items-start gap-2 text-sm last:mb-0">\n                  <input type="checkbox" checked={Boolean(basesVisibles[base.nombre])} onChange={(event) => setBasesVisibles((a) => ({ ...a, [base.nombre]: event.target.checked }))} />\n                  <span>{base.nombre}</span>\n                </label>\n              ))}`;
  if (!src.includes(propiasBlockNeedle)) {
    console.error('No pude ubicar la lista de bases propias para insertar la casilla del COAe.');
    console.error('Backup creado en:', backup);
    process.exit(1);
  }
  const propiasReplacement = propiasBlockNeedle + `\n\n              <label className="mt-3 flex items-start gap-2 border-t border-blue-900 pt-3 text-sm">\n                <input\n                  type="checkbox"\n                  checked={mostrarCOAe}\n                  onChange={(event) => setMostrarCOAe(event.target.checked)}\n                />\n                <span>\n                  <strong className="text-cyan-300">COAe / Río Cuarto</strong>\n                  <br />\n                  <span className="text-xs text-slate-400">\n                    Centro de operaciones aeroespaciales propio\n                  </span>\n                </span>\n              </label>`;
  src = src.replace(propiasBlockNeedle, propiasReplacement);
  cambios.push('casilla COAe en Propias');
}

// 6) Casilla Laboratorio dentro de Bases y estaciones visibles > Enemigas.
if (!src.includes('checked={mostrarLaboratorioTritio}')) {
  const enemigasBlockNeedle = `              {BASES_ENEMIGAS.map((base) => (\n                <label key={base.nombre} className="mb-2 flex items-start gap-2 text-sm last:mb-0">\n                  <input type="checkbox" checked={Boolean(basesVisibles[base.nombre])} onChange={(event) => setBasesVisibles((a) => ({ ...a, [base.nombre]: event.target.checked }))} />\n                  <span>{base.nombre}</span>\n                </label>\n              ))}`;
  if (!src.includes(enemigasBlockNeedle)) {
    console.error('No pude ubicar la lista de bases enemigas para insertar la casilla del laboratorio.');
    console.error('Backup creado en:', backup);
    process.exit(1);
  }
  const enemigasReplacement = enemigasBlockNeedle + `\n\n              <label className="mt-3 flex items-start gap-2 border-t border-orange-900 pt-3 text-sm">\n                <input\n                  type="checkbox"\n                  checked={mostrarLaboratorioTritio}\n                  onChange={(event) =>\n                    setMostrarLaboratorioTritio(event.target.checked)\n                  }\n                />\n                <span>\n                  <strong className="text-red-300">☢ {LABORATORIO_TRITIO.nombre}</strong>\n                  <br />\n                  <span className="text-xs text-slate-400">\n                    Objetivo estratégico enemigo\n                  </span>\n                </span>\n              </label>`;
  src = src.replace(enemigasBlockNeedle, enemigasReplacement);
  cambios.push('casilla laboratorio en Enemigas');
}

fs.writeFileSync(file, src, 'utf8');
console.log('Actualización aplicada correctamente.');
console.log('Cambios:', cambios.length ? cambios.join(', ') : 'ninguno; ya estaba aplicado');
console.log('Backup creado en:', backup);
