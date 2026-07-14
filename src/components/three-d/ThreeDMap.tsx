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
  phase: CampaignPhase;
  baseId: string;
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



type CampaignPhase = "fase-1" | "fase-2" | "fase-3" | "fase-4";

type BaseSite = {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  altitudeMeters: number;
  side: Side;
  aircraft?: string[];
};

type H24Platform = {
  id: string;
  name: string;
  aircraft: string;
  speedKt: number;
  altitudeFt: number;
  visible: boolean;
  showRoute: boolean;
  closed: boolean;
  route: RoutePoint[];
};

type EnemyAsset = {
  id: string;
  name: string;
  kind: "s300" | "radar" | "runway";
  longitude: number;
  latitude: number;
  altitudeMeters: number;
  headingDeg?: number;
  lengthMeters?: number;
  widthMeters?: number;
};

type Coverage = {
  id: string;
  name: string;
  url: string;
  side: Side;
  kind: "radar" | "s300";
  color: string;
};



const campaignPhases: Array<{ id: CampaignPhase; short: string; title: string; period: string; detail: string }> = [
  { id: "fase-1", short: "I", title: "Preparación", period: "P–M–A–D", detail: "Concepción, preparación, movilización y alerta estratégica." },
  { id: "fase-2", short: "II", title: "Tomar la iniciativa", period: "D–D+1", detail: "Apertura, SEAD, OCA y obtención del grado de control aeroespacial." },
  { id: "fase-3", short: "III", title: "Dominar", period: "D+2–D+9", detail: "Ataques estratégicos, reataques, BDA y sostenimiento del control." },
  { id: "fase-4", short: "IV", title: "Estabilización", period: "D+10–repliegue", detail: "Reorganización, transición y repliegue de las fuerzas." },
];

const bases3D: BaseSite[] = [
  { id: "base-la-rioja", name: "1.º Brigada Aérea / La Rioja", longitude: -66.793409, latitude: -29.376201, altitudeMeters: 438, side: "propio", aircraft: ["C-130J", "KC-130J", "LJ-60", "DHC-6"] },
  { id: "base-villa-mercedes", name: "2.º Brigada Aérea / Villa Mercedes", longitude: -65.370632, latitude: -33.738415, altitudeMeters: 485, side: "propio", aircraft: ["F-16C Block 40", "AMX A-1M", "T-6 TEXAN II", "HERMES 450"] },
  { id: "base-cordoba", name: "3.º Brigada Aérea / Córdoba", longitude: -64.207857, latitude: -31.319799, altitudeMeters: 489, side: "propio", aircraft: ["AMX A-1M", "E-99M ERIEYE", "KC-135"] },
  { id: "base-mendoza", name: "4.º Brigada Aérea / Mendoza", longitude: -68.84, latitude: -32.89, altitudeMeters: 704, side: "propio", aircraft: ["F-16C Block 40", "F-16D Block 42", "KC-135"] },
  { id: "base-general-acha", name: "5.º Brigada Aérea / General Acha", longitude: -64.639206, latitude: -37.425428, altitudeMeters: 277, side: "propio", aircraft: ["F-16CJ Block 50", "IAI HARPY", "EC-130H COMPASS CALL", "HERMES 450"] },
  { id: "base-malargue", name: "Base Aérea Militar Malargüe", longitude: -69.58, latitude: -35.47, altitudeMeters: 1425, side: "propio" },
  { id: "enemy-resistencia", name: "Ala Aérea n.º 1 / Resistencia", longitude: -58.99, latitude: -27.45, altitudeMeters: 52, side: "enemigo" },
  { id: "enemy-saenz-pena", name: "Ala Aérea n.º 2 / Sáenz Peña", longitude: -60.44, latitude: -26.79, altitudeMeters: 92, side: "enemigo" },
  { id: "enemy-salta", name: "Ala Aérea n.º 3 / Salta", longitude: -65.49, latitude: -24.86, altitudeMeters: 1246, side: "enemigo" },
  { id: "enemy-catamarca", name: "Ala Aérea n.º 4 / Catamarca", longitude: -65.75, latitude: -28.6, altitudeMeters: 454, side: "enemigo" },
  { id: "enemy-tucuman", name: "Ala Aérea n.º 5 / Tucumán", longitude: -65.1, latitude: -26.84, altitudeMeters: 456, side: "enemigo" },
  { id: "enemy-formosa", name: "Ala Aérea n.º 6 / Formosa", longitude: -58.23, latitude: -26.21, altitudeMeters: 59, side: "enemigo" },
  { id: "enemy-belen", name: "Ala Aérea n.º 7 / Belén", longitude: -67.03, latitude: -27.65, altitudeMeters: 1260, side: "enemigo" },
  { id: "enemy-tartagal", name: "Ala Aérea n.º 8 / Tartagal", longitude: -63.82, latitude: -22.52, altitudeMeters: 450, side: "enemigo" },
  { id: "enemy-las-lomitas", name: "Ala Aérea n.º 9 / Las Lomitas", longitude: -60.551518, latitude: -24.730022, altitudeMeters: 130, side: "enemigo" },
];

