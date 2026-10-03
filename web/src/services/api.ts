const API_URL = 'http://localhost:8000';

export const aiAssess = async (imageB64: string, text: string) => {
  const res = await fetch(`${API_URL}/ai/assess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_b64: imageB64, text })
  });
  if (!res.ok) throw new Error('AI Assessment failed');
  return res.json();
};

export const submitReport = async (reportData: any) => {
  const res = await fetch(`${API_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData)
  });
  if (!res.ok) throw new Error('Failed to submit report');
  return res.json();
};

export const fetchWaterBodies = async () => {
  const res = await fetch(`${API_URL}/water-bodies`);
  if (!res.ok) throw new Error('Failed to fetch water bodies');
  return res.json();
};
