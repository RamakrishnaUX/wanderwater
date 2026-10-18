import { put } from '@vercel/blob';

// Saves a player's passport name and photo to the private Wanderwater blob store.
// Each player gets a folder: passports/<id>/name.json and passports/<id>/photo.jpg
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const id = String(b.id || '').replace(/[^a-z0-9]/gi, '').slice(0, 24);
    if (id.length < 8) return res.status(400).json({ ok: false, error: 'bad id' });
    const name = String(b.name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 26);
    const saved = {};
    if (b.photo) {
      const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.photo));
      if (!m) return res.status(400).json({ ok: false, error: 'photo must be a jpeg' });
      const buf = Buffer.from(m[1], 'base64');
      if (buf.length > 400000) return res.status(413).json({ ok: false, error: 'photo too large' });
      if (buf[0] !== 0xff || buf[1] !== 0xd8) return res.status(400).json({ ok: false, error: 'not a jpeg' });
      await put(`passports/${id}/photo.jpg`, buf, { access: 'private', contentType: 'image/jpeg', addRandomSuffix: false, allowOverwrite: true });
      saved.photo = true;
    }
    if (name || b.photo) {
      const rec = { name, city: String(b.city || '').slice(0, 20), stamps: Math.max(0, Math.min(10, parseInt(b.stamps, 10) || 0)), updated: new Date().toISOString() };
      await put(`passports/${id}/name.json`, JSON.stringify(rec, null, 2), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
      saved.name = !!name;
    }
    return res.status(200).json({ ok: true, saved });
  } catch (e) {
    console.error('passport save failed', e);
    return res.status(500).json({ ok: false });
  }
}
