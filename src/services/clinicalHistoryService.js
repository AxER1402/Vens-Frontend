import api from './api';

/**
 * Correspondencia entre los campos de selección múltiple del formulario y las
 * categorías del catálogo clínico del backend (tabla clinical_options).
 */
const CATEGORIAS = {
  zonasPierna: 'zonas_pierna',
  sintomas: 'sintomas',
  sintomasAumentan: 'sintomas_aumentan',
  sintomasDisminuyen: 'sintomas_disminuyen',
  enfermedades: 'enfermedades',
  ceapDiagnostico: 'ceap_diagnostico',
  txZonas: 'tx_zonas',
  indicaciones: 'indicaciones',
  observaciones: 'observaciones',
};

/**
 * Antecedentes que pertenecen al paciente y no a una consulta puntual: al abrir
 * una consulta nueva se copian desde la anterior como punto de partida editable.
 * `ultimaMenstruacion` queda fuera a propósito porque cambia en cada visita.
 */
const CAMPOS_ANTECEDENTES = [
  'familiarVarices',
  'alergias',
  'cirugias',
  'gestas',
  'abortos',
  'partos',
  'cesareas',
  'hijosVivos',
  'hijosMuertos',
  'hormonas',
  'enfermedades',
  'enfermedadesOtros',
];

/** Formulario vacío: el estado inicial de una consulta sin datos. */
export const createEmptyForm = () => ({
  consultaPor: '',
  zonasPierna: [],
  sintomas: [],
  sintomasAumentan: [],
  sintomasDisminuyen: [],
  disminuyenOtros: '',
  familiarVarices: '',
  alergias: '',
  cirugias: '',
  gestas: '', abortos: '', partos: '', cesareas: '', hijosVivos: '', hijosMuertos: '',
  ultimaMenstruacion: '', hormonas: '',
  enfermedades: [], enfermedadesOtros: '',
  ta: '', fc: '', fr: '', temp: '', peso: '',
  tobillo: '', pantorrilla: '',
  ubicacion: '',
  ceapC: '',
  ceapDiagnostico: [],
  txZonas: [],
  escleroConcentracion: '', escleroForma: '', escleroVolumen: '',
  indicaciones: [], indicacionesDetalle: {}, indicacionesOtros: '',
  evolucion: '', observaciones: [], estado: '', notas: '',
});

/** Texto opcional: las cadenas vacías del formulario se envían como null. */
const texto = (valor) => {
  const limpio = (valor ?? '').toString().trim();
  return limpio === '' ? null : limpio;
};

/**
 * Entero opcional. Si el usuario escribió algo que no es un número, se envía
 * tal cual para que el backend responda con el mensaje de validación real.
 */
const entero = (valor) => {
  const limpio = texto(valor);
  if (limpio === null) return null;
  return /^\d+$/.test(limpio) ? Number.parseInt(limpio, 10) : limpio;
};

/**
 * Decimal opcional. Admite la unidad que el usuario suele escribir junto al
 * número (1%, 2.5 ml, 68 kg) y envía solo la cantidad.
 */
const decimal = (valor) => {
  const limpio = texto(valor);
  if (limpio === null) return null;

  const cantidad = limpio
    .replace(',', '.')
    .replace(/\s*(%|cm|ml|mL|kg|lbs?|°?\s*[cC])\s*$/, '')
    .trim();

  return /^\d+(\.\d+)?$/.test(cantidad) ? Number.parseFloat(cantidad) : limpio;
};

/** Los chips 'Sí' / 'No' se persisten como booleano. */
const booleano = (valor) => {
  if (valor === 'Sí') return true;
  if (valor === 'No') return false;
  return null;
};

/**
 * Qué se recetó en cada indicación marcada, indexado por el valor del catálogo.
 * Se descartan las indicaciones sin marcar y las que quedaron en blanco para no
 * archivar recetas de tratamientos que no se indicaron.
 */
