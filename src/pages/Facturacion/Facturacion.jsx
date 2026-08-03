import { useState } from 'react';
import Layout from '../../components/Layout/Layout';
import { FileText, Search, CreditCard, DollarSign, CheckCircle, FilePlus, User } from 'lucide-react';

const PATIENTS = [
  { id: 'P-001', nombre: 'Ana García López',   rfc: 'GALA850312XXX', cp: '01000' },
  { id: 'P-002', nombre: 'Carlos Méndez Ruiz', rfc: 'MERC780725YYY', cp: '11000' },
  { id: 'P-003', nombre: 'María Velásquez',     rfc: 'VEM921108ZZZ',  cp: '54000' },
];

function Facturacion() {
  const [patientId, setPatientId] = useState('');
  const [patient, setPatient] = useState(null);
  const [form, setForm] = useState({
    concepto: 'Consulta Médica de Especialidad (Angiología)',
    monto: '1200.00',
    metodoPago: '01 - Efectivo',
    usoCfdi: 'G03 - Gastos en general',
    regimen: '601 - General de Ley Personas Morales'
  });
  
  const [status, setStatus] = useState(null); // 'sat_success' | 'internal_success'

  const handlePatientSelect = (e) => {
    const pId = e.target.value;
    setPatientId(pId);
    setPatient(PATIENTS.find(p => p.id === pId) || null);
    setStatus(null);
  };

  const ch = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
  };

  const handleSat = () => {
    setStatus('sat_success');
  };

  const handleInternal = () => {
    setStatus('internal_success');
  };

  return (
    <Layout breadcrumb="Facturación">
      <div className="page-header">
        <div>
          <h1 className="page-title">Facturación y Cobranza</h1>
          <p className="page-subtitle">Emisión de comprobantes fiscales (CFDI) y recibos internos</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary">
            <FileText size={16} /> Ver Historial
          </button>
        </div>
      </div>

      <div className="hc-layout">
        
        {/* Lado izquierdo: Buscador de pacientes y resumen */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card-base" style={{ padding: '24px' }}>
            <div className="section-header">
              <span className="section-bar"></span>
              <span className="section-title">Datos del Paciente</span>
            </div>
            
            <div className="form-group mb-4">
              <label className="form-label">Buscar paciente</label>
              <div className="search-wrap">
                <Search className="search-icon-inner" />
                <select className="form-control" value={patientId} onChange={handlePatientSelect}>
                  <option value="">Seleccionar paciente...</option>
                  {PATIENTS.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {patient && (
              <div style={{ background: 'var(--brand-surface-alt)', padding: '16px', borderRadius: '12px', border: '1px solid var(--brand-border)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--brand-tertiary)', color: '#0D401C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--brand-text)' }}>{patient.nombre}</div>
                    <div style={{ fontSize: 12, color: 'var(--brand-text-muted)' }}>ID: {patient.id}</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: 13 }}>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted">RFC:</span>
                    <span className="text-medium">{patient.rfc}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">C.P.:</span>
                    <span className="text-medium">{patient.cp}</span>
                  </div>
                </div>
              </div>
            )}
            {!patient && (
              <div className="empty-state" style={{ padding: '32px' }}>
                <div className="empty-icon"><Search size={32} /></div>
                <p>Seleccione un paciente para facturar</p>
              </div>
            )}
          </div>
        </div>

        {/* Lado derecho: Formulario de cobro */}
        <div>
          <div className="card-base" style={{ padding: '24px', opacity: patient ? 1 : 0.5, pointerEvents: patient ? 'auto' : 'none' }}>
            <div className="section-header">
              <span className="section-bar"></span>
              <span className="section-title">Detalles del Comprobante</span>
            </div>

            <div className="hc-grid-2 mb-4">
              <div className="form-group">
                <label className="form-label">Concepto <span className="req">*</span></label>
                <input name="concepto" className="form-control" value={form.concepto} onChange={ch} />
              </div>
              <div className="form-group">
                <label className="form-label">Monto (MXN) <span className="req">*</span></label>
                <div className="search-wrap">
                  <DollarSign className="search-icon-inner" />
                  <input name="monto" type="number" step="0.01" className="form-control" value={form.monto} onChange={ch} />
                </div>
              </div>
            </div>

            <div className="hc-grid-3 mb-6">
              <div className="form-group">
                <label className="form-label">Método de Pago</label>
                <select name="metodoPago" className="form-control" value={form.metodoPago} onChange={ch}>
                  <option>01 - Efectivo</option>
                  <option>03 - Transferencia electrónica</option>
                  <option>04 - Tarjeta de crédito</option>
                  <option>28 - Tarjeta de débito</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Uso de CFDI</label>
                <select name="usoCfdi" className="form-control" value={form.usoCfdi} onChange={ch}>
                  <option>G03 - Gastos en general</option>
                  <option>D01 - Honorarios médicos, dentales y gastos hospitalarios</option>
                  <option>P01 - Por definir</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Régimen Fiscal</label>
                <select name="regimen" className="form-control" value={form.regimen} onChange={ch}>
                  <option>601 - General de Ley Personas Morales</option>
                  <option>612 - Personas Físicas con Actividades Empresariales y Profesionales</option>
                  <option>626 - Régimen Simplificado de Confianza</option>
                </select>
              </div>
            </div>

            {/* Acciones de Facturación */}
            <div style={{ display: 'flex', gap: '16px', paddingTop: '24px', borderTop: '1px solid var(--brand-border)' }}>
              <button 
                className="btn btn-primary btn-lg" 
                style={{ flex: 1 }}
                onClick={handleSat}
              >
                <FilePlus size={18} />
                Generar Factura CFDI (SAT)
              </button>
              <button 
                className="btn btn-secondary btn-lg"
                style={{ flex: 1 }}
                onClick={handleInternal}
              >
                <CreditCard size={18} />
                Generar Recibo Interno (Sin SAT)
              </button>
            </div>

            {/* Estados de éxito */}
            {status === 'sat_success' && (
              <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(167, 238, 179, 0.1)', border: '1px solid rgba(167, 238, 179, 0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--brand-tertiary)' }}>
                <CheckCircle size={24} />
                <div>
                  <div style={{ fontWeight: 700 }}>Factura CFDI Generada Exitosamente</div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>Folio Fiscal (UUID): 12345678-ABCD-1234-ABCD-1234567890AB</div>
                </div>
              </div>
            )}

            {status === 'internal_success' && (
              <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(167, 227, 238, 0.1)', border: '1px solid rgba(167, 227, 238, 0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--brand-secondary)' }}>
                <CheckCircle size={24} />
                <div>
                  <div style={{ fontWeight: 700 }}>Recibo Interno Generado</div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>Folio Interno: REC-2026-0042. Este recibo no tiene validez fiscal.</div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
}

export default Facturacion;
