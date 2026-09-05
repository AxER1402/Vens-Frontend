import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Save, Timer, CalendarOff, AlertCircle } from 'lucide-react';
import { TimePicker } from '@/components/ui/time-picker';
import { useAvisos } from '../../components/Avisos';
import * as ajusteService from '../../services/ajusteService';

/**
 * Los siete días, en el orden en que se leen.
 *
 * La lista está aquí y no se saca de lo que responde el backend porque MySQL
 * reordena las claves de una columna json al guardarla: leyendo el objeto tal
 * cual, la tabla saldría con el jueves entre el lunes y el martes.
 */
const DIAS = [
  { clave: 'lunes', etiqueta: 'Lunes' },
  { clave: 'martes', etiqueta: 'Martes' },
  { clave: 'miercoles', etiqueta: 'Miércoles' },
  { clave: 'jueves', etiqueta: 'Jueves' },
  { clave: 'viernes', etiqueta: 'Viernes' },
  { clave: 'sabado', etiqueta: 'Sábado' },
  { clave: 'domingo', etiqueta: 'Domingo' },
];

/** Con lo que se estrena un día que se acaba de marcar. */
const ABRE_POR_DEFECTO = '08:00';
const CIERRA_POR_DEFECTO = '17:00';

/** Rellena los siete días, vengan o no del backend. */
const normalizar = (horario) => {
  const guardado = Array.isArray(horario) ? {} : (horario ?? {});

  return Object.fromEntries(DIAS.map(({ clave }) => {
    const tramo = guardado[clave] ?? {};
    return [clave, {
      activo: Boolean(tramo.activo),
      abre: tramo.abre ?? ABRE_POR_DEFECTO,
      cierra: tramo.cierra ?? CIERRA_POR_DEFECTO,
    }];
  }));
};

/**
 * El horario de atención de la clínica.
 *
 * Antes la agenda solo sabía de feriados y vacaciones, así que aceptaba una
 * cita a las tres de la madrugada de un domingo sin decir nada.
 */
