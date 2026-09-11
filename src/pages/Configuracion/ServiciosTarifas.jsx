import { useCallback, useEffect, useState } from 'react';
import { Tags, Plus, Pencil, Power, Search, AlertCircle, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Combobox } from '@/components/ui/combobox';
import { useAvisos } from '../../components/Avisos';
import { useAuth } from '../../context/AuthContext';
import Paginador from '../../components/Paginador';
import { quetzales } from '../../services/facturacionService';
import * as servicioService from '../../services/servicioService';

const VACIO = { nombre: '', descripcion: '', precio: '', activo: true };

const FILTRO_ESTADO = [
  { value: 'true', label: 'En el catálogo' },
  { value: 'false', label: 'Retirados' },
];

/**
 * El catálogo de servicios y tarifas.
 *
 * Los renglones de un recibo se escribían a mano cada vez, con el precio
 * tecleado de memoria: el mismo servicio acababa escrito de tres formas y a
 * tres precios distintos según quién cobrara.
 *
 * Lo mantienen la administración y el médico, que son quienes ponen el precio.
 * Recepción lo ve en solo lectura: necesita saber a qué se cobra cada cosa para
 * emitir el recibo, pero una tarifa no se corrige en el mostrador con un
 * paciente delante. A quien solo mira se le quitan los botones que el servidor
 * le rechazaría.
 */
