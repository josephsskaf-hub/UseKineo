/** Presentation only: consent, uploads, generation and billing remain in AvatarStudioClient. */
export const AVATAR_PRESENTATION_CSS = `
 .avatar-workspace{max-width:1480px;margin-inline:auto;background:radial-gradient(ellipse at 10% 0,#14202e55,transparent 55%)}
 .avatar-workspace .avatar-layout{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:28px;align-items:start}
 .avatar-workspace .neon-card{background:#141920;border:1px solid #303946;box-shadow:none;border-radius:16px}
 .avatar-workspace .grad-text{color:inherit;background:none;-webkit-text-fill-color:currentColor}
 .avatar-workspace h1{font-size:clamp(28px,3vw,38px)!important;line-height:1.16!important;letter-spacing:-.035em}
 .avatar-workspace textarea{line-height:1.7}
 .avatar-workspace .avatar-preview{display:flex;min-width:0}
 .avatar-workspace .avatar-preview-frame{max-width:100%}
 .avatar-workspace button:focus-visible,.avatar-workspace a:focus-visible,.avatar-workspace input:focus-visible,.avatar-workspace textarea:focus-visible{outline:2px solid #8cbcff;outline-offset:3px}
 .avatar-preview-jump{display:none}
 @media(max-width:1100px){.avatar-workspace .avatar-layout{grid-template-columns:minmax(0,1fr)}.avatar-workspace .avatar-preview{position:static;scroll-margin-top:80px}.avatar-preview-jump{display:inline-block;margin-top:16px;color:#9fc7ff;font-size:14px;text-underline-offset:4px}}
 @media(max-width:600px){.avatar-workspace .avatar-preview-frame{width:300px!important;height:575px!important;border-radius:26px!important;box-shadow:none!important}.avatar-workspace .neon-card{padding:18px}.avatar-workspace h2{line-height:1.5}.avatar-workspace input[type=checkbox]{min-width:16px;min-height:16px}}
`
