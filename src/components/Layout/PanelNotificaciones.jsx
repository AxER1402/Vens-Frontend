import { useNavigate } from 'react-router-dom';
import { BellOff, CalendarClock, Phone, Stethoscope, X } from 'lucide-react';

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import './PanelNotificaciones.css';

const TITULOS = { hoy: 'Hoy', manana: 'Mañana' };

/**
 * Ficha de un aviso: la hora en su propia columna, porque es lo que se busca
 * al abrir el panel, y el paciente al lado.
 */
function Aviso({ aviso, mostrarMedico, onDescartar }) {
  return (
    <li className="av-item">
      <div>
        <div className="av-hora">{aviso.hora}</div>
        {aviso.estado !== 'Programada' && (
          <span className="av-estado">{aviso.estado}</span>
        )}
      </div>

      <div>
        <p className="av-paciente">
          {aviso.paciente?.nombre ?? 'Cita sin paciente asignado'}
        </p>

        {aviso.motivo && <p className="av-motivo">{aviso.motivo}</p>}

        {(aviso.paciente?.telefono || (mostrarMedico && aviso.medico?.name)) && (
          <div className="av-datos">
            {aviso.paciente?.telefono && (
              <span className="av-dato">
                <Phone size={12} />
                {aviso.paciente.telefono}
              </span>
            )}
            {mostrarMedico && aviso.medico?.name && (
              <span className="av-dato">
                <Stethoscope size={12} />
                {aviso.medico.name}
              </span>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        className="av-descartar"
        title="Descartar aviso"
        aria-label={`Descartar el aviso de ${aviso.paciente?.nombre ?? 'la cita'}`}
        onClick={() => onDescartar(aviso.clave)}
      >
        <X size={13} />
      </button>
    </li>
  );
}

/**
 * Panel de avisos de agenda.
 *
 * Del Drawer se toma el comportamiento —entra desde la derecha en escritorio,
 * desde abajo en el teléfono y ahí se arrastra para cerrarlo— y no su aspecto:
 * la lámina se viste con el sistema plano de los demás módulos.
 */
function PanelNotificaciones({ abierto, onOpenChange, avisos, cargando, error, onDescartar, onDescartarTodos, mostrarMedico }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const grupos = ['hoy', 'manana']
    .map((dia) => ({ dia, avisos: avisos.filter((aviso) => aviso.dia === dia) }))
    .filter((grupo) => grupo.avisos.length > 0);

  const irALaAgenda = () => {
    onOpenChange(false);
    navigate('/citas');
  };

  return (
    <Drawer
      open={abierto}
      onOpenChange={onOpenChange}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? 'down' : 'right'}
    >
      <DrawerContent
        className="flat-page av-panel rounded-none"
        overlayClassName="av-fondo"
      >
        <div className="av-head">
          <div>
            <DrawerTitle className="panel-title">Notificaciones</DrawerTitle>
            <DrawerDescription className="av-head-sub">
              Pacientes citados para hoy y mañana
            </DrawerDescription>
          </div>
          {avisos.length > 0 && (
            <span className="av-cuenta">
              {avisos.length} {avisos.length === 1 ? 'aviso' : 'avisos'}
            </span>
          )}
        </div>

        <div className="av-cuerpo">
          {error && (
            <div className="notice notice-danger">
              <span className="notice-body">{error}</span>
            </div>
          )}

          {!error && cargando && avisos.length === 0 && (
            <p className="av-cargando">Cargando avisos…</p>
          )}

          {!error && !cargando && avisos.length === 0 && (
            <div className="av-vacio">
              <BellOff size={24} />
              <p className="av-vacio-titulo">Sin avisos pendientes</p>
              <p className="av-vacio-texto">
                Aquí aparecen los pacientes citados para hoy y mañana. Cada aviso
                se retira solo cuando pasa la hora de su cita.
              </p>
            </div>
          )}

          {grupos.map((grupo) => (
            <section key={grupo.dia} className="av-grupo">
              <h3 className="av-grupo-titulo">
                {TITULOS[grupo.dia]}
                <span className="av-grupo-count">{grupo.avisos.length}</span>
              </h3>
              <ul className="av-lista">
                {grupo.avisos.map((aviso) => (
                  <Aviso
                    key={aviso.clave}
                    aviso={aviso}
                    mostrarMedico={mostrarMedico}
                    onDescartar={onDescartar}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="av-pie">
          <button type="button" className="btn btn-ghost btn-sm" onClick={irALaAgenda}>
            <CalendarClock size={14} />
            Ver la agenda
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onDescartarTodos}
            disabled={avisos.length === 0}
          >
            Descartar todo
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default PanelNotificaciones;
