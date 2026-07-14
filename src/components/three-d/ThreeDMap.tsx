"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type Props = { workspaceCode: string; token: string };
type Side = "propio" | "enemigo";
type PointKind =
  | "salida"
  | "navegacion"
  | "reunion"
  | "reabastecimiento"
  | "ingreso"
  | "lanzamiento"
  | "impacto"
  | "escape"
  | "recuperacion";

type RoutePoint = {
  id: string;
  longitude: number;
  latitude: number;
  kind: PointKind;
  name: string;
  altitudeFt: number;
};

type MissionPackage = {
  id: string;
  name: string;
  aircraft: string;
  quantity: number;
  speedKt: number;
  cruiseAltitudeFt: number;
  weapon: string;
  weaponsPerAircraft: number;
  departureTime: string;
  visible: boolean;
  route: RoutePoint[];
};

type PointSite = {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  altitudeMeters: number;
  side: Side;
  kind: "radar" | "tritio";
  detail: string;
};

type Coverage = {
  id: string;
  name: string;
  url: string;
  side: Side;
  kind: "radar" | "s300";
  color: string;
};

const pointSites: PointSite[] = [
  { id: "pos-radar-la-rioja", name: "Radar propio · La Rioja", longitude: -66.793409, latitude: -29.376201, altitudeMeters: 438, side: "propio", kind: "radar", detail: "Posición del radar propio asociado a la 1.ª Brigada Aérea." },
  { id: "pos-radar-villa-mercedes", name: "Radar propio · Villa Mercedes", longitude: -65.370632, latitude: -33.738415, altitudeMeters: 485, side: "propio", kind: "radar", detail: "Posición del radar propio asociado a la 2.ª Brigada Aérea." },
  { id: "pos-radar-cordoba", name: "Radar propio · Córdoba", longitude: -64.207857, latitude: -31.319799, altitudeMeters: 489, side: "propio", kind: "radar", detail: "Posición del radar propio asociado a la 3.ª Brigada Aérea." },
  { id: "pos-radar-general-acha", name: "Radar propio · General Acha", longitude: -64.639206, latitude: -37.425428, altitudeMeters: 277, side: "propio", kind: "radar", detail: "Posición del radar propio asociado a la 5.ª Brigada Aérea." },
  { id: "pos-radar-cafayate", name: "Radar enemigo · Cafayate", longitude: -65.925964, latitude: -26.062598, altitudeMeters: 1683, side: "enemigo", kind: "radar", detail: "Posición de la estación radar enemiga." },
  { id: "pos-radar-las-lomitas", name: "Radar enemigo · Las Lomitas", longitude: -60.551518, latitude: -24.730022, altitudeMeters: 130, side: "enemigo", kind: "radar", detail: "Posición de la estación radar enemiga." },
  { id: "pos-radar-oran", name: "Radar enemigo · Orán", longitude: -64.375962, latitude: -23.15641, altitudeMeters: 337, side: "enemigo", kind: "radar", detail: "Posición de la estación radar enemiga." },
  { id: "planta-tritio", name: "Planta de procesamiento de tritio", longitude: -66.80665833333333, latitude: -25.0827, altitudeMeters: 3950, side: "enemigo", kind: "tritio", detail: "Instalación estratégica enemiga de procesamiento de tritio." },
];

const coverages: Coverage[] = [
  { id: "radar-la-rioja", name: "Radar propio · La Rioja", url: "/data/radar/la_rioja.geojson", side: "propio", kind: "radar", color: "#2563eb" },
  { id: "radar-villa-mercedes", name: "Radar propio · Villa Mercedes", url: "/data/radar/villa_mercedes.geojson", side: "propio", kind: "radar", color: "#0ea5e9" },
  { id: "radar-cordoba", name: "Radar propio · Córdoba", url: "/data/radar/cordoba.geojson", side: "propio", kind: "radar", color: "#7c3aed" },
  { id: "radar-general-acha", name: "Radar propio · General Acha", url: "/data/radar/general_acha.geojson", side: "propio", kind: "radar", color: "#06b6d4" },
  { id: "radar-cafayate", name: "Radar enemigo · Cafayate", url: "/data/radar/cafayate.geojson", side: "enemigo", kind: "radar", color: "#f97316" },
  { id: "radar-las-lomitas", name: "Radar enemigo · Las Lomitas", url: "/data/radar/las_lomitas.geojson", side: "enemigo", kind: "radar", color: "#ef4444" },
  { id: "radar-oran", name: "Radar enemigo · Orán", url: "/data/radar/oran.geojson", side: "enemigo", kind: "radar", color: "#dc2626" },
  { id: "s300-alfa", name: "S-300 ALFA · Belén", url: "/data/defensa-s300/s300_alfa.geojson", side: "enemigo", kind: "s300", color: "#b91c1c" },
  { id: "s300-bravo", name: "S-300 BRAVO · Catamarca", url: "/data/defensa-s300/s300_bravo.geojson", side: "enemigo", kind: "s300", color: "#991b1b" },
  { id: "s300-charly", name: "S-300 CHARLY · Salta", url: "/data/defensa-s300/s300_charly.geojson", side: "enemigo", kind: "s300", color: "#ef4444" },
  { id: "s300-delta", name: "S-300 DELTA · Las Lomitas", url: "/data/defensa-s300/s300_delta.geojson", side: "enemigo", kind: "s300", color: "#dc2626" },
];

