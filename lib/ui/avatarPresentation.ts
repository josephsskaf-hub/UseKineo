/** Presentation only: consent, uploads, generation and billing remain in AvatarStudioClient. */
export const AVATAR_PRESENTATION_CSS = `
 .avatar-workspace{max-width:1480px;margin-inline:auto;background:transparent;color:var(--text);--avatar-selected-bg:var(--text2);--avatar-selected-text:var(--card);--avatar-selected-border:var(--text2);--avatar-overlay-text:#f1f5f9;--avatar-recording-bg:color-mix(in srgb,var(--danger) 12%,var(--card))}
 .avatar-workspace .avatar-layout{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:28px;align-items:start}
 .avatar-workspace .neon-card{background:var(--card);border:1px solid var(--border);box-shadow:var(--sh-card);border-radius:16px;padding:24px;backdrop-filter:none}
 .avatar-workspace .neon-card:hover{transform:none;border-color:var(--border2);box-shadow:var(--sh-card)}
 .avatar-workspace .neon-card>.flex.items-center.justify-between{flex-wrap:wrap;gap:12px}
 .avatar-workspace h2{font-size:14px;letter-spacing:-.01em;font-weight:650;line-height:1.5;text-transform:none;margin-bottom:16px}
 .avatar-workspace p{line-height:1.7}
 .avatar-workspace .neon-card p,.avatar-workspace .neon-card label>span{font-size:12px}
 .avatar-workspace .avatar-layout>div:first-child{gap:20px}
 .avatar-workspace .neon-card label{padding-top:12px;border-top:1px solid var(--border);gap:10px}
 .avatar-workspace :is(button,.btn-neon){font-weight:600;line-height:1.45;transition:background .16s ease,border-color .16s ease,box-shadow .16s ease}
 .avatar-workspace button:not([aria-label]):not(.btn-neon){min-height:40px;border-radius:10px}
 .avatar-workspace button:not(:disabled):hover{box-shadow:0 2px 5px color-mix(in srgb,var(--text) 8%,transparent)}
 .avatar-workspace .neon-card button:not([aria-label]):not(:has(img)):not(.underline){padding:10px 14px;font-size:12px}
 .avatar-workspace .neon-card button:not(:disabled):not([aria-label]):not(:has(img)):hover{border-color:var(--text2)!important}
 .avatar-workspace button:disabled{cursor:not-allowed;opacity:.55}
 .avatar-workspace .btn-neon{background:var(--indigo);color:var(--on-accent);border:1px solid var(--indigo);border-radius:10px;min-height:44px;box-shadow:var(--sh-cta)}
 .avatar-workspace .btn-neon:hover{transform:none;filter:none;box-shadow:var(--sh-cta)}
 .avatar-workspace .btn-neon::before,.avatar-workspace .btn-neon::after{display:none}
 .avatar-workspace .grad-text{color:inherit;background:none;-webkit-text-fill-color:currentColor}
 .avatar-workspace h1{font-size:clamp(28px,3vw,38px)!important;line-height:1.16!important;letter-spacing:-.035em}
 .avatar-workspace :is(textarea,input:not([type=file]):not([type=checkbox])){background:var(--card2);color:var(--text);border-color:var(--border);border-radius:12px;line-height:1.75;padding:16px}
 .avatar-workspace :is(textarea,input)::placeholder{color:var(--muted);opacity:1}
 .avatar-workspace input[type=checkbox]{accent-color:var(--indigo)}
 .avatar-workspace .spinner-sm{background:none;box-shadow:none;border-color:rgba(255,255,255,.25);border-top-color:var(--avatar-overlay-text)}
 .avatar-workspace .spinner-sm-inner{background:none;box-shadow:none;border-color:rgba(255,255,255,.25);border-bottom-color:var(--avatar-overlay-text)}
 .avatar-workspace .avatar-preview{display:flex;min-width:0}
 .avatar-workspace .avatar-preview-frame{max-width:100%}
 .avatar-workspace button:focus-visible,.avatar-workspace a:focus-visible,.avatar-workspace input:focus-visible,.avatar-workspace textarea:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
 .avatar-workspace a:not(.btn-neon){text-decoration:underline;text-underline-offset:3px}
 .avatar-preview-jump{display:none}
 @media(max-width:1100px){.avatar-workspace .avatar-layout{grid-template-columns:minmax(0,1fr)}.avatar-workspace .avatar-preview{position:static;scroll-margin-top:80px}.avatar-preview-jump{display:inline-block;margin-top:16px;color:var(--accent);font-size:14px;text-underline-offset:4px}}
 @media(max-width:600px){.avatar-workspace .avatar-preview-frame{width:300px!important;height:575px!important;border-radius:26px!important;box-shadow:none!important}.avatar-workspace .neon-card{padding:18px}.avatar-workspace button:not([aria-label]){min-height:44px}.avatar-workspace h2{line-height:1.5}.avatar-workspace input[type=checkbox]{min-width:16px;min-height:16px}}
 @media(prefers-reduced-motion:reduce){.avatar-workspace *{transition:none!important;animation:none!important}}
`
