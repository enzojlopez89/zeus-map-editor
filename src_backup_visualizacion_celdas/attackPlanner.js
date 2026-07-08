/* attackPlanner.js
   Módulo para planificar ataques aéreos en Leaflet.
   Requiere que exista una variable global: map = L.map(...)
*/

let ataqueActivo = false;
let ataqueMedio = null;
let puntosAtaque = [];
let lineaAtaque = null;
let marcadoresAtaque = [];
let marcadorImpacto = null;

function iniciarPlanAtaque(medioSeleccionado) {
  ataqueActivo = true;
  ataqueMedio = medioSeleccionado || "Medio aéreo";
  puntosAtaque = [];

  limpiarPlanAtaque();
  alert("Modo ataque activado. Marque origen, puntos de ruta y último punto de impacto.");
}

function limpiarPlanAtaque() {
  if (lineaAtaque) {
    map.removeLayer(lineaAtaque);
    lineaAtaque = null;
  }

  marcadoresAtaque.forEach(m => map.removeLayer(m));
  marcadoresAtaque = [];

  if (marcadorImpacto) {
    map.removeLayer(marcadorImpacto);
    marcadorImpacto = null;
  }
}

function agregarPuntoAtaque(latlng) {
  if (!ataqueActivo) return;

  puntosAtaque.push(latlng);
  const numero = puntosAtaque.length;

  const marcador = L.marker(latlng).addTo(map)
    .bindPopup(`${ataqueMedio}<br>Punto ${numero}`);

  marcadoresAtaque.push(marcador);
  actualizarLineaAtaque();
}

function agregarPuntoAtaquePorCoordenadas(lat, lng) {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    alert("Coordenadas inválidas.");
    return;
  }

  agregarPuntoAtaque(L.latLng(latNum, lngNum));
}

function actualizarLineaAtaque() {
  if (lineaAtaque) map.removeLayer(lineaAtaque);

  lineaAtaque = L.polyline(puntosAtaque, {
    color: "red",
    weight: 3,
    opacity: 0.9,
    dashArray: "6, 8"
  }).addTo(map);
}

function finalizarAtaque() {
  if (puntosAtaque.length < 2) {
    alert("Debe marcar al menos origen e impacto.");
    return;
  }

  const impacto = puntosAtaque[puntosAtaque.length - 1];

  marcadorImpacto = L.circleMarker(impacto, {
    radius: 16,
    color: "red",
    weight: 3,
    fillColor: "orange",
    fillOpacity: 0.85
  }).addTo(map).bindPopup(`IMPACTO / EXPLOSIÓN<br>${ataqueMedio}`);

  marcadorImpacto.openPopup();
  ataqueActivo = false;
}

function cancelarAtaque() {
  ataqueActivo = false;
  puntosAtaque = [];
  limpiarPlanAtaque();
}

map.on("click", function(e) {
  if (ataqueActivo) {
    agregarPuntoAtaque(e.latlng);
  }
});

// Opcional: exponer funciones para botones HTML
window.iniciarPlanAtaque = iniciarPlanAtaque;
window.finalizarAtaque = finalizarAtaque;
window.cancelarAtaque = cancelarAtaque;
window.agregarPuntoAtaquePorCoordenadas = agregarPuntoAtaquePorCoordenadas;
