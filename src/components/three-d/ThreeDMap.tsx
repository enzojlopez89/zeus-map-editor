"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type Props = { workspaceCode: string; token: string };
type PointSite = {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  altitudeMeters: number;
  side: "propio" | "enemigo";
  kind: "radar" | "tritio";
  detail: string;
};

type Coverage = {
  id: string;
  name: string;
  url: string;
  side: "propio" | "enemigo";
  kind: "radar" | "s300";
  color: string;
};

const pointSites: PointSite[] = [
  {
    id: "pos-radar-la-rioja",
    name: "Radar propio · La Rioja",
    longitude: -66.793409,
    latitude: -29.376201,
    altitudeMeters: 438,
    side: "propio",
    kind: "radar",
    detail: "Posición del radar propio asociado a la 1.ª Brigada Aérea.",
  },
  {
    id: "pos-radar-villa-mercedes",
    name: "Radar propio · Villa Mercedes",
    longitude: -65.370632,
    latitude: -33.738415,
    altitudeMeters: 485,
    side: "propio",
    kind: "radar",
    detail: "Posición del radar propio asociado a la 2.ª Brigada Aérea.",
  },
  {
    id: "pos-radar-cordoba",
    name: "Radar propio · Córdoba",
    longitude: -64.207857,
    latitude: -31.319799,
    altitudeMeters: 489,
    side: "propio",
    kind: "radar",
    detail: "Posición del radar propio asociado a la 3.ª Brigada Aérea.",
  },
  {
    id: "pos-radar-general-acha",
    name: "Radar propio · General Acha",
    longitude: -64.639206,
    latitude: -37.425428,
    altitudeMeters: 277,
    side: "propio",
    kind: "radar",
    detail: "Posición del radar propio asociado a la 5.ª Brigada Aérea.",
  },
  {
    id: "pos-radar-cafayate",
    name: "Radar enemigo · Cafayate",
    longitude: -65.925964,
    latitude: -26.062598,
    altitudeMeters: 1683,
    side: "enemigo",
    kind: "radar",
    detail: "Posición de la estación radar enemiga.",
  },
  {
    id: "pos-radar-las-lomitas",
    name: "Radar enemigo · Las Lomitas",
    longitude: -60.551518,
    latitude: -24.730022,
    altitudeMeters: 130,
    side: "enemigo",
    kind: "radar",
    detail: "Posición de la estación radar enemiga.",
  },
  {
    id: "pos-radar-oran",
    name: "Radar enemigo · Orán",
    longitude: -64.375962,
    latitude: -23.15641,
    altitudeMeters: 337,
    side: "enemigo",
    kind: "radar",
    detail: "Posición de la estación radar enemiga.",
  },
  {
    id: "planta-tritio",
    name: "Planta de procesamiento de tritio",
    longitude: -66.80665833333333,
    latitude: -25.0827,
    altitudeMeters: 3950,
    side: "enemigo",
    kind: "tritio",
    detail: "Instalación estratégica enemiga de procesamiento de tritio.",
  },
];

