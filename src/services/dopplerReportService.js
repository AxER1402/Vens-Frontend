import api from './api';

/**
 * Reporte de Ecodöppler venoso de miembros inferiores.
 *
 * El formulario trabaja en camelCase (derSegmentos) y el API en snake_case
 * (der_segmentos). La conversión vive aquí para que la pantalla no tenga que
 * conocer el nombre de las columnas.
 */

/** Lados que informa un estudio: der = MID, izq = MII */
export const LADOS = ['der', 'izq'];

/**
 * Segmentos del sistema venoso superficial que informa cada miembro. Los tres
 * primeros llevan siempre el mismo nombre; los dos últimos los nombra el médico
 * según lo que haya evaluado de más. La lista viaja completa y ordenada porque
 * es la posición, y no el nombre, lo que identifica a cada segmento.
 */
export const SEGMENTOS_FIJOS = ['SFJ', 'GSV Muslo', 'GSV Pierna'];
export const TOTAL_SEGMENTOS = 5;

/** Medidas de cada segmento, en el orden en que se informan en pantalla. */
export const MEDIDAS_SEGMENTO = [
  { campo: 'diametroMax', api: 'diametro_max', label: 'Ø Max.', unidad: 'mm' },
  { campo: 'velocidad', api: 'velocidad', label: 'Velocidad', unidad: 'cm/s' },
  { campo: 'duracion', api: 'duracion', label: 'Duración', unidad: 's' },
  { campo: 'observaciones', api: 'observaciones', label: 'Observaciones', texto: true },
  { campo: 'diametro', api: 'diametro', label: 'Diámetro', unidad: 'mm' },
];

/** Campos de texto de un lado, en el orden en que se informan */
const CAMPOS_TEXTO = ['profundo', 'perforantes', 'trombosis'];

/* ── Conversión de nombres ──────────────────────────────────────────────── */

/** diametroMax -> diametro_max */
const aSnake = (campo) => campo.replace(/([A-Z])/g, '_$1').toLowerCase();

/** ('der', 'segmentos') -> derSegmentos */
export const campoForm = (lado, campo) => `${lado}${campo.charAt(0).toUpperCase()}${campo.slice(1)}`;

/** ('der', 'segmentos') -> der_segmentos */
const campoApi = (lado, campo) => `${lado}_${aSnake(campo)}`;

/* ── Conversión de valores ──────────────────────────────────────────────── */

/** Una cadena vacía es ausencia de dato, no texto en blanco. */
const aTexto = (valor) => {
  const texto = String(valor ?? '').trim();
  return texto === '' ? null : texto;
};

/**
 * Diámetro en milímetros. Se acepta la coma decimal porque es lo que se digita
 * en el teclado local; lo que no sea numérico se envía tal cual para que el
 * backend devuelva su propio mensaje de validación.
 */
const aNumero = (valor) => {
  const texto = String(valor ?? '').trim().replace(',', '.');
  if (texto === '') return null;

  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : texto;
};

/** El API devuelve los decimales como '4.10'; el formulario muestra '4.1'. */
const aTextoNumero = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '';

  const numero = Number(valor);
  return Number.isFinite(numero) ? String(numero) : String(valor);
};

/* ── Formulario ─────────────────────────────────────────────────────────── */

/** Un segmento en blanco; los tres fijos arrancan con su nombre ya puesto. */
const segmentoVacio = (nombre = '') => ({
  nombre,
  ...Object.fromEntries(MEDIDAS_SEGMENTO.map(medida => [medida.campo, ''])),
});

/** Las cinco posiciones que informa un miembro. */
export const segmentosIniciales = () => [
  ...SEGMENTOS_FIJOS.map(nombre => segmentoVacio(nombre)),
  ...Array.from(
    { length: TOTAL_SEGMENTOS - SEGMENTOS_FIJOS.length },
    () => segmentoVacio()
  ),
];

/**
 * Campos de un miembro. El estudio arranca en blanco a propósito: los hallazgos
 * se escriben mientras se hace la ecografía, y un texto prellenado se termina
 * guardando sin leer.
 */
const camposLado = (lado) => ({
  [campoForm(lado, 'profundo')]: '',
  [campoForm(lado, 'perforantes')]: '',
  [campoForm(lado, 'trombosis')]: '',
  [campoForm(lado, 'segmentos')]: segmentosIniciales(),
});

/** Estado inicial del formulario de Ecodöppler. */
export const createEmptyForm = () => ({
  fecha: new Date().toISOString().split('T')[0],
  ...camposLado('der'),
  ...camposLado('izq'),
  conclusion: '',
});

/** Los segmentos del formulario, con los nombres de columna del API. */
const segmentosApi = (segmentos) => {
  const lista = Array.isArray(segmentos) ? segmentos : segmentosIniciales();

  return lista.map(segmento => ({
    nombre: aTexto(segmento.nombre),
    ...Object.fromEntries(MEDIDAS_SEGMENTO.map(medida => [
      medida.api,
      medida.texto ? aTexto(segmento[medida.campo]) : aNumero(segmento[medida.campo]),
    ])),
  }));
};

/** Los segmentos guardados, de vuelta al formulario. */
const segmentosForm = (guardados) => {
  const base = segmentosIniciales();

  if (!Array.isArray(guardados)) return base;

  return base.map((vacio, indice) => {
    const guardado = guardados[indice];
    if (!guardado) return vacio;

    return {
      // Un nombre nulo en una posición fija recupera el nombre del catálogo
      nombre: guardado.nombre ?? vacio.nombre,
      ...Object.fromEntries(MEDIDAS_SEGMENTO.map(medida => [
        medida.campo,
        medida.texto ? (guardado[medida.api] ?? '') : aTextoNumero(guardado[medida.api]),
      ])),
    };
  });
};