const enemyAssets: EnemyAsset[] = [
  { id: "s300-belen-site", name: "S-300 ALFA / Belén", kind: "s300", longitude: -67.03, latitude: -27.65, altitudeMeters: 1260 },
  { id: "s300-catamarca-site", name: "S-300 BRAVO / Catamarca", kind: "s300", longitude: -65.75, latitude: -28.6, altitudeMeters: 454 },
  { id: "s300-salta-site", name: "S-300 CHARLY / Salta", kind: "s300", longitude: -65.49, latitude: -24.86, altitudeMeters: 1246 },
  { id: "s300-lomitas-site", name: "S-300 DELTA / Las Lomitas", kind: "s300", longitude: -60.551518, latitude: -24.730022, altitudeMeters: 130 },
  { id: "radar-cafayate-site", name: "Radar enemigo / Cafayate", kind: "radar", longitude: -65.925964, latitude: -26.062598, altitudeMeters: 1683 },
  { id: "radar-oran-site", name: "Radar enemigo / Orán", kind: "radar", longitude: -64.375962, latitude: -23.15641, altitudeMeters: 337 },
  { id: "radar-lomitas-site", name: "Radar enemigo / Las Lomitas", kind: "radar", longitude: -60.551518, latitude: -24.730022, altitudeMeters: 130 },
  { id: "runway-salta", name: "Pista Ala Aérea n.º 3 / Salta", kind: "runway", longitude: -65.49, latitude: -24.86, altitudeMeters: 1246, headingDeg: 20, lengthMeters: 3000, widthMeters: 45 },
  { id: "runway-catamarca", name: "Pista Ala Aérea n.º 4 / Catamarca", kind: "runway", longitude: -65.75, latitude: -28.6, altitudeMeters: 454, headingDeg: 15, lengthMeters: 2800, widthMeters: 45 },
  { id: "runway-tucuman", name: "Pista Ala Aérea n.º 5 / Tucumán", kind: "runway", longitude: -65.1, latitude: -26.84, altitudeMeters: 456, headingDeg: 20, lengthMeters: 2900, widthMeters: 45 },
  { id: "runway-belen", name: "Pista Ala Aérea n.º 7 / Belén", kind: "runway", longitude: -67.03, latitude: -27.65, altitudeMeters: 1260, headingDeg: 5, lengthMeters: 2200, widthMeters: 35 },
];

const initialH24Platforms: H24Platform[] = [
  { id: "h24-awacs", name: "AWACS H24", aircraft: "E-99M ERIEYE", speedKt: 400, altitudeFt: 28000, visible: true, showRoute: true, closed: true, route: [] },
  { id: "h24-ew", name: "Guerra electrónica H24", aircraft: "EC-130H COMPASS CALL", speedKt: 300, altitudeFt: 25000, visible: true, showRoute: true, closed: true, route: [] },
];

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
    phase: "fase-2",
    baseId: "base-cordoba",
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

function metersToDegrees(latitude: number, eastMeters: number, northMeters: number) {
  const lat = northMeters / 111320;
  const lon = eastMeters / (111320 * Math.cos((latitude * Math.PI) / 180));
  return [lon, lat] as [number, number];
}

function orientedRectangle(asset: EnemyAsset) {
  const length = asset.lengthMeters ?? (asset.kind === "runway" ? 2600 : asset.kind === "s300" ? 90 : 45);
  const width = asset.widthMeters ?? (asset.kind === "runway" ? 45 : asset.kind === "s300" ? 55 : 25);
  const angle = ((asset.headingDeg ?? 0) * Math.PI) / 180;
  const corners = [[-width / 2, -length / 2], [width / 2, -length / 2], [width / 2, length / 2], [-width / 2, length / 2], [-width / 2, -length / 2]];
  return corners.map(([x, y]) => {
    const east = x * Math.cos(angle) + y * Math.sin(angle);
    const north = -x * Math.sin(angle) + y * Math.cos(angle);
    const [dlon, dlat] = metersToDegrees(asset.latitude, east, north);
    return [asset.longitude + dlon, asset.latitude + dlat];
  });
}

