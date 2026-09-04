import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AvatarUsuario from '../AvatarUsuario';
import { SECCIONES, ETIQUETAS_ROL } from '../../pages/Configuracion/secciones';
import './MenuAjustes.css';

/**
 * El menú del engranaje del encabezado.
 *
 * Se arma con un ref y un clic fuera, como el Combobox del proyecto, y no con
 * el Popover de la carpeta ui/: ese componente no lo usa ninguna pantalla y le
 * falta el posicionador de base-ui, así que estrenarlo aquí sería estrenar
 * también sus problemas de colocación.
 */
export default function MenuAjustes({ onCerrarSesion }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef(null);

  // Se cierra al tocar fuera o con Escape: es un menú, no un diálogo, y no
  // debe quedarse abierto tapando la pantalla si se cambió de idea.
  useEffect(() => {
    if (!abierto) return undefined;

    const alTocarFuera = (evento) => {
      if (contenedor.current && !contenedor.current.contains(evento.target)) {
        setAbierto(false);
      }
    };
    const alPulsarTecla = (evento) => {
      if (evento.key === 'Escape') setAbierto(false);
    };

    document.addEventListener('mousedown', alTocarFuera);
    document.addEventListener('keydown', alPulsarTecla);

    return () => {
      document.removeEventListener('mousedown', alTocarFuera);
      document.removeEventListener('keydown', alPulsarTecla);
    };
  }, [abierto]);

  const rol = user?.rol?.toLowerCase();

  // Cada sección declara quién puede verla. El backend vuelve a comprobarlo:
  // esconder una opción del menú acomoda la pantalla, no cierra la puerta.
  const visibles = SECCIONES.filter((s) => !s.roles || s.roles.includes(rol));

  const ir = (clave) => {
    setAbierto(false);
    navigate(`/configuracion?seccion=${clave}`);
  };

  return (
    <div className="menu-ajustes" ref={contenedor}>
      <button
        type="button"
        className="topbar-notif"
        title="Ajustes"
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((previo) => !previo)}
      >
        <Settings size={16} strokeWidth={2} />
      </button>

      {abierto && (
        <div className="menu-ajustes-panel" role="menu">
          <div className="menu-ajustes-cabecera">
            <AvatarUsuario
              nombre={user?.name}
              fotoUrl={user?.foto_url}
              tamano={38}
            />
            <div className="menu-ajustes-identidad">
              <span className="menu-ajustes-nombre" title={user?.name}>
                {user?.name || 'Usuario'}
              </span>
              <span className="menu-ajustes-rol">
                {ETIQUETAS_ROL[rol] || user?.rol || 'Personal'}
              </span>
            </div>
          </div>

          <div className="menu-ajustes-lista">
            {visibles.map((seccion) => (
              <button
                key={seccion.clave}
                type="button"
                role="menuitem"
                className="menu-ajustes-item"
                onClick={() => ir(seccion.clave)}
              >
                <seccion.icono size={15} strokeWidth={2} />
                <span>{seccion.titulo}</span>
              </button>
            ))}
          </div>

          <div className="menu-ajustes-separador" />

          <button
            type="button"
            role="menuitem"
            className="menu-ajustes-item menu-ajustes-salir"
            onClick={() => {
              setAbierto(false);
              onCerrarSesion();
            }}
          >
            <LogOut size={15} strokeWidth={2} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </div>
  );
}
