import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export const COOKIE = '__Host-llave-console';
export const hashToken = token => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');
export function configuration(env = process.env) {
  const {CONSOLE_ORIGIN: origin, CONSOLE_PASSWORD_HASH: passwordHash, CONSOLE_PASSWORD: password, CONSOLE_SESSION_SECRET: secret, DATABASE_URL: databaseUrl} = env;
  if (!origin || (!passwordHash && !password) || !secret || secret.length < 32 || !databaseUrl) return null;
  try { const u = new URL(origin); if (u.protocol !== 'https:' || u.origin !== origin) return null; } catch { return null; }
  if (passwordHash && !/^[a-f0-9]{32}:[a-f0-9]{128}$/i.test(passwordHash)) return null;
  if (!passwordHash && (typeof password !== 'string' || password.length < 12 || password.length > 256)) return null;
  return {origin,passwordHash,password:passwordHash?undefined:password,secret,databaseUrl};
}
export function sameOrigin(req, config) { return req.headers?.origin === config.origin; }
export function readToken(req) {
  const value = String(req.headers?.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  return /^[A-Za-z0-9_-]{43}$/.test(value || '') ? value : null;
}
export function cookie(token, maxAge = 28800) { return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`; }
export async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) return false;
  const [salt, expected] = encoded.split(':'); const actual = await derive(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(expected,'hex'));
}
export async function verifyConfiguredPassword(candidate, config) {
  if (config.passwordHash) return verifyPassword(candidate,config.passwordHash);
  if (typeof candidate !== 'string' || candidate.length < 12 || candidate.length > 256) return false;
  // Plain input is accepted only in the encrypted server environment, never in a client bundle.
  // Derive both values after the durable rate-limit check, then compare fixed-length buffers.
  const salt=createHmac('sha256',config.secret).update('console066-password').digest('hex');
  const [actual,expected]=await Promise.all([derive(candidate,salt,64),derive(config.password,salt,64)]);
  return timingSafeEqual(actual,expected);
}
export function rateKey(req, secret, onVercel = process.env.VERCEL === '1') {
  // Vercel overwrites this trusted platform header; never use a client-supplied forwarding chain.
  const ip = onVercel ? String(req.headers?.['x-vercel-forwarded-for'] || 'unknown').split(',')[0].trim() : 'unknown';
  return createHmac('sha256',secret).update(ip).digest('hex');
}
export const CONTACT_STATES = ['Por verificar','Listo para contactar','Contactado','En conversación','Cerrado','No contactar'];
export const TASK_STATES = ['Pendiente','En preparación','Listo para revisar','Completado'];
export const COUNTRIES = ['Chile','Argentina','Perú','Colombia','Ecuador','Bolivia','México','USA'];
export function validateNewLead(body) {
  if (!body || !COUNTRIES.includes(body.country)) return null;
  const limits={name:160,type:80,genres:200,evidence:1000,source_url:2000,verification:500};
  const lead={country:body.country};
  for (const [key,max] of Object.entries(limits)) {
    if (typeof body[key] !== 'string' || !body[key].trim() || body[key].length > max) return null;
    lead[key]=body[key].trim();
  }
  try { const url=new URL(lead.source_url); if (!['https:','http:'].includes(url.protocol) || url.username || url.password) return null; lead.source_url=url.href; } catch { return null; }
  return lead;
}
export function validateLeadUpdate(body) {
  if (!body || !Number.isSafeInteger(body.id) || body.id < 1 || !Number.isSafeInteger(body.version) || body.version < 0) return null;
  if (!CONTACT_STATES.includes(body.status) || typeof body.notes !== 'string' || body.notes.length > 5000 || typeof body.message !== 'string' || body.message.length > 3000 || typeof body.approved !== 'boolean') return null;
  if (body.approved && !body.message.trim()) return null;
  return {id:body.id,version:body.version,status:body.status,notes:body.notes.trim(),message:body.message.trim(),approved:body.approved};
}