const coverages: Coverage[] = [
  {
    id: "radar-la-rioja",
    name: "Radar propio · La Rioja",
    url: "/data/radar/la_rioja.geojson",
    side: "propio",
    kind: "radar",
    color: "#2563eb",
  },
  {
    id: "radar-villa-mercedes",
    name: "Radar propio · Villa Mercedes",
    url: "/data/radar/villa_mercedes.geojson",
    side: "propio",
    kind: "radar",
    color: "#0ea5e9",
  },
  {
    id: "radar-cordoba",
    name: "Radar propio · Córdoba",
    url: "/data/radar/cordoba.geojson",
    side: "propio",
    kind: "radar",
    color: "#7c3aed",
  },
  {
    id: "radar-general-acha",
    name: "Radar propio · General Acha",
    url: "/data/radar/general_acha.geojson",
    side: "propio",
    kind: "radar",
    color: "#06b6d4",
  },
  {
    id: "radar-cafayate",
    name: "Radar enemigo · Cafayate",
    url: "/data/radar/cafayate.geojson",
    side: "enemigo",
    kind: "radar",
    color: "#f97316",
  },
  {
    id: "radar-las-lomitas",
    name: "Radar enemigo · Las Lomitas",
    url: "/data/radar/las_lomitas.geojson",
    side: "enemigo",
    kind: "radar",
    color: "#ef4444",
  },
  {
    id: "radar-oran",
    name: "Radar enemigo · Orán",
    url: "/data/radar/oran.geojson",
    side: "enemigo",
    kind: "radar",
    color: "#dc2626",
  },
  {
    id: "s300-alfa",
    name: "S-300 ALFA · Belén",
    url: "/data/defensa-s300/s300_alfa.geojson",
    side: "enemigo",
    kind: "s300",
    color: "#b91c1c",
  },
  {
    id: "s300-bravo",
    name: "S-300 BRAVO · Catamarca",
    url: "/data/defensa-s300/s300_bravo.geojson",
    side: "enemigo",
    kind: "s300",
    color: "#991b1b",
  },
  {
    id: "s300-charly",
    name: "S-300 CHARLY · Salta",
    url: "/data/defensa-s300/s300_charly.geojson",
    side: "enemigo",
    kind: "s300",
    color: "#ef4444",
  },
  {
    id: "s300-delta",
    name: "S-300 DELTA · Las Lomitas",
    url: "/data/defensa-s300/s300_delta.geojson",
    side: "enemigo",
    kind: "s300",
    color: "#dc2626",
  },
];

