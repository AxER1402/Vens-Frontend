import { useRef, useState, useEffect } from 'react';
import { Eraser, Pencil, Undo, Download } from 'lucide-react';

/**
 * @param {Object} props
 * @param {(dataUrl: string) => void} [props.onImageChange] - Notifica el PNG del
 *   mapeo cada vez que el usuario dibuja o limpia, para poder persistirlo.
 * @param {string|null} [props.mapeoGuardadoUrl] - Mapeo ya almacenado para esta
 *   consulta, servido desde /storage del backend.
 * @param {boolean} [props.soloLectura] - Consulta finalizada: el mapeo guardado
 *   se muestra como imagen y no se permite dibujar.
 */
export default function MapeoVenosoCanvas({ onImageChange, mapeoGuardadoUrl = null, soloLectura = false }) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#8A2B49'); // Default pink drawing
  const [lineWidth, setLineWidth] = useState(3);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    // En modo lectura no se monta el canvas: solo se muestra el mapeo guardado
    if (!canvas) return;

    // Set display size
    canvas.style.width = '100%';
    canvas.style.height = '600px';
    
    // Set actual size in memory (scaled for retina displays)
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;

    const context = canvas.getContext('2d');
    context.scale(2, 2);
    context.lineCap = 'round';
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    contextRef.current = context;

    // Draw placeholder background (legs silhouette)
    drawBackground();
  }, []);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = lineWidth;
    }
  }, [color, lineWidth]);

  const drawBackground = () => {
    const ctx = contextRef.current;
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Clear canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw grid
    ctx.strokeStyle = '#F0F0F0';
    ctx.lineWidth = 1;
    for(let i = 0; i < rect.width; i += 20) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, rect.height); ctx.stroke();
    }
    for(let i = 0; i < rect.height; i += 20) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(rect.width, i); ctx.stroke();
    }
    
    // Draw simple leg outlines as placeholder
    ctx.strokeStyle = '#D0D0D0';
    ctx.lineWidth = 2;
    
    // Left Leg
    ctx.beginPath();
    ctx.ellipse(rect.width * 0.3, rect.height * 0.4, 40, 150, 0, 0, 2 * Math.PI);
    ctx.ellipse(rect.width * 0.3, rect.height * 0.75, 30, 100, 0, 0, 2 * Math.PI);
    ctx.stroke();

    // Right Leg
    ctx.beginPath();
    ctx.ellipse(rect.width * 0.7, rect.height * 0.4, 40, 150, 0, 0, 2 * Math.PI);
    ctx.ellipse(rect.width * 0.7, rect.height * 0.75, 30, 100, 0, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = '#8E8E93';
    ctx.font = '14px "Geist Variable", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Pierna Izquierda', rect.width * 0.3, 40);
    ctx.fillText('Pierna Derecha', rect.width * 0.7, 40);
    
    // Reset context properties for drawing
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
  };

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const finishDrawing = () => {
    // Sin trazo en curso no hay nada que cerrar (onMouseLeave se dispara siempre)
    if (!isDrawing) return;

    contextRef.current.closePath();
    setIsDrawing(false);

    // Save state for undo (simple implementation)
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    setHistory([...history, dataUrl]);
    onImageChange?.(dataUrl);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  };

  const clearCanvas = () => {
    drawBackground();
    setHistory([]);
    onImageChange?.(canvasRef.current.toDataURL('image/png'));
  };

  const downloadCanvas = () => {
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'mapeo-venoso.png';
    a.click();
  };

  // Consulta finalizada: se muestra el mapeo tal como quedó archivado
  if (soloLectura) {
    return (
      <div style={{ border: '1px solid var(--brand-border)', borderRadius: '12px', overflow: 'hidden' }}>
        {mapeoGuardadoUrl ? (
          <img
            src={mapeoGuardadoUrl}
            alt="Mapeo venoso registrado en esta consulta"
            style={{ display: 'block', width: '100%' }}
          />
        ) : (
          <div style={{ padding: '48px 16px', textAlign: 'center', fontSize: '12px', color: 'var(--brand-text-muted)' }}>
            En esta consulta no se registró un mapeo venoso.
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid var(--brand-border)', borderRadius: '12px', overflow: 'hidden' }}>
      {mapeoGuardadoUrl && (
        <div style={{ padding: '10px 16px', background: 'var(--brand-surface-alt)', borderBottom: '1px solid var(--brand-border)', fontSize: '12px', color: 'var(--brand-text-muted)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span>Esta consulta ya tiene un mapeo guardado. Si dibuja uno nuevo, lo reemplazará.</span>
          <a href={mapeoGuardadoUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost">
            Ver el mapeo guardado
          </a>
        </div>
      )}
      <div style={{ padding: '12px 16px', background: 'var(--brand-surface-alt)', borderBottom: '1px solid var(--brand-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button type="button" className={`btn btn-sm ${color === '#8A2B49' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setColor('#8A2B49')} title="Várices (Rojo)"><Pencil size={14}/> Várices</button>
          <button type="button" className={`btn btn-sm ${color === '#0C4550' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setColor('#0C4550')} title="Venas Profundas (Azul)"><Pencil size={14}/> Profundas</button>
          <button type="button" className={`btn btn-sm ${color === '#FFFFFF' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setColor('#FFFFFF')} title="Borrador"><Eraser size={14}/> Borrador</button>
          
          <div style={{ width: '1px', height: '24px', background: 'var(--brand-border)', margin: '0 8px' }}></div>
          
          <span style={{ fontSize: '12px', color: 'var(--brand-text-muted)' }}>Grosor:</span>
          <input type="range" min="1" max="10" value={lineWidth} onChange={(e) => setLineWidth(e.target.value)} style={{ width: '80px' }} />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-sm btn-ghost" onClick={clearCanvas}><Undo size={14}/> Limpiar Todo</button>
          <button type="button" className="btn btn-sm btn-secondary" onClick={downloadCanvas}><Download size={14}/> Descargar Mapeo</button>
        </div>

      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseUp={finishDrawing}
        onMouseMove={draw}
        onMouseLeave={finishDrawing}
        style={{ cursor: 'crosshair', display: 'block' }}
      />
      <div style={{ padding: '8px 16px', fontSize: '11px', color: 'var(--brand-text-muted)', textAlign: 'center', borderTop: '1px solid var(--brand-border)' }}>
        Utilice el mouse o un lápiz óptico para dibujar sobre el diagrama venoso. 
        (Nota: la imagen de fondo puede ser reemplazada por su plantilla institucional).
      </div>
    </div>
  );
}