const pointKindLabels: Record<PointKind, string> = {
  salida: "Salida",
  navegacion: "Navegación",
  reunion: "Reunión",
  reabastecimiento: "Reabastecimiento",
  ingreso: "Ingreso",
  lanzamiento: "Lanzamiento",
  impacto: "Impacto",
  escape: "Escape",
  recuperacion: "Recuperación",
};

const aircraftDefaults: Record<string, { speedKt: number; altitudeFt: number }> = {
  "F-16CJ Block 50": { speedKt: 480, altitudeFt: 24000 },
  "F-16C Block 40": { speedKt: 480, altitudeFt: 24000 },
  "AMX A-1M": { speedKt: 420, altitudeFt: 18000 },
  "E-99M ERIEYE": { speedKt: 400, altitudeFt: 28000 },
  "KC-135": { speedKt: 430, altitudeFt: 26000 },
  "KC-130J": { speedKt: 300, altitudeFt: 20000 },
  "EC-130H COMPASS CALL": { speedKt: 300, altitudeFt: 25000 },
  "HERMES 450": { speedKt: 80, altitudeFt: 15000 },
};

const initialPackages: MissionPackage[] = [
  {
    id: "pkg-sead-f16",
    name: "SEAD F-16CJ · Catamarca",
    aircraft: "F-16CJ Block 50",
    quantity: 2,
    speedKt: 480,
    cruiseAltitudeFt: 24000,
    weapon: "AGM-88C HARM",
    weaponsPerAircraft: 2,
    departureTime: "21:20",
    visible: true,
    route: [],
  },
];

function haversineNm(a: RoutePoint, b: RoutePoint) {
  const rNm = 3440.065;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * rNm * Math.asin(Math.sqrt(h));
}

function routeDistanceNm(route: RoutePoint[]) {
  return route.slice(1).reduce((sum, point, index) => sum + haversineNm(route[index], point), 0);
}

function interpolateRoute(route: RoutePoint[], progress: number) {
  if (!route.length) return null;
  if (route.length === 1) return [route[0].longitude, route[0].latitude] as [number, number];
  const segments = route.slice(1).map((point, index) => haversineNm(route[index], point));
  const total = segments.reduce((a, b) => a + b, 0);
  if (total <= 0) return [route[0].longitude, route[0].latitude] as [number, number];
  let target = Math.max(0, Math.min(1, progress)) * total;
  for (let i = 0; i < segments.length; i += 1) {
    if (target <= segments[i]) {
      const t = segments[i] === 0 ? 0 : target / segments[i];
      return [
        route[i].longitude + (route[i + 1].longitude - route[i].longitude) * t,
        route[i].latitude + (route[i + 1].latitude - route[i].latitude) * t,
      ] as [number, number];
    }
    target -= segments[i];
  }
  const last = route[route.length - 1];
  return [last.longitude, last.latitude] as [number, number];
}

