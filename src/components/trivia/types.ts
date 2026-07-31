export type TriviaQuestionType = "multiple_choice" | "verdadero_falso" | "desarrollo";

export type TriviaOption = {
  id: string;
  texto: string;
  textoOriginal: string;
};

export type TriviaEvidenceFragment = {
  texto: string;
  pagina: string;
  parrafo?: string;
};

export type TriviaQuestion = {
  id: string;
  numero: number;
  categoria: string;
  categoriaOriginal?: string;
  tipo: TriviaQuestionType;
  pregunta: string;
  preguntaOriginal: string;
  opciones: TriviaOption[];
  respuestaCorrecta: string | null;
  respuestaDesarrollo: string | null;
  justificacionDoctrinaria: string;
  fragmentosPpc?: TriviaEvidenceFragment[];
  fuenteRaw: string;
  nivelSeguridad: "alto" | "medio" | "dudoso";
  tipoVerificacion: string;
  activa: boolean;
  hashExacto: string;
};

export type TriviaMode = "estudio" | "examen";

export type SessionAnswer = {
  questionId: string;
  selectedOptionId?: string;
  developmentText?: string;
  correct: boolean | null;
  elapsedSeconds: number;
  answeredAt: string;
};