export default function ThreeDMap({ workspaceCode, token }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const siteMarkersRef = useRef<Record<string, maplibregl.Marker>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>(
    Object.fromEntries(coverages.map((coverage) => [coverage.id, true])),
  );
  const [siteVisible, setSiteVisible] = useState<Record<string, boolean>>(
    Object.fromEntries(pointSites.map((site) => [site.id, true])),
  );
  const [exaggeration, setExaggeration] = useState(4.5);
  const [opacity, setOpacity] = useState(0.34);
  const [status, setStatus] = useState("Inicializando relieve 3D...");

  useEffect(() => {
    if (!ref.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: ref.current,
      center: [-67.1, -27.7],
      zoom: 5.5,
      pitch: 72,
      bearing: -24,
      maxPitch: 85,
      style: {
        version: 8,
        sources: {
          terrain: {
            type: "raster-dem",
            tiles: [
              "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            encoding: "terrarium",
          },
        },
        layers: [
          {
            id: "fondo",
            type: "background",
            paint: { "background-color": "#07111d" },
          },
          {
            id: "relieve",
            type: "hillshade",
            source: "terrain",
            paint: {
              "hillshade-exaggeration": 1,
              "hillshade-shadow-color": "#020617",
              "hillshade-highlight-color": "#d8e3d4",
              "hillshade-accent-color": "#64748b",
              "hillshade-illumination-direction": 315,
            },
          },
        ],
        terrain: { source: "terrain", exaggeration },
      },
    });

    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "top-right",
    );
    map.on("load", () => {
      coverages.forEach((coverage) => {
        map.addSource(coverage.id, { type: "geojson", data: coverage.url });
        map.addLayer({
          id: `${coverage.id}-fill`,
          type: "fill",
          source: coverage.id,
          paint: {
            "fill-color": coverage.color,
            "fill-opacity": opacity,
          },
        });
        map.addLayer({
          id: `${coverage.id}-line`,
          type: "line",
          source: coverage.id,
          paint: {
            "line-color": coverage.color,
            "line-width": coverage.kind === "s300" ? 2.6 : 2,
            "line-dasharray": coverage.kind === "s300" ? [2, 1.5] : [3, 2],
          },
        });
      });

      pointSites.forEach((site) => {
        const element = document.createElement("button");
        element.type = "button";
        element.title = site.name;
        element.style.width = site.kind === "tritio" ? "42px" : "34px";
        element.style.height = site.kind === "tritio" ? "42px" : "34px";
        element.style.borderRadius = "999px";
        element.style.border =
          site.kind === "tritio" ? "3px solid #fecaca" : "3px solid #e2e8f0";
        element.style.background =
          site.kind === "tritio"
            ? "#991b1b"
            : site.side === "propio"
              ? "#1d4ed8"
              : "#c2410c";
        element.style.color = "white";
        element.style.fontWeight = "900";
        element.style.fontSize = site.kind === "tritio" ? "22px" : "17px";
        element.style.display = "flex";
        element.style.alignItems = "center";
        element.style.justifyContent = "center";
        element.style.cursor = "pointer";
        element.style.boxShadow =
          "0 0 0 2px rgba(15,23,42,.85), 0 5px 16px rgba(0,0,0,.55)";
        element.textContent = site.kind === "tritio" ? "☢" : "⌖";

        const popup = new maplibregl.Popup({ offset: 22 }).setHTML(`
          <div style="min-width:240px;color:#0f172a">
            <strong>${site.name}</strong><br />
            <span>${site.detail}</span><br /><br />
            <strong>Coordenadas:</strong> ${site.latitude.toFixed(6)}, ${site.longitude.toFixed(6)}<br />
            <strong>Altura:</strong> ${site.altitudeMeters.toLocaleString("es-AR")} m s. n. m.
          </div>
        `);

        siteMarkersRef.current[site.id] = new maplibregl.Marker({
          element,
          anchor: "bottom",
        })
          .setLngLat([site.longitude, site.latitude])
          .setPopup(popup)
          .addTo(map);
      });

      setStatus(
        "Relieve, planta de tritio, posiciones radar y coberturas cargadas",
      );
    });

    mapRef.current = map;
    return () => {
      Object.values(siteMarkersRef.current).forEach((marker) =>
        marker.remove(),
      );
      siteMarkersRef.current = {};
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const coverage of coverages) {
      for (const suffix of ["fill", "line"]) {
        const id = `${coverage.id}-${suffix}`;
        if (map.getLayer(id)) {
          map.setLayoutProperty(
            id,
            "visibility",
            visible[coverage.id] ? "visible" : "none",
          );
        }
      }
    }
  }, [visible]);

  useEffect(() => {
    for (const site of pointSites) {
      const marker = siteMarkersRef.current[site.id];
      if (marker)
        marker.getElement().style.display = siteVisible[site.id]
          ? "flex"
          : "none";
    }
  }, [siteVisible]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.getSource("terrain"))
      map.setTerrain({ source: "terrain", exaggeration });
  }, [exaggeration]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const coverage of coverages) {
      const id = `${coverage.id}-fill`;
      if (map.getLayer(id)) map.setPaintProperty(id, "fill-opacity", opacity);
    }
  }, [opacity]);

  const setGroup = (
    predicate: (coverage: Coverage) => boolean,
    value: boolean,
  ) => {
    setVisible((current) => ({
      ...current,
      ...Object.fromEntries(
        coverages.filter(predicate).map((coverage) => [coverage.id, value]),
      ),
    }));
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 bg-slate-900 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
            A3 · VISOR GEOESPACIAL
          </p>
          <h1 className="text-2xl font-bold">
            Relieve 3D, planta de tritio, radares y S-300
          </h1>
          <p className="text-sm text-slate-300">
            Vista limpia, sin rótulos geográficos, con posiciones radar, planta
            de tritio y relieve vertical exagerado.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/espacio/${workspaceCode}/${token}`}
            className="rounded bg-slate-700 px-3 py-2"
          >
            Mapa 2D
          </Link>
          <Link
            href={`/espacio/${workspaceCode}/${token}/ppc/pcr`}
            className="rounded bg-violet-700 px-3 py-2"
          >
            PCR
          </Link>
          <Link
            href={`/espacio/${workspaceCode}/${token}/ppc/computo-aereo`}
            className="rounded bg-cyan-700 px-3 py-2"
          >
            Cómputo Aéreo
          </Link>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-100px)] lg:grid-cols-[330px_1fr]">
        <aside className="overflow-y-auto border-r border-slate-700 bg-slate-900 p-4 lg:max-h-[calc(100vh-100px)]">
          <p className="mb-4 rounded border border-emerald-800 bg-emerald-950/40 p-2 text-sm text-emerald-200">
            {status}
          </p>

          <h2 className="mb-2 font-bold">Controles rápidos</h2>
          <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => setGroup((c) => c.side === "propio", true)}
              className="rounded bg-blue-800 p-2"
            >
              Radares propios
            </button>
            <button
              onClick={() => setGroup((c) => c.side === "propio", false)}
              className="rounded bg-slate-700 p-2"
            >
              Ocultar propios
            </button>
            <button
              onClick={() =>
                setGroup(
                  (c) => c.side === "enemigo" && c.kind === "radar",
                  true,
                )
              }
              className="rounded bg-orange-800 p-2"
            >
              Radares enemigos
            </button>
            <button
              onClick={() =>
                setGroup(
                  (c) => c.side === "enemigo" && c.kind === "radar",
                  false,
                )
              }
              className="rounded bg-slate-700 p-2"
            >
              Ocultar enemigos
            </button>
            <button
              onClick={() => setGroup((c) => c.kind === "s300", true)}
              className="rounded bg-red-800 p-2"
            >
              Mostrar S-300
            </button>
            <button
              onClick={() => setGroup((c) => c.kind === "s300", false)}
              className="rounded bg-slate-700 p-2"
            >
              Ocultar S-300
            </button>
          </div>

          <h2 className="mb-2 font-bold">Posiciones e instalaciones</h2>
          <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() =>
                setSiteVisible((current) => ({
                  ...current,
                  ...Object.fromEntries(
                    pointSites
                      .filter((site) => site.kind === "radar")
                      .map((site) => [site.id, true]),
                  ),
                }))
              }
              className="rounded bg-indigo-800 p-2"
            >
              Mostrar radares
            </button>
            <button
              onClick={() =>
                setSiteVisible((current) => ({
                  ...current,
                  ...Object.fromEntries(
                    pointSites
                      .filter((site) => site.kind === "radar")
                      .map((site) => [site.id, false]),
                  ),
                }))
              }
              className="rounded bg-slate-700 p-2"
            >
              Ocultar radares
            </button>
          </div>
          {pointSites.map((site) => (
            <label
              key={site.id}
              className="mb-2 flex items-center gap-2 rounded border border-slate-700 p-2 text-sm"
            >
              <input
                type="checkbox"
                checked={siteVisible[site.id]}
                onChange={(event) =>
                  setSiteVisible((current) => ({
                    ...current,
                    [site.id]: event.target.checked,
                  }))
                }
              />
              <span>
                {site.kind === "tritio" ? "☢ " : "⌖ "}
                {site.name}
              </span>
            </label>
          ))}

          <h2 className="mb-2 mt-5 font-bold">Coberturas visibles</h2>
          {coverages.map((coverage) => (
            <label
              key={coverage.id}
              className="mb-2 flex items-center gap-2 rounded border border-slate-700 p-2 text-sm"
            >
              <input
                type="checkbox"
                checked={visible[coverage.id]}
                onChange={(event) =>
                  setVisible((current) => ({
                    ...current,
                    [coverage.id]: event.target.checked,
                  }))
                }
              />
              <span>{coverage.name}</span>
            </label>
          ))}

          <label className="mt-5 block text-sm font-bold">
            Exageración vertical: {exaggeration.toFixed(1)}×
            <input
              type="range"
              min="1"
              max="8"
              step="0.1"
              value={exaggeration}
              onChange={(event) => setExaggeration(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>
          <label className="mt-4 block text-sm font-bold">
            Opacidad de coberturas: {Math.round(opacity * 100)} %
            <input
              type="range"
              min="0.08"
              max="0.75"
              step="0.01"
              value={opacity}
              onChange={(event) => setOpacity(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>

          <div className="mt-5 rounded border border-amber-800 bg-amber-950/30 p-3 text-xs text-amber-100">
            <strong>Nota:</strong> la base cartográfica fue reemplazada por
            sombreado del modelo de elevación. Por eso no aparecen nombres,
            rutas ni límites administrativos.
          </div>
        </aside>
        <div ref={ref} className="min-h-[760px] w-full" />
      </div>
    </main>
  );
}
