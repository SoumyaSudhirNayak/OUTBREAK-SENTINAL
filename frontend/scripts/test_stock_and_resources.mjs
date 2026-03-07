const BASE = process.env.BASE ?? 'http://localhost:8000';

async function j(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${text}`);
  }
  return JSON.parse(text);
}

async function main() {
  const vehicles = await j(`${BASE}/vehicles/`);
  const vehicleId = vehicles?.[0]?.id;
  if (!vehicleId) throw new Error('No vehicles');

  const assignments = await j(`${BASE}/vehicle/assignments/${vehicleId}/detailed`);
  const outbreakId = assignments?.[0]?.outbreak_id;
  if (!outbreakId) throw new Error('No assignment outbreak_id');

  const medsBefore = await j(`${BASE}/resources/medicines`);
  const medName = medsBefore?.[0]?.medicine_name;
  if (!medName) throw new Error('No medicines');

  console.log('vehicleId', vehicleId);
  console.log('outbreakId', outbreakId);
  console.log('medicine', medName);
  console.log('stock_before', medsBefore[0].stock_count);

  await j(`${BASE}/vehicle/stock/update`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      vehicle_id: vehicleId,
      outbreak_id: outbreakId,
      medicine_name: medName,
      quantity_used: 1,
      patients_treated: 1,
      equipment_used: {},
    }),
  });

  const medsAfter = await j(`${BASE}/resources/medicines`);
  const firstAfter = medsAfter.find((m) => m.medicine_name === medName);
  console.log('stock_after', firstAfter?.stock_count);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

