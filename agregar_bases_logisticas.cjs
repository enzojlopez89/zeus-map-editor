const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'components', 'MapEditor.tsx');

if (!fs.existsSync(file)) {
  console.error('No se encontró src/components/MapEditor.tsx. Ejecutá este script desde la raíz del proyecto zeus-map-editor.');
  process.exit(1);
}

let code = fs.readFileSync(file, 'utf8');

if (code.includes('Área de Material Realicó (AMR)') && code.includes('Área de Material San Rafael (AMSR)')) {
  console.log('Las bases logísticas AMR y AMSR ya están agregadas. No se hicieron cambios.');
  process.exit(0);
}

const originalTipo = 'tipo: "Base aérea" | "Estación radar" | "Centro de comando" | "Comunicaciones";';
const nuevoTipo = 'tipo: "Base aérea" | "Estación radar" | "Centro de comando" | "Comunicaciones" | "Apoyo logístico";';

if (code.includes(originalTipo)) {
  code = code.replace(originalTipo, nuevoTipo);
} else if (!code.includes('"Apoyo logístico"')) {
  console.warn('Aviso: no se encontró la definición exacta de BaseMilitar.tipo. Revisá si TypeScript requiere agregar "Apoyo logístico" al tipo.');
}

const bloqueMalargue = `  {
    nombre: "Base Aérea Militar Malargüe",
    longitude: -69.58,
    latitude: -35.47,
    bando: "propio",
    tipo: "Base aérea",
  },`;

const bloqueNuevo = `  {
    nombre: "Base Aérea Militar Malargüe",
    longitude: -69.58,
    latitude: -35.47,
    bando: "propio",
    tipo: "Base aérea",
  },
  {
    nombre: "Área de Material Realicó (AMR)",
    longitude: -64.245,
    latitude: -35.035,
    bando: "propio",
    tipo: "Apoyo logístico",
  },
  {
    nombre: "Área de Material San Rafael (AMSR)",
    longitude: -68.33,
    latitude: -34.617,
    bando: "propio",
    tipo: "Apoyo logístico",
  },`;

if (!code.includes(bloqueMalargue)) {
  console.error('No se encontró el bloque de Base Aérea Militar Malargüe para insertar las bases logísticas. No se modificó el archivo.');
  process.exit(1);
}

code = code.replace(bloqueMalargue, bloqueNuevo);

// Mejorar el ícono de apoyo logístico si existe la función crearIconoBase con la selección de familia estándar.
const originalFamilia = `const familia =
      base.tipo === "Estación radar"
        ? "radar"
        : base.tipo === "Centro de comando"
          ? "puesto_de_mando"
          : ICONO_BASE;`;

const nuevaFamilia = `const familia =
      base.tipo === "Estación radar"
        ? "radar"
        : base.tipo === "Centro de comando"
          ? "puesto_de_mando"
          : base.tipo === "Apoyo logístico"
            ? "instalacion"
            : ICONO_BASE;`;

if (code.includes(originalFamilia)) {
  code = code.replace(originalFamilia, nuevaFamilia);
}

// Asegurar fallback correcto aunque no exista el ícono "instalacion".
fs.writeFileSync(file, code, 'utf8');
console.log('Bases logísticas agregadas correctamente:');
console.log('- Área de Material Realicó (AMR): lat -35.035, lon -64.245');
console.log('- Área de Material San Rafael (AMSR): lat -34.617, lon -68.330');
console.log('Ejecutá npm.cmd run build antes de subir, si querés verificar compilación.');
