/** Shared workspace styling: no generation, balance or offer behavior. */
export const WORKSPACE_PRESENTATION_CSS = `
 .stu .grid.animate-grid{grid-template-columns:minmax(0,1fr) minmax(280px,360px);gap:28px;align-items:start}
 @media(max-width:1000px){.stu .grid.animate-grid{grid-template-columns:minmax(0,1fr)}}
.stu { background:linear-gradient(160deg,#11151c 0,#0b0e13 45%); color:#edf1f8; }
.stu h1 { background:none; color:#f2f5fa; -webkit-text-fill-color:currentColor; font-weight:650; letter-spacing:-.035em; }
.stu .sub { color:#a5afc0; line-height:1.65; max-width:820px; }
.stu .card { background:#141922; border-color:#2a3240; box-shadow:none; border-radius:14px; }
.stu .lab { color:#bdc8da; letter-spacing:.075em; }
.stu .lab .n { box-shadow:none; }
.stu .pill { min-height:36px; box-shadow:none; }
.stu .pill.on { box-shadow:none; }
.stu textarea { line-height:1.65; min-height:150px; }
.stu :is(button,a,input,textarea,summary):focus-visible { outline:2px solid #96baff; outline-offset:3px; }
.stu .grid.creation-grid { grid-template-columns:minmax(0,1fr) 320px; gap:24px; max-width:1440px; }
.stu .creation-input { min-width:0; }
.stu .creation-input textarea { min-height:180px; }
.stu .creation-settings.rail { position:static; min-width:0; }
.stu .creation-results { grid-column:1/-1; min-width:0; display:flex; flex-direction:column; gap:18px; padding-top:12px; border-top:1px solid #27303e; }
.stu.library-page { max-width:none; }
.stu .library-toolbar { display:flex; align-items:center; flex-wrap:wrap; gap:10px; padding:14px 0; margin:8px 0 20px; border-top:1px solid #27303e; border-bottom:1px solid #27303e; }
.stu .library-toolbar .pill { min-height:40px; padding-inline:18px; }
.stu .library-search { margin-left:auto; position:relative; flex:1 1 260px; max-width:420px; }
.stu .library-collection { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:18px; max-width:1440px; }
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