function aircraftGlyph(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("f-16")) return "F-16";
  if (normalized.includes("amx")) return "AMX";
  if (normalized.includes("e-99")) return "E99";
  if (normalized.includes("kc-135")) return "K135";
  if (normalized.includes("130")) return "C130";
  if (normalized.includes("hermes")) return "UAV";
  if (normalized.includes("harpy")) return "HARPY";
  return "AC";
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
  const baseMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const assetMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const routeMarkersRef = useRef<maplibregl.Marker[]>([]);
  const aircraftMarkerRef = useRef<maplibregl.Marker | null>(null);
  const orbitMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const h24MarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const satelliteMarkerRef = useRef<maplibregl.Marker | null>(null);
  const animationRef = useRef<number | null>(null);
  const animationStartRef = useRef<number | null>(null);
  const continuousAnimationRef = useRef<number | null>(null);
  const continuousStartRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);
  const latestScenarioRef = useRef<Record<string, unknown>>({});
  const drawingRouteRef = useRef(false);
  const drawingH24RouteRef = useRef(false);
  const selectedPackageIdRef = useRef(initialPackages[0].id);
  const selectedH24IdRef = useRef(initialH24Platforms[0].id);
  const nextPointKindRef = useRef<PointKind>("navegacion");

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
  const [showTonWall, setShowTonWall] = useState(true);
  const [showRepublicWalls, setShowRepublicWalls] = useState(true);
  const [wallOpacity, setWallOpacity] = useState(0.3);
  const [tonWallHeightMeters, setTonWallHeightMeters] = useState(30000);
  const [republicWallHeightMeters, setRepublicWallHeightMeters] = useState(20000);
  const [selectedPhase, setSelectedPhase] = useState<CampaignPhase>("fase-2");
  const [showOwnBases, setShowOwnBases] = useState(true);
  const [showEnemyBases, setShowEnemyBases] = useState(true);
  const [showEnemyAssets, setShowEnemyAssets] = useState(true);
  const [showReferenceMarkers, setShowReferenceMarkers] = useState(true);
  const [h24Platforms, setH24Platforms] = useState<H24Platform[]>(initialH24Platforms);
  const [selectedH24Id, setSelectedH24Id] = useState(initialH24Platforms[0].id);
  const [drawingH24Route, setDrawingH24Route] = useState(false);
  const [showPhaseOnly, setShowPhaseOnly] = useState(true);
  const [aircraftScaleMode, setAircraftScaleMode] = useState<"dynamic" | "fixed">("dynamic");
  const [mapBearing, setMapBearing] = useState(-24);
  const [mapPitch, setMapPitch] = useState(72);
  const [satelliteLoopSeconds, setSatelliteLoopSeconds] = useState(75);

  const phasePackages = useMemo(() => showPhaseOnly ? packages.filter((item) => item.phase === selectedPhase) : packages, [packages, selectedPhase, showPhaseOnly]);
  const selectedPackage = packages.find((item) => item.id === selectedPackageId) ?? phasePackages[0] ?? packages[0];
  const selectedH24 = h24Platforms.find((item) => item.id === selectedH24Id) ?? h24Platforms[0];
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

  useEffect(() => { drawingRouteRef.current = drawingRoute; }, [drawingRoute]);
  useEffect(() => { drawingH24RouteRef.current = drawingH24Route; }, [drawingH24Route]);
  useEffect(() => { selectedPackageIdRef.current = selectedPackageId; }, [selectedPackageId]);
  useEffect(() => { selectedH24IdRef.current = selectedH24Id; }, [selectedH24Id]);
  useEffect(() => { nextPointKindRef.current = nextPointKind; }, [nextPointKind]);
  useEffect(() => {
    if (showPhaseOnly && selectedPackage?.phase !== selectedPhase) {
      const first = packages.find((item) => item.phase === selectedPhase);
      if (first) setSelectedPackageId(first.id);
    }
  }, [selectedPhase, showPhaseOnly, packages, selectedPackage?.phase]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      center: [-67.1, -27.7],
      zoom: 5.5,
      pitch: 72,
      bearing: -24,
      maxPitch: 85,
      dragRotate: true,
      touchPitch: true,
      keyboard: true,
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
    map.addControl(new maplibregl.FullscreenControl(), "top-left");
    map.addControl(new maplibregl.ScaleControl({ unit: "nautical" }), "bottom-left");
    map.on("rotate", () => setMapBearing(Math.round(map.getBearing() * 10) / 10));
    map.on("pitch", () => setMapPitch(Math.round(map.getPitch() * 10) / 10));
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
          "fill-extrusion-height": tonWallHeightMeters,
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
          "fill-extrusion-height": republicWallHeightMeters,
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": wallOpacity * 0.9,
          "fill-extrusion-vertical-gradient": true,
        },
      });
      map.addLayer({ id: "republic-walls-base-line", type: "line", source: "republic-walls", paint: { "line-color": "#fde68a", "line-width": 1.5, "line-opacity": 0.8 } });

      map.addSource("enemy-assets-3d", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: enemyAssets.map((asset) => ({
            type: "Feature",
            properties: { id: asset.id, name: asset.name, kind: asset.kind, height: asset.kind === "runway" ? 1.2 : asset.kind === "s300" ? 16 : 22, color: asset.kind === "runway" ? "#64748b" : asset.kind === "s300" ? "#991b1b" : "#f97316" },
            geometry: { type: "Polygon", coordinates: [orientedRectangle(asset)] },
          })),
        },
      });
      map.addLayer({
        id: "enemy-assets-extrusion",
        type: "fill-extrusion",
        source: "enemy-assets-3d",
        paint: {
          "fill-extrusion-color": ["get", "color"],
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.9,
        },
      });
      map.addLayer({ id: "enemy-assets-outline", type: "line", source: "enemy-assets-3d", paint: { "line-color": "#f8fafc", "line-width": 1.2, "line-opacity": 0.75 } });

      initialH24Platforms.forEach((platform) => {
        map.addSource(`h24-route-${platform.id}`, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({ id: `h24-route-line-${platform.id}`, type: "line", source: `h24-route-${platform.id}`, paint: { "line-color": platform.id === "h24-awacs" ? "#22d3ee" : "#a78bfa", "line-width": 3, "line-dasharray": [2, 1.5] } });
      });

      bases3D.forEach((base) => {
        const element = document.createElement("button");
        element.type = "button";
        element.title = base.name;
        element.innerHTML = `<span style="display:block;font-size:10px;font-weight:900;line-height:10px">${base.side === "propio" ? "A" : "E"}</span><span style="display:block;font-size:16px;line-height:14px">✈</span>`;
        Object.assign(element.style, { width: "34px", height: "34px", borderRadius: "3px", border: `3px solid ${base.side === "propio" ? "#60a5fa" : "#fb923c"}`, background: "#f8fafc", color: base.side === "propio" ? "#1d4ed8" : "#c2410c", cursor: "pointer", boxShadow: "0 0 0 2px rgba(15,23,42,.9),0 4px 12px rgba(0,0,0,.6)" });
        const popup = new maplibregl.Popup({ offset: 18 }).setHTML(`<div style="min-width:250px;color:#0f172a"><strong>${base.name}</strong><br/><strong>Bando:</strong> ${base.side}<br/><strong>Coordenadas:</strong> ${base.latitude.toFixed(6)}, ${base.longitude.toFixed(6)}<br/><strong>Altura:</strong> ${base.altitudeMeters.toLocaleString("es-AR")} m s. n. m.<br/>${base.aircraft?.length ? `<strong>Medios:</strong> ${base.aircraft.join(", ")}<br/>` : ""}<em>Seleccione “Usar como base de salida” desde el panel.</em></div>`);
        baseMarkersRef.current[base.id] = new maplibregl.Marker({ element, anchor: "bottom" }).setLngLat([base.longitude, base.latitude]).setPopup(popup).addTo(map);
      });

      enemyAssets.forEach((asset) => {
        const element = document.createElement("div");
        element.title = asset.name;
        element.innerHTML = `<div style="height:72px;width:2px;background:linear-gradient(to top,rgba(248,250,252,.1),rgba(248,250,252,.9));margin:0 auto"></div><div style="transform:translateX(-50%);white-space:nowrap;border:2px solid #fff;background:${asset.kind === "runway" ? "#475569" : asset.kind === "s300" ? "#991b1b" : "#c2410c"};color:#fff;border-radius:999px;padding:3px 7px;font-size:10px;font-weight:900">${asset.kind === "runway" ? "PISTA" : asset.kind === "s300" ? "S-300" : "RADAR"}</div>`;
        Object.assign(element.style, { display: "block", cursor: "pointer", filter: "drop-shadow(0 2px 3px #000)" });
        assetMarkersRef.current[asset.id] = new maplibregl.Marker({ element, anchor: "bottom" }).setLngLat([asset.longitude, asset.latitude]).setPopup(new maplibregl.Popup({ offset: 76 }).setHTML(`<div style="color:#0f172a"><strong>${asset.name}</strong><br/>Objeto 3D a escala aproximada para selección de blanco.<br/><strong>Coordenadas:</strong> ${asset.latitude.toFixed(6)}, ${asset.longitude.toFixed(6)}<br/><strong>Altura:</strong> ${asset.altitudeMeters.toLocaleString("es-AR")} m s. n. m.</div>`)).addTo(map);
      });

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
      aircraftElement.innerHTML = `<div data-aircraft-body style="width:58px;height:26px;clip-path:polygon(50% 0,59% 34%,100% 58%,64% 64%,58% 100%,50% 78%,42% 100%,36% 64%,0 58%,41% 34%);background:linear-gradient(135deg,#f8fafc,#64748b 48%,#0f172a);border:1px solid rgba(255,255,255,.8);filter:drop-shadow(0 4px 5px #000);transform:perspective(90px) rotateX(52deg)"></div><div data-aircraft-label style="margin-top:-4px;text-align:center;font-size:9px;font-weight:900;color:#fde047;text-shadow:0 1px 3px #000">F-16</div>`;
      Object.assign(aircraftElement.style, { display: "none", transformOrigin: "center center" });
      aircraftMarkerRef.current = new maplibregl.Marker({ element: aircraftElement, anchor: "center" }).setLngLat([-64.2, -31.3]).addTo(map);

      const satelliteElement = document.createElement("div");
      satelliteElement.textContent = "🛰️";
      Object.assign(satelliteElement.style, { fontSize: "34px", filter: "drop-shadow(0 2px 4px #000)" });
      satelliteMarkerRef.current = new maplibregl.Marker({ element: satelliteElement, anchor: "center" }).setLngLat([-70.2, -31]).addTo(map);

      initialH24Platforms.forEach((platform) => {
        const element = document.createElement("div");
        element.innerHTML = `<div style="width:48px;height:22px;clip-path:polygon(50% 0,59% 34%,100% 58%,64% 64%,58% 100%,50% 78%,42% 100%,36% 64%,0 58%,41% 34%);background:${platform.id === "h24-awacs" ? "linear-gradient(135deg,#cffafe,#0891b2)" : "linear-gradient(135deg,#ede9fe,#7c3aed)"};filter:drop-shadow(0 3px 4px #000);transform:perspective(80px) rotateX(50deg)"></div><div style="font-size:9px;font-weight:900;text-align:center;color:#fff;text-shadow:0 1px 3px #000">${aircraftGlyph(platform.aircraft)}</div>`;
        element.title = platform.name;
        h24MarkersRef.current[platform.id] = new maplibregl.Marker({ element, anchor: "center" }).setLngLat(platform.id === "h24-awacs" ? [-65.7, -29.8] : [-66.5, -30.7]).addTo(map);
      });

      setStatus("Simulador listo: seleccione una fase, una base y trace las rutas sobre el mapa");
    });

    map.on("click", (event) => {
      if (drawingH24RouteRef.current) {
        setH24Platforms((current) => current.map((platform) => platform.id === selectedH24IdRef.current ? { ...platform, route: [...platform.route, { id: crypto.randomUUID(), longitude: event.lngLat.lng, latitude: event.lngLat.lat, kind: "navegacion", name: "Punto de órbita", altitudeFt: platform.altitudeFt }] } : platform));
        return;
      }
      if (!drawingRouteRef.current) return;
      setPackages((current) => current.map((pkg) => {
        if (pkg.id !== selectedPackageIdRef.current) return pkg;
        let route = pkg.route;
        if (nextPointKindRef.current === "impacto") route = route.map((point) => point.kind === "impacto" ? { ...point, kind: "navegacion" as PointKind, name: "Punto de navegación" } : point);
        const point: RoutePoint = {
          id: crypto.randomUUID(),
          longitude: event.lngLat.lng,
          latitude: event.lngLat.lat,
          kind: nextPointKindRef.current,
          name: pointKindLabels[nextPointKindRef.current],
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
      Object.values(h24MarkersRef.current).forEach((m) => m.remove());
      Object.values(baseMarkersRef.current).forEach((m) => m.remove());
      Object.values(assetMarkersRef.current).forEach((m) => m.remove());
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
    h24Platforms.forEach((platform) => {
      const marker = h24MarkersRef.current[platform.id];
      if (marker) marker.getElement().style.display = showH24 && platform.visible ? "block" : "none";
      const map = mapRef.current;
      const layerId = `h24-route-line-${platform.id}`;
      if (map?.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", showH24 && platform.showRoute ? "visible" : "none");
    });
  }, [showH24, h24Platforms]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    h24Platforms.forEach((platform) => {
      const source = map.getSource(`h24-route-${platform.id}`) as maplibregl.GeoJSONSource | undefined;
      const route = platform.route.length >= 2 ? (platform.closed ? [...platform.route, platform.route[0]] : platform.route) : [];
      source?.setData({ type: "FeatureCollection", features: route.length >= 2 ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route.map((point) => [point.longitude, point.latitude]) } }] : [] });
    });
  }, [h24Platforms]);

  useEffect(() => {
    bases3D.forEach((base) => {
      const marker = baseMarkersRef.current[base.id];
      if (marker) marker.getElement().style.display = base.side === "propio" ? (showOwnBases ? "block" : "none") : (showEnemyBases ? "block" : "none");
    });
  }, [showOwnBases, showEnemyBases]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.getLayer("enemy-assets-extrusion")) map.setLayoutProperty("enemy-assets-extrusion", "visibility", showEnemyAssets ? "visible" : "none");
    if (map?.getLayer("enemy-assets-outline")) map.setLayoutProperty("enemy-assets-outline", "visibility", showEnemyAssets ? "visible" : "none");
    Object.values(assetMarkersRef.current).forEach((marker) => { marker.getElement().style.display = showEnemyAssets && showReferenceMarkers ? "block" : "none"; });
  }, [showEnemyAssets, showReferenceMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = aircraftMarkerRef.current;
    if (!map || !marker) return;
    const applyScale = () => {
      const zoom = map.getZoom();
      const scale = aircraftScaleMode === "dynamic" ? Math.max(0.65, Math.min(1.8, 0.55 + zoom * 0.13)) : 1;
      marker.getElement().style.transform = `scale(${scale})`;
      Object.values(h24MarkersRef.current).forEach((m) => { m.getElement().style.transform = `scale(${Math.max(0.6, scale * 0.88)})`; });
    };
    applyScale();
    map.on("zoom", applyScale);
    return () => { map.off("zoom", applyScale); };
  }, [aircraftScaleMode]);

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
      map.setPaintProperty("ton-wall-extrusion", "fill-extrusion-height", tonWallHeightMeters);
      map.setPaintProperty("ton-wall-extrusion", "fill-extrusion-opacity", wallOpacity);
    }
    if (map.getLayer("republic-walls-extrusion")) {
      map.setPaintProperty("republic-walls-extrusion", "fill-extrusion-height", republicWallHeightMeters);
      map.setPaintProperty("republic-walls-extrusion", "fill-extrusion-opacity", wallOpacity * 0.9);
    }
  }, [tonWallHeightMeters, republicWallHeightMeters, wallOpacity]);

  useEffect(() => {
    const route = selectedPackage?.route ?? [];
    const position = interpolateRoute(route, simulationProgress);
    const marker = aircraftMarkerRef.current;
    if (marker && position) {
      marker.setLngLat(position);
      marker.getElement().style.display = selectedPackage?.visible ? "block" : "none";
      marker.getElement().title = `${selectedPackage.name} · ${selectedPackage.quantity} ${selectedPackage.aircraft}`;
      const label = marker.getElement().querySelector("[data-aircraft-label]");
      if (label) label.textContent = aircraftGlyph(selectedPackage.aircraft);
    } else if (marker) marker.getElement().style.display = "none";
  }, [selectedPackage, simulationProgress]);

  useEffect(() => {
    const tick = (now: number) => {
      if (continuousStartRef.current === null) continuousStartRef.current = now;
      const elapsedSeconds = (now - continuousStartRef.current) / 1000;

      h24Platforms.forEach((platform, index) => {
        const marker = h24MarkersRef.current[platform.id];
        if (!marker) return;
        const route = platform.route.length >= 2 ? (platform.closed ? [...platform.route, platform.route[0]] : platform.route) : [];
        const distanceNm = routeDistanceNm(route);
        if (route.length < 2 || distanceNm <= 0 || platform.speedKt <= 0) return;
        const cycleSeconds = Math.max(8, (distanceNm / platform.speedKt) * 3600);
        const progress = ((elapsedSeconds / cycleSeconds) + index * 0.17) % 1;
        const position = interpolateRoute(route, progress);
        if (position) marker.setLngLat(position);
      });

      const satelliteProgressNow = (elapsedSeconds / Math.max(10, satelliteLoopSeconds)) % 1;
      satelliteMarkerRef.current?.setLngLat([-70.2 + satelliteProgressNow * 7.7, -31 + satelliteProgressNow * 7.5]);
      continuousAnimationRef.current = requestAnimationFrame(tick);
    };
    continuousAnimationRef.current = requestAnimationFrame(tick);
    return () => {
      if (continuousAnimationRef.current) cancelAnimationFrame(continuousAnimationRef.current);
      continuousAnimationRef.current = null;
      continuousStartRef.current = null;
    };
  }, [h24Platforms, satelliteLoopSeconds]);

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

  const scenarioStorageKey = `zeus-simulator-moa1-${workspaceCode}`;
  const buildScenarioState = useCallback(() => ({
    packages,
    h24Platforms,
    selectedPhase,
    selectedPackageId,
    selectedH24Id,
    showPhaseOnly,
    showH24,
    showSatellite,
    satelliteLoopSeconds,
    showTonWall,
    showRepublicWalls,
    wallOpacity,
    tonWallHeightMeters,
    republicWallHeightMeters,
    showOwnBases,
    showEnemyBases,
    showEnemyAssets,
    showReferenceMarkers,
    aircraftScaleMode,
    exaggeration,
    opacity,
    visible,
    siteVisible,
    mapCamera: mapRef.current ? {
      center: [mapRef.current.getCenter().lng, mapRef.current.getCenter().lat],
      zoom: mapRef.current.getZoom(),
      pitch: mapRef.current.getPitch(),
      bearing: mapRef.current.getBearing(),
    } : null,
    savedAt: new Date().toISOString(),
  }), [packages, h24Platforms, selectedPhase, selectedPackageId, selectedH24Id, showPhaseOnly, showH24, showSatellite, satelliteLoopSeconds, showTonWall, showRepublicWalls, wallOpacity, tonWallHeightMeters, republicWallHeightMeters, showOwnBases, showEnemyBases, showEnemyAssets, showReferenceMarkers, aircraftScaleMode, exaggeration, opacity, visible, siteVisible]);

  const persistScenario = useCallback((showMessage = false) => {
    if (typeof window === "undefined") return;
    const state = buildScenarioState();
    latestScenarioRef.current = state;
    localStorage.setItem(scenarioStorageKey, JSON.stringify(state));
    if (showMessage) setStatus("Modo de Acción N.º 1 guardado en este equipo");
  }, [buildScenarioState, scenarioStorageKey]);

  const applyScenario = useCallback((parsed: any) => {
    if (parsed.packages?.length) setPackages(parsed.packages);
    if (parsed.h24Platforms?.length) setH24Platforms(parsed.h24Platforms);
    if (parsed.selectedPhase) setSelectedPhase(parsed.selectedPhase);
    if (parsed.selectedPackageId) setSelectedPackageId(parsed.selectedPackageId);
    if (parsed.selectedH24Id) setSelectedH24Id(parsed.selectedH24Id);
    if (typeof parsed.showPhaseOnly === "boolean") setShowPhaseOnly(parsed.showPhaseOnly);
    if (typeof parsed.showH24 === "boolean") setShowH24(parsed.showH24);
    if (typeof parsed.showSatellite === "boolean") setShowSatellite(parsed.showSatellite);
    if (Number.isFinite(parsed.satelliteLoopSeconds)) setSatelliteLoopSeconds(parsed.satelliteLoopSeconds);
    if (typeof parsed.showTonWall === "boolean") setShowTonWall(parsed.showTonWall);
    if (typeof parsed.showRepublicWalls === "boolean") setShowRepublicWalls(parsed.showRepublicWalls);
    if (Number.isFinite(parsed.wallOpacity)) setWallOpacity(parsed.wallOpacity);
    if (Number.isFinite(parsed.tonWallHeightMeters)) setTonWallHeightMeters(parsed.tonWallHeightMeters);
    if (Number.isFinite(parsed.republicWallHeightMeters)) setRepublicWallHeightMeters(parsed.republicWallHeightMeters);
    if (typeof parsed.showOwnBases === "boolean") setShowOwnBases(parsed.showOwnBases);
    if (typeof parsed.showEnemyBases === "boolean") setShowEnemyBases(parsed.showEnemyBases);
    if (typeof parsed.showEnemyAssets === "boolean") setShowEnemyAssets(parsed.showEnemyAssets);
    if (typeof parsed.showReferenceMarkers === "boolean") setShowReferenceMarkers(parsed.showReferenceMarkers);
    if (parsed.aircraftScaleMode) setAircraftScaleMode(parsed.aircraftScaleMode);
    if (Number.isFinite(parsed.exaggeration)) setExaggeration(parsed.exaggeration);
    if (Number.isFinite(parsed.opacity)) setOpacity(parsed.opacity);
    if (parsed.visible) setVisible(parsed.visible);
    if (parsed.siteVisible) setSiteVisible(parsed.siteVisible);
    if (parsed.mapCamera && mapRef.current) {
      mapRef.current.jumpTo(parsed.mapCamera);
      setMapBearing(parsed.mapCamera.bearing ?? -24);
      setMapPitch(parsed.mapCamera.pitch ?? 72);
    }
  }, []);

  const saveScenario = () => persistScenario(true);
  const loadScenario = () => {
    const raw = localStorage.getItem(scenarioStorageKey);
    if (!raw) { setStatus("No hay una simulación guardada en este equipo"); return; }
    try {
      const parsed = JSON.parse(raw);
      applyScenario(parsed);
      setStatus("Simulación guardada recuperada");
    } catch { setStatus("El archivo de simulación guardado no es válido"); }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(scenarioStorageKey);
    if (raw) {
      try { applyScenario(JSON.parse(raw)); setStatus("Cambios anteriores recuperados automáticamente"); } catch { /* conserva valores iniciales */ }
    }
    hydratedRef.current = true;
  }, [scenarioStorageKey, applyScenario]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const timer = window.setTimeout(() => persistScenario(false), 350);
    return () => window.clearTimeout(timer);
  }, [persistScenario]);

  useEffect(() => {
    const persistBeforeLeave = () => persistScenario(false);
    window.addEventListener("pagehide", persistBeforeLeave);
    window.addEventListener("beforeunload", persistBeforeLeave);
    return () => {
      persistBeforeLeave();
      window.removeEventListener("pagehide", persistBeforeLeave);
      window.removeEventListener("beforeunload", persistBeforeLeave);
    };
  }, [persistScenario]);

  const addPackage = () => {
    const id = crypto.randomUUID();
    const next: MissionPackage = { ...initialPackages[0], id, name: `Paquete ${packages.length + 1}`, phase: selectedPhase, route: [] };
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
          <p className="text-sm text-slate-300">Trazado libre 2D, órbitas H24 continuas, satélite en loop y guardado automático.</p>
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
            <div className="mb-3 text-center text-xs font-bold text-slate-300">P ─ M ─ A (Alerta Estratégica) ─ D ─ D+1 ─ D+9 ─ D+10</div>
            <div className="grid grid-cols-4 gap-1">
              {campaignPhases.map((phase) => (
                <button key={phase.id} onClick={() => { setSelectedPhase(phase.id); setSimulationProgress(0); setIsPlaying(false); }} className={`rounded border px-1 py-2 text-[10px] font-bold ${selectedPhase === phase.id ? "border-amber-300 bg-amber-500 text-slate-950" : "border-slate-600 bg-slate-800 text-slate-200"}`} title={`${phase.title}: ${phase.detail}`}>
                  <span className="block text-sm">{phase.short}</span>{phase.period}
                </button>
              ))}
            </div>
            <div className="mt-3 text-center text-sm font-bold text-amber-300">FASE {campaignPhases.find((phase) => phase.id === selectedPhase)?.short} · {campaignPhases.find((phase) => phase.id === selectedPhase)?.title.toUpperCase()}</div>
            <p className="mt-1 text-center text-xs text-slate-400">{campaignPhases.find((phase) => phase.id === selectedPhase)?.detail}</p>
            <label className="mt-3 flex items-center justify-center gap-2 text-xs"><input type="checkbox" checked={showPhaseOnly} onChange={(e) => setShowPhaseOnly(e.target.checked)} />Mostrar solo paquetes de esta fase</label>
          </div>

          <h2 className="mb-2 font-bold">Paquetes</h2>
          <select value={selectedPackageId} onChange={(e) => { setSelectedPackageId(e.target.value); setSimulationProgress(0); setIsPlaying(false); }} className="mb-2 w-full rounded bg-slate-800 p-2">
            {phasePackages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name}</option>)}
          </select>
          <div className="mb-4 grid grid-cols-3 gap-2 text-xs">
            <button onClick={addPackage} className="rounded bg-blue-700 p-2">+ Paquete</button>
            <button onClick={saveScenario} className="rounded bg-emerald-700 p-2">Guardar</button>
            <button onClick={loadScenario} className="rounded bg-slate-700 p-2">Recuperar</button>
          </div>

          <div className="space-y-3 rounded border border-slate-700 p-3">
            <label className="block text-xs">Nombre<input value={selectedPackage.name} onChange={(e) => updatePackage({ name: e.target.value })} className="mt-1 w-full rounded bg-slate-800 p-2 text-sm" /></label>
            <label className="block text-xs">Fase del paquete<select value={selectedPackage.phase} onChange={(e) => updatePackage({ phase: e.target.value as CampaignPhase })} className="mt-1 w-full rounded bg-slate-800 p-2 text-sm">{campaignPhases.map((phase) => <option key={phase.id} value={phase.id}>Fase {phase.short} — {phase.title}</option>)}</select></label>
            <label className="block text-xs">Base de salida<select value={selectedPackage.baseId} onChange={(e) => updatePackage({ baseId: e.target.value })} className="mt-1 w-full rounded bg-slate-800 p-2 text-sm">{bases3D.filter((base) => base.side === "propio").map((base) => <option key={base.id} value={base.id}>{base.name}</option>)}</select></label>
            <button onClick={() => { const base = bases3D.find((item) => item.id === selectedPackage.baseId); if (!base) return; const salida: RoutePoint = { id: crypto.randomUUID(), longitude: base.longitude, latitude: base.latitude, kind: "salida", name: base.name, altitudeFt: selectedPackage.cruiseAltitudeFt }; updatePackage({ route: selectedPackage.route.length ? [salida, ...selectedPackage.route.filter((point) => point.kind !== "salida")] : [salida] }); mapRef.current?.flyTo({ center: [base.longitude, base.latitude], zoom: 8, pitch: 72 }); }} className="w-full rounded bg-blue-800 p-2 text-xs font-bold">Usar base como punto de salida</button>
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

          <details open className="mt-4 rounded border border-sky-800 bg-sky-950/20 p-3">
            <summary className="cursor-pointer font-bold text-sky-200">Orientación libre del mapa 3D</summary>
            <p className="mt-2 text-xs text-slate-300">Arrastre con el botón derecho para girar e inclinar. También puede usar estos controles precisos.</p>
            <label className="mt-3 block text-xs font-bold">Rotación horizontal: {mapBearing.toFixed(0)}°
              <input type="range" min="-180" max="180" step="1" value={mapBearing} onChange={(e) => { const value = Number(e.target.value); setMapBearing(value); mapRef.current?.setBearing(value); }} className="mt-2 w-full" />
            </label>
            <label className="mt-3 block text-xs font-bold">Inclinación: {mapPitch.toFixed(0)}°
              <input type="range" min="0" max="85" step="1" value={mapPitch} onChange={(e) => { const value = Number(e.target.value); setMapPitch(value); mapRef.current?.setPitch(value); }} className="mt-2 w-full" />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <button onClick={() => { setMapBearing(0); setMapPitch(72); mapRef.current?.easeTo({ bearing: 0, pitch: 72, duration: 500 }); }} className="rounded bg-sky-800 p-2">Vista operativa</button>
              <button onClick={() => { setMapBearing(0); setMapPitch(0); mapRef.current?.easeTo({ bearing: 0, pitch: 0, duration: 500 }); }} className="rounded bg-slate-700 p-2">Vista cenital</button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">MapLibre permite rotación horizontal e inclinación libre. No aplica giro lateral de cámara porque deformaría la referencia geográfica.</p>
          </details>

          <h2 className="mb-2 mt-5 font-bold">Capas de simulación</h2>
          <label className="mb-2 flex items-center gap-2 rounded border border-slate-700 p-2 text-sm"><input type="checkbox" checked={showSatellite} onChange={(e) => setShowSatellite(e.target.checked)} />Satélite y trayectoria orbital en loop continuo</label>
          <label className="mb-2 block rounded border border-slate-700 p-2 text-xs">Duración visual de cada pasada satelital: {satelliteLoopSeconds} s<input type="range" min="20" max="180" step="5" value={satelliteLoopSeconds} onChange={(e) => setSatelliteLoopSeconds(Number(e.target.value))} className="mt-2 w-full" /></label>
          <label className="mb-2 flex items-center gap-2 rounded border border-slate-700 p-2 text-sm"><input type="checkbox" checked={selectedPackage.visible} onChange={(e) => updatePackage({ visible: e.target.checked })} />Mostrar paquete seleccionado</label>
          <label className="mb-2 flex items-center gap-2 rounded border border-slate-700 p-2 text-sm"><input type="checkbox" checked={showOwnBases} onChange={(e) => setShowOwnBases(e.target.checked)} />Bases propias</label>
          <label className="mb-2 flex items-center gap-2 rounded border border-slate-700 p-2 text-sm"><input type="checkbox" checked={showEnemyBases} onChange={(e) => setShowEnemyBases(e.target.checked)} />Bases enemigas</label>
          <label className="mb-2 flex items-center gap-2 rounded border border-slate-700 p-2 text-sm"><input type="checkbox" checked={showEnemyAssets} onChange={(e) => setShowEnemyAssets(e.target.checked)} />Sistemas enemigos y pistas 3D</label>
          <label className="mb-2 flex items-center gap-2 rounded border border-slate-700 p-2 text-sm"><input type="checkbox" checked={showReferenceMarkers} onChange={(e) => setShowReferenceMarkers(e.target.checked)} />Marcadores verticales de referencia</label>
          <label className="mb-2 block rounded border border-slate-700 p-2 text-sm">Escala de aeronaves<select value={aircraftScaleMode} onChange={(e) => setAircraftScaleMode(e.target.value as "dynamic" | "fixed")} className="mt-1 w-full rounded bg-slate-800 p-2"><option value="dynamic">Dinámica según zoom</option><option value="fixed">Fija</option></select></label>

          <details open className="mt-4 rounded border border-violet-800 bg-violet-950/20 p-3">
            <summary className="cursor-pointer font-bold text-violet-200">Trayectorias de aeronaves H24</summary>
            <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={showH24} onChange={(e) => setShowH24(e.target.checked)} />Mostrar plataformas H24</label>
            <select value={selectedH24Id} onChange={(e) => setSelectedH24Id(e.target.value)} className="mt-3 w-full rounded bg-slate-800 p-2 text-sm">{h24Platforms.map((platform) => <option key={platform.id} value={platform.id}>{platform.name}</option>)}</select>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <label>Velocidad (kt)<input type="number" value={selectedH24.speedKt} onChange={(e) => setH24Platforms((current) => current.map((platform) => platform.id === selectedH24Id ? { ...platform, speedKt: Number(e.target.value) } : platform))} className="mt-1 w-full rounded bg-slate-800 p-2 text-center" /></label>
              <label>Altura (ft)<input type="number" value={selectedH24.altitudeFt} onChange={(e) => setH24Platforms((current) => current.map((platform) => platform.id === selectedH24Id ? { ...platform, altitudeFt: Number(e.target.value) } : platform))} className="mt-1 w-full rounded bg-slate-800 p-2 text-center" /></label>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <button onClick={() => { setDrawingH24Route((value) => !value); setDrawingRoute(false); }} className={`rounded p-2 font-bold ${drawingH24Route ? "bg-amber-500 text-slate-950" : "bg-violet-700"}`}>{drawingH24Route ? "Finalizar órbita" : "Trazar trayectoria"}</button>
              <button onClick={() => setH24Platforms((current) => current.map((platform) => platform.id === selectedH24Id ? { ...platform, route: [] } : platform))} className="rounded bg-red-900 p-2">Limpiar</button>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={selectedH24.closed} onChange={(e) => setH24Platforms((current) => current.map((platform) => platform.id === selectedH24Id ? { ...platform, closed: e.target.checked } : platform))} />Cerrar circuito automáticamente</label>
            <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={selectedH24.visible} onChange={(e) => setH24Platforms((current) => current.map((platform) => platform.id === selectedH24Id ? { ...platform, visible: e.target.checked } : platform))} />Mostrar aeronave</label>
            <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={selectedH24.showRoute} onChange={(e) => setH24Platforms((current) => current.map((platform) => platform.id === selectedH24Id ? { ...platform, showRoute: e.target.checked } : platform))} />Mostrar trayectoria</label>
            <p className="mt-2 text-xs text-slate-400">Puntos cargados: {selectedH24.route.length}. La trayectoria se reproduce permanentemente en un loop independiente del reloj del paquete. Puede ocultar la aeronave o la línea sin detener su movimiento.</p>
          </details>

          <details open className="mt-4 rounded border border-cyan-800 bg-cyan-950/20 p-3">
            <summary className="cursor-pointer font-bold text-cyan-200">Límites 3D de la campaña</summary>
            <p className="mt-2 text-xs text-slate-300">Muros traslúcidos que siguen los contornos del Teatro de Operaciones y de las repúblicas, sin nombres ni rótulos sobre el relieve.</p>
            <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={showTonWall} onChange={(e) => setShowTonWall(e.target.checked)} />Límite vertical del TON</label>
            <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={showRepublicWalls} onChange={(e) => setShowRepublicWalls(e.target.checked)} />Fronteras entre repúblicas</label>
            <label className="mt-3 block text-sm font-bold">Altura del TON: {(tonWallHeightMeters / 1000).toFixed(0)} km<input type="range" min="10000" max="60000" step="1000" value={tonWallHeightMeters} onChange={(e) => setTonWallHeightMeters(Number(e.target.value))} className="mt-2 w-full" /></label>
            <label className="mt-3 block text-sm font-bold">Altura de fronteras: {(republicWallHeightMeters / 1000).toFixed(0)} km<input type="range" min="5000" max="40000" step="1000" value={republicWallHeightMeters} onChange={(e) => setRepublicWallHeightMeters(Number(e.target.value))} className="mt-2 w-full" /></label>
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
