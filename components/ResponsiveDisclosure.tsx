'use client';
import {useEffect,useState} from 'react';
export default function ResponsiveDisclosure({title,meta,children,className=''}:{title:string;meta?:string;children:React.ReactNode;className?:string}){
  const [open,setOpen]=useState(false);
  useEffect(()=>{const media=window.matchMedia('(max-width: 760px)');const update=()=>setOpen(!media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  return <details className={'responsive-disclosure '+className} open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary onClick={e=>{if(!window.matchMedia('(max-width: 760px)').matches)e.preventDefault();}}><strong>{title}</strong>{meta && <span>{meta}</span>}</summary><div className="disclosure-content">{children}</div></details>;
}
