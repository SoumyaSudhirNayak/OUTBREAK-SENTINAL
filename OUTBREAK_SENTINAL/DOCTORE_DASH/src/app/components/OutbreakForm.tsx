import { useState, useEffect } from 'react';
import { Save, ChevronRight, AlertCircle } from 'lucide-react';

interface OutbreakFormProps {
  onProceed: (data: any) => void;
}

const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(20px)',
  borderRadius: '20px',
};

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: 'rgba(255,255,255,0.9)',
  width: '100%',
  padding: '12px 16px',
  outline: 'none',
  transition: 'all 0.2s',
  fontSize: '14px',
};

const labelStyle = {
  display: 'block',
  marginBottom: '8px',
  fontSize: '13px',
  fontWeight: '500',
  color: 'rgba(255,255,255,0.6)',
  letterSpacing: '0.02em',
};

export function OutbreakForm({ onProceed }: OutbreakFormProps) {
  const [formData, setFormData] = useState({
    diseaseType: '',
    affectedPeople: '',
    children: '',
    adults: '',
    elderly: '',
    outbreakDate: '',
    severity: '',
    notes: '',
  });
  const [autoSaved, setAutoSaved] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.values(formData).some((val) => val !== '')) {
        setAutoSaved(true);
        setTimeout(() => setAutoSaved(false), 2500);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onProceed(formData);
  };

  const getFocusStyle = (field: string) => ({
    ...inputStyle,
    border: focusedField === field
      ? '1px solid rgba(37,99,235,0.7)'
      : '1px solid rgba(255,255,255,0.1)',
    boxShadow: focusedField === field ? '0 0 0 3px rgba(37,99,235,0.15)' : 'none',
  });

  const severityColors: Record<string, string> = {
    mild: '#22c55e',
    moderate: '#f59e0b',
    severe: '#ef4444',
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div
              className="h-1 w-8 rounded-full"
              style={{ background: 'linear-gradient(90deg, #2563EB, #818cf8)' }}
            />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#60a5fa' }}>
              New Report
            </span>
          </div>
          <h2
            className="text-3xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            New Outbreak Report
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Submit a detailed outbreak report for analysis and mobile clinic routing
          </p>
        </div>
        {autoSaved && (
          <div
            className="flex items-center gap-2 rounded-full px-4 py-2"
            style={{
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.25)',
            }}
          >
            <Save className="h-3.5 w-3.5 text-green-400" />
            <span className="text-xs font-medium text-green-400">Draft Saved</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={glassCard} className="p-8">
          <div className="space-y-6">
            {/* Disease Type + Severity Row */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label style={labelStyle}>Disease Type</label>
                <select
                  value={formData.diseaseType}
                  onChange={(e) => handleChange('diseaseType', e.target.value)}
                  onFocus={() => setFocusedField('diseaseType')}
                  onBlur={() => setFocusedField(null)}
                  style={getFocusStyle('diseaseType')}
                  required
                >
                  <option value="" style={{ background: '#0d1530' }}>Select disease type</option>
                  <option value="malaria" style={{ background: '#0d1530' }}>Malaria</option>
                  <option value="dengue" style={{ background: '#0d1530' }}>Dengue</option>
                  <option value="tb" style={{ background: '#0d1530' }}>TB</option>
                  <option value="cholera" style={{ background: '#0d1530' }}>Cholera</option>
                  <option value="custom" style={{ background: '#0d1530' }}>Custom</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Symptoms Severity Level</label>
                <select
                  value={formData.severity}
                  onChange={(e) => handleChange('severity', e.target.value)}
                  onFocus={() => setFocusedField('severity')}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...getFocusStyle('severity'),
                    color: formData.severity
                      ? severityColors[formData.severity] || 'rgba(255,255,255,0.9)'
                      : 'rgba(255,255,255,0.9)',
                  }}
                  required
                >
                  <option value="" style={{ background: '#0d1530', color: 'rgba(255,255,255,0.9)' }}>
                    Select severity level
                  </option>
                  <option value="mild" style={{ background: '#0d1530', color: '#22c55e' }}>Mild</option>
                  <option value="moderate" style={{ background: '#0d1530', color: '#f59e0b' }}>Moderate</option>
                  <option value="severe" style={{ background: '#0d1530', color: '#ef4444' }}>Severe</option>
                </select>
              </div>
            </div>

            {/* Number of Affected People */}
            <div>
              <label style={labelStyle}>Number of Affected People</label>
              <input
                type="number"
                min="0"
                value={formData.affectedPeople}
                onChange={(e) => handleChange('affectedPeople', e.target.value)}
                onFocus={() => setFocusedField('affectedPeople')}
                onBlur={() => setFocusedField(null)}
                style={getFocusStyle('affectedPeople')}
                placeholder="Enter total number of affected individuals"
                required
              />
            </div>

            {/* Age Group Distribution */}
            <div>
              <label style={{ ...labelStyle, marginBottom: '12px' }}>Age Group Distribution</label>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { key: 'children', label: 'Children (0–14)', color: '#60a5fa' },
                  { key: 'adults', label: 'Adults (15–59)', color: '#818cf8' },
                  { key: 'elderly', label: 'Elderly (60+)', color: '#c084fc' },
                ].map(({ key, label, color }) => (
                  <div
                    key={key}
                    className="rounded-xl p-4"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${focusedField === key ? `${color}40` : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <div
                      className="mb-3 flex items-center gap-2 text-xs font-semibold"
                      style={{ color }}
                    >
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                      />
                      {label}
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={formData[key as keyof typeof formData]}
                      onChange={(e) => handleChange(key, e.target.value)}
                      onFocus={() => setFocusedField(key)}
                      onBlur={() => setFocusedField(null)}
                      style={{
                        ...inputStyle,
                        background: 'rgba(255,255,255,0.04)',
                        border: focusedField === key
                          ? `1px solid ${color}60`
                          : '1px solid rgba(255,255,255,0.07)',
                        boxShadow: focusedField === key ? `0 0 0 3px ${color}15` : 'none',
                      }}
                      placeholder="0"
                      required
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Date of First Outbreak */}
            <div>
              <label style={labelStyle}>Date of First Outbreak</label>
              <input
                type="date"
                value={formData.outbreakDate}
                onChange={(e) => handleChange('outbreakDate', e.target.value)}
                onFocus={() => setFocusedField('outbreakDate')}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...getFocusStyle('outbreakDate'),
                  colorScheme: 'dark',
                }}
                required
              />
            </div>

            {/* Doctor Notes */}
            <div>
              <label style={labelStyle}>Brief Doctor Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                onFocus={() => setFocusedField('notes')}
                onBlur={() => setFocusedField(null)}
                rows={4}
                style={{
                  ...getFocusStyle('notes'),
                  resize: 'vertical',
                  minHeight: '100px',
                }}
                placeholder="Enter any additional observations, risk factors, or clinical notes..."
                required
              />
            </div>
          </div>

          {/* Severity Warning */}
          {formData.severity === 'severe' && (
            <div
              className="mt-6 flex items-start gap-3 rounded-xl p-4"
              style={{
                background: 'rgba(220,38,38,0.08)',
                border: '1px solid rgba(220,38,38,0.25)',
              }}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
              <p className="text-sm text-red-300">
                <span className="font-semibold text-red-400">Severe outbreak detected.</span> This report will
                be flagged for immediate review and emergency resource allocation.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-8">
            <button
              type="submit"
              className="group flex items-center gap-3 rounded-xl px-8 py-3.5 font-semibold text-white transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #2563EB, #4f46e5)',
                boxShadow: '0 0 20px rgba(37,99,235,0.4), 0 4px 15px rgba(37,99,235,0.3)',
              }}
            >
              Proceed to Location Selection
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
