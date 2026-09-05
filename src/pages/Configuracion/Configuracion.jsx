import { useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { SECCIONES, SECCION_POR_DEFECTO } from './secciones';
import MiCuenta from './MiCuenta';
import CambiarPassword from './CambiarPassword';
import DatosClinica from './DatosClinica';
import AgendaHorario from './AgendaHorario';
import ServiciosTarifas from './ServiciosTarifas';
import './Configuracion.css';

/** Qué componente pinta cada sección. */
const CONTENIDOS = {
  cuenta: MiCuenta,
  password: CambiarPassword,
  clinica: DatosClinica,
  agenda: AgendaHorario,
  servicios: ServiciosTarifas,
};

/**
 * La pantalla de configuración.
 *
 * La sección abierta viaja en la barra de direcciones (?seccion=cuenta) y no
 * en el estado del componente: así el menú del encabezado puede llevar
 * directo a la que se pidió, y la dirección se puede guardar o compartir.
 */
export default function Configuracion() {
  const { user } = useAuth();
  const [parametros, setParametros] = useSearchParams();

  const rol = user?.rol?.toLowerCase();
  const visibles = SECCIONES.filter((s) => !s.roles || s.roles.includes(rol));

  // Una sección que no existe, o que este rol no puede ver, cae en la primera
  // que sí: la dirección puede venir de un enlace viejo o escrita a mano, y la
  // pantalla no debería quedarse en blanco por eso.
  const pedida = parametros.get('seccion');
  const actual = visibles.some((s) => s.clave === pedida) ? pedida : SECCION_POR_DEFECTO;

  const seccion = visibles.find((s) => s.clave === actual) ?? visibles[0];
  const Contenido = CONTENIDOS[seccion?.clave];

  return (
    <Layout breadcrumb="Configuración">
      <div className="flat-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Configuración</h1>
            <p className="page-subtitle">
              Su cuenta y los ajustes del sistema.
            </p>
          </div>
        </div>

        <div className="config-disposicion">
          {/* Navegación de secciones */}
          <nav className="config-nav" aria-label="Secciones de configuración">
            {visibles.map((s) => (
              <button
                key={s.clave}
                type="button"
                className={`config-nav-item${s.clave === actual ? ' activo' : ''}`}
                aria-current={s.clave === actual ? 'page' : undefined}
                onClick={() => setParametros({ seccion: s.clave })}
              >
                <s.icono size={16} strokeWidth={2} />
                <span className="config-nav-texto">
                  <span className="config-nav-titulo">{s.titulo}</span>
                  <span className="config-nav-descripcion">{s.descripcion}</span>
                </span>
              </button>
            ))}
          </nav>

          <div className="config-contenido">
            {Contenido ? <Contenido /> : null}
          </div>
        </div>
      </div>
    </Layout>
  );
}