export default function AgendaHorario() {
  const avisos = useAvisos();

  const [horario, setHorario] = useState(null);
  const [duracion, setDuracion] = useState(30);
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const res = await ajusteService.getAgenda();

    if (res.success) {
      setHorario(normalizar(res.horario));
      setDuracion(res.duracionCita);
    } else {
      avisos.error(res.message);
    }

    setCargando(false);
  }, [avisos]);

  useEffect(() => { cargar(); }, [cargar]);

  const cambiarDia = (clave, cambios) => {
    setHorario((previo) => ({ ...previo, [clave]: { ...previo[clave], ...cambios } }));
  };

  const algunoAbierto = horario !== null
    && DIAS.some(({ clave }) => horario[clave].activo);

  const guardar = async (evento) => {
    evento.preventDefault();
    setErrores({});
    setGuardando(true);

    const res = await ajusteService.actualizarAgenda({
      horario,
      duracionCita: Number(duracion),
    });

    if (res.success) {
      setHorario(normalizar(res.horario));
      setDuracion(res.duracionCita);
      avisos.exito(
        res.message,
        algunoAbierto ? null : 'Sin ningún día marcado, la agenda vuelve a aceptar cualquier hora.',
      );
    } else {
      setErrores(res.errors ?? {});
      avisos.error(res.message);
    }

    setGuardando(false);
  };

  if (cargando) {
    return (
      <section className="hc-section">
        <div className="hc-section-body">
          <p className="hc-field-hint">Cargando el horario…</p>
        </div>
      </section>
    );
  }

  if (!horario) return null;

  return (
    <form onSubmit={guardar}>
      {/* ── Horario semanal ──────────────────────────────────────────── */}
      <section className="hc-section">
        <div className="hc-section-head">
          <CalendarClock size={14} />
          <h2 className="hc-section-title">Horario de atención</h2>
        </div>

        <div className="hc-section-body">
          <p className="hc-field-hint">
            Marque los días en que se atiende y a qué horas. Una cita fuera de
            ese horario se rechaza al agendarla.
          </p>

          <div className="config-horario">
            {DIAS.map(({ clave, etiqueta }) => {
              const dia = horario[clave];
              const error = errores[`horario.${clave}.cierra`]?.[0];

              return (
                <div key={clave} className={`config-dia${dia.activo ? ' abierto' : ''}`}>
                  <label className="config-dia-nombre">
                    <input
                      type="checkbox"
                      checked={dia.activo}
                      onChange={(e) => cambiarDia(clave, { activo: e.target.checked })}
                    />
                    <span>{etiqueta}</span>
                  </label>

                  {dia.activo ? (
                    <div className="config-dia-horas">
                      {/* Cada selector va en su propia caja de ancho fijo:
                          TimePicker se declara w-full y, suelto en la fila,
                          empujaría al otro al renglón de abajo. */}
                      <div className="config-dia-hora">
                        <TimePicker
                          value={dia.abre}
                          onChange={(v) => cambiarDia(clave, { abre: v })}
                        />
                      </div>
                      <span className="config-dia-a">a</span>
                      <div className="config-dia-hora">
                        <TimePicker
                          value={dia.cierra}
                          onChange={(v) => cambiarDia(clave, { cierra: v })}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="config-dia-cerrado">No se atiende</span>
                  )}

                  {error && (
                    <span className="form-hint form-hint-danger config-dia-error">{error}</span>
                  )}
                </div>
              );
            })}
          </div>

          {!algunoAbierto && (
            <p className="config-advertencia">
              <AlertCircle size={15} />
              <span>
                Sin ningún día marcado no se aplica ninguna restricción: la
                agenda acepta cualquier hora, como hasta ahora. Para cerrar
                unos días concretos están los feriados y las vacaciones.
              </span>
            </p>
          )}
        </div>
      </section>

      {/* ── Duración ─────────────────────────────────────────────────── */}
      <section className="hc-section">
        <div className="hc-section-head">
          <Timer size={14} />
          <h2 className="hc-section-title">Duración de la cita</h2>
        </div>

        <div className="hc-section-body">
          <div className="config-grid">
            <div className="hc-field">
              <label className="hc-field-label" htmlFor="config-duracion">
                Minutos por cita
              </label>
              <input
                id="config-duracion"
                type="number"
                className="form-control"
                min={5}
                max={480}
                step={5}
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
              />
              {errores.duracion_cita && (
                <span className="form-hint form-hint-danger">{errores.duracion_cita[0]}</span>
              )}
            </div>

            <p className="config-nota">
              Es lo que se propone como hora de fin al agendar. Se puede cambiar
              cita por cita; esto solo evita teclearlo cada vez.
            </p>
          </div>
        </div>
      </section>

      {/* ── Feriados ─────────────────────────────────────────────────── */}
      <section className="hc-section">
        <div className="hc-section-head">
          <CalendarOff size={14} />
          <h2 className="hc-section-title">Feriados, vacaciones y cierres</h2>
        </div>

        <div className="hc-section-body">
          <p className="hc-field-hint">
            Los días sueltos que la clínica cierra se registran desde la propia
            agenda, con el calendario a la vista: es donde se decide cerrar un
            día y donde se ve a quién hay que reprogramar.
          </p>

          <div className="config-acciones config-acciones-izquierda">
            <Link to="/citas" className="btn btn-secondary">
              <CalendarOff size={15} />
              Ir a la agenda
            </Link>
          </div>
        </div>
      </section>

      {/* Guardar cierra el formulario entero —horario y duración—, así que va
          al pie y no dentro de una de las secciones, donde parecería que
          guarda solo esa. */}
      <div className="config-acciones config-pie-guardar">
        <button type="submit" className="btn btn-primary" disabled={guardando}>
          <Save size={15} />
          {guardando ? 'Guardando…' : 'Guardar horario'}
        </button>
      </div>
    </form>
  );
}
