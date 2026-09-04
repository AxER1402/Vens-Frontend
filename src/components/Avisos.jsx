import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import './Avisos.css';

/**
 * Avisos flotantes.
 *
 * «Paciente actualizado» es una confirmación, no una advertencia: se lee de
 * paso y se olvida. Antes empujaba el contenido hacia abajo y se quedaba en
 * pantalla hasta que alguien la cerraba, así que la tabla saltaba al aparecer
 * y volvía a saltar al cerrarla. Ahora flota sobre la esquina superior derecha
 * y se retira sola a los cinco segundos.
 *
 * Lo que **no** va aquí son los errores de validación de un formulario: esos
 * tienen que quedarse junto al campo que hay que corregir, y desaparecer solos
 * a los cinco segundos sería justo lo contrario de lo que hacen falta.
 *
 *   const avisos = useAvisos();
 *   avisos.exito('Paciente actualizado');
 *   avisos.error('No se pudo conectar con el servidor');
 */

const AvisosContext = createContext(null);

/** Lo que dura en pantalla antes de retirarse sola. */
const DURACION = 5000;

const ICONOS = {
  exito: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const relojes = useRef(new Map());

  const retirar = useCallback((id) => {
    setAvisos((previos) => previos.filter((a) => a.id !== id));

    const reloj = relojes.current.get(id);
    if (reloj) {
      clearTimeout(reloj);
      relojes.current.delete(id);
    }
  }, []);

  const mostrar = useCallback((tipo, mensaje, detalle = null) => {
    if (!mensaje) return;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Se apilan los últimos tres: más avisos a la vez no se leen, se tapan.
    setAvisos((previos) => [...previos.slice(-2), { id, tipo, mensaje, detalle }]);
    relojes.current.set(id, setTimeout(() => retirar(id), DURACION));
  }, [retirar]);

  // Los relojes pendientes se cancelan al desmontar, o dispararían un cambio
  // de estado sobre un componente que ya no existe.
  useEffect(() => {
    const pendientes = relojes.current;
    return () => {
      pendientes.forEach(clearTimeout);
      pendientes.clear();
    };
  }, []);

  const valor = useMemo(() => ({
    exito: (mensaje, detalle) => mostrar('exito', mensaje, detalle),
    error: (mensaje, detalle) => mostrar('error', mensaje, detalle),
    info: (mensaje, detalle) => mostrar('info', mensaje, detalle),
    retirar,
  }), [mostrar, retirar]);

  return (
    <AvisosContext.Provider value={valor}>
      {children}

      {/* aria-live para que un lector de pantalla lo anuncie sin robar el foco:
          el aviso informa de algo que ya pasó, no pide nada. */}
      <div className="aviso-pila" role="status" aria-live="polite">
        {avisos.map((aviso) => {
          const Icono = ICONOS[aviso.tipo] ?? Info;

          return (
            <div key={aviso.id} className={`aviso-caja av-${aviso.tipo}`}>
              <span className="aviso-icono"><Icono size={16} /></span>

              <div className="aviso-cuerpo">
                <p className="aviso-mensaje">{aviso.mensaje}</p>
                {aviso.detalle && <p className="aviso-detalle">{aviso.detalle}</p>}
              </div>

              <button
                type="button"
                className="aviso-cerrar"
                aria-label="Cerrar aviso"
                onClick={() => retirar(aviso.id)}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </AvisosContext.Provider>
  );
}

export function useAvisos() {
  const contexto = useContext(AvisosContext);

  if (!contexto) {
    throw new Error('useAvisos debe usarse dentro de un AvisosProvider');
  }

  return contexto;
}