const construirDetalleIndicaciones = (form) => {
  const marcadas = Array.isArray(form.indicaciones) ? form.indicaciones : [];
  const detalle = {};

  marcadas.forEach((indicacion) => {
    const escrito = texto(form.indicacionesDetalle?.[indicacion]);
    if (escrito !== null) detalle[indicacion] = escrito;
  });

  return Object.keys(detalle).length > 0 ? detalle : null;
};

/** Agrupar las listas marcadas por categoría del catálogo. */
const construirSelecciones = (form) => {
  const selecciones = {};

  Object.entries(CATEGORIAS).forEach(([campo, categoria]) => {
    selecciones[categoria] = Array.isArray(form[campo]) ? form[campo] : [];
  });

  return selecciones;
};

/**
 * Traducir el estado `form` de la pantalla de Historia Clínica al payload que
 * espera el backend. Solo se envía patient_id como relación: los datos del
 * paciente ya viven en la tabla de pacientes y no se duplican aquí.
 */
export const buildClinicalHistoryPayload = (form, patientId, estadoRegistro = 'Finalizada') => ({
  patient_id: Number(patientId),
  estado_registro: estadoRegistro,

  // Interrogatorio y síntomas
  consulta_por: texto(form.consultaPor),
  disminuyen_otros: texto(form.disminuyenOtros),

  // Antecedentes
  familiar_varices: booleano(form.familiarVarices),
  alergias: texto(form.alergias),
  cirugias: texto(form.cirugias),

  // Antecedentes ginecológicos
  gestas: entero(form.gestas),
  abortos: entero(form.abortos),
  partos: entero(form.partos),
  cesareas: entero(form.cesareas),
  hijos_vivos: entero(form.hijosVivos),
  hijos_muertos: entero(form.hijosMuertos),
  ultima_menstruacion: texto(form.ultimaMenstruacion),
  hormonas: texto(form.hormonas),
  enfermedades_otros: texto(form.enfermedadesOtros),

  // Examen físico
  presion_arterial: texto(form.ta),
  frecuencia_cardiaca: entero(form.fc),
  frecuencia_respiratoria: entero(form.fr),
  temperatura: decimal(form.temp),
  peso: decimal(form.peso),
  perimetro_tobillo: decimal(form.tobillo),
  perimetro_pantorrilla: decimal(form.pantorrilla),
  ubicacion_patologia: texto(form.ubicacion),

  // Diagnóstico CEAP: la clase clínica (ej: C2a) es un dato propio de la consulta
  ceap_c: texto(form.ceapC),

  // Plan de tratamiento y escleroterapia
  esclero_concentracion: decimal(form.escleroConcentracion),
  esclero_forma: texto(form.escleroForma),
  esclero_volumen: decimal(form.escleroVolumen),
  indicaciones_detalle: construirDetalleIndicaciones(form),
  indicaciones_otros: texto(form.indicacionesOtros),

  // Evolución y observaciones
  evolucion: texto(form.evolucion),
  estado_general: texto(form.estado),
  notas: texto(form.notas),

  // Listas de selección múltiple
  selecciones: construirSelecciones(form),
});

/**
 * Reconstruir el estado `form` a partir de una historia clínica del backend.
 */
