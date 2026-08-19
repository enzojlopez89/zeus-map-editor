export type MedioEstado = "3d" | "catalogado" | "pendiente";
export type NivelModelo = "3d-exacto" | "3d-adaptado" | "3d-zeus" | "2d-provisional" | "pendiente";

export type Medio3D = {
  id: string;
  nombre: string;
  variante?: string;
  dominio: "Aeroespacial" | "Defensa aeroespacial" | "Terrestre" | "Naval" | "Logística";
  categoria: string;
  funcion: string;
  cantidad?: string;
  ubicacion?: string;
  estado: MedioEstado;
  destacado?: boolean;
  imagen2d: string;
  nivelModelo: NivelModelo;
  especificaciones?: { etiqueta: string; valor: string }[];
  datosPlan?: { etiqueta: string; valor: string }[];
  fuenteTecnica?: string;
  notaTecnica?: string;
  armamentoPlan?: string[];
};

export const medios: Medio3D[] = [
  { id: "f16c40", nombre: "F-16C", variante: "Block 40", dominio: "Aeroespacial", categoria: "Caza / multirrol", funcion: "Caza, ataque y defensa contra-aérea", cantidad: "34", ubicacion: "2ª BA (20) · 4ª BA (14)", estado: "3d", destacado: true , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/195th%20Fighter%20Squadron%20General%20Dynamics%20F-16C%20Block%2042H%20Fighting%20Falcon%2090-0716.jpg", nivelModelo: "3d-exacto" },
  { id: "f16d42", nombre: "F-16D", variante: "Block 42", dominio: "Aeroespacial", categoria: "Caza / multirrol", funcion: "Multirrol biplaza", cantidad: "6", ubicacion: "4ª BA · Mendoza", estado: "3d", destacado: true , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/425th%20Fighter%20Squadron%20-%20Lockheed%20F-16D%20Block%2052%20Fighting%20Falcon%2094-0282.jpg", nivelModelo: "3d-exacto" },
  { id: "f16cj50", nombre: "F-16CJ", variante: "Block 50", dominio: "Aeroespacial", categoria: "SEAD / DEAD", funcion: "Supresión de defensas aéreas", cantidad: "10", ubicacion: "5ª BA · Gral. Acha", estado: "3d", destacado: true , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/F-16%20CJ%20Fighting%20Falcon.jpg", nivelModelo: "3d-exacto" },
  { id: "amx", nombre: "AMX A-1M", dominio: "Aeroespacial", categoria: "Ataque / cazabombardero", funcion: "Ataque aire-superficie y autodefensa AA", cantidad: "36", ubicacion: "2ª BA (12) · 3ª BA (12) + asignación plan", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Alenia-Aermacchi-Embraer%20AMX,%20Italy%20-%20Air%20Force%20JP7721735.jpg", nivelModelo: "3d-zeus" },
  { id: "t6", nombre: "T-6 Texan II", dominio: "Aeroespacial", categoria: "Ataque ligero", funcion: "Ataque aire-superficie", cantidad: "24", ubicacion: "2ª BA (12) · 3ª BA (12)", estado: "3d", imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Foto%20Texan%20II%20FAA.jpg", nivelModelo: "3d-zeus",
    especificaciones: [
      { etiqueta: "Longitud", valor: "10,16 m" },
      { etiqueta: "Envergadura", valor: "10,2 m" },
      { etiqueta: "Altura", valor: "3,25 m" },
      { etiqueta: "Superficie alar", valor: "16,28 m²" },
      { etiqueta: "Motor", valor: "Turbohélice · 1.100 shp" },
      { etiqueta: "MTOW", valor: "3.765 kg" },
      { etiqueta: "Peso básico", valor: "2.336 kg" },
      { etiqueta: "Combustible interno", valor: "544 kg" },
      { etiqueta: "Límite de velocidad", valor: "Mach 0,67 / 316 KIAS" },
      { etiqueta: "Límites G", valor: "+7,0 / -3,5 G" },
      { etiqueta: "Alcance ferry", valor: "884 NM interno · 1.382 NM con 2 tanques" },
      { etiqueta: "Puntos externos", valor: "6" }
    ],
    notaTecnica: "Referencia técnica: Beechcraft T-6C Texan II (Textron Aviation). El Plan ZEUS identifica el medio como T-6 Texan II sin precisar subvariante; por eso estos valores se muestran como referencia técnica de familia y no como dato del Plan.",
    armamentoPlan: ["Mk 81 / Mk 82", "LAU-61/A 2,75 pulgadas", "GBU-12 Paveway II", "Pods 12,7 mm"]
  },
  { id: "harpy", nombre: "IAI Harpy", dominio: "Aeroespacial", categoria: "UCAV / munición merodeadora", funcion: "SEAD", cantidad: "36", ubicacion: "5ª BA · Gral. Acha", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/IAI%20Harop%20PAS%202013%2001.jpg", nivelModelo: "3d-zeus" },
  { id: "e99m", nombre: "E-99M Erieye", dominio: "Aeroespacial", categoria: "AEW&C / C2", funcion: "Vigilancia y control aerotransportado", cantidad: "3", ubicacion: "3ª BA · Córdoba", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Embraer%20R-99A.jpg", nivelModelo: "3d-zeus" },
  { id: "ec130h", nombre: "EC-130H Compass Call", dominio: "Aeroespacial", categoria: "Guerra electrónica", funcion: "GE / AE / ERA / C2", cantidad: "2", ubicacion: "5ª BA · Gral. Acha", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/EC-130H%2041st%20EWS%20taking%20off%20Davis-Monthan%20AFB%202007.jpg", nivelModelo: "3d-zeus" },
  { id: "hermes450", nombre: "Hermes 450", dominio: "Aeroespacial", categoria: "ISR / SIGINT", funcion: "ELINT / COMINT", cantidad: "6", ubicacion: "2ª BA y 5ª BA", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Hermes%20450%20take%20off.jpg", nivelModelo: "3d-zeus" },
  { id: "c130j", nombre: "C-130J", dominio: "Aeroespacial", categoria: "Transporte táctico", funcion: "Carga, tropas y asalto aéreo", cantidad: "10", ubicacion: "1ª BA · La Rioja", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Italian%20Air%20Force%20Hercules%20C-130J-30%20departs%20RIAT%20Fairford%2014thJuly2014%20arp.jpg", nivelModelo: "3d-zeus" },
  { id: "kc130j", nombre: "KC-130J", dominio: "Aeroespacial", categoria: "Reabastecimiento aéreo", funcion: "REV / transporte", cantidad: "4", ubicacion: "1ª BA · La Rioja", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Italian%20Air%20Force%20Hercules%20C-130J-30%20departs%20RIAT%20Fairford%2014thJuly2014%20arp.jpg", nivelModelo: "3d-zeus" },
  { id: "kc135", nombre: "KC-135 Stratotanker", dominio: "Aeroespacial", categoria: "Reabastecimiento aéreo", funcion: "REV", cantidad: "6", ubicacion: "3ª BA (3) · 4ª BA (3)", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/EGUN%20-%20Boeing%20KC-135R%20Stratotanker%20-%20United%20States%20Air%20Force%20-%2058-1519%20(46065191141).jpg", nivelModelo: "3d-zeus" },
  { id: "lj60", nombre: "Learjet 60", dominio: "Aeroespacial", categoria: "VIP / MEDEVAC", funcion: "VIP / evacuación médica", cantidad: "6", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Filton.learjet.60.arp.jpg", nivelModelo: "3d-zeus" },
  { id: "dhc6", nombre: "DHC-6-400", dominio: "Aeroespacial", categoria: "Transporte ligero", funcion: "Carga, tropas y asalto aéreo", cantidad: "12", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Loganair%20G-BVVK%20De%20Havilland%20Canada%20DHC-6%20Twin%20Otter%20Glasgow%20International%20Airport%20(GLA%20EGPF)%20(52701388630).jpg", nivelModelo: "3d-zeus" },
  { id: "ch47", nombre: "CH-47F", dominio: "Aeroespacial", categoria: "Ala rotativa", funcion: "Transporte, asalto aéreo y búsqueda/recuperación", cantidad: "12", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/CH-47%20Chinook%20Afghanistan%20101st%20Airborne%202010.jpg", nivelModelo: "3d-zeus" },
  { id: "uh1y", nombre: "UH-1Y", dominio: "Aeroespacial", categoria: "Ala rotativa", funcion: "Transporte, asalto aéreo y búsqueda/recuperación", cantidad: "16", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Bell%20UH-1Y%20Venom%20(13778983613).jpg", nivelModelo: "3d-zeus" },
  { id: "b412", nombre: "B-412", dominio: "Aeroespacial", categoria: "Ala rotativa", funcion: "CASEVAC / Búsqueda y salvamento / transporte", cantidad: "14", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Slovenian%20Air%20Force%20Bell%20412%20(cropped).jpg", nivelModelo: "3d-zeus" },
  { id: "tps77", nombre: "TPS-77 MRR", dominio: "Defensa aeroespacial", categoria: "Radar", funcion: "Vigilancia 360°", cantidad: "3", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/RAAF%20AN-FPS-117%20radar%20in%202007.jpg", nivelModelo: "3d-zeus" },
  { id: "gm400", nombre: "GM 400 Alpha", dominio: "Defensa aeroespacial", categoria: "Radar", funcion: "Vigilancia 360°", cantidad: "1", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Thales%20Ground%20Master%20400%20alpha%20-%20Dutch%20armed%20forces.jpg", nivelModelo: "3d-zeus" },
  { id: "patriot", nombre: "MIM-104B Patriot PAC-1", dominio: "Defensa aeroespacial", categoria: "SAM / LRS", funcion: "Defensa antiaérea de largo alcance", cantidad: "2 baterías", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/210714-M-VR873-842%20-%20MIM-104%20Patriot%20at%20exercise%20Talisman%20Sabre%2021.jpg", nivelModelo: "3d-zeus" },
  { id: "nasams", nombre: "NASAMS 1", dominio: "Defensa aeroespacial", categoria: "SAM / MRS-SHORAD", funcion: "Defensa antiaérea de medio/corto alcance", cantidad: "6 baterías", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/NASAMS.jpg", nivelModelo: "3d-zeus" },
  { id: "skyguard", nombre: "Skyguard III / Oerlikon GDF007", dominio: "Defensa aeroespacial", categoria: "VSHORAD / AAA", funcion: "Defensa antiaérea de punto", cantidad: "8 baterías", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Skyguard.jpg", nivelModelo: "3d-zeus" },
  { id: "rbs70", nombre: "RBS-70 NG", dominio: "Defensa aeroespacial", categoria: "VSHORAD", funcion: "Defensa antiaérea portátil", cantidad: "80 lanzadores", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/RBS-70%20in%20Lithuanian%20Air%20Force.jpg", nivelModelo: "3d-zeus" },
  { id: "landcruiser", nombre: "Toyota Land Cruiser", dominio: "Logística", categoria: "Vehículos", funcion: "Movilidad terrestre", cantidad: "35", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Toyota%20Land%20Cruiser%20Stendal%202024.jpg", nivelModelo: "3d-zeus" },
  { id: "sprinter", nombre: "Mercedes-Benz Sprinter", dominio: "Logística", categoria: "Vehículos", funcion: "Transporte", cantidad: "12", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Mercedes-Benz%20Sprinter%20208D%20ambulancia%20Ej%C3%A9rcito%20espa%C3%B1ol.jpg", nivelModelo: "3d-zeus" },
  { id: "amarok", nombre: "Volkswagen Amarok", dominio: "Logística", categoria: "Vehículos", funcion: "Movilidad terrestre", cantidad: "22", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Volkswagen%20Amarok%20UME.jpg", nivelModelo: "3d-zeus" },
  { id: "unimog", nombre: "UNIMOG", dominio: "Logística", categoria: "Vehículos", funcion: "Transporte táctico/logístico", cantidad: "30", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Unimog%20435.jpg", nivelModelo: "3d-zeus" },
  { id: "camion20", nombre: "Camión 20 Tn", dominio: "Logística", categoria: "Vehículos", funcion: "Transporte pesado", cantidad: "7", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Unimog%20435.jpg", nivelModelo: "3d-zeus" },
  { id: "camion5", nombre: "Camión 5 Tn", dominio: "Logística", categoria: "Vehículos", funcion: "Transporte logístico", cantidad: "10", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Unimog%20435.jpg", nivelModelo: "3d-zeus" },
  { id: "meko360", nombre: "Destructor MEKO 360", dominio: "Naval", categoria: "Destructores", funcion: "Guerra de superficie / defensa", cantidad: "4", ubicacion: "Puerto Aguas Negras", estado: "3d", destacado: true , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Fraterno%20XXXVII%20-%202024%20(53925635044).jpg", nivelModelo: "3d-adaptado" },
  { id: "meko140", nombre: "Corbeta MEKO 140", dominio: "Naval", categoria: "Corbetas", funcion: "Guerra de superficie", cantidad: "6", ubicacion: "Puerto Aguas Negras", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/CorbetasMeko140.jpg", nivelModelo: "3d-zeus" },
  { id: "drummond", nombre: "Corbeta Clase Drummond A69", dominio: "Naval", categoria: "Corbetas", funcion: "Guerra de superficie", cantidad: "4", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/ARA%20Guerrico%20en%20base%20naval%20Mar%20del%20Plata.jpg", nivelModelo: "3d-zeus" },
  { id: "sigma", nombre: "SIGMA 10514", dominio: "Naval", categoria: "Patrulla oceánica", funcion: "Patrulla oceánica de largo alcance", cantidad: "4", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Hasanuddin-1.jpg", nivelModelo: "3d-zeus" },
  { id: "bouchard", nombre: "Patrullero Clase Bouchard", dominio: "Naval", categoria: "Patrulleros", funcion: "Patrulla", cantidad: "8", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/ARA%20Contraalmirante%20Cordero%20(P-54).jpg", nivelModelo: "3d-zeus" },
  { id: "tipo209", nombre: "Submarino Tipo 209", dominio: "Naval", categoria: "Submarinos", funcion: "Guerra submarina", cantidad: "3", ubicacion: "Las Cuevas", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/TurkishSubmarine.JPG", nivelModelo: "3d-zeus" },
  { id: "tr1700", nombre: "Submarino TR-1700", dominio: "Naval", categoria: "Submarinos", funcion: "Guerra submarina", cantidad: "4", ubicacion: "Las Cuevas", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/S41ARASantaCruz.jpg", nivelModelo: "3d-zeus" },
  { id: "p3", nombre: "P-3 Orion", dominio: "Naval", categoria: "Aviación naval", funcion: "Guerra antisubmarina", cantidad: "2", ubicacion: "Las Cuevas", estado: "3d", destacado: true , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/US%20Navy%20030313-F-9032T-022%20A%20U.S.%20Navy%20P-3C%20Orion%20patrol%20aircraft%20takes%20off%20on%20a%20mission%20from%20a%20forward%20deployed%20location%20in%20support%20of%20Operation%20Enduring%20Freedom.jpg", nivelModelo: "3d-adaptado" },
  { id: "s2t", nombre: "S-2T Turbo Tracker", dominio: "Naval", categoria: "Aviación naval", funcion: "Guerra antisubmarina", cantidad: "4", ubicacion: "Las Cuevas", estado: "3d" , imagen2d: "https://commons.wikimedia.org/wiki/Special:Redirect/file/ROCAF%20S-2T%20Turbo%20Tracker%20Display%20at%20Tainan%20Air%20Force%20Base%20Apron%2020130810a.jpg", nivelModelo: "3d-zeus" },
];


type FichaParcial = Pick<Medio3D, "especificaciones" | "datosPlan" | "fuenteTecnica" | "notaTecnica" | "armamentoPlan">;

const fichasTecnicasZEUS: Record<string, FichaParcial> = {
  f16c40: {
    datosPlan: [
      { etiqueta: "Cantidad", valor: "34 F-16C Block 40" },
      { etiqueta: "Ubicación", valor: "2ª BA (20) · 4ª BA (14)" },
      { etiqueta: "Rol ZEUS", valor: "Caza / ataque / defensa contra-aérea" },
      { etiqueta: "Armamento A/A", valor: "AIM-9M 18 km · AIM-120C-5 105 km (NEZ 65 km) · AIM-7P 70 km" },
      { etiqueta: "Armamento A/S", valor: "Mk 82/83/84 · GBU-10/12/38 · AGM-65G 34 km · AGM-119 55 km" }
    ],
    fuenteTecnica: "USAF · F-16 Fighting Falcon Fact Sheet",
    notaTecnica: "Performance de referencia de la familia F-16C/D; varía por Block, motor, carga y perfil."
  },
  f16d42: {
    datosPlan: [
      { etiqueta: "Cantidad", valor: "6 F-16D Block 42" },
      { etiqueta: "Ubicación", valor: "4ª BA · Mendoza" },
      { etiqueta: "Rol ZEUS", valor: "Multirrol biplaza" },
      { etiqueta: "Armamento A/A", valor: "AIM-9M 18 km · AIM-120C-5 105 km (NEZ 65 km) · AIM-7P 70 km" }
    ],
    fuenteTecnica: "USAF · F-16 Fighting Falcon Fact Sheet"
  },
  f16cj50: {
    datosPlan: [
      { etiqueta: "Cantidad", valor: "10 F-16CJ Block 50" },
      { etiqueta: "Ubicación", valor: "5ª BA · Gral. Acha" },
      { etiqueta: "Rol ZEUS", valor: "SEAD / DEAD" },
      { etiqueta: "AGM-88C HARM", valor: "140 unidades · alcance Plan: 148 km" },
      { etiqueta: "HTS", valor: "10 AN/ASQ-213" }
    ],
    fuenteTecnica: "USAF · F-16 Fighting Falcon Fact Sheet"
  },
  amx: {
    datosPlan: [
      { etiqueta: "Cantidad", valor: "36 AMX A-1M" },
      { etiqueta: "Rol ZEUS", valor: "Ataque aire-superficie / autodefensa AA" }
    ],
    notaTecnica: "Performance específica pendiente de incorporar desde fuente técnica primaria."
  },
  t6: {
    datosPlan: [
      { etiqueta: "Cantidad", valor: "24 T-6 Texan II" },
      { etiqueta: "Ubicación", valor: "2ª BA (12) · 3ª BA (12)" },
      { etiqueta: "Rol ZEUS", valor: "Ataque aire-superficie" }
    ],
    fuenteTecnica: "Textron Aviation Defense · T-6C Texan II"
  },
  harpy: {
    datosPlan: [
      { etiqueta: "Cantidad", valor: "36 IAI Harpy" },
      { etiqueta: "Ubicación", valor: "5ª BA · Gral. Acha" },
      { etiqueta: "Rol ZEUS", valor: "SEAD / munición merodeadora antirradiación" }
    ],
    notaTecnica: "Alcance y autonomía pendientes de cotejo técnico primario; ZEUS no los estima."
  },
  e99m: {
    datosPlan: [
      { etiqueta: "Cantidad", valor: "3 E-99M Erieye" },
      { etiqueta: "Ubicación", valor: "3ª BA · Córdoba" },
      { etiqueta: "Rol ZEUS", valor: "AEW&C / vigilancia / C2" }
    ],
    notaTecnica: "Performance de la variante E-99M pendiente de consolidar desde fuente técnica primaria."
  },
  ec130h: {
    especificaciones: [
      { etiqueta: "Velocidad", valor: "300 mph (Mach 0,52) a 20.000 ft" },
      { etiqueta: "Alcance", valor: "2.295 mi / 3.694 km" },
      { etiqueta: "Techo", valor: "25.000 ft / 7,6 km" },
      { etiqueta: "MTOW", valor: "155.000 lb / 69.750 kg" },
      { etiqueta: "Combustible", valor: "41.000 lb / 18.597 kg" },
      { etiqueta: "Armamento", valor: "No cinético · ataque electromagnético" }
    ],
    datosPlan: [
      { etiqueta: "Cantidad", valor: "2 EC-130H Compass Call" },
      { etiqueta: "Ubicación", valor: "5ª BA · Gral. Acha" },
      { etiqueta: "Rol ZEUS", valor: "Guerra electrónica / AE / ERA / C2" }
    ],
    fuenteTecnica: "USAF / Air Combat Command · EC-130H Compass Call"
  },
  hermes450: {
    datosPlan: [
      { etiqueta: "Cantidad", valor: "6 Hermes 450" },
      { etiqueta: "Ubicación", valor: "2ª BA y 5ª BA" },
      { etiqueta: "Rol ZEUS", valor: "ISR / ELINT / COMINT" }
    ],
    notaTecnica: "Performance pendiente de cotejo con documentación técnica primaria."
  },
  c130j: {
    especificaciones: [
      { etiqueta: "Velocidad máx. crucero", valor: "365 KTAS / 675 km/h" },
      { etiqueta: "Alcance con 40.000 lb", valor: "≈ 2.160 NM / 4.000 km" },
      { etiqueta: "MTOW", valor: "164.000 lb / 74.389 kg" },
      { etiqueta: "Carga útil máx.", valor: "≈ 44.000 lb / 19.958 kg (según variante)" }
    ],
    datosPlan: [
      { etiqueta: "Cantidad", valor: "10 C-130J" },
      { etiqueta: "Ubicación", valor: "1ª BA · La Rioja" },
      { etiqueta: "Rol ZEUS", valor: "Transporte táctico · carga · tropas · asalto aéreo" }
    ],
    fuenteTecnica: "Lockheed Martin · C-130J Super Hercules",
    notaTecnica: "Alcance y carga dependen de variante y perfil; se muestran como referencia de familia."
  },
  kc130j: {
    especificaciones: [
      { etiqueta: "Velocidad máx. crucero", valor: "≈ 365 KTAS / 675 km/h" },
      { etiqueta: "Alcance con 40.000 lb", valor: "≈ 1.980 NM (familia KC/HC/MC-130J)" },
      { etiqueta: "MTOW", valor: "164.000 lb / 74.389 kg" }
    ],
    datosPlan: [
      { etiqueta: "Cantidad", valor: "4 KC-130J" },
      { etiqueta: "Ubicación", valor: "1ª BA · La Rioja" },
      { etiqueta: "Rol ZEUS", valor: "Reabastecimiento en vuelo / transporte" }
    ],
    fuenteTecnica: "Lockheed Martin · C-130J family data"
  },
  kc135: {
    especificaciones: [
      { etiqueta: "Velocidad", valor: "530 mph a 30.000 ft" },
      { etiqueta: "Techo", valor: "50.000 ft / 15.240 m" },
      { etiqueta: "Alcance con 150.000 lb transferibles", valor: "1.500 mi / 2.419 km" },
      { etiqueta: "Alcance ferry", valor: "Hasta 11.015 mi / 17.766 km" },
      { etiqueta: "MTOW", valor: "322.500 lb / 146.285 kg" },
      { etiqueta: "Combustible transferible máx.", valor: "200.000 lb / 90.719 kg" }
    ],
    datosPlan: [
      { etiqueta: "Cantidad", valor: "6 KC-135" },
      { etiqueta: "Ubicación", valor: "3ª BA (3) · 4ª BA (3)" },
      { etiqueta: "Rol ZEUS", valor: "Reabastecimiento en vuelo" }
    ],
    fuenteTecnica: "USAF · KC-135 Stratotanker Fact Sheet"
  },
  lj60: {
    datosPlan: [
      { etiqueta: "Cantidad", valor: "6 Learjet 60" },
      { etiqueta: "Rol ZEUS", valor: "VIP / MEDEVAC" }
    ],
    notaTecnica: "Performance de la variante operativa pendiente de cotejo técnico primario."
  },
  dhc6: {
    especificaciones: [
      { etiqueta: "Alcance máx. (cero carga)", valor: "763 NM / 1.413 km · tanques estándar" },
      { etiqueta: "Alcance máx. LR", valor: "833 NM / 1.542 km · tanques largo alcance" },
      { etiqueta: "Velocidad máx. autonomía", valor: "100 KIAS (referencia de familia)" }
    ],
    datosPlan: [
      { etiqueta: "Cantidad", valor: "12 DHC-6-400" },
      { etiqueta: "Rol ZEUS", valor: "Transporte ligero · carga · tropas · asalto aéreo" }
    ],
    fuenteTecnica: "De Havilland Canada · Twin Otter Series 400"
  },
  ch47: {
    especificaciones: [
      { etiqueta: "Velocidad máxima", valor: "170 KTAS / 302 km/h" },
      { etiqueta: "Radio de misión", valor: "165 NM / 306 km" },
      { etiqueta: "Peso bruto máx.", valor: "54.000 lb / 24.494 kg" },
      { etiqueta: "Combustible", valor: "1.080 US gal / 4.088 L" }
    ],
    datosPlan: [
      { etiqueta: "Cantidad", valor: "12 CH-47F" },
      { etiqueta: "Rol ZEUS", valor: "Transporte · asalto aéreo · búsqueda/recuperación" }
    ],
    fuenteTecnica: "Boeing · CH-47F Chinook"
  },
  uh1y: {
    especificaciones: [
      { etiqueta: "Velocidad máxima", valor: "170 KIAS" },
      { etiqueta: "Crucero", valor: "147 KTAS" },
      { etiqueta: "Radio de combate", valor: "119 NM" },
      { etiqueta: "Alcance máximo", valor: "325 NM" },
      { etiqueta: "Capacidad", valor: "4 + 8 personas" }
    ],
    datosPlan: [
      { etiqueta: "Cantidad", valor: "16 UH-1Y" },
      { etiqueta: "Rol ZEUS", valor: "Transporte · asalto aéreo · búsqueda/recuperación" }
    ],
    fuenteTecnica: "Bell · UH-1Y Venom"
  },
  b412: {
    especificaciones: [
      { etiqueta: "Peso bruto máx. interno", valor: "12.200 lb / 5.534 kg" },
      { etiqueta: "Peso bruto máx. externo", valor: "13.000 lb / 5.897 kg" },
      { etiqueta: "Carga de gancho", valor: "5.000 lb / 2.268 kg" }
    ],
    datosPlan: [
      { etiqueta: "Cantidad", valor: "14 B-412" },
      { etiqueta: "Rol ZEUS", valor: "CASEVAC · SAR · transporte" }
    ],
    fuenteTecnica: "Bell · Bell 412"
  },
  tps77: {
    datosPlan: [
      { etiqueta: "Cantidad", valor: "3 TPS-77 MRR" },
      { etiqueta: "Alcance máximo", valor: "250–300 NM" },
      { etiqueta: "Cobertura", valor: "Vigilancia 360°" }
    ],
    notaTecnica: "Valores del Plan ZEUS."
  },
  gm400: {
    datosPlan: [
      { etiqueta: "Cantidad", valor: "1 GM400 Alpha" },
      { etiqueta: "Alcance máximo", valor: "270–320 NM" },
      { etiqueta: "Cobertura", valor: "Vigilancia 360°" }
    ],
    notaTecnica: "Valores del Plan ZEUS."
  },
  patriot: {
    datosPlan: [
      { etiqueta: "Cantidad", valor: "2 baterías" },
      { etiqueta: "Alcance", valor: "160 km" },
      { etiqueta: "Altura máxima", valor: "24.240 m" }
    ],
    notaTecnica: "Valores del Plan ZEUS."
  },
  nasams: {
    datosPlan: [
      { etiqueta: "Cantidad", valor: "6 baterías" },
      { etiqueta: "MR", valor: "35 km · 16.000 m" },
      { etiqueta: "SR", valor: "15 km · 9.000 m" }
    ],
    notaTecnica: "Valores del Plan ZEUS."
  },
  skyguard: {
    datosPlan: [
      { etiqueta: "Cantidad", valor: "8 baterías" },
      { etiqueta: "Alcance", valor: "4.000 m" },
      { etiqueta: "Altura máxima", valor: "4.000 m" }
    ],
    notaTecnica: "Valores del Plan ZEUS."
  },
  rbs70: {
    datosPlan: [
      { etiqueta: "Cantidad", valor: "80 lanzadores" },
      { etiqueta: "Alcance", valor: "9 km" },
      { etiqueta: "Altura máxima", valor: "5.000 m" }
    ],
    notaTecnica: "Valores del Plan ZEUS."
  },
  landcruiser: { datosPlan: [{ etiqueta: "Cantidad", valor: "35" }, { etiqueta: "Rol", valor: "Movilidad terrestre" }] },
  sprinter: { datosPlan: [{ etiqueta: "Cantidad", valor: "12" }, { etiqueta: "Rol", valor: "Transporte" }] },
  amarok: { datosPlan: [{ etiqueta: "Cantidad", valor: "22" }, { etiqueta: "Rol", valor: "Movilidad terrestre" }] },
  unimog: { datosPlan: [{ etiqueta: "Cantidad", valor: "30" }, { etiqueta: "Rol", valor: "Transporte táctico/logístico" }] },
  camion20: { datosPlan: [{ etiqueta: "Cantidad", valor: "7" }, { etiqueta: "Capacidad nominal ZEUS", valor: "20 Tn" }] },
  camion5: { datosPlan: [{ etiqueta: "Cantidad", valor: "10" }, { etiqueta: "Capacidad nominal ZEUS", valor: "5 Tn" }] },
  meko360: { datosPlan: [{ etiqueta: "Cantidad", valor: "4" }, { etiqueta: "Ubicación", valor: "Puerto Aguas Negras" }, { etiqueta: "Rol ZEUS", valor: "Guerra de superficie / defensa" }], notaTecnica: "Performance naval pendiente de cotejo técnico primario." },
  meko140: { datosPlan: [{ etiqueta: "Cantidad", valor: "6" }, { etiqueta: "Ubicación", valor: "Puerto Aguas Negras" }, { etiqueta: "Rol ZEUS", valor: "Guerra de superficie" }] },
  drummond: { datosPlan: [{ etiqueta: "Cantidad", valor: "4" }, { etiqueta: "Rol ZEUS", valor: "Guerra de superficie" }] },
  sigma: { datosPlan: [{ etiqueta: "Cantidad", valor: "4" }, { etiqueta: "Rol ZEUS", valor: "Patrulla oceánica de largo alcance" }] },
  bouchard: { datosPlan: [{ etiqueta: "Cantidad", valor: "8" }, { etiqueta: "Rol ZEUS", valor: "Patrulla" }] },
  tipo209: { datosPlan: [{ etiqueta: "Cantidad", valor: "3" }, { etiqueta: "Ubicación", valor: "Las Cuevas" }, { etiqueta: "Rol ZEUS", valor: "Guerra submarina" }] },
  tr1700: { datosPlan: [{ etiqueta: "Cantidad", valor: "4" }, { etiqueta: "Ubicación", valor: "Las Cuevas" }, { etiqueta: "Rol ZEUS", valor: "Guerra submarina" }] },
  p3: { datosPlan: [{ etiqueta: "Cantidad", valor: "2" }, { etiqueta: "Ubicación", valor: "Las Cuevas" }, { etiqueta: "Rol ZEUS", valor: "Guerra antisubmarina" }], notaTecnica: "Performance específica pendiente de consolidación desde fuente primaria." },
  s2t: { datosPlan: [{ etiqueta: "Cantidad", valor: "4" }, { etiqueta: "Ubicación", valor: "Las Cuevas" }, { etiqueta: "Rol ZEUS", valor: "Guerra antisubmarina" }], notaTecnica: "Performance específica pendiente de consolidación desde fuente primaria." }
};

for (const medio of medios) {
  const ficha = fichasTecnicasZEUS[medio.id];
  if (!ficha) continue;
  medio.especificaciones = ficha.especificaciones ?? medio.especificaciones;
  medio.datosPlan = ficha.datosPlan ?? medio.datosPlan;
  medio.fuenteTecnica = ficha.fuenteTecnica ?? medio.fuenteTecnica;
  medio.notaTecnica = ficha.notaTecnica ?? medio.notaTecnica;
  medio.armamentoPlan = ficha.armamentoPlan ?? medio.armamentoPlan;
}

export const f16General = {
  funcion: "Caza multirrol",
  longitud: "14,8 m",
  envergadura: "9,8 m",
  altura: "4,8 m",
  pesoSinCombustible: "8.936 kg",
  mtow: "16.875 kg",
  combustibleInterno: "3.175 kg",
  combustibleTipicoExterno: "5.443 kg totales con 2 tanques externos",
  velocidad: "Mach 2 / 1.500 mph en altura",
  alcanceFerry: "> 1.740 NM",
  radioCombateAS: "> 500 mi / 860 km (misión A/S de referencia)",
  techo: "> 50.000 ft / 15 km",
  limiteG: "Hasta 9 G con combustible interno completo",
  armamentoFijo: "M61A1 20 mm",
};

export type Compatibilidad = {
  id: string;
  nombre: string;
  tipo: string;
  inventarioZeus?: string;
  datoPlan?: string;
  block40: "si" | "condicionado" | "por-verificar";
  block42: "si" | "condicionado" | "por-verificar";
  block50: "si" | "condicionado" | "por-verificar";
  requisito?: string;
  imagen2d?: string;
  nivelModelo?: NivelModelo;
};

export const f16Compatibilidad: Compatibilidad[] = [
  { id: "mk84", nombre: "Mk 84", tipo: "A/S propósito general", inventarioZeus: "250", datoPlan: "907 kg", block40: "si", block42: "si", block50: "si" , imagen2d: "/images/medios3d/catalogo/mk84.svg", nivelModelo: "pendiente" },
  { id: "mk83", nombre: "Mk 83", tipo: "A/S propósito general", inventarioZeus: "250", datoPlan: "454 kg", block40: "si", block42: "si", block50: "si" , imagen2d: "/images/medios3d/catalogo/mk83.svg", nivelModelo: "pendiente" },
  { id: "mk82", nombre: "Mk 82", tipo: "A/S propósito general", inventarioZeus: "250", datoPlan: "227 kg", block40: "si", block42: "si", block50: "si" , imagen2d: "/images/medios3d/catalogo/mk82.svg", nivelModelo: "pendiente" },
  { id: "aim9m", nombre: "AIM-9M Sidewinder", tipo: "A/A IR", inventarioZeus: "180", datoPlan: "18 km · all aspect", block40: "si", block42: "si", block50: "si" , imagen2d: "/images/medios3d/catalogo/aim9m.svg", nivelModelo: "pendiente" },
  { id: "aim120", nombre: "AIM-120C-5 AMRAAM", tipo: "BVR A/A", inventarioZeus: "240", datoPlan: "105 km · NEZ 65 km", block40: "si", block42: "si", block50: "si" , imagen2d: "/images/medios3d/catalogo/aim120.svg", nivelModelo: "pendiente" },
  { id: "aim7p", nombre: "AIM-7P Sparrow", tipo: "BVR A/A", inventarioZeus: "220", datoPlan: "70 km", block40: "por-verificar", block42: "por-verificar", block50: "por-verificar", requisito: "Integración exacta por Block/estación pendiente de cotejo técnico." , imagen2d: "/images/medios3d/catalogo/aim7p.svg", nivelModelo: "pendiente" },
  { id: "agm65g", nombre: "AGM-65G Maverick", tipo: "A/S antiblindaje", inventarioZeus: "120", datoPlan: "302 kg · 34 km · guía TV según Plan", block40: "si", block42: "si", block50: "si" , imagen2d: "/images/medios3d/catalogo/agm65g.svg", nivelModelo: "pendiente" },
  { id: "agm88c", nombre: "AGM-88C HARM", tipo: "A/S antirradiación", inventarioZeus: "140", datoPlan: "148 km", block40: "por-verificar", block42: "por-verificar", block50: "condicionado", requisito: "En ZEUS se asocia al F-16CJ Block 50 y al AN/ASQ-213. La compatibilidad exacta de otros Blocks se deja pendiente de verificación por configuración." , imagen2d: "/images/medios3d/catalogo/agm88c.svg", nivelModelo: "pendiente" },
  { id: "gbu10", nombre: "GBU-10 Paveway II", tipo: "A/S guiada láser", inventarioZeus: "48", datoPlan: "Usa Mk-84", block40: "si", block42: "si", block50: "si", requisito: "Designación láser / pod de targeting según configuración." , imagen2d: "/images/medios3d/catalogo/gbu10.svg", nivelModelo: "pendiente" },
  { id: "gbu12", nombre: "GBU-12 Paveway II", tipo: "A/S guiada láser", inventarioZeus: "48", datoPlan: "Usa Mk-82", block40: "si", block42: "si", block50: "si", requisito: "Designación láser / pod de targeting según configuración." , imagen2d: "/images/medios3d/catalogo/gbu12.svg", nivelModelo: "pendiente" },
  { id: "gbu38", nombre: "GBU-38 JDAM", tipo: "A/S GPS/INS", inventarioZeus: "78", datoPlan: "Mk-82", block40: "si", block42: "si", block50: "si" , imagen2d: "/images/medios3d/catalogo/gbu38.svg", nivelModelo: "pendiente" },
  { id: "penguin", nombre: "AGM-119 Penguin", tipo: "Antibuque", inventarioZeus: "80", datoPlan: "385 kg · 55 km", block40: "por-verificar", block42: "por-verificar", block50: "por-verificar", requisito: "Disponible en inventario del Plan, pero integración exacta por variante/estación pendiente." , imagen2d: "/images/medios3d/catalogo/penguin.svg", nivelModelo: "pendiente" },
  { id: "lantirn", nombre: "AN/AAQ-13/14 LANTIRN", tipo: "NAV / targeting / FLIR", inventarioZeus: "34 + 34", block40: "condicionado", block42: "condicionado", block50: "por-verificar", requisito: "Compatibilidad y estación exacta por Block se mostrará tras cotejo específico." , imagen2d: "/images/medios3d/catalogo/lantirn.svg", nivelModelo: "pendiente" },
  { id: "asq213", nombre: "AN/ASQ-213 HTS", tipo: "HARM Targeting System", inventarioZeus: "10", block40: "por-verificar", block42: "por-verificar", block50: "condicionado", requisito: "Configuración SEAD / F-16CJ en ZEUS." , imagen2d: "/images/medios3d/catalogo/asq213.svg", nivelModelo: "pendiente" },
  { id: "alq", nombre: "AN/ALQ-184 / 131", tipo: "ECM", inventarioZeus: "32 + 32", block40: "condicionado", block42: "condicionado", block50: "condicionado", requisito: "Pod ECM; estación/configuración exacta según variante." , imagen2d: "/images/medios3d/catalogo/alq.svg", nivelModelo: "pendiente" },
  { id: "lau61", nombre: "LAU-61 / LAU-66", tipo: "Lanzador de cohetes A/S", inventarioZeus: "450 / 450", datoPlan: "Cohetes A/S", block40: "si", block42: "si", block50: "si", requisito: "Representación 2D provisional hasta disponer de modelo 3D verificable." , imagen2d: "/images/medios3d/catalogo/lau61.svg", nivelModelo: "pendiente" },
  { id: "tank300", nombre: "Tanque externo 300 US gal", tipo: "Combustible externo", inventarioZeus: "76", datoPlan: "300 US gal", block40: "si", block42: "si", block50: "si", requisito: "Representación 2D provisional hasta disponer de modelo 3D verificable." , imagen2d: "/images/medios3d/catalogo/tank300.svg", nivelModelo: "pendiente" },
  { id: "tank370", nombre: "Tanque externo 370 US gal", tipo: "Combustible externo", inventarioZeus: "152", datoPlan: "370 US gal", block40: "si", block42: "si", block50: "si", requisito: "Representación 2D provisional hasta disponer de modelo 3D verificable." , imagen2d: "/images/medios3d/catalogo/tank370.svg", nivelModelo: "pendiente" },
];