export default function ServiciosTarifas() {
  const avisos = useAvisos();
  const { user } = useAuth();

  const puedeEditar = user?.rol === 'administrador' || user?.rol === 'medico';

  const [servicios, setServicios] = useState([]);
  const [meta, setMeta] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('true');
  const [cargando, setCargando] = useState(true);

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  // Servicio pendiente de borrar, o null. Borrar no se deshace: se pregunta.
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);

    const res = await servicioService.getServicios({
      search: busqueda,
      activo: estado,
      page: pagina,
    });

    if (res.success) {
      setServicios(res.data);
      setMeta(res.meta);
    } else {
      avisos.error(res.message);
    }

    setCargando(false);
  }, [busqueda, estado, pagina, avisos]);

  useEffect(() => { cargar(); }, [cargar]);

  // Al filtrar se vuelve a la primera página: quedarse en la cuarta de un
  // listado que ahora tiene dos deja la pantalla en blanco sin explicar nada.
  useEffect(() => { setPagina(1); }, [busqueda, estado]);

  const abrirNuevo = () => {
    setEditando(null);
    setForm(VACIO);
    setErrores({});
    setAbierto(true);
  };

  const abrirEdicion = (servicio) => {
    setEditando(servicio);
    setForm({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion ?? '',
      precio: String(servicio.precio),
      activo: servicio.activo,
    });
    setErrores({});
    setAbierto(true);
  };

  const set = (campo) => (evento) => {
    setForm((previo) => ({ ...previo, [campo]: evento.target.value }));
  };

  const guardar = async (evento) => {
    evento.preventDefault();
    setErrores({});
    setGuardando(true);

    const datos = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      precio: Number(form.precio),
      activo: form.activo,
    };

    const res = editando
      ? await servicioService.actualizarServicio(editando.id, datos)
      : await servicioService.crearServicio(datos);

    if (res.success) {
      setAbierto(false);
      avisos.exito(res.message);
      cargar();
    } else {
      setErrores(res.errors ?? {});
      avisos.error(res.message);
    }

    setGuardando(false);
  };

  const alternar = async (servicio) => {
    const res = servicio.activo
      ? await servicioService.retirarServicio(servicio.id)
      : await servicioService.actualizarServicio(servicio.id, { activo: true });

    if (res.success) {
      avisos.exito(servicio.activo ? res.message : 'Servicio devuelto al catálogo.');
      cargar();
    } else {
      avisos.error(res.message);
    }
  };

  const eliminar = async () => {
    setEliminando(true);

    const res = await servicioService.eliminarServicio(aEliminar.id);

    if (res.success) {
      avisos.exito(res.message);
      setAEliminar(null);

      // Si era el último de su página, se retrocede una: quedarse en una
      // página que ya no existe deja la tabla en blanco sin explicar nada.
      if (servicios.length === 1 && pagina > 1) setPagina(pagina - 1);
      else cargar();
    } else {
      avisos.error(res.message);
    }

    setEliminando(false);
  };

  return (
    <>
      <section className="hc-section">
        <div className="hc-section-head">
          <Tags size={14} />
          <h2 className="hc-section-title">Servicios y tarifas</h2>
        </div>

        <div className="hc-section-body">
          <p className="hc-field-hint">
            Lo que aparece aquí se puede elegir al emitir un recibo, con su
            precio ya puesto. Subir una tarifa no cambia ningún recibo ya
            emitido: cada uno guarda el precio con el que se cobró.
          </p>

          {!puedeEditar && (
            <p className="config-advertencia">
              <AlertCircle size={15} />
              <span>
                El catálogo se muestra para consulta, con los precios vigentes.
                Las tarifas las fijan la administración y el médico.
              </span>
            </p>
          )}

          <div className="config-catalogo-barra">
            <div className="search-wrap config-buscador">
              <span className="search-icon-inner"><Search size={15} /></span>
              <input
                className="form-control"
                placeholder="Buscar un servicio…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            <div className="config-filtro-estado">
              <Combobox
                items={FILTRO_ESTADO}
                value={estado}
                onChange={setEstado}
                clearable={false}
              />
            </div>

            {puedeEditar && (
              <button type="button" className="btn btn-primary" onClick={abrirNuevo}>
                <Plus size={15} />
                Nuevo servicio
              </button>
            )}
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th className="fa-num">Precio</th>
                  {puedeEditar && <th />}
                </tr>
              </thead>
              <tbody>
                {cargando && (
                  <tr><td colSpan={puedeEditar ? 3 : 2} className="hc-field-hint">Cargando…</td></tr>
                )}

                {!cargando && servicios.length === 0 && (
                  <tr>
                    <td colSpan={puedeEditar ? 3 : 2} className="hc-field-hint">
                      {busqueda
                        ? 'Ningún servicio coincide con esa búsqueda.'
                        : puedeEditar
                          ? 'El catálogo está vacío. Agregue el primer servicio.'
                          : 'El catálogo está vacío.'}
                    </td>
                  </tr>
                )}

                {!cargando && servicios.map((s) => (
                  <tr key={s.id} className={s.activo ? '' : 'config-fila-retirada'}>
                    <td>
                      <div className="config-servicio-nombre">{s.nombre}</div>
                      {s.descripcion && (
                        <div className="config-servicio-detalle">{s.descripcion}</div>
                      )}
                    </td>
                    <td className="fa-num">{quetzales(s.precio)}</td>
                    {puedeEditar && (
                      <td className="fa-num config-fila-acciones">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Editar"
                          onClick={() => abrirEdicion(s)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title={s.activo ? 'Retirar del catálogo' : 'Devolver al catálogo'}
                          onClick={() => alternar(s)}
                        >
                          <Power size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Eliminar definitivamente"
                          onClick={() => setAEliminar(s)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Paginador
            pagina={meta?.pagina ?? 1}
            paginas={meta?.paginas ?? 1}
            total={meta?.total ?? servicios.length}
            porPagina={meta?.por_pagina ?? servicios.length}
            onCambiar={setPagina}
            etiqueta="servicios"
          />
        </div>
      </section>

      {/* ── Alta y edición ───────────────────────────────────────────── */}
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="flat-page sm:max-w-lg rounded-none bg-brand-surface">
          <form onSubmit={guardar}>
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle>
              <DialogDescription>
                El nombre es lo que se elige al cobrar; el precio, lo que se
                propone como precio unitario.
              </DialogDescription>
            </DialogHeader>

            <div className="config-grid config-grid-dialogo">
              <div className="hc-field">
                <label className="hc-field-label" htmlFor="sv-nombre">
                  Nombre <span className="req">*</span>
                </label>
                <input
                  id="sv-nombre"
                  className="form-control"
                  value={form.nombre}
                  onChange={set('nombre')}
                  maxLength={150}
                  required
                />
                {errores.nombre && (
                  <span className="form-hint form-hint-danger">{errores.nombre[0]}</span>
                )}
              </div>

              <div className="hc-field">
                <label className="hc-field-label" htmlFor="sv-precio">
                  Precio <span className="req">*</span>
                </label>
                <input
                  id="sv-precio"
                  className="form-control"
                  value={form.precio}
                  onChange={set('precio')}
                  inputMode="decimal"
                  placeholder="0.00"
                  required
                />
                {errores.precio && (
                  <span className="form-hint form-hint-danger">{errores.precio[0]}</span>
                )}
              </div>

              <div className="hc-field config-campo-completo">
                <label className="hc-field-label" htmlFor="sv-descripcion">
                  Descripción
                </label>
                <input
                  id="sv-descripcion"
                  className="form-control"
                  value={form.descripcion}
                  onChange={set('descripcion')}
                  maxLength={255}
                  placeholder="Para distinguirlo de otro parecido"
                />
              </div>
            </div>

            {editando && !form.activo && (
              <p className="config-advertencia">
                <AlertCircle size={15} />
                <span>
                  Este servicio está retirado: no aparece al cobrar. Guárdelo
                  con el interruptor de la lista para devolverlo al catálogo.
                </span>
              </p>
            )}

            <DialogFooter>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAbierto(false)}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={guardando}>
                {guardando ? 'Guardando…' : (editando ? 'Guardar cambios' : 'Agregar')}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar el borrado definitivo ──────────────────────────── */}
      <AlertDialog
        open={aEliminar !== null}
        onOpenChange={(abierto) => { if (!abierto) setAEliminar(null); }}
      >
        <AlertDialogContent className="flat-page confirm-box">
          <div className="confirm-head">
            <span className="confirm-icon"><Trash2 size={17} /></span>
            <AlertDialogTitle className="confirm-title">Eliminar servicio</AlertDialogTitle>
          </div>

          <AlertDialogDescription className="confirm-text">
            <strong>{aEliminar?.nombre}</strong> desaparece del catálogo y de la
            base. No se puede deshacer, y su nombre queda libre para volver a
            usarse.
            <br />
            Los recibos que ya lo cobraron no cambian: cada renglón guarda su
            descripción y su precio desde que se emitió.
            <br />
            Si el servicio se prestó y solo quiere dejar de ofrecerlo, use
            <strong> Retirar del catálogo</strong>: sale del selector al cobrar,
            pero sigue en la lista y se puede devolver.
          </AlertDialogDescription>

          <div className="confirm-actions dialog-sep">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setAEliminar(null)}
              disabled={eliminando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={eliminar}
              disabled={eliminando}
            >
              {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
