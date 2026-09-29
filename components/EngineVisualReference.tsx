import type { ImgModelKey } from '@/lib/imageModels'

/** Illustrative direction only, never presented as output from the selected model. */
export default function EngineVisualReference({ model }: { model: ImgModelKey }) {
  return <svg className="image-engine-visual" viewBox="0 0 240 100" fill="none" aria-hidden="true">
    <rect width="240" height="100" rx="8" fill="var(--card2)" />
    {model === 'schnell' ? <><circle cx="170" cy="29" r="14" fill="#c39761"/><path d="m0 100 65-72 51 49 34-25 90 48" fill="#718b83"/><path d="m0 100 80-44 83 44" fill="#3c5c59"/></> : null}
    {model === 'dev' ? <><ellipse cx="120" cy="85" rx="65" ry="9" fill="#bdc4c4"/><rect x="90" y="27" width="60" height="54" rx="9" fill="#8a7358"/><rect x="101" y="12" width="38" height="17" rx="3" fill="#343e45"/><rect x="98" y="39" width="44" height="26" rx="2" fill="#ebe3d4"/><path d="M106 48h28m-24 8h20" stroke="#8a7358" strokeWidth="2"/></> : null}
    {model === 'seedream' ? <><path d="M0 0h240v100H0z" fill="#c8b8a2"/><path d="M145 12h64v66h-64z" fill="#eef0e5"/><path d="M176 12v66m-31-33h64" stroke="#9b947f" strokeWidth="3"/><rect x="30" y="52" width="98" height="31" rx="10" fill="#5c7167"/><path d="M20 87h200" stroke="#85745f" strokeWidth="4"/></> : null}
    {model === 'grok' ? <><rect width="240" height="100" rx="8" fill="#263950"/><circle cx="129" cy="48" r="31" fill="#ac967b"/><ellipse cx="129" cy="52" rx="67" ry="12" transform="rotate(-20 129 52)" stroke="#d4cbbb" strokeWidth="5"/><path d="M42 20h2m151 6h2M62 77h2m153-4h2" stroke="#f5eddf" strokeWidth="2"/></> : null}
    {model === 'recraft' ? <><rect x="56" y="9" width="128" height="82" rx="3" fill="#d4ac74"/><circle cx="120" cy="50" r="28" fill="#2d4946"/><path d="M104 69V33h7v14l14-14h10l-16 17 17 19h-10l-15-17v17z" fill="#f1e9d9"/></> : null}
    {model === 'nanobanana' ? <><rect x="52" y="8" width="136" height="84" rx="42" fill="#bdc6bb"/><path d="M80 100q0-38 40-38t40 38" fill="#52665d"/><ellipse cx="120" cy="44" rx="23" ry="27" fill="#c99571"/><path d="M96 37q-5-31 25-28 29 3 23 32l-8-17q-16 13-40 13" fill="#443d37"/><path d="M109 45h4m14 0h4m-17 13q6 4 12 0" stroke="#443d37" strokeWidth="2" strokeLinecap="round"/></> : null}
  </svg>
}
