import { useState } from 'react';
import { OutbreakForm } from './OutbreakForm';
import { LocationSelection } from './LocationSelection';
import { createOutbreak } from '../utils/doctorDashboardApi';

export function DashboardTab() {
  const [step, setStep] = useState<'form' | 'location'>('form');
  const [formData, setFormData] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProceedToLocation = (data: any) => {
    setFormData(data);
    setStep('location');
  };

  const handleBack = () => {
    setStep('form');
  };

  const handleSubmit = (locationData: any) => {
    setSubmitting(true);
    setError(null);

    const payload = {
      disease_type: String(formData?.diseaseType ?? '').trim(),
      severity: String(formData?.severity ?? '').trim(),
      affected_people: Number(formData?.affectedPeople ?? 0),
      children: Number(formData?.children ?? 0),
      adults: Number(formData?.adults ?? 0),
      elderly: Number(formData?.elderly ?? 0),
      outbreak_date: String(formData?.outbreakDate ?? '').trim(),
      notes: String(formData?.notes ?? '').trim(),
      latitude: Number(locationData?.coordinates?.lat),
      longitude: Number(locationData?.coordinates?.lng),
      area_name: String(locationData?.selectedArea ?? '').trim(),
    };

    createOutbreak(payload as any)
      .then(() => {
        setStep('form');
        setFormData(null);
      })
      .catch((e: any) => {
        setError(e?.message ?? 'Failed to submit report');
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-xl p-4" style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)', color: '#fca5a5' }}>
          {error}
        </div>
      )}
      {step === 'form' ? (
        <OutbreakForm onProceed={handleProceedToLocation} />
      ) : (
        <LocationSelection onBack={handleBack} onSubmit={handleSubmit} submitting={submitting} />
      )}
    </div>
  );
}
