export const FOOTER_PRESENTATION_CSS = `
 .kineo-footer{max-width:1200px;margin-inline:auto}
 .kineo-footer .footer-group{border:1px solid #29313d;border-radius:12px;padding:14px 16px;background:#10151d;min-width:0}
 .kineo-footer .footer-group summary{display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;list-style:none;min-height:28px;color:#e0e8f6}
 .kineo-footer .footer-group summary::-webkit-details-marker{display:none}
 .kineo-footer .footer-group summary:after{content:'+';font-size:20px;color:#95b9e7}
 .kineo-footer .footer-group[open] summary:after{content:'−'}
 .kineo-footer .footer-group summary h2{margin:0!important;color:inherit!important;font-size:12px!important}
 .kineo-footer .footer-group ul{padding-top:14px!important}
 .kineo-footer .footer-group a{display:block;padding-block:6px;line-height:1.55}
 .kineo-footer a:hover{color:#fff!important}
 .kineo-footer summary:focus-visible,.kineo-footer a:focus-visible{outline:2px solid #85baff;outline-offset:4px;border-radius:4px}
 @media(max-width:600px){.kineo-footer .footer-navigation{grid-template-columns:1fr!important;gap:10px!important}.kineo-footer .footer-group summary{min-height:34px}}
`
