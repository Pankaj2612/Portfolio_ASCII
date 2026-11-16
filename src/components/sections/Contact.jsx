/* CONTACT — terminal-style form that really delivers mail (see lib/mail.js).
   • validation + a hidden honeypot field against bots
   • states: sending → sent | activation (FormSubmit one-time setup) | error
   • the UI only says "delivered" when the provider confirmed it
   • always offers a fallback: open the visitor's mail app (prefilled) or copy the address */
import { useRef, useState } from 'react';
import SectionHead from '../ui/SectionHead.jsx';
import Window from '../ui/Window.jsx';
import Lede from '../ui/Lede.jsx';
import { Section, Split } from '../ui/Section.jsx';
import { CONTACT, LINKS } from '../../data/portfolio.js';
import { sendMessage, mailtoHref, providerLabel, isConfigured } from '../../lib/mail.js';
import { sfx } from '../../lib/sound.js';
import { track } from '../../lib/analytics.js';

const RULES = {
  name: v => (v.trim().length < 2 ? 'name: at least 2 characters required' : ''),
  email: v => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'email: enter a valid address'),
  message: v => (v.trim().length < 10 ? 'message: at least 10 characters required' : ''),
};
const FIELDS = [
  { key: 'name', id: 'fName', type: 'text', autoComplete: 'name', max: 80 },
  { key: 'email', id: 'fEmail', type: 'email', autoComplete: 'email', max: 120 },
  { key: 'message', id: 'fMsg', textarea: true, max: 4000 },
];
const STATUS = {
  sent: 'border border-secondary px-3 py-2.5 text-cyan',
  activation: 'border border-dashed border-highlight bg-coral/5 px-3 py-2.5 text-coral-soft',
  error: 'border border-dashed border-highlight px-3 py-2.5 text-highlight',
  invalid: 'text-highlight',
  sending: 'text-fg-2',
  mailto: 'border border-secondary px-3 py-2.5 text-cyan',
};
const COOLDOWN_MS = 30000;
const EMPTY = { name: '', email: '', message: '' };
const linkBtn = 'inline-block border border-line-strong bg-ink-1 px-2.5 py-1.5 hover:bg-highlight hover:text-ink-0';

