import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import './Paginador.css';

/**
 * Paginador de una tabla.
 *
 * Envuelve las piezas del registro con dos decisiones propias:
 *
 * 1. Los botones no navegan. El listado se recarga en su sitio, así que un
 *    enlace con href de verdad recargaría la página y perdería los filtros.
 * 2. Dice cuántos registros hay y cuáles se están viendo. «Página 2 de 7» no
 *    responde a «¿me faltan muchos?»; «31–60 de 194» sí.
 *
 * Con una sola página se queda solo la cuenta: los controles no llevan a
 * ninguna parte y ocupan sitio, pero saber cuántos hay sigue sirviendo.
 */

/**
 * Números a mostrar: siempre el primero y el último, la página actual con sus
 * vecinas, y puntos suspensivos donde se salta.
 */
function ventana(pagina, paginas) {
  if (paginas <= 7) {
    return Array.from({ length: paginas }, (_, i) => i + 1);
  }

  const numeros = new Set([1, paginas, pagina, pagina - 1, pagina + 1]);
  const visibles = [...numeros].filter((n) => n >= 1 && n <= paginas).sort((a, b) => a - b);
  const salida = [];

  visibles.forEach((n, i) => {
    if (i > 0 && n - visibles[i - 1] > 1) salida.push('…');
    salida.push(n);
  });

  return salida;
}

function Paginador({ pagina, paginas, total, porPagina, onCambiar, etiqueta = 'registros' }) {
  if (!total) return null;

  const primero = (pagina - 1) * porPagina + 1;
  const ultimo = Math.min(pagina * porPagina, total);

  const ir = (destino) => (evento) => {
    evento.preventDefault();
    if (destino >= 1 && destino <= paginas && destino !== pagina) onCambiar(destino);
  };

  return (
    <div className="pg-barra">
      <span className="pg-cuenta">
        {total <= porPagina
          ? `${total} ${etiqueta}`
          : `${primero}–${ultimo} de ${total} ${etiqueta}`}
      </span>

      {paginas > 1 && (
        <Pagination className="pg-controles">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text="Anterior"
                aria-label="Ir a la página anterior"
                onClick={ir(pagina - 1)}
                aria-disabled={pagina === 1}
                className={pagina === 1 ? 'pg-inerte' : undefined}
              />
            </PaginationItem>

            {ventana(pagina, paginas).map((n, i) => (
              <PaginationItem key={n === '…' ? `salto-${i}` : n}>
                {n === '…' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    href="#"
                    isActive={n === pagina}
                    aria-label={`Ir a la página ${n}`}
                    onClick={ir(n)}
                  >
                    {n}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                href="#"
                text="Siguiente"
                aria-label="Ir a la página siguiente"
                onClick={ir(pagina + 1)}
                aria-disabled={pagina === paginas}
                className={pagina === paginas ? 'pg-inerte' : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

export default Paginador;
