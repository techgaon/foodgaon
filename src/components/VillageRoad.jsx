import React from 'react';

function CropRows() {
  return <g>
    {[137, 156].map((y, row) => <g key={y}>
      {Array.from({ length: 18 }, (_, i) => <g key={i} transform={`translate(${14 + i * 36 + row * 12} ${y})`}>
        <path d="M0 1V-18" fill="none" stroke="#507c32" strokeWidth="2" />
        <path d="M0-2Q-12-5-12-14Q-2-13 0-5M0-7Q11-10 12-20Q2-18 0-10M0-12Q-6-18-3-25Q3-22 0-12" fill={row ? '#5d933c' : '#74a344'} />
      </g>)}
    </g>)}
    {Array.from({ length: 20 }, (_, i) => <g key={i} transform={`translate(${10 + i * 33} 178)`}>
      <path d="M0 0V-24M0-5-8-11M0-9 8-15" fill="none" stroke="#a88332" strokeWidth="1.8" />
      <path d="M0-13Q-9-15-7-19L0-16Q-8-20-5-23L0-19Q-5-25 0-29Q5-25 0-19Q5-23 7-20L0-16Q9-20 8-15Z" fill="#eac66a" stroke="#b58f38" strokeWidth=".8" />
    </g>)}
  </g>;
}

function Landscape() {
  return <svg className="fd-landscape" viewBox="0 0 640 220" preserveAspectRatio="none" focusable="false">
    <path d="M0 0h640v220H0Z" fill="#fff0cb" />
    <circle cx="520" cy="35" r="25" fill="#f5ce67" />
    <path d="M0 108h640v112H0Z" fill="#dce5a1" />
    <path d="M0 126h640v94H0Z" fill="#b8cf70" />
    <path d="m0 151 160-25 160 25 160-25 160 25v69H0Z" fill="#e4cc76" />
    <path d="M0 158h640M0 172h640M165 127 98 181M320 127l58 54M480 127l72 54" fill="none" stroke="#baaa50" strokeWidth="2.5" />
    <CropRows />
    <g transform="translate(310 64)"><path d="M-35 50V7L0-16 35 7v43" fill="#f7d48b" /><path d="M-43 7 0-24 43 7Z" fill="#d57437" /><path d="M-6 50V24H9v26" fill="#a66539" /><path d="M-24 16h12v13h-12m35-13h12v13H11" fill="#bd8d4b" /></g>
    {[60, 440].map((x,i)=><g key={x} transform={`translate(${x} ${i?52:45})`}><path d="M0 72V18" stroke="#8d6741" strokeWidth="7" /><ellipse cy="10" rx="28" ry="29" fill="#7f9d49" /><ellipse cx="-20" cy="22" rx="19" ry="20" fill="#91ac55" /><ellipse cx="20" cy="25" rx="19" ry="21" fill="#6c9343" /></g>)}
    <path d="M0 182h640v38H0Z" fill="#c1a97d" /><path d="M0 184h640" stroke="#f8e6b9" strokeWidth="4" />
  </svg>;
}

export default function VillageRoad() {
  return <div className="fd-countryside-track"><Landscape /><Landscape /></div>;
}