function ContactLinks() {
  const items = [
    LINKS.email && ['email', `mailto:${LINKS.email}`, LINKS.email],
    LINKS.github && ['github', LINKS.github, 'GitHub'],
    LINKS.repos && ['repositories', LINKS.repos, 'All projects on GitHub'],
    LINKS.linkedin && ['linkedin', LINKS.linkedin, 'LinkedIn'],
    LINKS.leetcode && ['leetcode', LINKS.leetcode, 'LeetCode'],
    LINKS.resume && ['resume', LINKS.resume, 'Résumé (PDF)'],
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <ul className="mb-[22px] mt-0 flex list-none flex-wrap gap-2.5 p-0 text-[13px]" aria-label="Contact links">
      {items.map(([k, href, label]) => {
        const ext = !href.startsWith('mailto:');
        return (
          <li key={k}>
            <a href={href} aria-label={`${k}: ${label}`} onClick={() => k === 'resume' && track('resume_open')} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={linkBtn}>
              &gt; {label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function CopyEmail() {
  const [copied, setCopied] = useState(false);
  if (!LINKS.email || !navigator.clipboard) return null;
  return (
    <button
      type="button"
      className={`${linkBtn} text-[13px]`}
      onClick={async () => {
        try { await navigator.clipboard.writeText(LINKS.email); setCopied(true); sfx.play('success'); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
      }}
    >
      {copied ? '✓ copied' : '[ copy email ]'}
    </button>
  );
}

export default function Contact() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null); // { kind, text }
  const [sending, setSending] = useState(false);
  const [honey, setHoney] = useState('');
  const lastSent = useRef(0);
  const refs = { name: useRef(null), email: useRef(null), message: useRef(null) };
  const mailtoOnly = CONTACT.provider === 'mailto';

  const check = (key, v = values[key]) => { const msg = RULES[key](v); setErrors(e => ({ ...e, [key]: msg })); return !msg; };
  const onChange = key => (e) => { const v = e.target.value; setValues(s => ({ ...s, [key]: v })); if (errors[key]) check(key, v); };

  async function onSubmit(e) {
    e.preventDefault();
    if (sending) return;
    const next = Object.fromEntries(Object.keys(RULES).map(k => [k, RULES[k](values[k])]));
    setErrors(next);
    const firstBad = Object.keys(next).find(k => next[k]);
    if (firstBad) { setStatus({ kind: 'invalid', text: '✕ validation failed — fix the highlighted fields.' }); sfx.play('error'); refs[firstBad].current?.focus(); return; }

    // bots fill every field, people never see this one: pretend success, send nothing
    if (honey) { setStatus({ kind: 'sent', text: '✓ message delivered.' }); setValues(EMPTY); return; }

    if (mailtoOnly) {
      window.location.href = mailtoHref(values);
      setStatus({ kind: 'mailto', text: '→ your mail app should open with the message ready to send. Nothing is sent until you press send there.' });
      return;
    }
    if (Date.now() - lastSent.current < COOLDOWN_MS) {
      setStatus({ kind: 'error', text: '✕ please wait a few seconds before sending another message.' });
      return;
    }

    setSending(true);
    setStatus({ kind: 'sending', text: '> opening connection… transmitting…' });
    const result = await sendMessage(values);
    setSending(false);

    if (result.status === 'sent') {
      lastSent.current = Date.now();
      setStatus({ kind: 'sent', text: `✓ message delivered. Thanks ${values.name.trim().split(' ')[0]} — I'll reply to ${values.email.trim()}.` });
      setValues(EMPTY);
      sfx.play('success');
      track('contact_sent', { provider: CONTACT.provider });
    } else if (result.status === 'activation') {
      setStatus({ kind: 'activation', text: '⚠ first-time setup: the mail service just asked the site owner to confirm this form. Your message was NOT delivered yet — please use “open in mail app” below, or try again later.' });
      sfx.play('error');
    } else {
      setStatus({ kind: 'error', text: `✕ not delivered (${result.text}). Your text is still here — use “open in mail app” below to send it another way.` });
      sfx.play('error');
    }
  }

  const showFallback = status && (status.kind === 'error' || status.kind === 'activation');

  return (
    <Section id="contact" labelledBy="contactTitle" className="lg:min-h-screen">
      <SectionHead section="contact" titleId="contactTitle" big />
      <Split side="right" stage={{ id: 'contact', topLeft: 'PORTAL.LINK', bottomRight: 'STATUS: LISTENING' }}>
        <Lede>Share a problem, a role or an idea. A clear description of what you're trying to achieve is the best place to start.</Lede>
        <ContactLinks />
        <Window title="~/connect.sh" meta={providerLabel()} metaClass={isConfigured() ? 'text-secondary' : 'text-highlight'} reveal="crt">
          <form className="grid gap-1" noValidate onSubmit={onSubmit} aria-busy={sending}>
            {FIELDS.map((f) => {
              const errId = `${f.id}Err`;
              const bad = !!errors[f.key];
              const common = {
                id: f.id, name: f.key, ref: refs[f.key], value: values[f.key], required: true, maxLength: f.max, disabled: sending,
                onChange: onChange(f.key), onBlur: () => values[f.key] && check(f.key),
                'aria-invalid': bad ? 'true' : 'false', 'aria-describedby': errId,
                className: `w-full rounded-none border bg-ink-0 px-3 py-2.5 font-mono text-sm text-fg caret-highlight outline-none transition-[border-color,box-shadow] focus:border-secondary focus:shadow-[4px_4px_0_rgba(103,232,249,.25)] disabled:opacity-60 ${bad ? 'border-highlight' : 'border-line-strong'}`,
              };
              return (
                <div key={f.key}>
                  <label htmlFor={f.id} className="mb-1 block text-[13px] tracking-[.08em] text-secondary">&gt; {f.key}</label>
                  {f.textarea ? <textarea rows={5} {...common} className={`${common.className} min-h-[120px] resize-y`} /> : <input type={f.type} autoComplete={f.autoComplete} {...common} />}
                  <span id={errId} className="mt-0.5 block min-h-[1.4em] text-xs text-highlight">{bad ? `✕ ${errors[f.key]}` : ''}</span>
                </div>
              );
            })}
            {/* honeypot: hidden from people and assistive tech, bots fill it */}
            <div aria-hidden="true" className="sr-only">
              <label htmlFor="fWebsite">website</label>
              <input id="fWebsite" name="website" type="text" tabIndex={-1} autoComplete="off" value={honey} onChange={e => setHoney(e.target.value)} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <button type="submit" id="sendBtn" className="btn btn-primary" disabled={sending}>
                {sending ? '[ TRANSMITTING… ]' : mailtoOnly ? '[ OPEN_MAIL_APP ]' : '[ EXECUTE_SEND ]'}
              </button>
              <CopyEmail />
            </div>
            <p id="formStatus" role="status" aria-live="polite" className={`mb-0 mt-3.5 text-[13px] leading-[1.55] empty:hidden ${status ? STATUS[status.kind] : ''}`}>{status?.text || ''}</p>
            {showFallback && (
              <a id="mailtoFallback" href={mailtoHref(values)} className={`${linkBtn} mt-2 justify-self-start text-[13px]`}>
                &gt; open in mail app (message prefilled)
              </a>
            )}
          </form>
        </Window>
      </Split>
    </Section>
  );
}
