import React from 'react';

export const EVERYDAY_BANNERS = [
  { id: 'fg-family', scene: 'family', title: 'खाने का प्यार,', sub: 'सीधे आपके द्वार', note: 'परिवार के साथ, स्वाद की हर बात' },
  { id: 'fg-farm', scene: 'farm', title: 'पछुआ बयार,', sub: 'खाना आपके द्वार', note: 'खेत हो या घर, अपनों वाला स्वाद' },
  { id: 'fg-office', scene: 'office', title: 'प्यार भरी डिश,', sub: 'सीधे आपके ऑफिस', note: 'काम के बीच, स्वाद का छोटा ब्रेक' },
];

function Face({ x, y, scale = 1, shirt = '#e66a32', woman, moustache, child }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    {woman && <ellipse cx="0" cy="-7" rx="23" ry="29" fill="#473026" />}
    <path d="M-26 67V37Q-24 20 0 20Q24 20 26 37V67Z" fill={shirt} />
    <path d="M-16 28Q0 40 16 28" stroke="#fff" strokeOpacity=".35" strokeWidth="3" fill="none" />
    <rect x="-6" y="13" width="12" height="15" rx="4" fill="#de995f" />
    <ellipse cy="-4" rx={child ? 19 : 20} ry="24" fill="#f3b77d" />
    <path d="M-20-7Q-25-35 0-31Q25-34 21-6L12-14Q-2-9-12-18Z" fill="#473026" />
    {woman && <><circle cx="18" cy="-25" r="9" fill="#473026" /><circle cy="-8" r="2" fill="#b72e2e" /><path d="M-21 29 15 66H25L-11 25Z" fill="#ffd262" /></>}
    <g fill="#372920"><ellipse cx="-7" cy="-3" rx="2" ry="2.6" /><ellipse cx="8" cy="-3" rx="2" ry="2.6" /></g>
    <path d="M-5 9Q1 15 8 8" fill="#fff" stroke="#9d4b34" strokeWidth="1.3" strokeLinecap="round" />
    {moustache && <path d="M-10 6Q-5 0 0 5Q6 0 12 6Q5 12 0 7Q-5 11-10 6" fill="#473026" />}
    <ellipse cx="-13" cy="5" rx="4" ry="2" fill="#e87a5b" opacity=".35" />
  </g>;
}
function Food({ x, y, scale = 1 }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <ellipse cy="7" rx="39" ry="13" fill="#bd7b34" opacity=".12" />
    <ellipse rx="38" ry="13" fill="#fff" stroke="#e0c294" strokeWidth="2" />
    <ellipse cy="-3" rx="28" ry="8" fill="#f7d180" />
    <path d="M-12-5Q0-25 13-5Z" fill="#fff9df" />
    <ellipse cx="-20" cy="-4" rx="10" ry="5" fill="#d55c24" /><ellipse cx="22" cy="-4" rx="8" ry="5" fill="#5c9944" />
    <path d="M-8-22Q-14-29-8-36M4-20Q-2-29 5-35M16-19Q11-26 17-32" className="scene-steam" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
  </g>;
}
function Sky() {
  return <><circle cx="275" cy="30" r="19" fill="#ffc952" /><path d="M30 35Q35 19 46 27Q58 10 69 26Q86 21 90 35Z" fill="#fff" opacity=".75" className="scene-cloud" /><path d="M180 52Q187 37 197 45Q207 26 219 45Q234 39 241 52Z" fill="#fff" opacity=".6" /></>;
}
function Courier({ x = 260, y = 130 }) {
  return <g transform={`translate(${x} ${y})`}>
    <path d="M-10 51-14 83M12 51 18 83" stroke="#33504f" strokeWidth="11" strokeLinecap="round" />
    <path d="M-16 34-35 43-48 32" stroke="#f3b77d" strokeWidth="9" strokeLinecap="round" fill="none" />
    <Face x={0} y={0} scale={.76} shirt="#268859" />
    <path d="M-17-11Q-20-31 0-29Q19-29 18-11Z" fill="#e85d27" /><path d="M0-12H25" stroke="#c9431a" strokeWidth="5" strokeLinecap="round" />
    <g className="scene-handover">
      <path d="M-51 25V18Q-40 9-29 18V25" fill="none" stroke="#9c4b26" strokeWidth="3" />
      <rect x="-65" y="22" width="50" height="36" rx="5" fill="#e85d27" stroke="#fff0d4" strokeWidth="2" />
      <rect x="-62" y="32" width="44" height="13" rx="3" fill="#fff6e5" />
      <text x="-40" y="41" textAnchor="middle" fontSize="8" fontWeight="800" fontFamily="system-ui, sans-serif" fill="#237346">FoodGaon</text>
      <path d="M-44 52Q-40 46-35 48Q-36 55-43 54" fill="#fff5d8" />
    </g>
  </g>;
}
function Family() {
  return <>
    <Sky /><path d="M25 137V72L110 22 196 72V208H25Z" fill="#edc69c" /><path d="M17 75 110 19 205 75" stroke="#ce7041" strokeWidth="13" strokeLinejoin="round" fill="none" />
    <path d="M41 90H112V150H41Z" fill="#a5cbd2" stroke="#fff5dd" strokeWidth="7" /><path d="M76 91V150M41 119H112" stroke="#fff5dd" strokeWidth="4" />
    <path d="M142 96H182V207H142Z" fill="#ac774d" /><circle cx="174" cy="147" r="3" fill="#ffe9ad" />
    <path d="M0 206Q160 192 330 207V240H0Z" fill="#ebd9aa" /><ellipse cx="135" cy="224" rx="93" ry="8" fill="#a77c4e" opacity=".15" />
    <g className="scene-family"><Face x={64} y={145} scale={.87} shirt="#e77555" woman /><Face x={147} y={140} scale={.95} shirt="#6b9e6a" moustache /><Face x={110} y={165} scale={.65} shirt="#e8ad32" child /></g>
    <path d="M40 199H177L187 212H32Z" fill="#be7944" /><path d="M49 211V237M169 211V237" stroke="#996032" strokeWidth="6" />
    <Food x={111} y={201} scale={.75} /><path d="M166 173Q179 182 193 177" fill="none" stroke="#f3b77d" strokeWidth="7" strokeLinecap="round" /><Courier x={254} y={139} />
    <path className="scene-heart" d="M204 107C189 97 195 85 204 93C215 82 224 98 204 107" fill="#e66b54" />
    <path d="M295 212V170M295 192Q269 180 276 166Q297 167 295 192M296 184Q318 171 321 184Q313 200 296 201" fill="#63995b" stroke="#4b7f47" strokeWidth="3" /><path d="M281 211H311L306 239H287Z" fill="#cf7e4d" />
  </>;
}
function Farm() {
  return <>
    <Sky /><path d="M0 97Q70 71 143 94T330 89V240H0Z" fill="#a8c86a" /><path d="M0 134Q160 102 330 140V240H0Z" fill="#76a74b" />
    <path d="m5 240 111-115m-42 115 78-111m9 111 34-110m39 110-1-105m79 105-39-98" stroke="#c9d484" strokeWidth="16" opacity=".7" />
    <path d="M30 125V50M30 73Q4 58 6 40Q28 42 30 73M30 59Q55 29 65 39Q57 63 30 73" fill="#59894b" stroke="#4b7a43" strokeWidth="5" />
    <g className="scene-crops" stroke="#e3d275" strokeWidth="2.8" fill="none" strokeLinecap="round">{[15,38,63,91,119,149,177,203,232,263,294,320].map((x,i)=><path key={x} d={`M${x} 237v-${24+i%3*7}m0 13-8-9m8 4 8-10m-8-3-7-7`} />)}</g>
    <g transform="translate(220 91)"><rect x="0" y="38" width="64" height="34" rx="4" fill="#cda36f" /><path d="M11 45V4H42V21H29V45" stroke="#768d8c" strokeWidth="12" fill="none" strokeLinejoin="round" /><path d="M11 45V4H42V21" stroke="#b7cac4" strokeWidth="4" fill="none" /><rect x="38" y="-2" width="21" height="11" rx="3" fill="#e47e39" /><circle cx="48" cy="3" r="12" stroke="#9a4927" strokeWidth="3" fill="none" /><path d="M43 23Q76 29 78 63" className="scene-water" fill="none" stroke="#b8edf4" strokeWidth="10" strokeLinecap="round" /><path d="M42 24Q72 31 76 61" className="scene-water-spark" fill="none" stroke="#fff" strokeWidth="2.5" strokeDasharray="3 8" /><ellipse cx="78" cy="69" rx="21" ry="6" fill="#91d5df" className="scene-ripple" /></g>
    <path d="M295 166Q219 202 291 235" fill="none" stroke="#9ed6df" strokeWidth="13" /><path d="M294 166Q220 202 291 235" className="scene-water-spark" fill="none" stroke="#e3faf6" strokeWidth="2" strokeDasharray="5 15" />
    <g transform="translate(103 128)"><path d="M-8 40-24 78M12 39 23 77" stroke="#f0e4c2" strokeWidth="11" strokeLinecap="round" /><g className="scene-farmer"><Face x={0} y={0} scale={.8} shirt="#eee9d5" moustache /><path d="M-18-17Q0-30 18-17L14-10H-14Z" fill="#e78e38" /><path d="M-21-15H22" stroke="#b8652a" strokeWidth="4" strokeLinecap="round" /><path d="M9 27 35 45" stroke="#e5ac76" strokeWidth="8" strokeLinecap="round" /><path d="M28 31 50 85M48 83 65 80" stroke="#866137" strokeWidth="4" fill="none" /></g></g>
    <path d="M119 159 134 168" fill="none" stroke="#e5ac76" strokeWidth="7" strokeLinecap="round" /><Courier x={192} y={133} />
    <path className="scene-breeze" d="M63 95Q81 87 97 96M76 104Q99 93 119 103M150 79Q166 72 181 80" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".7" />
  </>;
}
function Office() {
  return <>
    <rect x="16" y="29" width="289" height="182" rx="12" fill="#ecdac5" />
    <rect x="35" y="42" width="127" height="100" rx="7" fill="#b2d4d8" stroke="#fff8e7" strokeWidth="6" />
    <path d="M40 132V93H61V132M76 132V73H99V132M115 132V87H141V132" stroke="#85afb4" strokeWidth="6" fill="#97bcc0" /><path d="M98 43V141M35 90H162" stroke="#fff8e7" strokeWidth="5" />
    <circle cx="222" cy="60" r="22" fill="#fff5df" stroke="#d5b68c" strokeWidth="4" /><path d="M222 45V60L232 64" fill="none" stroke="#82634e" strokeWidth="3" strokeLinecap="round" />
    <path d="M0 213H330V240H0Z" fill="#ceb89c" />
    <path d="M64 157Q47 151 51 180L59 211H100L109 173Q110 156 96 156" fill="#dca477" /><path d="M74 208V236M64 236H91" stroke="#8b755f" strokeWidth="5" />
    <Face x={86} y={131} scale={.92} shirt="#d78056" woman /><Face x={166} y={133} scale={.82} shirt="#71889f" />
    <path d="M30 183H205L216 199H24Z" fill="#9b6f49" /><path d="M40 199V239M197 199V239" stroke="#806042" strokeWidth="7" />
    <path d="M52 148H101L109 179H60Z" fill="#5c727e" stroke="#e9f2ed" strokeWidth="2" /><path d="M57 180H119" stroke="#b7c8c8" strokeWidth="4" strokeLinecap="round" /><circle cx="81" cy="163" r="3" fill="#d0e0d8" />
    <Food x={158} y={182} scale={.74} /><path d="M119 170H133V185H119Z" fill="#fff0d4" /><path d="M133 172Q145 173 134 181" fill="none" stroke="#fff0d4" strokeWidth="3" />
    <path d="M184 160Q194 171 204 170" fill="none" stroke="#f3b77d" strokeWidth="7" strokeLinecap="round" /><Courier x={266} y={136} /><path className="scene-heart" d="M215 116C201 106 205 95 215 102C225 92 235 107 215 116" fill="#df8764" />
    <path d="M300 213V166M300 193Q277 186 283 172Q299 173 300 193M300 183Q318 166 326 177Q320 192 300 200" fill="#6a9b68" stroke="#578253" strokeWidth="3" /><path d="M287 213H316L312 240H292Z" fill="#d99766" />
  </>;
}
export default function EverydayScene({ kind }) {
  return <svg className={`everyday-scene scene-${kind}`} viewBox="0 0 330 240" aria-hidden="true" focusable="false">
    {kind === 'farm' ? <Farm /> : kind === 'office' ? <Office /> : <Family />}
  </svg>;
}