function formatDuration(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) return "—";
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "—";
  const value = ((h * 60 + m + Math.round(minutes)) % 1440 + 1440) % 1440;
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export default function ThreeDMap({ workspaceCode, token }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const siteMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const routeMarkersRef = useRef<maplibregl.Marker[]>([]);
  const aircraftMarkerRef = useRef<maplibregl.Marker | null>(null);
  const orbitMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const satelliteMarkerRef = useRef<maplibregl.Marker | null>(null);
  const animationRef = useRef<number | null>(null);
  const animationStartRef = useRef<number | null>(null);

  const [visible, setVisible] = useState<Record<string, boolean>>(Object.fromEntries(coverages.map((c) => [c.id, true])));
  const [siteVisible, setSiteVisible] = useState<Record<string, boolean>>(Object.fromEntries(pointSites.map((s) => [s.id, true])));
  const [exaggeration, setExaggeration] = useState(4.5);
  const [opacity, setOpacity] = useState(0.34);
  const [status, setStatus] = useState("Inicializando relieve 3D...");
  const [packages, setPackages] = useState<MissionPackage[]>(initialPackages);
  const [selectedPackageId, setSelectedPackageId] = useState(initialPackages[0].id);
  const [drawingRoute, setDrawingRoute] = useState(false);
  const [nextPointKind, setNextPointKind] = useState<PointKind>("navegacion");
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [simulationSpeed, setSimulationSpeed] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showH24, setShowH24] = useState(true);
  const [showSatellite, setShowSatellite] = useState(true);
  const [satelliteProgress, setSatelliteProgress] = useState(0);
  const [showTonWall, setShowTonWall] = useState(true);
  const [showRepublicWalls, setShowRepublicWalls] = useState(true);
  const [wallHeightMeters, setWallHeightMeters] = useState(8000);
  const [wallOpacity, setWallOpacity] = useState(0.3);

  const selectedPackage = packages.find((item) => item.id === selectedPackageId) ?? packages[0];
  const selectedDistance = useMemo(() => routeDistanceNm(selectedPackage?.route ?? []), [selectedPackage]);
  const selectedHours = selectedPackage && selectedPackage.speedKt > 0 ? selectedDistance / selectedPackage.speedKt : 0;
  const impactPoint = selectedPackage?.route.find((point) => point.kind === "impacto");
  const impactIndex = selectedPackage?.route.findIndex((point) => point.kind === "impacto") ?? -1;
  const distanceToImpact = useMemo(() => {
    if (!selectedPackage || impactIndex < 1) return 0;
    return routeDistanceNm(selectedPackage.route.slice(0, impactIndex + 1));
  }, [selectedPackage, impactIndex]);
  const impactArrival = selectedPackage && selectedPackage.speedKt > 0
    ? addMinutes(selectedPackage.departureTime, (distanceToImpact / selectedPackage.speedKt) * 60)
    : "—";

  const updatePackage = useCallback((patch: Partial<MissionPackage>) => {
    setPackages((current) => current.map((item) => item.id === selectedPackageId ? { ...item, ...patch } : item));
  }, [selectedPackageId]);

  const updateRouteSource = useCallback((route: RoutePoint[]) => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("mission-route") as maplibregl.GeoJSONSource | undefined;
    source?.setData({
      type: "FeatureCollection",
      features: route.length > 1 ? [{
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: route.map((p) => [p.longitude, p.latitude]) },
      }] : [],
    });

    routeMarkersRef.current.forEach((marker) => marker.remove());
    routeMarkersRef.current = [];
    route.forEach((point, index) => {
      const element = document.createElement("button");
      element.type = "button";
      element.textContent = point.kind === "impacto" ? "💥" : String(index + 1);
      element.title = `${index + 1}. ${pointKindLabels[point.kind]}`;
      Object.assign(element.style, {
        width: point.kind === "impacto" ? "38px" : "28px",
        height: point.kind === "impacto" ? "38px" : "28px",
        borderRadius: "999px",
        border: "2px solid white",
        background: point.kind === "impacto" ? "#dc2626" : "#0f766e",
        color: "white",
        fontWeight: "900",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,.6)",
      });
      const marker = new maplibregl.Marker({ element, anchor: "center" })
        .setLngLat([point.longitude, point.latitude])
        .setPopup(new maplibregl.Popup({ offset: 18 }).setHTML(`<strong>${point.name}</strong><br/>${pointKindLabels[point.kind]}<br/>Altura: ${point.altitudeFt.toLocaleString("es-AR")} ft`))
        .addTo(map);
      routeMarkersRef.current.push(marker);
    });
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      center: [-67.1, -27.7],
      zoom: 5.5,
      pitch: 72,
      bearing: -24,
      maxPitch: 85,
      style: {
        version: 8,
        sources: {
          terrain: { type: "raster-dem", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], tileSize: 256, encoding: "terrarium" },
        },
        layers: [
          { id: "fondo", type: "background", paint: { "background-color": "#07111d" } },
          { id: "relieve", type: "hillshade", source: "terrain", paint: { "hillshade-exaggeration": 1, "hillshade-shadow-color": "#020617", "hillshade-highlight-color": "#d8e3d4", "hillshade-accent-color": "#64748b", "hillshade-illumination-direction": 315 } },
        ],
        terrain: { source: "terrain", exaggeration },
      },
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-left");
    map.on("load", () => {
      coverages.forEach((coverage) => {
        map.addSource(coverage.id, { type: "geojson", data: coverage.url });
        map.addLayer({ id: `${coverage.id}-fill`, type: "fill", source: coverage.id, paint: { "fill-color": coverage.color, "fill-opacity": opacity } });
        map.addLayer({ id: `${coverage.id}-line`, type: "line", source: coverage.id, paint: { "line-color": coverage.color, "line-width": coverage.kind === "s300" ? 2.6 : 2, "line-dasharray": coverage.kind === "s300" ? [2, 1.5] : [3, 2] } });
      });
      map.addSource("mission-route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "mission-route-line", type: "line", source: "mission-route", paint: { "line-color": "#facc15", "line-width": 4, "line-dasharray": [2, 1.5] } });
      map.addSource("satellite-track", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[-70.2, -31], [-68, -28.5], [-65.2, -25.8], [-62.5, -23.5]] } } });
      map.addLayer({ id: "satellite-track-line", type: "line", source: "satellite-track", paint: { "line-color": "#e2e8f0", "line-width": 2, "line-dasharray": [1, 2], "line-opacity": 0.75 } });

      map.addSource("ton-wall", { type: "geojson", data: "/data/limites/ton_muro.geojson" });
      map.addLayer({
        id: "ton-wall-extrusion",
        type: "fill-extrusion",
        source: "ton-wall",
        paint: {
          "fill-extrusion-color": "#7dd3fc",
          "fill-extrusion-height": wallHeightMeters,
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": wallOpacity,
          "fill-extrusion-vertical-gradient": true,
        },
      });
      map.addLayer({ id: "ton-wall-base-line", type: "line", source: "ton-wall", paint: { "line-color": "#e0f2fe", "line-width": 2.2, "line-opacity": 0.9 } });

      map.addSource("republic-walls", { type: "geojson", data: "/data/limites/fronteras_republicas_muro.geojson" });
      map.addLayer({
        id: "republic-walls-extrusion",
        type: "fill-extrusion",
        source: "republic-walls",
        paint: {
          "fill-extrusion-color": "#fbbf24",
          "fill-extrusion-height": wallHeightMeters,
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": wallOpacity * 0.9,
          "fill-extrusion-vertical-gradient": true,
        },
      });
      map.addLayer({ id: "republic-walls-base-line", type: "line", source: "republic-walls", paint: { "line-color": "#fde68a", "line-width": 1.5, "line-opacity": 0.8 } });

      pointSites.forEach((site) => {
        const element = document.createElement("button");
        element.type = "button";
        element.title = site.name;
        element.textContent = site.kind === "tritio" ? "☢" : "⌖";
        Object.assign(element.style, { width: site.kind === "tritio" ? "42px" : "34px", height: site.kind === "tritio" ? "42px" : "34px", borderRadius: "999px", border: site.kind === "tritio" ? "3px solid #fecaca" : "3px solid #e2e8f0", background: site.kind === "tritio" ? "#991b1b" : site.side === "propio" ? "#1d4ed8" : "#c2410c", color: "white", fontWeight: "900", fontSize: site.kind === "tritio" ? "22px" : "17px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 0 0 2px rgba(15,23,42,.85), 0 5px 16px rgba(0,0,0,.55)" });
        const popup = new maplibregl.Popup({ offset: 22 }).setHTML(`<div style="min-width:240px;color:#0f172a"><strong>${site.name}</strong><br/><span>${site.detail}</span><br/><br/><strong>Coordenadas:</strong> ${site.latitude.toFixed(6)}, ${site.longitude.toFixed(6)}<br/><strong>Altura:</strong> ${site.altitudeMeters.toLocaleString("es-AR")} m s. n. m.</div>`);
        siteMarkersRef.current[site.id] = new maplibregl.Marker({ element, anchor: "bottom" }).setLngLat([site.longitude, site.latitude]).setPopup(popup).addTo(map);
      });

      const aircraftElement = document.createElement("div");
      aircraftElement.textContent = "✈";
      Object.assign(aircraftElement.style, { fontSize: "36px", color: "#fde047", textShadow: "0 2px 5px #000", transform: "rotate(0deg)", display: "none" });
      aircraftMarkerRef.current = new maplibregl.Marker({ element: aircraftElement, anchor: "center" }).setLngLat([-64.2, -31.3]).addTo(map);

      const satelliteElement = document.createElement("div");
      satelliteElement.textContent = "🛰️";
      Object.assign(satelliteElement.style, { fontSize: "34px", filter: "drop-shadow(0 2px 4px #000)" });
      satelliteMarkerRef.current = new maplibregl.Marker({ element: satelliteElement, anchor: "center" }).setLngLat([-70.2, -31]).addTo(map);

      const orbitDefinitions = [
        { id: "awacs", icon: "✈", center: [-65.7, -29.8] as [number, number], label: "E-99M H24" },
        { id: "ew", icon: "✦", center: [-66.5, -30.7] as [number, number], label: "EC-130H H24" },
      ];
      orbitDefinitions.forEach((orbit) => {
        const element = document.createElement("div");
        element.textContent = orbit.icon;
        element.title = orbit.label;
        Object.assign(element.style, { fontSize: "30px", color: "#67e8f9", textShadow: "0 2px 4px #000" });
        orbitMarkersRef.current[orbit.id] = new maplibregl.Marker({ element, anchor: "center" }).setLngLat(orbit.center).addTo(map);
      });
      setStatus("Simulador listo: seleccione un paquete y trace su ruta sobre el mapa");
    });

    map.on("click", (event) => {
      if (!drawingRoute) return;
      setPackages((current) => current.map((pkg) => {
        if (pkg.id !== selectedPackageId) return pkg;
        let route = pkg.route;
        if (nextPointKind === "impacto") route = route.map((point) => point.kind === "impacto" ? { ...point, kind: "navegacion" as PointKind, name: "Punto de navegación" } : point);
        const point: RoutePoint = {
          id: crypto.randomUUID(),
          longitude: event.lngLat.lng,
          latitude: event.lngLat.lat,
          kind: nextPointKind,
          name: pointKindLabels[nextPointKind],
          altitudeFt: pkg.cruiseAltitudeFt,
        };
        return { ...pkg, route: [...route, point] };
      }));
    });

    mapRef.current = map;
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      routeMarkersRef.current.forEach((m) => m.remove());
      Object.values(siteMarkersRef.current).forEach((m) => m.remove());
      Object.values(orbitMarkersRef.current).forEach((m) => m.remove());
      aircraftMarkerRef.current?.remove();
      satelliteMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => { updateRouteSource(selectedPackage?.route ?? []); }, [selectedPackage?.route, updateRouteSource]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    coverages.forEach((coverage) => ["fill", "line"].forEach((suffix) => {
      const id = `${coverage.id}-${suffix}`;
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visible[coverage.id] ? "visible" : "none");
    }));
  }, [visible]);

  useEffect(() => {
    pointSites.forEach((site) => {
      const marker = siteMarkersRef.current[site.id];
      if (marker) marker.getElement().style.display = siteVisible[site.id] ? "flex" : "none";
    });
  }, [siteVisible]);

  useEffect(() => { const map = mapRef.current; if (map?.getSource("terrain")) map.setTerrain({ source: "terrain", exaggeration }); }, [exaggeration]);
  useEffect(() => { const map = mapRef.current; if (!map) return; coverages.forEach((coverage) => { const id = `${coverage.id}-fill`; if (map.getLayer(id)) map.setPaintProperty(id, "fill-opacity", opacity); }); }, [opacity]);

  useEffect(() => {
    Object.values(orbitMarkersRef.current).forEach((marker) => { marker.getElement().style.display = showH24 ? "block" : "none"; });
  }, [showH24]);

  useEffect(() => {
    const marker = satelliteMarkerRef.current;
    const map = mapRef.current;
    if (!marker || !map) return;
    marker.getElement().style.display = showSatellite ? "block" : "none";
    if (map.getLayer("satellite-track-line")) map.setLayoutProperty("satellite-track-line", "visibility", showSatellite ? "visible" : "none");
  }, [showSatellite]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    ["ton-wall-extrusion", "ton-wall-base-line"].forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", showTonWall ? "visible" : "none");
    });
    ["republic-walls-extrusion", "republic-walls-base-line"].forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", showRepublicWalls ? "visible" : "none");
    });
  }, [showTonWall, showRepublicWalls]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer("ton-wall-extrusion")) {
      map.setPaintProperty("ton-wall-extrusion", "fill-extrusion-height", wallHeightMeters);
      map.setPaintProperty("ton-wall-extrusion", "fill-extrusion-opacity", wallOpacity);
    }
    if (map.getLayer("republic-walls-extrusion")) {
      map.setPaintProperty("republic-walls-extrusion", "fill-extrusion-height", wallHeightMeters);
      map.setPaintProperty("republic-walls-extrusion", "fill-extrusion-opacity", wallOpacity * 0.9);
    }
  }, [wallHeightMeters, wallOpacity]);

  useEffect(() => {
    const route = selectedPackage?.route ?? [];
    const position = interpolateRoute(route, simulationProgress);
    const marker = aircraftMarkerRef.current;
    if (marker && position) {
      marker.setLngLat(position);
      marker.getElement().style.display = selectedPackage?.visible ? "block" : "none";
      marker.getElement().title = `${selectedPackage.name} · ${selectedPackage.quantity} ${selectedPackage.aircraft}`;
    } else if (marker) marker.getElement().style.display = "none";
  }, [selectedPackage, simulationProgress]);

  useEffect(() => {
    const awacs = orbitMarkersRef.current.awacs;
    const ew = orbitMarkersRef.current.ew;
    const angle = simulationProgress * Math.PI * 2;
    awacs?.setLngLat([-65.7 + Math.cos(angle) * 0.7, -29.8 + Math.sin(angle) * 0.22]);
    ew?.setLngLat([-66.5 + Math.cos(angle + Math.PI) * 0.55, -30.7 + Math.sin(angle + Math.PI) * 0.18]);
    setSatelliteProgress((simulationProgress * 1.7) % 1);
  }, [simulationProgress]);

  useEffect(() => {
    satelliteMarkerRef.current?.setLngLat([-70.2 + satelliteProgress * 7.7, -31 + satelliteProgress * 7.5]);
  }, [satelliteProgress]);

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationStartRef.current = null;
      return;
    }
    const durationMs = Math.max(5000, selectedHours * 3600 * 1000 / simulationSpeed);
    const tick = (now: number) => {
      if (animationStartRef.current === null) animationStartRef.current = now - simulationProgress * durationMs;
      const progress = Math.min(1, (now - animationStartRef.current) / durationMs);
      setSimulationProgress(progress);
      if (progress >= 1) {
        setIsPlaying(false);
        setStatus(impactPoint ? `Paquete finalizado. Impacto registrado en ${impactArrival}.` : "Paquete finalizado sin punto de impacto definido.");
        return;
      }
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isPlaying, selectedHours, simulationSpeed, impactPoint, impactArrival]);

  const saveScenario = () => {
    localStorage.setItem("zeus-simulator-moa1", JSON.stringify({ packages, savedAt: new Date().toISOString() }));
    setStatus("Modo de Acción N.º 1 guardado en este equipo");
  };
  const loadScenario = () => {
    const raw = localStorage.getItem("zeus-simulator-moa1");
    if (!raw) { setStatus("No hay una simulación guardada en este equipo"); return; }
    try {
      const parsed = JSON.parse(raw) as { packages?: MissionPackage[] };
      if (parsed.packages?.length) {
        setPackages(parsed.packages);
        setSelectedPackageId(parsed.packages[0].id);
        setStatus("Simulación guardada recuperada");
      }
    } catch { setStatus("El archivo de simulación guardado no es válido"); }
  };

  const addPackage = () => {
    const id = crypto.randomUUID();
    const next: MissionPackage = { ...initialPackages[0], id, name: `Paquete ${packages.length + 1}`, route: [] };
    setPackages((current) => [...current, next]);
    setSelectedPackageId(id);
  };

  const deleteLastPoint = () => updatePackage({ route: selectedPackage.route.slice(0, -1) });
  const clearRoute = () => { setSimulationProgress(0); setIsPlaying(false); updatePackage({ route: [] }); };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-slate-900 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-300">A3 · MODO DE ACCIÓN N.º 1</p>
          <h1 className="text-2xl font-bold">Simulador de paquetes aéreos sobre relieve 3D</h1>
          <p className="text-sm text-slate-300">Fase II · Momento I Ofensiva · trazado libre 2D y ejecución temporal.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/espacio/${workspaceCode}/${token}`} className="rounded bg-slate-700 px-3 py-2">Mapa 2D</Link>
          <Link href={`/espacio/${workspaceCode}/${token}/ppc/pcr`} className="rounded bg-violet-700 px-3 py-2">PCR</Link>
          <Link href={`/espacio/${workspaceCode}/${token}/ppc/computo-aereo`} className="rounded bg-cyan-700 px-3 py-2">Cómputo Aéreo</Link>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-100px)] lg:grid-cols-[1fr_390px]">
        <div ref={mapContainerRef} className="min-h-[780px] w-full" />
        <aside className="overflow-y-auto border-l border-slate-700 bg-slate-900 p-4 lg:max-h-[calc(100vh-100px)]">
          <p className="mb-4 rounded border border-emerald-800 bg-emerald-950/40 p-2 text-sm text-emerald-200">{status}</p>

          <div className="mb-4 rounded border border-slate-700 bg-slate-950/60 p-3">
            <div className="text-center text-xs font-bold text-slate-300">P ─ M ─ A (Alerta Estratégica) ─ D ─ D+1 ─ D+9 ─ D+10</div>
            <div className="mt-2 text-center text-sm font-bold text-amber-300">FASE II · MOMENTO I — OFENSIVA</div>
          </div>

          <h2 className="mb-2 font-bold">Paquetes</h2>
          <select value={selectedPackageId} onChange={(e) => { setSelectedPackageId(e.target.value); setSimulationProgress(0); setIsPlaying(false); }} className="mb-2 w-full rounded bg-slate-800 p-2">
            {packages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name}</option>)}
          </select>
          <div className="mb-4 grid grid-cols-3 gap-2 text-xs">
            <button onClick={addPackage} className="rounded bg-blue-700 p-2">+ Paquete</button>
            <button onClick={saveScenario} className="rounded bg-emerald-700 p-2">Guardar</button>
            <button onClick={loadScenario} className="rounded bg-slate-700 p-2">Recuperar</button>
          </div>

          <div className="space-y-3 rounded border border-slate-700 p-3">
            <label className="block text-xs">Nombre<input value={selectedPackage.name} onChange={(e) => updatePackage({ name: e.target.value })} className="mt-1 w-full rounded bg-slate-800 p-2 text-sm" /></label>
            <label className="block text-xs">Aeronave<select value={selectedPackage.aircraft} onChange={(e) => { const values = aircraftDefaults[e.target.value]; updatePackage({ aircraft: e.target.value, speedKt: values.speedKt, cruiseAltitudeFt: values.altitudeFt }); }} className="mt-1 w-full rounded bg-slate-800 p-2 text-sm">{Object.keys(aircraftDefaults).map((name) => <option key={name}>{name}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs">Cantidad<input type="number" min="1" value={selectedPackage.quantity} onChange={(e) => updatePackage({ quantity: Number(e.target.value) })} className="mt-1 w-full rounded bg-slate-800 p-2 text-center" /></label>
              <label className="block text-xs">Velocidad (kt)<input type="number" min="1" value={selectedPackage.speedKt} onChange={(e) => updatePackage({ speedKt: Number(e.target.value) })} className="mt-1 w-full rounded bg-slate-800 p-2 text-center" /></label>
              <label className="block text-xs">Altura (ft)<input type="number" min="0" value={selectedPackage.cruiseAltitudeFt} onChange={(e) => updatePackage({ cruiseAltitudeFt: Number(e.target.value) })} className="mt-1 w-full rounded bg-slate-800 p-2 text-center" /></label>
              <label className="block text-xs">Salida<input type="time" value={selectedPackage.departureTime} onChange={(e) => updatePackage({ departureTime: e.target.value })} className="mt-1 w-full rounded bg-slate-800 p-2 text-center" /></label>
            </div>
            <label className="block text-xs">Armamento<input value={selectedPackage.weapon} onChange={(e) => updatePackage({ weapon: e.target.value })} className="mt-1 w-full rounded bg-slate-800 p-2 text-sm" /></label>
            <label className="block text-xs">Armas por aeronave<input type="number" min="0" value={selectedPackage.weaponsPerAircraft} onChange={(e) => updatePackage({ weaponsPerAircraft: Number(e.target.value) })} className="mt-1 w-full rounded bg-slate-800 p-2 text-center" /></label>
          </div>

          <h2 className="mb-2 mt-5 font-bold">Trazado de ruta 2D</h2>
          <select value={nextPointKind} onChange={(e) => setNextPointKind(e.target.value as PointKind)} className="mb-2 w-full rounded bg-slate-800 p-2">
            {Object.entries(pointKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button onClick={() => setDrawingRoute((v) => !v)} className={`mb-2 w-full rounded p-3 font-bold ${drawingRoute ? "bg-amber-500 text-slate-950" : "bg-teal-700"}`}>{drawingRoute ? "Finalizar trazado" : "Trazar ruta: hacer clic en el mapa"}</button>
          <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
            <button onClick={deleteLastPoint} disabled={!selectedPackage.route.length} className="rounded bg-slate-700 p-2 disabled:opacity-40">Quitar último</button>
            <button onClick={clearRoute} className="rounded bg-red-900 p-2">Limpiar ruta</button>
          </div>

          <div className="max-h-44 space-y-1 overflow-y-auto rounded border border-slate-700 p-2 text-xs">
            {!selectedPackage.route.length && <p className="text-slate-400">Todavía no hay puntos. Seleccione un tipo y haga clic en el mapa.</p>}
            {selectedPackage.route.map((point, index) => (
              <div key={point.id} className={`grid grid-cols-[28px_1fr_90px] items-center gap-1 rounded p-1 ${point.kind === "impacto" ? "bg-red-900/60" : "bg-slate-800"}`}>
                <span className="text-center font-bold">{point.kind === "impacto" ? "💥" : index + 1}</span>
                <select value={point.kind} onChange={(e) => {
                  const kind = e.target.value as PointKind;
                  updatePackage({ route: selectedPackage.route.map((p) => p.id === point.id ? { ...p, kind, name: pointKindLabels[kind] } : kind === "impacto" && p.kind === "impacto" ? { ...p, kind: "navegacion", name: pointKindLabels.navegacion } : p) });
                }} className="rounded bg-slate-700 p-1">
                  {Object.entries(pointKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input type="number" value={point.altitudeFt} onChange={(e) => updatePackage({ route: selectedPackage.route.map((p) => p.id === point.id ? { ...p, altitudeFt: Number(e.target.value) } : p) })} className="rounded bg-slate-700 p-1 text-center" title="Altura en pies" />
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded border border-amber-700 bg-amber-950/30 p-3 text-xs">
            <div><span className="text-slate-400">Distancia total</span><strong className="block text-lg">{selectedDistance.toFixed(1)} NM</strong></div>
            <div><span className="text-slate-400">Duración estimada</span><strong className="block text-lg">{formatDuration(selectedHours)}</strong></div>
            <div><span className="text-slate-400">Distancia al impacto</span><strong className="block text-lg">{impactPoint ? `${distanceToImpact.toFixed(1)} NM` : "—"}</strong></div>
            <div><span className="text-slate-400">Hora de impacto</span><strong className="block text-lg">{impactArrival}</strong></div>
          </div>

          <h2 className="mb-2 mt-5 font-bold">Control temporal del paquete</h2>
          <input type="range" min="0" max="1" step="0.001" value={simulationProgress} onChange={(e) => { setIsPlaying(false); setSimulationProgress(Number(e.target.value)); }} className="w-full" />
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <button onClick={() => { setSimulationProgress(0); setIsPlaying(false); }} className="rounded bg-slate-700 p-2">Reiniciar</button>
            <button onClick={() => setIsPlaying((v) => !v)} disabled={selectedPackage.route.length < 2} className="rounded bg-emerald-700 p-2 disabled:opacity-40">{isPlaying ? "Pausar" : "Reproducir"}</button>
            <select value={simulationSpeed} onChange={(e) => setSimulationSpeed(Number(e.target.value))} className="rounded bg-slate-700 p-2 text-center"><option value="1">1×</option><option value="5">5×</option><option value="10">10×</option><option value="30">30×</option><option value="60">60×</option></select>
          </div>

          <h2 className="mb-2 mt-5 font-bold">Capas de simulación</h2>
          <label className="mb-2 flex items-center gap-2 rounded border border-slate-700 p-2 text-sm"><input type="checkbox" checked={showH24} onChange={(e) => setShowH24(e.target.checked)} />Aeronaves H24 en órbita</label>
          <label className="mb-2 flex items-center gap-2 rounded border border-slate-700 p-2 text-sm"><input type="checkbox" checked={showSatellite} onChange={(e) => setShowSatellite(e.target.checked)} />Satélite y trayectoria orbital</label>
          <label className="mb-2 flex items-center gap-2 rounded border border-slate-700 p-2 text-sm"><input type="checkbox" checked={selectedPackage.visible} onChange={(e) => updatePackage({ visible: e.target.checked })} />Mostrar paquete seleccionado</label>

          <details open className="mt-4 rounded border border-cyan-800 bg-cyan-950/20 p-3">
            <summary className="cursor-pointer font-bold text-cyan-200">Límites 3D de la campaña</summary>
            <p className="mt-2 text-xs text-slate-300">Muros traslúcidos que siguen los contornos del Teatro de Operaciones y de las repúblicas, sin nombres ni rótulos sobre el relieve.</p>
            <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={showTonWall} onChange={(e) => setShowTonWall(e.target.checked)} />Límite vertical del TON</label>
            <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={showRepublicWalls} onChange={(e) => setShowRepublicWalls(e.target.checked)} />Fronteras entre repúblicas</label>
            <label className="mt-3 block text-sm font-bold">Altura de las barreras: {(wallHeightMeters / 1000).toFixed(1)} km<input type="range" min="3000" max="15000" step="500" value={wallHeightMeters} onChange={(e) => setWallHeightMeters(Number(e.target.value))} className="mt-2 w-full" /></label>
            <label className="mt-3 block text-sm font-bold">Transparencia: {Math.round(wallOpacity * 100)} %<input type="range" min="0.1" max="0.6" step="0.02" value={wallOpacity} onChange={(e) => setWallOpacity(Number(e.target.value))} className="mt-2 w-full" /></label>
          </details>

          <details className="mt-4 rounded border border-slate-700 p-3">
            <summary className="cursor-pointer font-bold">Relieve, radares y S-300</summary>
            <label className="mt-3 block text-sm font-bold">Exageración vertical: {exaggeration.toFixed(1)}×<input type="range" min="1" max="8" step="0.1" value={exaggeration} onChange={(e) => setExaggeration(Number(e.target.value))} className="mt-2 w-full" /></label>
            <label className="mt-3 block text-sm font-bold">Opacidad: {Math.round(opacity * 100)} %<input type="range" min="0.08" max="0.75" step="0.01" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="mt-2 w-full" /></label>
            {pointSites.map((site) => <label key={site.id} className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={siteVisible[site.id]} onChange={(e) => setSiteVisible((current) => ({ ...current, [site.id]: e.target.checked }))} />{site.name}</label>)}
            {coverages.map((coverage) => <label key={coverage.id} className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={visible[coverage.id]} onChange={(e) => setVisible((current) => ({ ...current, [coverage.id]: e.target.checked }))} />{coverage.name}</label>)}
          </details>
        </aside>
      </div>
    </main>
  );
}
