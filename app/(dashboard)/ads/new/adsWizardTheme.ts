/** Presentation only. Access, saved steps, consent and generation stay in AdsWizardClient. */
export const ADS_WIZARD_THEME_CSS = `
.stu.adsw{
  --ads-bg:var(--bg,#f7f9fc);--ads-card:var(--card,#fff);--ads-soft:var(--surface-soft,var(--card2,#eef3f9));
  --ads-text:var(--text,#17273b);--ads-secondary:var(--text2,#586c83);--ads-muted:var(--muted,#586c83);
  --ads-line:var(--border,#d5e0ec);--ads-line-strong:var(--border2,#bccbdb);
  --ads-accent:var(--accent,#1766d3);--ads-tint:var(--accent-soft,#eaf2ff);--ads-action:var(--indigo,#1766d3);--ads-on-action:var(--on-accent,#fff);
  --ads-error:#b52b3b;--ads-warning:#965209;--ads-success:#18724e;
  box-sizing:border-box;width:100%;max-width:none;min-width:0;min-height:calc(100dvh - 64px);margin:0;
  padding:clamp(24px,3vw,44px) clamp(20px,3.2vw,52px) 64px;
  background:var(--ads-bg);color:var(--ads-text);overflow:visible;
}
html[data-theme=dark] .stu.adsw{--ads-error:#ff9aa5;--ads-warning:#ffc17b;--ads-success:#73d9aa}
.adsw .adsw-header{margin-bottom:28px;max-width:900px}
.adsw .adsw-header h1{color:var(--ads-text);background:none;-webkit-text-fill-color:currentColor;font-size:clamp(30px,2.4vw,40px);font-weight:650;letter-spacing:-.04em;line-height:1.15;margin-bottom:12px}
.adsw .adsw-header .sub{color:var(--ads-secondary);font-size:15px;line-height:1.75;margin:0;max-width:760px}
.adsw h2{color:var(--ads-text);font-size:clamp(23px,1.8vw,28px);font-weight:650;letter-spacing:-.025em;line-height:1.3;margin-bottom:12px}
.adsw h3{color:var(--ads-text);font-size:17px;line-height:1.5}
.adsw .adsw-lead{color:var(--ads-secondary);font-size:15px;line-height:1.75;max-width:78ch;margin-bottom:26px}
.adsw>.card{margin-top:24px;padding:clamp(24px,2.6vw,38px);border:1px solid var(--ads-line);border-radius:20px;background:var(--ads-card);box-shadow:0 10px 35px #18385906}
.adsw>.card:hover{border-color:var(--ads-line)}
.adsw .adsw-steps{padding:18px;border:1px solid var(--ads-line);border-radius:18px;background:var(--ads-card)}
.adsw .adsw-steps ol{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:9px}
.adsw .adsw-steps li{min-width:0}
.adsw .adsw-steps button{width:100%;height:100%;min-height:48px;padding:10px;gap:9px;border-radius:11px;justify-content:flex-start;line-height:1.4;text-align:left;border-color:transparent;background:var(--ads-soft);color:var(--ads-muted);font-size:12px;font-weight:600}
.adsw .adsw-steps button .sn{width:25px;height:25px;flex-shrink:0;background:var(--ads-card);color:var(--ads-muted);border:1px solid var(--ads-line);font-weight:700}
.adsw .adsw-steps button.done{background:var(--ads-card);color:var(--ads-secondary);border-color:var(--ads-line)}
.adsw .adsw-steps button.done .sn{background:var(--ads-tint);color:var(--ads-accent);border-color:var(--ads-line)}
.adsw .adsw-steps button.on{color:var(--ads-accent);border-color:var(--ads-accent);background:var(--ads-tint);opacity:1}
.adsw .adsw-steps button.on .sn{background:var(--ads-action);color:var(--ads-on-action);border-color:transparent}
.adsw .adsw-steps button:disabled:not(.on){opacity:.68}
.adsw .adsw-2{grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px}
.adsw .adsw-f{margin-bottom:23px}
.adsw .adsw-f>span,.adsw .adsw-legend{color:var(--ads-text);font-size:13px;line-height:1.5;font-weight:650;margin-bottom:9px}
.adsw .adsw-legend{padding:0}
.adsw .adsw-f small,.adsw .adsw-hint{color:var(--ads-muted);font-size:12px;line-height:1.65;margin-bottom:9px;max-width:88ch}
.adsw .adsw-req,.adsw .adsw-link{color:var(--ads-accent)}
.adsw input[type=text],.adsw select,.adsw textarea.adsw-ta{
  width:100%;max-width:100%;min-width:0;min-height:48px;padding:14px 16px;border-radius:11px;
  color:var(--ads-text);background:var(--ads-bg);border:1px solid var(--ads-line);font-size:15px;line-height:1.65;
  box-shadow:none;caret-color:var(--ads-accent);transition:border-color .18s ease,box-shadow .18s ease;
}
.adsw textarea.adsw-ta{resize:vertical}
.adsw input[type=text]::placeholder,.adsw textarea::placeholder{color:var(--ads-muted);opacity:.8}
.adsw select option{background:var(--ads-card);color:var(--ads-text)}
.adsw input[type=text]:focus,.adsw select:focus,.adsw textarea.adsw-ta:focus{border-color:var(--ads-accent);box-shadow:0 0 0 3px var(--ads-tint);outline:none}
.adsw input[aria-invalid=true]{border-color:var(--ads-error)}
.adsw :is(button,a,input,textarea,select,summary):focus-visible{outline:2px solid var(--ads-accent);outline-offset:3px}
.adsw .adsw-err{color:var(--ads-error);line-height:1.65}
.adsw .adsw-warn,.adsw .adsw-model .m-miss{color:var(--ads-warning);line-height:1.65}
.adsw .adsw-good{color:var(--ads-success)}
.adsw .adsw-actions{gap:12px;margin-top:28px;padding-top:22px;border-top:1px solid var(--ads-line)}
.adsw .adsw-btn,.adsw .go{min-height:48px;padding:13px 22px;border-radius:11px;background:var(--ads-action);color:var(--ads-on-action);font-size:14px;font-weight:650;box-shadow:none;line-height:1.45}
.adsw .adsw-btn:hover:not(:disabled){filter:brightness(1.04)}
.adsw .adsw-btn.ghost{background:var(--ads-card);color:var(--ads-text);border-color:var(--ads-line-strong)}
.adsw .adsw-btn:disabled,.adsw .go.no{background:var(--ads-soft);border-color:var(--ads-line);color:var(--ads-muted);opacity:.72}
.adsw .adsw-btn.small{min-height:40px;padding:9px 15px}
.adsw .row{gap:10px}
.adsw .pill{min-height:42px;padding:10px 17px;border-radius:10px;background:var(--ads-card);color:var(--ads-secondary);border-color:var(--ads-line);font-weight:600;line-height:1.4}
.adsw .pill:hover{color:var(--ads-text);border-color:var(--ads-line-strong);transform:none}
.adsw .pill.on{color:var(--ads-accent);background:var(--ads-tint);border-color:var(--ads-accent);box-shadow:none}
.adsw .adsw-media{grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:14px}
.adsw .adsw-tile{border-color:var(--ads-line);background:var(--ads-soft);border-radius:14px}
.adsw .adsw-tile img,.adsw .adsw-tile video{object-fit:contain}
.adsw .adsw-add{min-width:0;background:var(--ads-bg);border-color:var(--ads-line-strong);color:var(--ads-secondary);border-radius:14px;line-height:1.6}
.adsw .adsw-add:hover:not(:disabled){border-color:var(--ads-accent);background:var(--ads-tint)}
.adsw .adsw-logo{gap:22px;padding:22px;border:1px solid var(--ads-line);border-radius:15px;background:var(--ads-bg)}
.adsw .adsw-logo .adsw-tile{width:124px;background:var(--ads-soft)}
.adsw .adsw-check{color:var(--ads-text);line-height:1.7;padding:18px 20px;border:1px solid var(--ads-line);border-radius:12px;background:var(--ads-bg);margin-top:24px}
.adsw .adsw-check input{accent-color:var(--ads-action);margin-top:2px}
.adsw .adsw-count{color:var(--ads-secondary);line-height:1.65}
.adsw .cams{grid-template-columns:repeat(auto-fit,minmax(min(100%,225px),1fr));gap:16px}
.adsw .cams .cam.adsw-model{padding:22px;border-radius:15px;border-color:var(--ads-line);background:var(--ads-bg);color:var(--ads-text);gap:10px;box-shadow:none}
.adsw .cams .cam.adsw-model.on{background:var(--ads-tint);border-color:var(--ads-accent);color:var(--ads-text)}
.adsw .adsw-model b{font-size:16px;line-height:1.5}
.adsw .adsw-model .m-meta{color:var(--ads-accent)}
.adsw .adsw-model .m-seg,.adsw .cam span{color:var(--ads-muted);font-size:12px;line-height:1.6}
.adsw .adsw-vers{gap:18px}
.adsw .adsw-ver,.adsw .adsw-voice{padding:20px;border-color:var(--ads-line);background:var(--ads-bg);border-radius:15px;gap:16px}
.adsw .adsw-ver.on,.adsw .adsw-voice.on{border-color:var(--ads-accent);background:var(--ads-tint)}
.adsw .adsw-ver-h span,.adsw .adsw-sum dt{color:var(--ads-muted)}
.adsw .adsw-ver p,.adsw .adsw-say,.adsw .adsw-sum dd{color:var(--ads-text);line-height:1.75}
.adsw .adsw-ver p{display:block;overflow:visible;-webkit-line-clamp:unset}
.adsw .adsw-voices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.adsw .adsw-beat{border-color:var(--ads-line);padding-top:26px;margin-top:26px}
.adsw .adsw-cardwrap{gap:28px}
.adsw .adsw-canvas{max-width:280px;border-color:var(--ads-line)}
.adsw details summary{color:var(--ads-accent);line-height:1.6}
.adsw .adsw-bar{height:12px;background:var(--ads-soft);margin:24px 0 14px}
.adsw .adsw-bar i{background:var(--ads-action)}
.adsw .adsw-video{max-width:420px;max-height:75dvh;object-fit:contain;border-color:var(--ads-line)}
.adsw .adsw-panel{padding:48px 24px;min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center}
.adsw .adsw-panel .adsw-bar{width:min(100%,440px)}
.adsw .adsw-sum{gap:13px 22px;max-width:760px;padding-bottom:20px;margin-bottom:20px;border-bottom:1px solid var(--ads-line)}
.adsw .adsw-review{color:var(--ads-secondary);background:var(--ads-tint);border-color:var(--ads-line);padding:17px 20px;line-height:1.7}
.adsw .cost{padding:26px;border:1px solid var(--ads-line);background:var(--ads-bg);border-radius:15px}
.adsw .cost .sum,.adsw .cost .val,.adsw .cost .val b{color:var(--ads-text)}
.adsw .cost .val span,.adsw .cost .gnote{color:var(--ads-muted)}
@media(max-width:1200px){.adsw .adsw-steps ol{grid-template-columns:repeat(4,minmax(0,1fr))}.adsw .adsw-steps button{font-size:12px}}
@media(max-width:900px){
  .stu.adsw{padding:26px 22px 40px}.adsw .adsw-header{margin-bottom:24px}.adsw>.card{padding:26px}
  .adsw .adsw-2{gap:0 18px}.adsw .adsw-voices{grid-template-columns:1fr}
  .adsw input[type=text],.adsw select,.adsw textarea.adsw-ta{font-size:16px}
}
@media(max-width:640px){
  .stu.adsw{padding:22px 16px 36px}.adsw .adsw-header h1{font-size:30px}.adsw .adsw-header .sub{font-size:14px;line-height:1.75}
  .adsw .adsw-steps{padding:12px;border-radius:14px}.adsw .adsw-steps ol{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
  .adsw .adsw-steps button{min-height:43px;padding:8px;gap:8px;font-size:11px}.adsw .adsw-steps button .sn{width:22px;height:22px}
  .adsw>.card{padding:22px 18px;border-radius:16px;margin-top:18px}.adsw h2{font-size:23px}.adsw .adsw-lead{font-size:14px;margin-bottom:22px}
  .adsw .adsw-2{grid-template-columns:minmax(0,1fr)}.adsw .adsw-f{margin-bottom:20px}.adsw .adsw-actions{gap:10px;margin-top:23px;padding-top:19px}
  .adsw .adsw-media{grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.adsw .adsw-logo{padding:17px;gap:16px}.adsw .adsw-check{padding:15px;font-size:13px}
  .adsw .adsw-vers{grid-template-columns:minmax(0,1fr)}.adsw .adsw-ver,.adsw .adsw-voice{padding:16px}.adsw .adsw-btn{max-width:100%;padding:12px 17px}
  .adsw .adsw-cardwrap{gap:20px}.adsw .adsw-canvas{max-width:240px;margin-inline:auto}.adsw .adsw-cardside{flex-basis:100%}
  .adsw .cost{padding:19px}.adsw .adsw-sum{font-size:13px;gap:11px 14px}.adsw .adsw-review{padding:15px;font-size:13px}
}
@media(prefers-reduced-motion:reduce){.adsw *{animation:none!important;transition:none!important}}
`
