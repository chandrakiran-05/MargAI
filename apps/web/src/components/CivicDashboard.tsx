import React, { useEffect, useRef, useState } from 'react';
import Rellax from 'rellax';
import { CivicCase } from '@margai/contracts';
import { apiClient } from '../services/apiClient';
import { useI18n } from '../i18n';
import '../civic.css';

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const icons: Record<string, string> = { pothole: '🕳️', pedestrian: '🚶', animal: '🐄', collision_risk: '💥', suspected_incident: '⚠️', confirmed_incident: '🚨', sharp_curve: '↪️', low_visibility: '🌫️' };

const CountUp: React.FC<{ value: number }> = ({ value }) => {
  const [n, setN] = useState(reduced() ? value : 0);
  useEffect(() => {
    if (reduced()) { setN(value); return; }
    let raf = 0; const start = performance.now();
    const tick = (now: number) => { const p = Math.min(1, (now - start) / 900); setN(Math.round(value * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n}</>;
};

export const CivicDashboard: React.FC = () => {
  const { t, language } = useI18n();
  const [cases, setCases] = useState<CivicCase[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const mounted = useRef(false);
  const pending = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const statusLabels: Record<string, string> = { detected: t('New'), corroborated: t('Confirmed'), reviewed: t('Confirmed'), prepared: t('Ready'), submitted: t('Notice sent'), acknowledged: t('Notice sent'), repair_reported: t('Fixed'), reverified: t('Fixed'), closed: t('Fixed') };
  const hazardLabels: Record<string, string> = { pothole: t('Pothole'), pedestrian: t('Pedestrian'), animal: t('Animal'), collision_risk: t('Collision risk'), suspected_incident: t('Suspected incident'), confirmed_incident: t('Confirmed incident'), sharp_curve: t('Sharp curve'), low_visibility: t('Low visibility') };
  const tone = (c: CivicCase) => c.authority.complaintNumber || ['submitted', 'acknowledged', 'repair_reported', 'reverified', 'closed'].includes(c.status) ? 'mint' : c.status === 'detected' ? 'amber' : '';
  const when = (v: string) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? t('Time unavailable') : d.toLocaleString(language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); };

  const load = async () => {
    try {
      const data = await apiClient.getCases();
      if (!mounted.current) return;
      if (!Array.isArray(data)) throw new Error('bad');
      setCases(data); setError('');
      setSelectedId((p) => (data.some((c) => c.id === p) ? p : data[0]?.id ?? null));
    } catch { if (mounted.current) setError('Reports could not be loaded. Please try again.'); }
    finally { if (mounted.current) setIsLoading(false); }
  };
  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (reduced() || !rootRef.current) return;
    let r: Rellax | undefined;
    try { r = new Rellax('.cv-deco', { center: false }); } catch { /* decorative */ }
    return () => { try { r?.destroy(); } catch { /* ignore */ } };
  }, []);

  const burst = async (el: HTMLElement) => {
    if (reduced()) return;
    try {
      const mojs = (await import('@mojs/core')).default;
      const rect = el.getBoundingClientRect();
      const b = new mojs.Burst({ parent: document.body, left: 0, top: 0, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, count: 10, radius: { 20: 90 }, angle: { 0: 40 }, children: { shape: ['circle', 'polygon'], radius: { 7: 0 }, fill: ['#2f6bff', '#7a4dff', '#ff5d73', '#ffc23d', '#18c98a'], duration: 800, easing: 'cubic.out' }, onComplete: () => b.el?.remove?.() });
      if (b.el) { b.el.style.pointerEvents = 'none'; b.el.style.zIndex = '500'; b.el.setAttribute('aria-hidden', 'true'); }
      b.play();
    } catch { /* decorative */ }
  };

  const selected = cases.find((c) => c.id === selectedId) || null;
  const sent = (c: CivicCase) => !!c.authority.complaintNumber;

  // Existing logic: prepare the draft if missing, then record the demo dispatch (simulation only).
  const handleSend = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!selected || pending.current || sent(selected)) return;
    const caseId = selected.id; const hasDraft = !!selected.formalComplaintMarkdown;
    pending.current = true; setIsSending(true); setError(''); setNotice('');
    void burst(event.currentTarget);
    try {
      if (!hasDraft) {
        const g = await apiClient.generateGeminiReport(caseId);
        if (g.error || !g.markdownReport) throw new Error('draft');
      }
      const result = await apiClient.submitToAuthority(caseId);
      if (!mounted.current) return;
      if (result.error || !result.case) throw new Error('dispatch');
      setCases((p) => p.map((c) => (c.id === caseId ? result.case : c)));
      setNotice('Demo notice recorded. No authority was contacted.');
      await load();
    } catch { if (mounted.current) setError('The demo notice could not be sent. Please try again.'); }
    finally { pending.current = false; if (mounted.current) setIsSending(false); }
  };

  const recent = cases.slice().sort((a, b) => new Date(b.lastObservedAt).getTime() - new Date(a.lastObservedAt).getTime()).slice(0, 5);
  const noticesSent = cases.filter(sent).length;
  const stats = [{ k: 'blue', v: cases.length, l: t('Reports') }, { k: 'amber', v: cases.length - noticesSent, l: t('Waiting') }, { k: 'mint', v: noticesSent, l: t('Notices sent') }];

  return (
    <div className="cv" ref={rootRef}>
      <span className="cv-deco a" data-rellax-speed="-2" aria-hidden="true" />
      <span className="cv-deco b" data-rellax-speed="2" aria-hidden="true" />
      <header className="cv-in" style={{ '--i': 0 } as React.CSSProperties}>
        <h1>{t('Road reports')}</h1>
        <p className="cv-sub">{t('Spot it. Tap it. Get it fixed.')}</p>
      </header>
      <div className="cv-stats">
        {stats.map((s, i) => <div key={s.k} className={`cv-stat glass ${s.k} cv-in`} style={{ '--i': i + 1 } as React.CSSProperties}><b><CountUp value={s.v} /></b><span>{s.l}</span></div>)}
      </div>
      {error && <div role="alert" className="cv-msg err">{t(error)}</div>}
      {notice && <div role="status" className="cv-msg ok">{t(notice)}</div>}
      {isLoading && !cases.length ? <p className="cv-empty">{t('Loading reports…')}</p> : !recent.length ? <p className="cv-empty">{t('No reports yet.')}</p> : (
        <div className="cv-grid">
          <div className="cv-list">
            {recent.map((c, i) => (
              <button key={c.id} className="cv-row cv-in" style={{ '--i': i + 4 } as React.CSSProperties} aria-pressed={c.id === selectedId} onClick={() => { setSelectedId(c.id); setNotice(''); }}>
                <span className="cv-ico" aria-hidden="true">{icons[c.hazardType] || '🛣️'}</span>
                <span className="cv-main"><strong>{c.roadName}</strong><small>{when(c.lastObservedAt)}</small></span>
                <span className={`cv-chip ${tone(c)}`}>{sent(c) ? t('Notice sent') : statusLabels[c.status] || t('In review')}</span>
              </button>
            ))}
          </div>
          {selected && (
            <aside className="cv-card glass cv-in" style={{ '--i': 5 } as React.CSSProperties} aria-live="polite">
              <span className={`cv-chip ${tone(selected)}`}>{hazardLabels[selected.hazardType] || t('Road observation')}</span>
              <h2>{selected.roadName}</h2>
              <p>{selected.jurisdiction}</p>
              <p style={{ marginTop: 6 }}>{when(selected.lastObservedAt)}</p>
              <div className="cv-act">
                {sent(selected)
                  ? <span className="cv-chip mint">{t('Demo notice recorded')}</span>
                  : <button className="btn3d coral big" onClick={handleSend} disabled={isSending}>{isSending ? t('Sending…') : t('Send notice')}</button>}
                <span className="cv-honest">{t('Simulation only. No authority is contacted.')}</span>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
};
