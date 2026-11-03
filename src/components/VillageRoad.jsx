import React from 'react';

function Cow({ x, y }) {
  return <g transform={`translate(${x} ${y})`}>
    <path d="M-28-4q-13-12-13 5" fill="none" stroke="#78634b" strokeWidth="3" />
    <path d="M-20 10v22m17-20v21m26-22v21m-11-21v19" stroke="#846646" strokeWidth="5" strokeLinecap="round" />
    <ellipse cy="4" rx="30" ry="16" fill="#fff8df" />
    <path d="M-14-9q17-12 22 4L0 9-17 3Z" fill="#a2774f" />
    <path d="M23-6 30-18 42-12 44 4 32 11 22 6Z" fill="#fff8df" />
    <path d="m31-18-3-7m12 12 5-6" stroke="#846646" strokeWidth="3" strokeLinecap="round" />
    <ellipse cx="42" cy="5" rx="8" ry="5" fill="#d9b69c" /><circle cx="37" cy="-7" r="1.8" fill="#473b31" />
  </g>;
}

function Dog({ x, y }) {
  return <g transform={`translate(${x} ${y})`}>
    <path d="M-18 3q-16-2-15-15" fill="none" stroke="#9c6037" strokeWidth="4" strokeLinecap="round" />
    <path d="M-11 7v16m21-16 7 16" stroke="#9c6037" strokeWidth="4" strokeLinecap="round" />
    <ellipse cy="2" rx="20" ry="10" fill="#c38a50" /><path d="M11-2 17-16 27-15 34-5 31 1 19 6Z" fill="#c38a50" />
    <path d="m18-16 6-8 3 12Z" fill="#805434" /><circle cx="27" cy="-10" r="1.6" fill="#3e342a" /><circle cx="34" cy="-4" r="2.3" fill="#3e342a" />
  </g>;
}

function Landscape() {
  return <svg className="fd-landscape" viewBox="0 0 640 220" preserveAspectRatio="none" focusable="false">
    <path d="M0 0h640v220H0Z" fill="#fff0cb" />
    <circle cx="520" cy="35" r="25" fill="#f5ce67" />
    <path d="M0 86Q80 30 165 74T330 67 490 72 640 66V220H0Z" fill="#dce5a1" />
    <path d="M0 105Q150 77 320 102T640 105V220H0Z" fill="#b8cf70" />
    <path d="M0 135q160-48 320-4t320 4v85H0Z" fill="#e4cc76" />
    <path d="M0 154q150-37 320-3t320 3m-640 16q150-37 320-3t320 3" fill="none" stroke="#baaa50" strokeWidth="3" />
    <g stroke="#527c39" strokeWidth="3"><path d="M34 136v-20m-7 9 7 5 8-10M56 131v-20m-7 9 7 5 8-10M555 142v-20m-7 9 7 5 8-10M578 145v-20m-7 9 7 5 8-10" /></g>
    <g transform="translate(310 64)"><path d="M-35 50V7L0-16 35 7v43" fill="#f7d48b" /><path d="M-43 7 0-24 43 7Z" fill="#d57437" /><path d="M-6 50V24H9v26" fill="#a66539" /><path d="M-24 16h12v13h-12m35-13h12v13H11" fill="#bd8d4b" /></g>
    {[60, 440].map((x,i)=><g key={x} transform={`translate(${x} ${i?52:45})`}><path d="M0 72V18" stroke="#8d6741" strokeWidth="7" /><ellipse cy="10" rx="28" ry="29" fill="#7f9d49" /><ellipse cx="-20" cy="22" rx="19" ry="20" fill="#91ac55" /><ellipse cx="20" cy="25" rx="19" ry="21" fill="#6c9343" /></g>)}
    <Cow x={165} y={128} /><Dog x={485} y={148} />
    <path d="M0 182h640v38H0Z" fill="#c1a97d" /><path d="M0 184h640" stroke="#f8e6b9" strokeWidth="4" />
  </svg>;
}

export default function VillageRoad() {
  return <div className="fd-countryside-track"><Landscape /><Landscape /></div>;
}
