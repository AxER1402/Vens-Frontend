import { useEffect, useState } from 'react';
import './AvatarUsuario.css';

/**
 * Las dos primeras iniciales del nombre, que es lo que se pinta mientras no
 * haya foto. Vivía dentro de Layout; se movió aquí porque ahora lo necesitan
 * también el menú de ajustes y la pantalla de configuración.
 */
export function iniciales(nombre) {
  if (!nombre) return 'US';

  const partes = nombre.trim().split(/\s+/);
  if (partes.length >= 2) return `${partes[0][0]}${partes[1][0]}`.toUpperCase();

  return nombre.slice(0, 2).toUpperCase();
}

/**
 * El avatar de una persona: su foto si la subió, sus iniciales si no.
 *
 * Si la imagen no carga —el archivo se borró del disco, o la red falló— se
 * vuelve a las iniciales en lugar de dejar el ícono de imagen rota, que en una
 * ficha de personal se lee como un error del sistema.
 */
export default function AvatarUsuario({
  nombre,
  fotoUrl = null,
  tamano = 34,
  className = '',
}) {
  const [falloImagen, setFalloImagen] = useState(false);

  // Al cambiar de foto se vuelve a intentar: la anterior pudo fallar y esta no.
  useEffect(() => setFalloImagen(false), [fotoUrl]);

  const medidas = {
    width: tamano,
    height: tamano,
    fontSize: Math.max(10, Math.round(tamano * 0.36)),
  };

  if (fotoUrl && !falloImagen) {
    return (
      <img
        src={fotoUrl}
        alt={nombre ? `Foto de ${nombre}` : 'Foto de perfil'}
        className={`avatar-usuario avatar-usuario-foto ${className}`}
        style={medidas}
        onError={() => setFalloImagen(true)}
      />
    );
  }

  return (
    <span
      className={`avatar-usuario avatar-usuario-iniciales ${className}`}
      style={medidas}
      aria-hidden="true"
    >
      {iniciales(nombre)}
    </span>
  );
}