/**
 * Armar el payload que espera el API a partir del estado del formulario.
 *
 * @param {Object} form - estado del formulario de Ecodöppler
 * @param {number|string} patientId
 * @param {number|string|null} clinicalHistoryId - consulta a la que se adjunta
 * @param {'Borrador'|'Finalizada'} estadoRegistro
 */
export const buildDopplerReportPayload = (form, patientId, clinicalHistoryId, estadoRegistro = 'Finalizada') => {
  const hallazgos = {};

  LADOS.forEach(lado => {
    CAMPOS_TEXTO.forEach(campo => {
      hallazgos[campoApi(lado, campo)] = aTexto(form[campoForm(lado, campo)]);
    });

    hallazgos[campoApi(lado, 'segmentos')] = segmentosApi(form[campoForm(lado, 'segmentos')]);
  });

  return {
    patient_id: Number(patientId),
    clinical_history_id: clinicalHistoryId ? Number(clinicalHistoryId) : null,
    // La columna no admite nulos: si el campo viene vacío no se envía, así el
    // registro nuevo toma la fecha de hoy y el existente conserva la suya.
    ...(form.fecha ? { fecha_estudio: form.fecha } : {}),
    conclusion: aTexto(form.conclusion),
    estado_registro: estadoRegistro,
    ...hallazgos,
  };
};

/** Cargar un reporte guardado en el formulario. */
export const mapDopplerReportToForm = (reporte) => {
  const form = createEmptyForm();

  form.fecha = reporte.fecha_estudio
    ? String(reporte.fecha_estudio).slice(0, 10)
    : form.fecha;
  form.conclusion = reporte.conclusion ?? '';

  LADOS.forEach(lado => {
    CAMPOS_TEXTO.forEach(campo => {
      form[campoForm(lado, campo)] = reporte[campoApi(lado, campo)] ?? '';
    });

    form[campoForm(lado, 'segmentos')] = segmentosForm(reporte[campoApi(lado, 'segmentos')]);
  });

  return form;
};

/* ── Peticiones ─────────────────────────────────────────────────────────── */

/**
 * Reportes adjuntos a una consulta del expediente. Es la consulta que usa el
 * formulario para saber si el estudio ya existe y debe editarse en vez de
 * registrarse otra vez.
 */
export const getDopplerReportsByClinicalHistory = async (clinicalHistoryId) => {
  try {
    const response = await api.get(`/clinical-histories/${clinicalHistoryId}/doppler-reports`);
    return {
      success: true,
      data: response.data.data || [],
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al consultar el reporte de Ecodöppler.',
      status: error.response?.status,
    };
  }
};

/** Estudios de un paciente, del más reciente al más antiguo. */
export const getDopplerReportsByPatient = async (patientId, params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.estado_registro) queryParams.append('estado_registro', params.estado_registro);

    const queryString = queryParams.toString();
    const url = `/patients/${patientId}/doppler-reports${queryString ? `?${queryString}` : ''}`;

    const response = await api.get(url);
    return {
      success: true,
      data: response.data.data || [],
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al consultar los estudios del paciente.',
      status: error.response?.status,
    };
  }
};

/** Detalle de un reporte por ID. */
export const getDopplerReportById = async (id) => {
  try {
    const response = await api.get(`/doppler-reports/${id}`);
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al consultar el reporte de Ecodöppler.',
      status: error.response?.status,
    };
  }
};

/** Registrar un reporte nuevo (requiere Administrador o Médico). */
export const createDopplerReport = async (form, patientId, clinicalHistoryId, estadoRegistro = 'Finalizada') => {
  try {
    const payload = buildDopplerReportPayload(form, patientId, clinicalHistoryId, estadoRegistro);

    const response = await api.post('/doppler-reports', payload);
    return {
      success: true,
      message: response.data.message || 'Reporte de Ecodöppler guardado exitosamente.',
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al guardar el reporte de Ecodöppler.',
      errors: error.response?.data?.errors,
      status: error.response?.status,
    };
  }
};

/**
 * Actualizar un reporte existente (requiere Administrador o Médico).
 * El backend ignora patient_id: un estudio no se traslada a otro expediente.
 */
export const updateDopplerReport = async (id, form, patientId, clinicalHistoryId, estadoRegistro = 'Finalizada') => {
  try {
    const payload = buildDopplerReportPayload(form, patientId, clinicalHistoryId, estadoRegistro);

    const response = await api.put(`/doppler-reports/${id}`, payload);
    return {
      success: true,
      message: response.data.message || 'Reporte de Ecodöppler actualizado exitosamente.',
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al actualizar el reporte de Ecodöppler.',
      errors: error.response?.data?.errors,
      status: error.response?.status,
    };
  }
};

/** Desactivación lógica: el estudio forma parte del expediente y no se borra. */
export const deactivateDopplerReport = async (id) => {
  try {
    const response = await api.delete(`/doppler-reports/${id}`);
    return {
      success: true,
      message: response.data.message || 'Reporte de Ecodöppler desactivado exitosamente.',
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al desactivar el reporte de Ecodöppler.',
      status: error.response?.status,
    };
  }
};
