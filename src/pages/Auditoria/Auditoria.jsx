import { Fragment, useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout/Layout';
import StatCard from '../../components/StatCard';
import Paginador from '../../components/Paginador';
import { useAvisos } from '../../components/Avisos';
import { Combobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { ROLE_MAP } from '@/components/forms/UserFormFields';
import {
  LogIn,
  ShieldAlert,
  UserCog,
  Wifi,
  Search,
  Users,
  ScrollText,
  Filter,
  Tag,
  User,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileSearch,
  X,
} from 'lucide-react';

import * as auditoriaService from '../../services/auditoriaService';
import './Auditoria.css';

/** El color de cada categoría, para leer la bitácora de un vistazo. */
const TONO_CATEGORIA = {
  sesion: 'tag-info',
  usuarios: 'tag-primary',
  cuenta: 'tag-success',
  registros: 'tag-warning',
  configuracion: 'tag-primary',
};

/** Los fallidos se pintan en rojo aunque sean de la categoría sesión. */
const tonoEvento = (fila) =>
  fila.evento === 'login_fallido' ? 'tag-danger' : TONO_CATEGORIA[fila.categoria] || 'tag-info';

const NOMBRE_CAMPO = {
  name: 'Nombre',
  email: 'Correo',
  rol: 'Rol',
  activo: 'Activo',
  telefono: 'Teléfono',
  password: 'Contraseña',
  foto_path: 'Foto',
  total: 'Total',
  motivo: 'Motivo',
  nombre: 'Nombre',
  precio: 'Precio',
  duracion_segundos: 'Duración (segundos)',
};

const fechaHora = (iso) =>
  iso
    ? new Date(iso).toLocaleString('es-GT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—';

/** «hace 5 min», «hace 3 h», «hace 2 días». */
const haceCuanto = (iso) => {
  if (!iso) return null;

  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

  if (minutos < 1) return 'hace un momento';
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;

  const dias = Math.floor(horas / 24);
  return `hace ${dias} día${dias === 1 ? '' : 's'}`;
};

const valorLegible = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (valor === true) return 'Sí';
  if (valor === false) return 'No';
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
};

const FILTROS_VACIOS = { search: '', categoria: '', evento: '', userId: '', desde: '', hasta: '' };

function Auditoria() {
  const avisos = useAvisos();

  const [resumen, setResumen] = useState(null);
  const [cargandoResumen, setCargandoResumen] = useState(true);

  const [catalogo, setCatalogo] = useState({ eventos: [], categorias: [], usuarios: [] });

  const [filas, setFilas] = useState([]);
  const [meta, setMeta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [abierta, setAbierta] = useState(null);

  const cargarResumen = useCallback(async () => {
    setCargandoResumen(true);
    const res = await auditoriaService.getResumen();

    if (res.success) setResumen(res.data);
    else avisos.error(res.message);

    setCargandoResumen(false);
  }, [avisos]);

  const cargarBitacora = useCallback(async () => {
    setCargando(true);
    const res = await auditoriaService.getBitacora({ ...filtros, page: pagina });

    if (res.success) {
      setFilas(res.data);
      setMeta(res.meta);
    } else {
      avisos.error(res.message);
    }

    setCargando(false);
  }, [filtros, pagina, avisos]);

  useEffect(() => {
    cargarResumen();

    auditoriaService.getCatalogo().then((res) => {
      if (res.success) setCatalogo(res.data);
    });
  }, [cargarResumen]);

  useEffect(() => {
    cargarBitacora();
  }, [cargarBitacora]);

  // Con un filtro nuevo, la página abierta puede no existir en el resultado.
  useEffect(() => {
    setPagina(1);
  }, [filtros]);

  const cambiarFiltro = (campo) => (valor) =>
    setFiltros((f) => {
      const siguiente = { ...f, [campo]: valor ?? '' };
      // Un evento de otra categoría dejaría la tabla vacía sin explicar por qué.
      if (campo === 'categoria') siguiente.evento = '';
      return siguiente;
    });

  const hayFiltros = Object.values(filtros).some(Boolean);

  const recargar = () => {
    cargarResumen();
    cargarBitacora();
  };

  const opcionesCategoria = catalogo.categorias.map((c) => ({ value: c.clave, label: c.etiqueta }));
  const opcionesEvento = catalogo.eventos
    .filter((e) => !filtros.categoria || e.categoria === filtros.categoria)
    .map((e) => ({ value: e.clave, label: e.etiqueta }));
  const opcionesUsuario = catalogo.usuarios.map((u) => ({ value: String(u.id), label: u.name }));
  const etiquetaEvento = Object.fromEntries(catalogo.eventos.map((e) => [e.clave, e.etiqueta]));

  const verIngresosDe = (id) => {
    setFiltros({ ...FILTROS_VACIOS, userId: String(id), categoria: 'sesion' });
    document.getElementById('bitacora')?.scrollIntoView({ behavior: 'smooth' });
  };

  const totales = resumen?.totales;

  return (
    <Layout breadcrumb="Auditoría">
      <div className="flat-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Auditoría</h1>
            <p className="page-subtitle">
              Inicios de sesión, cambios en las cuentas y acciones sensibles del sistema.
            </p>
          </div>
          <div className="page-actions">
            <button className="btn btn-secondary btn-sm flex items-center gap-1.5" onClick={recargar}>
              <RefreshCw size={16} className={cargando || cargandoResumen ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </div>

        <div className="stat-grid">
          <StatCard
            label="Ingresos hoy"
            value={totales ? totales.ingresos_hoy : '—'}
            icon={<LogIn size={20} />}
            tono="sage"
          />
          <StatCard
            label="Intentos fallidos (24 h)"
            value={totales ? totales.fallidos_24h : '—'}
            icon={<ShieldAlert size={20} />}
            tono={totales?.fallidos_24h > 0 ? 'rose' : 'clay'}
          />
          <StatCard
            label="Cambios en usuarios (7 días)"
            value={totales ? totales.cambios_usuarios_semana : '—'}
            icon={<UserCog size={20} />}
            tono="plum"
          />
          <StatCard
            label="Usuarios conectados"
            value={totales ? totales.usuarios_conectados : '—'}
            icon={<Wifi size={20} />}
            tono="amber"
          />
        </div>

        {/* ── Accesos por usuario ─────────────────────────────────────── */}
        <section className="hc-section">
          <div className="hc-section-head">
            <Users size={14} />
            <h2 className="hc-section-title">Accesos por usuario</h2>
          </div>
          <div className="hc-section-body">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Último ingreso</th>
                    <th className="text-right">Ingresos (7 días)</th>
                    <th className="text-right">Fallidos (7 días)</th>
                    <th>Sesión</th>
                    <th className="text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {cargandoResumen && !resumen ? (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-sm text-muted">
                        Cargando accesos…
                      </td>
                    </tr>
                  ) : (
                    (resumen?.usuarios ?? []).map((u) => {
                      const rol = ROLE_MAP[u.rol] || { label: u.rol, tagClass: 'tag-info' };
                      const conectado = u.sesiones_abiertas > 0;

                      return (
                        <tr key={u.id} className={!u.activo ? 'row-off' : ''}>
                          <td>
                            <div className="font-semibold text-brand-text text-sm">{u.name}</div>
                            <div className="text-xs text-muted">{u.email}</div>
                          </td>
                          <td>
                            <span className={`tag ${rol.tagClass}`}>{rol.label}</span>
                          </td>
                          <td className="text-sm">
                            {u.ultimo_ingreso ? (
                              <>
                                <div>{fechaHora(u.ultimo_ingreso)}</div>
                                <div className="text-xs text-muted">{haceCuanto(u.ultimo_ingreso)}</div>
                              </>
                            ) : (
                              <span className="text-muted">Sin registros</span>
                            )}
                          </td>
                          <td className="text-right font-mono text-sm">{u.ingresos_semana}</td>
                          <td className="text-right font-mono text-sm">
                            <span className={u.fallidos_semana > 0 ? 'au-alerta' : ''}>
                              {u.fallidos_semana}
                            </span>
                          </td>
                          <td className="text-sm">
                            <span className="state-inline">
                              <span className={`dot ${conectado ? 'dot-on' : 'dot-off'}`}></span>
                              {conectado
                                ? `Conectado · ${haceCuanto(u.ultima_actividad)}`
                                : 'Sin sesión'}
                            </span>
                          </td>
                          <td className="text-right">
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Ver sus sesiones en la bitácora"
                              onClick={() => verIngresosDe(u.id)}
                            >
                              <FileSearch size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Bitácora ────────────────────────────────────────────────── */}
        <section className="hc-section" id="bitacora">
          <div className="hc-section-head">
            <ScrollText size={14} />
            <h2 className="hc-section-title">Bitácora de eventos</h2>
            <span className="au-contador">
              {meta ? `${meta.total} registro(s)` : ''}
            </span>
          </div>
          <div className="hc-section-body">
            <div className="toolbar">
              <div className="toolbar-left flex flex-wrap gap-3">
                <div className="search-wrap search-wrap-ancho">
                  <span className="search-icon-inner">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar en descripción, usuario, correo o IP…"
                    value={filtros.search}
                    onChange={(e) => cambiarFiltro('search')(e.target.value)}
                  />
                </div>

                <div className="filtro">
                  <Combobox
                    items={opcionesCategoria}
                    value={filtros.categoria}
                    onChange={cambiarFiltro('categoria')}
                    placeholder="Todas las categorías"
                    icon={<Filter size={15} />}
                  />
                </div>

                <div className="filtro">
                  <Combobox
                    items={opcionesEvento}
                    value={filtros.evento}
                    onChange={cambiarFiltro('evento')}
                    placeholder="Todos los eventos"
                    icon={<Tag size={15} />}
                  />
                </div>

                <div className="filtro">
                  <Combobox
                    items={opcionesUsuario}
                    value={filtros.userId}
                    onChange={cambiarFiltro('userId')}
                    placeholder="Todos los usuarios"
                    icon={<User size={15} />}
                  />
                </div>

                <div className="au-fecha">
                  <DatePicker
                    value={filtros.desde}
                    onChange={cambiarFiltro('desde')}
                    placeholder="Desde…"
                    max={filtros.hasta || null}
                  />
                </div>

                <div className="au-fecha">
                  <DatePicker
                    value={filtros.hasta}
                    onChange={cambiarFiltro('hasta')}
                    placeholder="Hasta…"
                  />
                </div>

                {hayFiltros && (
                  <button
                    className="btn btn-ghost btn-sm flex items-center gap-1"
                    onClick={() => setFiltros(FILTROS_VACIOS)}
                  >
                    <X size={14} />
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="au-col-toggle"></th>
                    <th>Fecha y hora</th>
                    <th>Usuario</th>
                    <th>Evento</th>
                    <th>Descripción</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center gap-2 text-brand-slate">
                          <div className="w-6 h-6 border-2 border-brand-deep border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm">Cargando bitácora…</span>
                        </div>
                      </td>
                    </tr>
                  ) : filas.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state py-8">
                          <div className="empty-icon text-brand-text-light mb-2">
                            <ScrollText size={36} />
                          </div>
                          <p className="font-medium text-brand-text">No hay eventos registrados</p>
                          <p className="text-xs text-muted">
                            {hayFiltros
                              ? 'Pruebe con otros filtros o un rango de fechas más amplio.'
                              : 'Los eventos aparecerán aquí a medida que se use el sistema.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filas.map((f) => {
                      const tieneDetalle = (f.cambios && Object.keys(f.cambios).length > 0) || f.user_agent;
                      const expandida = abierta === f.id;

                      return (
                        <Fragment key={f.id}>
                          <tr
                            className={tieneDetalle ? 'au-fila-clic' : ''}
                            onClick={() => tieneDetalle && setAbierta(expandida ? null : f.id)}
                          >
                            <td className="au-col-toggle">
                              {tieneDetalle &&
                                (expandida ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                            </td>
                            <td className="text-sm whitespace-nowrap">{fechaHora(f.created_at)}</td>
                            <td>
                              <div className="text-sm font-semibold text-brand-text">
                                {f.usuario_nombre || '—'}
                              </div>
                              <div className="text-xs text-muted">{f.usuario_correo}</div>
                            </td>
                            <td>
                              <span className={`tag ${tonoEvento(f)}`}>
                                {etiquetaEvento[f.evento] || f.evento}
                              </span>
                            </td>
                            <td className="text-sm au-descripcion">{f.descripcion}</td>
                            <td className="text-xs text-muted font-mono">{f.ip || '—'}</td>
                          </tr>

                          {expandida && (
                            <tr className="au-detalle">
                              <td></td>
                              <td colSpan={5}>
                                {f.cambios && Object.keys(f.cambios).length > 0 && (
                                  <table className="au-cambios">
                                    <thead>
                                      <tr>
                                        <th>Campo</th>
                                        <th>Antes</th>
                                        <th>Después</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {Object.entries(f.cambios).map(([campo, valor]) => {
                                        const esDiff =
                                          valor && typeof valor === 'object' && 'antes' in valor;

                                        return (
                                          <tr key={campo}>
                                            <td>{NOMBRE_CAMPO[campo] || campo}</td>
                                            <td>{esDiff ? valorLegible(valor.antes) : '—'}</td>
                                            <td>{valorLegible(esDiff ? valor.despues : valor)}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}
                                {f.user_agent && (
                                  <div className="text-xs text-muted au-agente">
                                    Navegador: {f.user_agent}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Paginador
              pagina={meta?.pagina ?? 1}
              paginas={meta?.paginas ?? 1}
              total={meta?.total ?? filas.length}
              porPagina={meta?.por_pagina ?? filas.length}
              onCambiar={setPagina}
              etiqueta="registros"
            />
          </div>
        </section>
      </div>
    </Layout>
  );
}

export default Auditoria;
