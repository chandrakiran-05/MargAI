import React, { useEffect, useRef, useState } from 'react';
import { AudioLines, Eye, Navigation2, Radio, Smartphone, Sparkles, Pause, Play } from 'lucide-react';
import { TabType } from './Navbar';
import { useI18n } from '../i18n';
import '../home.css';
interface PublicSiteProps {onNavigateTab:(tab:TabType)=>void;selectedLanguage:string;}
const STACK=[{n:'Gemini',c:'#2f6bff'},{n:'Cloud Run',c:'#7a4dff'},{n:'Firestore',c:'#ffb400'},{n:'Maps Platform',c:'#18c98a'},{n:'LiteRT',c:'#ff5d73'},{n:'Android Auto',c:'#3dd5f3'}];
export const PublicSite:React.FC<PublicSiteProps>=({onNavigateTab})=>{
  const {t}=useI18n();
  const reduce=typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [playing,setPlaying]=useState(!reduce);
  const [videoFailed,setVideoFailed]=useState(false);
  const videoRef=useRef<HTMLVideoElement>(null);
  const rootRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{const v=videoRef.current;if(playing)void v?.play().catch(()=>{});else v?.pause();},[playing]);
  useEffect(()=>{
    let parallax:{destroy:()=>void}|undefined;let disposed=false;
    if(!reduce)import('rellax').then(m=>{if(!disposed&&rootRef.current)parallax=new m.default('.rellax',{center:true,round:true});}).catch(()=>{});
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{threshold:.15});
    rootRef.current?.querySelectorAll('.reveal').forEach(el=>io.observe(el));
    return()=>{disposed=true;parallax?.destroy();io.disconnect();};
  },[]);
  const steps=[{icon:Eye,color:'blue',title:'See',copy:'Your phone camera spots the hazard.'},{icon:Radio,color:'violet',title:'Share',copy:'The live map and cars behind you get a heads-up.'},{icon:AudioLines,color:'coral',title:'Hear',copy:'Your car display speaks it, in your language.'}];
  return <div className="home" ref={rootRef}>
    <i className="blob b1 rellax" data-rellax-speed="-2" aria-hidden="true"/><i className="blob b2 rellax" data-rellax-speed="2" aria-hidden="true"/><i className="blob b3 rellax" data-rellax-speed="-1" aria-hidden="true"/>
    <section className="home-hero page-width">
      <div className="home-copy">
        <span className="pill"><Sparkles size={14}/>{t('Startup Buildathon India 2026')}</span>
        <h1>{t('Roads change.')}<br/><span className="grad-text">{t('Stay a step ahead.')}</span></h1>
        <p>{t('Your phone sees a hazard. The next driver gets a heads-up.')}</p>
        <div className="home-cta"><button className="btn3d big" onClick={()=>onNavigateTab('live')}>{t('Open live map')}<Navigation2 size={19}/></button><button className="btn3d big white" onClick={()=>onNavigateTab('app')}><Smartphone size={19}/>{t('Get the driver app')}</button></div>
      </div>
      <div className="home-visual">
        <div className="video-card"><div className="video-wrap">{videoFailed?<img src="/media/road-awareness-concept.webp" alt={t('Illustrative road awareness scene')}/>:<video ref={videoRef} src="/media/road-awareness-concept.mp4" poster="/media/road-awareness-concept.webp" autoPlay={playing} muted playsInline loop preload="metadata" onError={()=>setVideoFailed(true)} aria-label={t('Illustrative road awareness scene')}/>}
          <button className="btn3d white round video-toggle" aria-label={t(playing?'Pause animation':'Play animation')} onClick={()=>setPlaying(!playing)}>{playing?<Pause size={18}/>:<Play size={18}/>}</button></div></div>
        <div className="float-alert"><span className="fa-icon"><Eye size={22}/></span><div><small>{t('A gentle heads-up')}</small><strong>{t('Pothole ahead.')}</strong></div><span className="fa-waves" aria-hidden="true"><i/><i/><i/><i/></span></div>
      </div>
    </section>
    <section className="home-steps page-width">
      {steps.map((s,i)=><article key={s.title} className={`step-card reveal ${s.color}`} style={{transitionDelay:`${i*110}ms`}}><span className="step-num">{i+1}</span><div className="step-ico"><s.icon size={28}/></div><h3>{t(s.title)}</h3><p>{t(s.copy)}</p></article>)}
    </section>
    <section className="home-google page-width reveal">
      <h2>{t('Built on Google Cloud & AI')}</h2>
      <div className="stack-row">{STACK.map((s,i)=><span key={s.n} className="stack-chip" style={{'--c':s.c,animationDelay:`${i*.4}s`} as React.CSSProperties}><i/>{s.n}</span>)}</div>
    </section>
  </div>;
};
