ACTUALIZACIÓN A3 — EJERCICIO ZEUS

Se agregaron tres accesos independientes en A3:
1. Cálculo PCR (se conserva el módulo existente).
2. Cómputo Aéreo (nuevo formulario por cuadros, sin apariencia de Excel).
3. Mapa 3D (terreno tridimensional y máscaras S-300 superpuestas).

CÓMPUTO AÉREO
- Performance, aviónica, armamento aire-aire, armamento aire-superficie.
- Meteorología con referencias en cada campo.
- Generación de salidas y supervivencia.
- Variables adicionales.
- Cálculos intermedios integrados y ocultos.
- Guardado en Supabase usando pcr_analyses con analysis_key computo-aereo-principal,
  sin mezclarse con el análisis PCR principal en la interfaz.

MAPA 3D
- Usa MapLibre y un modelo digital de elevación Terrarium.
- Superpone los cuatro archivos GeoJSON de coberturas S-300 existentes.
- Permite activar/desactivar coberturas y ajustar exageración vertical.
- No requiere una clave adicional.
- La fotogrametría de Google Earth/Google Photorealistic 3D Tiles no se incluye
  en esta versión porque requiere una clave de Google Maps Platform y facturación.

No se incluyeron archivos .env.local ni enlaces privados.
