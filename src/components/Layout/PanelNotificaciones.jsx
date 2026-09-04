import { useNavigate } from 'react-router-dom';
import { BellOff, CalendarClock, Clock, Phone, Stethoscope, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

const TITULOS = { hoy: 'Hoy', manana: 'Mañana' };

/**
 * Una cita a la vista: la hora primero, que es lo que se busca al abrir el
 * panel, y el nombre del paciente en grande debajo.
 */
function Aviso({ aviso, mostrarMedico, onDescartar }) {
  return (
    <li className="group relative rounded-lg border border-brand-border-light/70 bg-brand-surface/70 p-3 pr-9 transition-colors hover:border-brand-border">
      <div className="flex items-center gap-1.5 text-xs font-medium text-brand-slate">
        <Clock size={13} />
        {aviso.hora}
        {aviso.estado !== 'Programada' && (
          <span className="text-brand-text-light">· {aviso.estado}</span>
        )}
      </div>

      <p className="mt-1 font-medium text-brand-text">
        {aviso.paciente?.nombre ?? 'Cita sin paciente asignado'}
      </p>

      {aviso.motivo && (
        <p className="mt-0.5 text-xs leading-relaxed text-brand-text-muted">{aviso.motivo}</p>
      )}

      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-brand-text-light">
        {aviso.paciente?.telefono && (
          <span className="inline-flex items-center gap-1">
            <Phone size={12} />
            {aviso.paciente.telefono}
          </span>
        )}
        {mostrarMedico && aviso.medico?.name && (
          <span className="inline-flex items-center gap-1">
            <Stethoscope size={12} />
            {aviso.medico.name}
          </span>
        )}
      </div>

      <button
        type="button"
        title="Descartar aviso"
        aria-label={`Descartar el aviso de ${aviso.paciente?.nombre ?? 'la cita'}`}
        onClick={() => onDescartar(aviso.clave)}
        className="absolute top-2.5 right-2.5 rounded-md p-1 text-brand-text-light opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-brand-surface-deep hover:text-brand-text focus-visible:opacity-100"
      >
        <X size={14} />
      </button>
    </li>
  );
}

/**
 * Panel de avisos de agenda.
 *
 * Entra desde la derecha en escritorio y desde abajo en el teléfono, donde
 * además se puede arrastrar para cerrarlo. El fondo se difumina y el panel va
 * traslúcido, pero no tanto: por debajo del 85% de opacidad el texto empieza a
 * pelearse con lo que hay detrás.
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
        className="border-brand-border-light bg-brand-surface/85 text-brand-text supports-backdrop-filter:backdrop-blur-2xl supports-backdrop-filter:backdrop-saturate-150 sm:[--drawer-content-width:26rem]"
        overlayClassName="bg-brand-deep/25 supports-backdrop-filter:backdrop-blur-md"
      >
        <DrawerHeader className="border-b border-brand-border-light/70 pb-3">
          <DrawerTitle className="text-brand-text">Notificaciones</DrawerTitle>
          <DrawerDescription className="text-brand-text-muted">
            Los pacientes que vienen en lo que queda de hoy y mañana.
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </p>
          )}

          {!error && cargando && avisos.length === 0 && (
            <p className="py-8 text-center text-sm text-brand-text-light">Cargando avisos…</p>
          )}

          {!error && !cargando && avisos.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <BellOff size={26} className="text-brand-text-light" />
              <p className="text-sm font-medium text-brand-text">Sin avisos pendientes</p>
              <p className="max-w-[15rem] text-xs leading-relaxed text-brand-text-light">
                Aquí aparecen los pacientes citados para hoy y mañana. Cada aviso se
                retira solo cuando pasa la hora de su cita.
              </p>
            </div>
          )}

          {grupos.map((grupo) => (
            <section key={grupo.dia} className="mb-4 last:mb-0">
              <h3 className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-brand-text-light uppercase">
                {TITULOS[grupo.dia]}
                <span className="ml-1.5 font-normal normal-case">
                  ({grupo.avisos.length})
                </span>
              </h3>
              <ul className="flex flex-col gap-2">
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

        <DrawerFooter className="flex-row justify-between gap-2 border-t border-brand-border-light/70 pt-3">
          <Button variant="ghost" size="sm" onClick={irALaAgenda}>
            <CalendarClock />
            Ver la agenda
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDescartarTodos}
            disabled={avisos.length === 0}
          >
            Descartar todo
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export default PanelNotificaciones;