export const mapClinicalHistoryToForm = (historia) => {
  const selecciones = historia.selecciones || {};
  const lista = (categoria) => (Array.isArray(selecciones[categoria]) ? selecciones[categoria] : []);
  const valor = (dato) => (dato === null || dato === undefined ? '' : String(dato));

  return {
    consultaPor: valor(historia.consulta_por),
    zonasPierna: lista('zonas_pierna'),
    sintomas: lista('sintomas'),
    sintomasAumentan: lista('sintomas_aumentan'),
    sintomasDisminuyen: lista('sintomas_disminuyen'),
    disminuyenOtros: valor(historia.disminuyen_otros),
    familiarVarices: historia.familiar_varices === null || historia.familiar_varices === undefined
      ? ''
      : (historia.familiar_varices ? 'Sí' : 'No'),
    alergias: valor(historia.alergias),
    cirugias: valor(historia.cirugias),
    gestas: valor(historia.gestas),
    abortos: valor(historia.abortos),
    partos: valor(historia.partos),
    cesareas: valor(historia.cesareas),
    hijosVivos: valor(historia.hijos_vivos),
    hijosMuertos: valor(historia.hijos_muertos),
    ultimaMenstruacion: valor(historia.ultima_menstruacion),
    hormonas: valor(historia.hormonas),
    enfermedades: lista('enfermedades'),
    enfermedadesOtros: valor(historia.enfermedades_otros),
    ta: valor(historia.presion_arterial),
    fc: valor(historia.frecuencia_cardiaca),
    fr: valor(historia.frecuencia_respiratoria),
    temp: valor(historia.temperatura),
    peso: valor(historia.peso),
    tobillo: valor(historia.perimetro_tobillo),
    pantorrilla: valor(historia.perimetro_pantorrilla),
    ubicacion: valor(historia.ubicacion_patologia),
    ceapC: valor(historia.ceap_c),
    ceapDiagnostico: lista('ceap_diagnostico'),
    txZonas: lista('tx_zonas'),
    escleroConcentracion: valor(historia.esclero_concentracion),
    escleroForma: valor(historia.esclero_forma),
    escleroVolumen: valor(historia.esclero_volumen),
    indicaciones: lista('indicaciones'),
    indicacionesDetalle: historia.indicaciones_detalle || {},
    indicacionesOtros: valor(historia.indicaciones_otros),
    evolucion: valor(historia.evolucion),
    observaciones: lista('observaciones'),
    estado: valor(historia.estado_general),
    notas: valor(historia.notas),
  };
};

/**
 * Preparar el formulario de una consulta nueva. Los antecedentes del paciente se
 * arrastran desde la consulta anterior (si la hay) para no volver a capturarlos;
 * síntomas, examen físico, diagnóstico y tratamiento arrancan siempre en blanco
 * porque describen la visita de hoy.
 *
 * @param {Object|null} historiaPrevia - historia más reciente del paciente
 */
export const buildFormForNewConsulta = (historiaPrevia = null) => {
  const form = createEmptyForm();

  if (!historiaPrevia) return form;

  const previo = mapClinicalHistoryToForm(historiaPrevia);

  CAMPOS_ANTECEDENTES.forEach((campo) => {
    form[campo] = Array.isArray(previo[campo]) ? [...previo[campo]] : previo[campo];
  });

  return form;
};

/**
 * Obtener el catálogo de opciones clínicas agrupado por categoría
 * @param {Object} params - { categoria }
 */
export const getClinicalHistoryOptions = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.categoria) queryParams.append('categoria', params.categoria);

    const queryString = queryParams.toString();
    const url = `/clinical-history-options${queryString ? `?${queryString}` : ''}`;

    const response = await api.get(url);
    return {
      success: true,
      data: response.data.data || {},
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al obtener el catálogo clínico.',
    };
  }
};

/**
 * Obtener listado de historias clínicas con filtros opcionales
 * @param {Object} params - { patient_id, estado_registro, from_date, to_date, search }
 */
export const getClinicalHistories = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    if (params.patient_id) queryParams.append('patient_id', params.patient_id);
    if (params.estado_registro) queryParams.append('estado_registro', params.estado_registro);
    if (params.from_date) queryParams.append('from_date', params.from_date);
    if (params.to_date) queryParams.append('to_date', params.to_date);
    if (params.search && params.search.trim()) queryParams.append('search', params.search.trim());

    const queryString = queryParams.toString();
    const url = `/clinical-histories${queryString ? `?${queryString}` : ''}`;

    const response = await api.get(url);
    return {
      success: true,
      data: response.data.data || [],
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al obtener las historias clínicas.',
      errors: error.response?.data?.errors,
    };
  }
};

/**
 * Obtener el detalle de una historia clínica por ID
 */
export const getClinicalHistoryById = async (id) => {
  try {
    const response = await api.get(`/clinical-histories/${id}`);
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al consultar la historia clínica.',
    };
  }
};

/**
 * Obtener las historias clínicas de un paciente específico
 */
