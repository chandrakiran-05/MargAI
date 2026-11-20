import React, { useEffect, useState } from 'react';
import { ChevronDown, Globe2, Menu, X } from 'lucide-react';
import { UI_LANGUAGES, useI18n } from '../i18n';
export type TabType = 'live' | 'app' | 'car' | 'command-center' | 'in-car' | 'smartphone' | 'driver' | 'deck' | 'civic' | 'google-stack' | 'public';
export const VIEWS: {id:TabType;label:string}[] = [
  {id:'public',label:'Home'},{id:'live',label:'Live map'},{id:'smartphone',label:'Drive demo'},{id:'civic',label:'Road reports'},{id:'app',label:'Driver app'},{id:'car',label:'Car display'},
  {id:'command-center',label:'Drive studio'},{id:'in-car',label:'In-car display'},{id:'driver',label:'Scenarios'},
  {id:'google-stack',label:'Technology'},{id:'deck',label:'Our story'},
];
export const BrandMark=({compact=false}:{compact?:boolean})=><span className="brand-lockup"><span className="brand-symbol" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M5 25 12 7h8l7 18h-7L16 14l-4 11H5Z" fill="currentColor"/><path d="M16 21v7" stroke="#fff" strokeWidth="2" strokeDasharray="2 2"/></svg></span>{!compact&&<span className="brand-wordmark">Marg<span>AI</span></span>}</span>;
interface NavbarProps {currentTab:TabType;onSelectTab:(tab:TabType)=>void;selectedLanguage:string;onSelectLanguage:(language:string)=>void;isBackendConnected:boolean;}
export const Navbar:React.FC<NavbarProps>=({currentTab,onSelectTab,selectedLanguage,onSelectLanguage})=>{
  const {t}=useI18n();
  const [menuOpen,setMenuOpen]=useState(false);
  const primary=VIEWS.slice(0,4);
  const go=(view:TabType)=>{onSelectTab(view);setMenuOpen(false);};
  useEffect(()=>{const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setMenuOpen(false);};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[]);
  return <header className="site-header"><div className="header-inner"><button className="brand-button" aria-label={t('MargAI home')} onClick={()=>go('public')}><BrandMark/></button><nav className="desktop-nav" aria-label={t('Main navigation')}>{primary.map(view=><button key={view.id} onClick={()=>go(view.id)} aria-current={currentTab===view.id?'page':undefined} className={`nav-link ${currentTab===view.id?'is-active':''}`}>{t(view.label)}</button>)}</nav><div className="header-actions"><label className="language-control"><Globe2 size={17}/><span className="sr-only">{t('Website language')}</span><select aria-label={t('Website language')} value={selectedLanguage} onChange={event=>onSelectLanguage(event.target.value)}>{UI_LANGUAGES.map(language=><option key={language.code} value={language.code}>{language.nativeName}</option>)}</select><ChevronDown size={13}/></label><button className="mobile-menu-button" aria-label={t(menuOpen?'Close navigation':'Open navigation')} aria-controls="mobile-navigation" aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X size={22}/>:<Menu size={22}/>}</button></div></div>{menuOpen&&<nav id="mobile-navigation" className="mobile-navigation" aria-label={t('Main navigation')}>{primary.map(view=><button key={view.id} onClick={()=>go(view.id)} aria-current={currentTab===view.id?'page':undefined}>{t(view.label)}</button>)}</nav>}</header>;
};
