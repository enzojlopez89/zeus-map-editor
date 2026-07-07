const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'components', 'WorkspaceMapClient.tsx');
if (!fs.existsSync(file)) {
  console.error('No se encontró src/components/WorkspaceMapClient.tsx');
  process.exit(1);
}

let text = fs.readFileSync(file, 'utf8');

if (!text.includes('PPC · Calcular PCR')) {
  if (!text.includes('import Link from "next/link";') && !text.includes("import Link from 'next/link';")) {
    text = text.replace(/^("use client";\s*)/m, '$1\nimport Link from "next/link";\n');
  }

  const marker = '<span className="rounded-full bg-emerald-900 px-3 py-1 font-semibold text-emerald-200">';
  const button = `          {workspaceCode === "a3" && access === "edit" && (\n            <Link\n              href={\`/espacio/\${workspaceCode}/\${token}/ppc/pcr\`}\n              className="rounded bg-cyan-700 px-3 py-1.5 font-semibold text-white hover:bg-cyan-600"\n            >\n              PPC · Calcular PCR\n            </Link>\n          )}\n`;

  if (text.includes(marker)) {
    text = text.replace(marker, button + marker);
  } else {
    console.error('No pude ubicar el encabezado para insertar el botón. Agregalo manualmente o avisame.');
    process.exit(1);
  }

  fs.writeFileSync(file, text, 'utf8');
  console.log('Botón PPC · Calcular PCR agregado en A3.');
} else {
  console.log('El botón PPC · Calcular PCR ya estaba agregado.');
}
