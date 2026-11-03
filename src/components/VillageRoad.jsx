import React from 'react';

function Landscape() {
  return <svg className="fd-landscape" viewBox="0 0 640 220" preserveAspectRatio="none" focusable="false">
    <path d="M0 0h640v220H0Z" fill="#fff0cb" />
    <circle cx="520" cy="35" r="25" fill="#f5ce67" />
    <path d="M0 108h640v112H0Z" fill="#dce5a1" />
    <path d="M0 126h640v94H0Z" fill="#b8cf70" />
    <path d="M0 151h640v69H0Z" fill="#a3c465" />
    <g transform="translate(310 64)"><path d="M-35 50V7L0-16 35 7v43" fill="#f7d48b" /><path d="M-43 7 0-24 43 7Z" fill="#d57437" /><path d="M-6 50V24H9v26" fill="#a66539" /><path d="M-24 16h12v13h-12m35-13h12v13H11" fill="#bd8d4b" /></g>
    {[60, 440].map((x,i)=><g key={x} transform={`translate(${x} ${i?52:45})`}><path d="M0 72V18" stroke="#8d6741" strokeWidth="7" /><ellipse cy="10" rx="28" ry="29" fill="#7f9d49" /><ellipse cx="-20" cy="22" rx="19" ry="20" fill="#91ac55" /><ellipse cx="20" cy="25" rx="19" ry="21" fill="#6c9343" /></g>)}
    <path d="M0 182h640v38H0Z" fill="#c1a97d" /><path d="M0 184h640" stroke="#f8e6b9" strokeWidth="4" />
  </svg>;
}

export default function VillageRoad() {
  return <div className="fd-countryside-track"><Landscape /><Landscape /></div>;
}
