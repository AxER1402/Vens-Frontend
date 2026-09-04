import { Link } from 'react-router-dom';

/**
 * Tarjeta de indicador.
 *
 * Vive aparte porque la usan tres módulos —Inicio, Citas y Reportes— y la
 * gracia es justamente que se vean iguales: si cada pantalla la vuelve a
 * escribir, a la tercera ya no coinciden ni el tamaño de la cifra.
 *
 * `to` la convierte en enlace; sin él es una tarjeta muerta, que es lo que
 * corresponde cuando el número ya está en la pantalla que la muestra.
 */
function StatCard({ label, value, detail, icon, tono = 'rose', to, title }) {
  const contenido = (
    <>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {detail && (
          <div className="stat-change neutral">
            <span>{detail}</span>
          </div>
        )}
      </div>
      <div className={`stat-icon stat-icon-${tono}`}>{icon}</div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className="stat-card" title={title ?? `Ir a ${label}`}>
        {contenido}
      </Link>
    );
  }

  return <div className="stat-card">{contenido}</div>;
}

export default StatCard;