export const getClinicalHistoriesByPatient = async (patientId, params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.estado_registro) queryParams.append('estado_registro', params.estado_registro);

    const queryString = queryParams.toString();
    const url = `/patients/${patientId}/clinical-histories${queryString ? `?${queryString}` : ''}`;

    const response = await api.get(url);
    return {
      success: true,
      data: response.data.data || [],
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al consultar el historial del paciente.',
    };
  }
};

/**
 * Registrar una nueva historia clínica (Requiere Admin o Medico)
 * @param {Object} form - estado del formulario de Historia Clínica
 * @param {number|string} patientId
 * @param {'Borrador'|'Finalizada'} estadoRegistro
 */
export const createClinicalHistory = async (form, patientId, estadoRegistro = 'Finalizada') => {
  try {
    const payload = buildClinicalHistoryPayload(form, patientId, estadoRegistro);

    const response = await api.post('/clinical-histories', payload);
    return {
      success: true,
      message: response.data.message || 'Historia clínica guardada exitosamente.',
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al guardar la historia clínica.',
      errors: error.response?.data?.errors,
      status: error.response?.status,
    };
  }
};

/**
 * Actualizar una historia clínica existente (Requiere Admin o Medico)
 */
export const updateClinicalHistory = async (id, form, patientId, estadoRegistro = 'Finalizada') => {
  try {
    const payload = buildClinicalHistoryPayload(form, patientId, estadoRegistro);

    const response = await api.put(`/clinical-histories/${id}`, payload);
    return {
      success: true,
      message: response.data.message || 'Historia clínica actualizada exitosamente.',
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al actualizar la historia clínica.',
      errors: error.response?.data?.errors,
      status: error.response?.status,
    };
  }
};

/**
 * Guardar el mapeo venoso de una consulta.
 *
 * Viajan dos representaciones del mismo mapeo y cada una tiene su papel:
 *   - `imagen`: el PNG rasterizado, que es lo que se imprime y lo que se
 *     muestra cuando la consulta ya está finalizada;
 *   - `datos`: el documento vectorial ({ version, plantilla, objetos }), que es
 *     lo que permite reabrir el mapeo y seguir editándolo en la consulta
 *     siguiente en vez de volver a dibujarlo desde cero.
 *
 * `datos` es opcional: omitirlo deja el comportamiento anterior, que solo
 * archivaba la imagen.
 *
 * @param {number|string} id - historia clínica
 * @param {string} imagenDataUrl - `data:image/png;base64,…`
 * @param {Object} [datos] - documento vectorial del mapeo
 */
export const saveVenousMap = async (id, imagenDataUrl, datos = null) => {
  try {
    const response = await api.post(`/clinical-histories/${id}/venous-map`, {
      imagen: imagenDataUrl,
      ...(datos ? { datos } : {}),
    });
    return {
      success: true,
      message: response.data.message || 'Mapeo venoso guardado exitosamente.',
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al guardar el mapeo venoso.',
      errors: error.response?.data?.errors,
      status: error.response?.status,
    };
  }
};

/**
 * Extraer de una historia clínica lo relativo a su mapeo venoso.
 *
 * Se queda a propósito en datos crudos: interpretar el documento vectorial es
 * tarea del editor (leerDocumento), no del servicio.
 *
 * @returns {{datos: Object|null, url: string|null, actualizado: string|null}}
 */
export const mapClinicalHistoryToMapeo = (historia) => ({
  datos: historia?.mapeo_venoso_datos || null,
  url: historia?.mapeo_venoso_url || null,
  actualizado: historia?.mapeo_venoso_updated_at || null,
});

/**
 * Desactivar una historia clínica (DELETE lógico, requiere Admin o Medico)
 */
export const deactivateClinicalHistory = async (id) => {
  try {
    const response = await api.delete(`/clinical-histories/${id}`);
    return {
      success: true,
      message: response.data.message || 'Historia clínica desactivada exitosamente.',
      data: response.data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || 'Error al desactivar la historia clínica.',
      status: error.response?.status,
    };
  }
};
