import { useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

/**
 * Cuadro para escribir la nota anclada a un punto del mapa.
 *
 * Sirve tanto para las anotaciones (texto largo, con su alfiler numerado) como
 * para las etiquetas sueltas sobre el dibujo, cambiando `multilinea`.
 *
 * @param {Object} props
 * @param {boolean} props.abierto
 * @param {string} props.titulo
 * @param {string} [props.zona] - vista anatómica donde cayó el punto
 * @param {string} [props.valor] - texto previo cuando se está editando
 * @param {boolean} [props.multilinea]
 * @param {(texto: string) => void} props.onConfirmar
 * @param {() => void} props.onCancelar
 */

const LARGO_MAXIMO = 400;

export default function DialogoAnotacion({
  abierto,
  titulo = 'Anotación',
  zona,
  valor = '',
  multilinea = true,
  onConfirmar,
  onCancelar,
}) {
  const [texto, setTexto] = useState(valor);
  const campoRef = useRef(null);

  // Cada apertura arranca con el texto que corresponda (vacío o el que se edita)
  useEffect(() => {
    if (abierto) {
      setTexto(valor);
      // El foco se pide tras el montaje del diálogo
      const id = setTimeout(() => campoRef.current?.focus(), 40);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [abierto, valor]);

  const limpio = texto.trim();

  const confirmar = () => {
    if (!limpio) return;
    onConfirmar(limpio.slice(0, LARGO_MAXIMO));
  };

  // Ctrl/Cmd+Enter guarda sin obligar a soltar el teclado
  const alTeclear = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !multilinea)) {
      e.preventDefault();
      confirmar();
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => { if (!v) onCancelar(); }}>
      <DialogContent className="flat-page hc-page sm:max-w-md rounded-none bg-brand-surface">
        <DialogHeader>
          <DialogTitle className="text-brand-text">{titulo}</DialogTitle>
          <DialogDescription>
            {zona
              ? `Quedará anclada en ${zona}.`
              : 'El punto elegido no cae sobre ninguna de las vistas del mapa.'}
          </DialogDescription>
        </DialogHeader>

        {multilinea ? (
          <textarea
            ref={campoRef}
            className="form-control"
            rows={4}
            maxLength={LARGO_MAXIMO}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={alTeclear}
            placeholder="Ej.: reflujo en cayado safeno-femoral de 0.9 s, safena magna dilatada 8 mm."
          />
        ) : (
          <input
            ref={campoRef}
            type="text"
            className="form-control"
            maxLength={60}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={alTeclear}
            placeholder="Ej.: 12 cm"
          />
        )}

        <div className="hc-field-hint">
          {multilinea
            ? `${texto.length} / ${LARGO_MAXIMO} caracteres · Ctrl+Enter para guardar`
            : 'Enter para guardar'}
        </div>

        <DialogFooter>
          <button type="button" className="btn btn-ghost" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" disabled={!limpio} onClick={confirmar}>
            Guardar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
