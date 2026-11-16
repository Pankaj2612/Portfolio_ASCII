/* ==========================================================================
   mail.js — contact-form delivery (configured by CONTACT in data/portfolio.js)

   sendMessage(values) → { status, text }
     status 'sent'        delivered to the provider
            'activation'  FormSubmit's one-time setup: the site owner must click
                          "Activate form" in the email FormSubmit just sent them
            'error'       nothing was delivered (text explains why)
   The UI never claims delivery unless the provider confirmed it.

   mailtoHref(values) → a prefilled mailto: link (fallback + 'mailto' provider)
   ========================================================================== */
import { CONTACT, LINKS } from '../data/portfolio.js';

const TIMEOUT_MS = 15000;

export function providerLabel() {
  const p = CONTACT.provider;
  if (p === 'mailto') return 'MAILTO';
  return isConfigured() ? `LIVE · ${p.toUpperCase()}` : 'NOT CONFIGURED';
}

export function isConfigured() {
  switch (CONTACT.provider) {
    case 'formsubmit': return !!CONTACT.to;
    case 'formspree':
    case 'custom': return !!CONTACT.endpoint;
    case 'web3forms': return !!CONTACT.accessKey;
    case 'mailto': return !!(CONTACT.to || LINKS.email);
    default: return false;
  }
}

export function mailtoHref({ name = '', email = '', message = '' } = {}) {
  const to = LINKS.email || CONTACT.to || '';
  const subject = name ? `${CONTACT.subject} — ${name}` : CONTACT.subject;
  const body = message ? `${message}\n\n— ${name}${email ? ` <${email}>` : ''}` : '';
  const q = new URLSearchParams();
  q.set('subject', subject);
  if (body) q.set('body', body);
  // URLSearchParams encodes spaces as '+', which some mail apps show literally
  return `mailto:${to}?${q.toString().replace(/\+/g, '%20')}`;
}

async function post(url, payload) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    let data = null;
    try { data = await res.json(); } catch { /* non-JSON response */ }
    return { res, data };
  } finally {
    clearTimeout(timer);
  }
}

export async function sendMessage(values) {
  const name = values.name.trim(), email = values.email.trim(), message = values.message.trim();
  const subject = `${CONTACT.subject} — ${name}`;
  if (!isConfigured()) return { status: 'error', text: 'The contact form is not configured yet (see CONTACT in src/data/portfolio.js).' };

  try {
    switch (CONTACT.provider) {
      case 'formsubmit': {
        const { res, data } = await post(`https://formsubmit.co/ajax/${encodeURIComponent(CONTACT.to)}`, {
          name, email, message, _subject: subject, _replyto: email, _template: 'table', _captcha: 'false',
        });
        const ok = data && String(data.success) === 'true';
        if (res.ok && ok) return { status: 'sent' };
        const msg = (data && data.message) || `HTTP ${res.status}`;
        if (/activat/i.test(msg)) return { status: 'activation', text: msg };
        return { status: 'error', text: msg };
      }
      case 'formspree': {
        const { res, data } = await post(CONTACT.endpoint, { name, email, message, _subject: subject });
        if (res.ok) return { status: 'sent' };
        const msg = data && data.errors ? data.errors.map(e => e.message).join('; ') : `HTTP ${res.status}`;
        return { status: 'error', text: msg };
      }
      case 'web3forms': {
        const { res, data } = await post('https://api.web3forms.com/submit', { access_key: CONTACT.accessKey, name, email, message, subject, from_name: 'Portfolio' });
        if (res.ok && data && data.success) return { status: 'sent' };
        return { status: 'error', text: (data && data.message) || `HTTP ${res.status}` };
      }
      case 'custom': {
        const { res } = await post(CONTACT.endpoint, { name, email, message });
        return res.ok ? { status: 'sent' } : { status: 'error', text: `HTTP ${res.status}` };
      }
      default:
        return { status: 'error', text: `Unknown provider '${CONTACT.provider}'` };
    }
  } catch (err) {
    return { status: 'error', text: err.name === 'AbortError' ? 'the mail service did not respond in time' : 'network error — check your connection' };
  }
}
