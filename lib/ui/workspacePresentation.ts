/** Shared workspace styling: no generation, balance or offer behavior. */
export const WORKSPACE_PRESENTATION_CSS = `
 .stu .grid.animate-grid{grid-template-columns:minmax(0,1fr) minmax(280px,360px);gap:28px;align-items:start}
 @media(max-width:1000px){.stu .grid.animate-grid{grid-template-columns:minmax(0,1fr)}}
.stu { background:var(--bg); color:var(--text); min-width:0; }
.stu h1 { background:none; color:var(--text); -webkit-text-fill-color:currentColor; font-weight:var(--type-title-weight); letter-spacing:-.025em; line-height:1.2; }
.stu .sub { color:var(--muted); font-size:15px; line-height:1.65; max-width:820px; }
.stu .card { background:var(--card); border-color:var(--border); box-shadow:var(--sh-card); border-radius:16px; }
.stu .lab { color:var(--text2); letter-spacing:.01em; text-transform:none; font-size:13px; line-height:1.5; font-weight:var(--type-label-weight); }
.stu .lab .n { box-shadow:none; }
.stu .pill { min-height:36px; box-shadow:none; font-weight:var(--type-label-weight); }
.stu .pill.on { box-shadow:none; }
.stu textarea { line-height:1.65; min-height:150px; }
.stu :is(button,a,input,textarea,summary):focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
.stu .grid.creation-grid { grid-template-columns:minmax(0,1fr) 320px; gap:24px; max-width:1440px; }
.stu .creation-input { min-width:0; }
.stu .creation-input textarea { min-height:180px; }
.stu .creation-settings.rail { position:static; min-width:0; }
.stu .creation-results { grid-column:1/-1; min-width:0; display:flex; flex-direction:column; gap:18px; padding-top:12px; border-top:1px solid #27303e; }
.stu.library-page { max-width:none; }
/* Shared appearance surfaces; media overlays deliberately keep their own dark scrim. */
.stu :is(.hint,.cnt,.gnote,.pk .d,.step p,.cost .val span){color:var(--muted)}
.stu :is(.mdlbtn,.picker,.eng-ic,.cam,.upl,.step){background:var(--card);color:var(--text);border-color:var(--border)}
.stu .pk{color:var(--text)}
.stu .upl.ok{color:var(--text2)}
.stu .upl.no{color:var(--muted)}
.stu .pk:hover,.stu .pill:hover{background:var(--card2);color:var(--text);border-color:var(--border2)}
.stu .pk.on,.stu .cam.on{background:var(--accent-soft);border-color:var(--accent)}
.stu .pill{background:var(--card2);color:var(--text2);border-color:var(--border)}
.stu .pill.on{background:var(--indigo);color:var(--on-accent);border-color:var(--indigo)}
.stu .pill.off:hover{color:var(--muted);border-color:var(--border)}
.stu .cost{background:var(--accent-soft);border-color:var(--border2)}
.stu :is(.cost .sum,.cost .val b,.mdlname i,.pk .sp,.pk .t i,.tag,.camline,.step b,.myv .hd a){color:var(--accent)}
.stu .go.ok{background:var(--indigo);color:var(--on-accent);box-shadow:var(--sh-cta)}
.stu .go.no{background:var(--card2);color:var(--muted)}
.stu textarea{background:var(--bg);color:var(--text);border-color:var(--border)}
.stu textarea::placeholder{color:var(--muted)}
.stu :is(select,input:not([type=range]):not([type=checkbox]):not([type=radio])){color:var(--text);background:var(--bg);border-color:var(--border);max-width:100%}
.stu .grid.creation-grid{max-width:none}
.stu .library-collection{max-width:none}
.stu .library-toolbar { display:flex; align-items:center; flex-wrap:wrap; gap:10px; padding:14px 0; margin:8px 0 20px; border-top:1px solid #27303e; border-bottom:1px solid #27303e; }
.stu .library-toolbar .pill { min-height:40px; padding-inline:18px; }
.stu .library-search { margin-left:auto; position:relative; flex:1 1 260px; max-width:420px; }
.stu .library-collection { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:18px; max-width:none; }
.stu .library-collection .card { overflow:hidden; }
@media(max-width:900px) {
 .stu .grid.creation-grid { grid-template-columns:minmax(0,1fr); gap:18px; }
 .stu .creation-results { grid-column:1; }
 .stu .creation-input textarea { min-height:150px; }
 .stu .library-search { max-width:none; margin-left:0; }
 .stu .library-collection { grid-template-columns:repeat(auto-fill,minmax(145px,1fr)); gap:12px; }
}
@media(prefers-reduced-motion:reduce) { .stu * { animation:none!important; transition:none!important; } }
`
