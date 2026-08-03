import { useState } from 'react';
import Layout from '../../components/Layout/Layout';
import { Activity, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function ReporteDoppler() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    paciente: 'Ana García López',
    fecha: new Date().toISOString().split('T')[0],
    dopDerProfundo: 'Eje venoso profundo permeable y compresible en toda su extensión con flujo cíclico espontáneo sin insuficiencia ni reflujo.',
    dopDerSafInt: 'Suficiente.', dopDerSafIntDiam: '',
    dopDerSafExt: 'Permeable, suficiente.', dopDerSafExtDiam: '',
    dopDerPerf: 'No se observan perforantes insuficientes.',
    dopDerTrom: 'No se observan signos de trombosis en los vasos evaluados.',
    dopIzqProfundo: 'Eje venoso profundo permeable y compresible en toda su extensión con flujo cíclico espontáneo sin insuficiencia ni reflujo.',
    dopIzqSafInt: 'Suficiente.', dopIzqSafIntDiam: '',
    dopIzqSafExt: 'Permeable, suficiente.', dopIzqSafExtDiam: '',
    dopIzqPerf: 'No se observan perforantes insuficientes.',
    dopIzqTrom: 'No se observan signos de trombosis en los vasos evaluados.',
    dopConclusion: 'Sistema venoso evaluado permeable sin datos de insuficiencia ni trombosis.'
  });

  const ch = (e) => { const { name, value } = e.target; setForm(p => ({ ...p, [name]: value })); };

  return (
    <Layout breadcrumb="Reporte Ecodöppler">
      <div className="page-header">
        <div>
          <button className="btn btn-ghost mb-2 px-0 text-muted" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} className="mr-1" /> Volver a Historia Clínica
          </button>
          <h1 className="page-title flex items-center gap-2">
            <Activity size={24} style={{ color: 'var(--brand-primary)' }} /> 
            Reporte Ecodöppler Venoso
          </h1>
          <p className="page-subtitle">Formulario de registro ecográfico de miembros inferiores</p>
        </div>
        <button className="btn btn-primary">
          <Save size={16} className="mr-1" /> Guardar Reporte
        </button>
      </div>

      <div className="card" style={{ padding: '32px' }}>
        
        <div className="hc-grid-2 mb-6">
          <div className="form-group">
            <label className="form-label">Paciente</label>
            <input name="paciente" className="form-control" value={form.paciente} onChange={ch} />
          </div>
          <div className="form-group">
            <label className="form-label">Fecha del estudio</label>
            <input name="fecha" type="date" className="form-control" value={form.fecha} onChange={ch} />
          </div>
        </div>

        {/* MID */}
        <div className="mb-8">
          <div className="section-header">
            <span className="section-bar"></span>
            <span className="section-title">Miembro Inferior Derecho</span>
          </div>
          <div className="form-group mb-4">
            <label className="form-label">Eje venoso profundo</label>
            <textarea name="dopDerProfundo" className="form-control" rows={2} value={form.dopDerProfundo} onChange={ch} />
          </div>
          <div className="hc-grid-2 mb-4">
            <div className="form-group">
              <label className="form-label">Cayado / Tronco Safena Interna</label>
              <input name="dopDerSafInt" className="form-control" value={form.dopDerSafInt} onChange={ch} />
            </div>
            <div className="form-group">
              <label className="form-label">Diámetro (mm)</label>
              <input name="dopDerSafIntDiam" className="form-control" placeholder="Ej: 5.2" value={form.dopDerSafIntDiam} onChange={ch} />
            </div>
            <div className="form-group">
              <label className="form-label">Cayado / Tronco Safena Externa</label>
              <input name="dopDerSafExt" className="form-control" value={form.dopDerSafExt} onChange={ch} />
            </div>
            <div className="form-group">
              <label className="form-label">Diámetro (mm)</label>
              <input name="dopDerSafExtDiam" className="form-control" placeholder="Ej: 4.1" value={form.dopDerSafExtDiam} onChange={ch} />
            </div>
          </div>
          <div className="hc-grid-2">
            <div className="form-group">
              <label className="form-label">Perforantes</label>
              <input name="dopDerPerf" className="form-control" value={form.dopDerPerf} onChange={ch} />
            </div>
            <div className="form-group">
              <label className="form-label">Trombosis</label>
              <input name="dopDerTrom" className="form-control" value={form.dopDerTrom} onChange={ch} />
            </div>
          </div>
        </div>

        {/* MII */}
        <div className="mb-8">
          <div className="section-header">
            <span className="section-bar"></span>
            <span className="section-title">Miembro Inferior Izquierdo</span>
          </div>
          <div className="form-group mb-4">
            <label className="form-label">Eje venoso profundo</label>
            <textarea name="dopIzqProfundo" className="form-control" rows={2} value={form.dopIzqProfundo} onChange={ch} />
          </div>
          <div className="hc-grid-2 mb-4">
            <div className="form-group">
              <label className="form-label">Cayado / Tronco Safena Interna</label>
              <input name="dopIzqSafInt" className="form-control" value={form.dopIzqSafInt} onChange={ch} />
            </div>
            <div className="form-group">
              <label className="form-label">Diámetro (mm)</label>
              <input name="dopIzqSafIntDiam" className="form-control" placeholder="Ej: 5.2" value={form.dopIzqSafIntDiam} onChange={ch} />
            </div>
            <div className="form-group">
              <label className="form-label">Cayado / Tronco Safena Externa</label>
              <input name="dopIzqSafExt" className="form-control" value={form.dopIzqSafExt} onChange={ch} />
            </div>
            <div className="form-group">
              <label className="form-label">Diámetro (mm)</label>
              <input name="dopIzqSafExtDiam" className="form-control" placeholder="Ej: 4.1" value={form.dopIzqSafExtDiam} onChange={ch} />
            </div>
          </div>
          <div className="hc-grid-2">
            <div className="form-group">
              <label className="form-label">Perforantes</label>
              <input name="dopIzqPerf" className="form-control" value={form.dopIzqPerf} onChange={ch} />
            </div>
            <div className="form-group">
              <label className="form-label">Trombosis</label>
              <input name="dopIzqTrom" className="form-control" value={form.dopIzqTrom} onChange={ch} />
            </div>
          </div>
        </div>

        {/* Conclusion */}
        <div className="form-group">
          <label className="form-label font-bold text-lg">CONCLUSIÓN</label>
          <textarea name="dopConclusion" className="form-control" rows={3} style={{ fontWeight: 600 }} value={form.dopConclusion} onChange={ch} />
        </div>

      </div>
    </Layout>
  );
}

export default ReporteDoppler;
