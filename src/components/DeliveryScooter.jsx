import React, { useId } from 'react';

export default function DeliveryScooter() {
  const id = useId().replace(/:/g, '');
  const paint = name => `url(#${id}-${name})`;
  return <svg className="fd-scooter" viewBox="0 0 200 132" width="148" height="98" focusable="false">
    <defs>
      <linearGradient id={`${id}-body`} x1="0" y1="0" x2=".6" y2="1"><stop stopColor="#fff3b0" /><stop offset=".55" stopColor="#ffd264" /><stop offset="1" stopColor="#eda33c" /></linearGradient>
      <linearGradient id={`${id}-front`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffab58" /><stop offset="1" stopColor="#e75c2a" /></linearGradient>
      <linearGradient id={`${id}-bag`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ff9255" /><stop offset="1" stopColor="#d94a25" /></linearGradient>
    </defs>
    <ellipse cx="106" cy="125" rx="78" ry="4" fill="#003f2a" opacity=".22" />
    <g className="fd-bounce" strokeLinejoin="round" strokeLinecap="round">
      <path d="M25 88H72" stroke="#254d40" strokeWidth="4" />
      <path d="M29 81V88M62 81V88" stroke="#6f8e72" strokeWidth="3" />
      <rect x="21" y="44" width="49" height="39" rx="7" fill={paint('bag')} stroke="#b74f2b" strokeWidth="1.5" />
      <path d="M35 45V40Q45 32 56 40V45" fill="none" stroke="#b74f2b" strokeWidth="3" />
      <path d="M23 55H68M59 46V80" stroke="#ffb075" strokeWidth="2" />
      <rect x="25" y="60" width="40" height="13" rx="3" fill="#fff8e7" />
      <text x="45" y="69" textAnchor="middle" fontSize="7.4" fontWeight="800" fill="#227a4f" fontFamily="system-ui, sans-serif" stroke="none">FoodGaon</text>
      <path d="M96 70 116 78Q123 81 121 89L119 100H136" fill="none" stroke="#263f56" strokeWidth="12" />
      <path d="M128 100H139Q144 100 144 105H124Z" fill="#fff0d7" stroke="#38504b" strokeWidth="1.5" />
      <path d="M87 49Q91 39 106 41L116 45 114 71Q109 80 88 77L82 69Z" fill="#2e9b69" stroke="#216649" strokeWidth="1.7" />
      <path d="M91 49 86 67Q94 73 104 73M108 46 104 61" fill="none" stroke="#65ba84" strokeWidth="3" />
      <path d="M99 43 102 34H112L113 44" fill="#e9ac7b" />
      <ellipse cx="108" cy="25" rx="13" ry="16" fill="#f7c18e" stroke="#ad744c" strokeWidth="1.3" />
      <path d="M94 25Q92 5 108 4Q126 4 124 25Z" fill={paint('front')} stroke="#c2562d" strokeWidth="1.5" />
      <path d="M97 19Q98 9 109 8" stroke="#ffd397" strokeWidth="3" fill="none" />
      <path d="M111 22H127L126 30H114Z" fill="#365a59" opacity=".75" />
      <path d="M104 27V39L116 42" fill="none" stroke="#805940" strokeWidth="2" />
      <path d="M115 34Q119 36 121 33" fill="none" stroke="#a56e48" strokeWidth="1.5" />
      <path d="M111 51 128 62 150 55" fill="none" stroke="#1f6b4b" strokeWidth="10" />
      <path d="M113 50 128 59 143 55" fill="none" stroke="#43ad75" strokeWidth="6" />
      <path d="M145 55 153 53" stroke="#f7c18e" strokeWidth="6" />
      <path d="M153 53 150 39M146 39H156M153 44 159 32" fill="none" stroke="#31544b" strokeWidth="3" />
      <ellipse cx="160" cy="29" rx="7" ry="4.5" fill="#b9dcd8" stroke="#31544b" strokeWidth="2" />
      <path d="M28 101Q28 83 47 82H85Q96 82 101 96L104 100H139L150 59Q153 51 163 58Q177 67 177 94L174 104H154Q148 95 137 109H80Q72 96 57 96Q42 96 37 108H26Z" fill={paint('body')} stroke="#a96d32" strokeWidth="1.8" />
      <path d="M146 95 154 63Q157 56 164 61Q173 69 173 91L170 101H151Z" fill={paint('front')} />
      <path d="M35 88H75Q87 87 90 94" fill="none" stroke="#fff4c6" strokeWidth="3" />
      <path d="M104 103H139M111 100 143 100" stroke="#b87734" strokeWidth="2" />
      <path d="M71 79H104" stroke="#2f5148" strokeWidth="8" /><path d="M73 76H100" stroke="#6a8273" strokeWidth="2" />
      <path d="M156 66 152 87" stroke="#ffd396" strokeWidth="3" />
      <ellipse cx="174" cy="73" rx="5" ry="7" fill="#fff3b8" stroke="#b8753b" strokeWidth="1.5" />
      <ellipse cx="175" cy="72" rx="2" ry="4" fill="#fffdf1" />
      <rect x="25" y="91" width="5" height="9" rx="2" fill="#e86843" />
      <path d="M45 101Q57 92 70 101M148 101Q159 94 173 103" fill="none" stroke="#fff0ad" strokeWidth="4" />
    </g>
    {[57,161].map(x => <g key={x} className="fd-wheel" style={{transformOrigin:`${x}px 112px`}}>
      <circle cx={x} cy="112" r="13" fill="#233d38" /><circle cx={x} cy="112" r="9" fill="#718b83" /><circle cx={x} cy="112" r="6" fill="#e3e6cc" />
      <path d={`M${x} 105v14m-7-7h14`} stroke="#a0b6aa" strokeWidth="1.5" /><circle cx={x} cy="112" r="2.8" fill="#48675d" />
    </g>)}
    <g className="fd-speed" fill="none" stroke="#dff6d2" strokeWidth="2.6" strokeLinecap="round"><path d="M4 62H13M1 74H13M5 87H15" /></g>
  </svg>;
}
