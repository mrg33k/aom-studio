import React, { useState } from 'react';
import LazyGumlet from '../components/home/LazyGumlet';
import BrandMark from '../components/home/BrandMark';

/**
 * HomeR5Preview -- AOM marketing home reimagined in the NEW brand
 * (Bricolage Grotesque + Schibsted Grotesk, obsidian/ivory/champagne gold,
 * hairline editorial grid, globe + monogram marks, period-as-signature).
 *
 * Real content + real Gumlet video (hero reel deck, portfolio tiles, click-to-
 * play modal). Mounted at /r5 for review; promote to / when approved.
 * Mission: corner:home-rebrand.
 */

const playerEmbed = (id) => `https://play.gumlet.io/embed/${id}?autoplay=true`;

const HERO_DECK = [
  { id: '698a596eaec3d4e420c22a9a', client: 'Lagos White Party', tag: 'Event promo', time: '0:30' },
  { id: '698a5946873071aec5c96163', client: 'Lagos Recap', tag: 'Highlight' },
  { id: '698a5a8b873071aec5c99c6f', client: 'Nook 10 Year', tag: 'Creative' },
];

const TICKER = [
  'Skylar', "PA'LA", 'Ambition Mechanical', 'ISA Energy', 'Brandon Wiley',
  'Space Rising', 'Included Health', 'Intelliplay', 'Valor to Victory', 'Kohrs',
];

const FEATURED = { t: 'Journey to Gary Vee', s: 'Cinematic brand story, concept to final cut.', id: '698a6296fc23d3d76fa8d992', tag: 'Narrative' };

const PORTFOLIO = [
  { t: 'Virtu Hospitality', s: 'Scottsdale premium', id: '698a5ef5fc23d3d76fa87ef4', cat: 'Brands', tag: 'Luxury', metric: '3 venue launches' },
  { t: 'Aiper Homeshow', s: 'Event recap', id: '698a58ae873071aec5c953ea', cat: 'Brands', tag: 'Consumer', metric: 'Event recap' },
  { t: 'United Food Bank', s: 'Year end impact', id: '698a5fcdfc23d3d76fa893b8', cat: 'Brands', tag: 'Non-profit', metric: 'Year end impact' },
  { t: 'Abstrakt', s: 'SaaS explainer', id: '698a5faffc23d3d76fa8909f', cat: 'Founders', tag: 'SaaS', metric: 'Product explainer' },
  { t: 'Intelliplay', s: 'Product story', id: '698a5386aec3d4e420c17a69', cat: 'Founders', tag: 'UX', metric: 'Product story' },
  { t: 'Gitex Dubai', s: 'Global tech expo', id: '698a6227fc23d3d76fa8cd57', cat: 'Founders', tag: 'Tech', metric: 'Global expo' },
  { t: 'To Have and To Host', s: 'Residential build', id: '698a68b7fc23d3d76fa970ef', cat: 'Construction', tag: 'Build', metric: 'Residential build' },
  { t: 'Memorial Towers', s: 'Industrial scale', id: '698a584faec3d4e420c20fef', cat: 'Construction', tag: 'Industrial', metric: 'Industrial scale' },
  { t: 'Refined Gardens', s: 'Brand authority', id: '698a57fb873071aec5c94350', cat: 'Construction', tag: 'Landscaping', metric: 'Brand authority' },
];

const TABS = ['All', 'Brands', 'Founders', 'Construction'];
const SPANS = [5, 4, 3]; // varied widths, fills a 12-col row every 3 tiles

const TRUST = [
  { k: 'Predictable delivery', v: 'Tight timelines', d: 'You know what is happening and when. No surprises, no delays, no scope creep.' },
  { k: 'Fast turnarounds', v: '24 to 72 hr', d: 'When you need social cuts or selects fast, we deliver. Not weeks. Days.' },
  { k: 'Lean crew', v: 'Cinema grade', d: 'Small team, big output. No account managers between you and the people doing the work.' },
  { k: 'Brand consistency', v: 'Repeatable', d: 'Every piece looks like it came from the same team. Because it did.' },
];

const ONLINE_STEPS = [
  ['1', 'Tell us what you need', 'A sentence is fine. "Make me a 30 second ad." "Fix the homepage." "Build me a brand."'],
  ['2', 'Send us your files', 'Photos, raw footage, an old website, a logo. Whatever you already have, we will use.'],
  ['3', 'We reply in 24 hours', 'A real person, with a price, a timeline, and any questions left open.'],
  ['4', 'Rough draft in 48 to 72 hours', 'You see the work fast. Then we polish until you love it.'],
];
const PERSON_STEPS = [
  ['1', 'Book a visit', 'Come to our space or we come to yours. Coffee on us.'],
  ['2', 'Plan it together', 'We figure out the story, the look, and the timeline in one sitting.'],
  ['3', 'We shoot or design it', 'Cameras, designers, writers. Whatever the job needs.'],
  ['4', 'You leave with the work', 'Same week, most of the time. Edits handled remotely after.'],
];

const VOICES = [
  { q: 'The video was a huge tool in recruiting our first 3 cohorts and showing people what we are about.', m: '3 cohorts, 40+ founders', n: 'Brandon Clarke', c: 'Startup AZ Foundation, Tech investments' },
  { q: 'Before AOM we posted randomly. Now we have a repeatable system that fills our pipeline. Our outreach finally has teeth.', m: '150% pipeline growth', n: 'Sumit Seth', c: 'Naamly, SaaS' },
  { q: 'They did not just shoot beautiful footage. They showed people the place I created had legacy.', m: '3 venue launches', n: 'Gio Osso', c: 'Virtu Hospitality Group, Hospitality' },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap');
.r5{--ink:#0B0B0B;--ink-800:#161614;--ink-700:#2A2A28;--ink-500:#6E6E66;--ink-300:#A8A49C;--paper:#F6F6F4;--paper-alt:#EEEDE8;--line:#DCD9D2;--stone:#B6B2AB;--gold:#C4A46A;--gold-deep:#A8884C;--display:'Bricolage Grotesque',system-ui,Helvetica,Arial,sans-serif;--text:'Schibsted Grotesk',system-ui,Helvetica,Arial,sans-serif;}
.r5,.r5 *{margin:0;padding:0;box-sizing:border-box}
.r5{font-family:var(--text);background:var(--paper);color:var(--ink);font-size:16px;-webkit-font-smoothing:antialiased;}
.r5 .wrap{max-width:1280px;margin:0 auto;padding:0 48px;}
.r5 .disp{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.02em;line-height:.9;}
.r5 .gold{color:var(--gold);}
.r5 .kicker{font-family:var(--text);font-weight:500;font-size:12px;letter-spacing:.22em;text-transform:uppercase;}
.r5 .dot{display:inline-block;width:.5em;height:.5em;background:var(--gold);margin-left:.1em;vertical-align:baseline;}
.r5 .lbl{font-family:var(--text);font-weight:600;font-size:11px;letter-spacing:.14em;text-transform:uppercase;border:1px solid currentColor;padding:4px 9px;display:inline-block;}
.r5 .mark svg{display:block;width:100%;height:100%;}
.r5 .btn{font-family:var(--text);font-weight:600;font-size:15px;letter-spacing:.01em;padding:15px 26px;display:inline-flex;align-items:center;gap:10px;border:1px solid var(--ink);background:var(--ink);color:var(--paper);text-transform:uppercase;cursor:pointer;text-decoration:none;}
.r5 .btn.gold{background:var(--gold);border-color:var(--gold);color:var(--ink);}
.r5 .btn.ghost-light{background:transparent;color:var(--paper);border-color:#454440;}
.r5 .btn.ghost-ink{background:transparent;color:var(--ink);}

.r5 .nav{border-bottom:1px solid var(--line);background:var(--paper);position:sticky;top:0;z-index:40;}
.r5 .nav .row{display:flex;align-items:center;justify-content:space-between;height:84px;}
.r5 .nav .brand{display:flex;align-items:center;gap:13px;}
.r5 .nav .brand .mk{width:34px;height:34px;color:var(--ink);}
.r5 .nav .brand .wm{font-family:var(--display);font-weight:800;text-transform:uppercase;font-size:17px;letter-spacing:.01em;}
.r5 .nav .links{display:flex;gap:30px;}
.r5 .nav .links a{color:var(--ink);text-decoration:none;}

.r5 .hero{background:var(--ink);color:var(--paper);position:relative;overflow:hidden;}
.r5 .hero .ghost{position:absolute;width:560px;height:560px;left:-230px;bottom:-260px;color:var(--gold);opacity:.08;}
.r5 .hero .inner{position:relative;z-index:2;padding:74px 0 76px;display:grid;grid-template-columns:1.04fr .96fr;gap:54px;align-items:center;}
.r5 .hero .pill{display:inline-flex;align-items:center;gap:9px;border:1px solid #3A3A36;padding:7px 14px;color:var(--stone);font-size:11px;letter-spacing:.2em;text-transform:uppercase;margin-bottom:34px;}
.r5 .hero .pill .ledot{width:7px;height:7px;background:var(--gold);display:inline-block;animation:r5pulse 2s infinite;}
@keyframes r5pulse{0%,100%{opacity:1}50%{opacity:.35}}
.r5 .hero h1{font-size:86px;line-height:.92;}
.r5 .hero .sub p{max-width:42ch;font-size:20px;line-height:1.5;font-weight:500;color:#E7E4DC;margin-top:30px;}
.r5 .hero .cta{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:30px;}

.r5 .deck{position:relative;height:500px;}
.r5 .reel{position:absolute;width:296px;height:404px;border:1px solid #565249;overflow:hidden;background:linear-gradient(155deg,#2C2A25 0%,#131210 76%);box-shadow:0 26px 64px rgba(0,0,0,.6);}
.r5 .reel .scrim{position:absolute;inset:0;z-index:1;background:radial-gradient(120% 80% at 70% 20%, rgba(196,164,106,.16), transparent 55%);pointer-events:none;}
.r5 .reel .play{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2;width:58px;height:58px;border:1.5px solid var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--gold);font-size:17px;background:rgba(11,11,11,.35);}
.r5 .reel .badge{position:absolute;top:14px;left:14px;z-index:2;font-weight:600;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--paper);border:1px solid #4A4843;padding:3px 8px;background:rgba(11,11,11,.4);}
.r5 .reel .time{position:absolute;top:14px;right:14px;z-index:2;font-family:var(--display);font-weight:800;font-size:12px;color:var(--stone);}
.r5 .reel .meta{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:18px 16px 16px;background:linear-gradient(transparent,rgba(0,0,0,.9));}
.r5 .reel .meta .t{color:var(--gold);font-size:10px;letter-spacing:.24em;text-transform:uppercase;margin-bottom:6px;}
.r5 .reel .meta .c{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.01em;font-size:23px;line-height:.95;}
.r5 .reel.back{left:4px;top:30px;transform:rotate(-6deg);opacity:.55;z-index:1;}
.r5 .reel.mid{right:4px;top:14px;transform:rotate(5deg);opacity:.78;z-index:2;}
.r5 .reel.front{left:50%;top:46px;transform:translateX(-50%);z-index:3;}

.r5 .ticker{background:var(--ink);color:var(--stone);border-top:1px solid var(--ink-700);overflow:hidden;}
.r5 .ticker .row{display:flex;align-items:center;height:58px;width:max-content;animation:r5marq 32s linear infinite;}
@keyframes r5marq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.r5 .ticker .it{font-family:var(--display);font-weight:800;text-transform:uppercase;font-size:15px;letter-spacing:.02em;color:#7C7A73;white-space:nowrap;padding:0 22px;}
.r5 .ticker .sep{color:var(--ink-700);}

.r5 .work{padding:84px 0;border-bottom:1px solid var(--line);}
.r5 .work .head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid var(--ink);padding-bottom:22px;margin-bottom:26px;gap:20px;flex-wrap:wrap;}
.r5 .work .head h2{font-size:72px;}
.r5 .work .head .sub{color:var(--ink-500);font-size:18px;margin-top:10px;}
.r5 .work .head .tabs{display:flex;gap:8px;}
.r5 .work .head .tabs button{font-family:var(--text);font-size:12px;letter-spacing:.12em;text-transform:uppercase;padding:8px 14px;border:1px solid var(--line);color:var(--ink-500);background:transparent;cursor:pointer;}
.r5 .work .head .tabs button.on{background:var(--ink);color:var(--paper);border-color:var(--ink);}
.r5 .feature{position:relative;background:var(--ink);color:var(--paper);border:1px solid var(--ink);aspect-ratio:21/8;display:flex;flex-direction:column;justify-content:space-between;padding:30px 34px;margin-bottom:18px;overflow:hidden;cursor:pointer;}
.r5 .feature .vid,.r5 .tile .vid{position:absolute;inset:0;z-index:0;}
.r5 .feature .shade{position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,rgba(11,11,11,.92),rgba(11,11,11,.45) 55%,rgba(11,11,11,.2));}
.r5 .feature .ftop,.r5 .feature .fbot{position:relative;z-index:2;}
.r5 .feature .ftop{display:flex;justify-content:space-between;align-items:flex-start;}
.r5 .feature .play{width:62px;height:62px;border:1.5px solid var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--gold);font-size:20px;background:rgba(11,11,11,.35);}
.r5 .feature .ftag{color:var(--gold);font-size:11px;letter-spacing:.3em;text-transform:uppercase;margin-bottom:10px;}
.r5 .feature .fttl{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.02em;font-size:58px;line-height:.9;}
.r5 .feature .fsub{color:var(--stone);margin-top:10px;font-size:16px;}
.r5 .grid12{display:grid;grid-template-columns:repeat(12,1fr);gap:18px;}
.r5 .tile{position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;padding:22px;min-height:250px;border:1px solid var(--ink);background:var(--ink);color:var(--paper);cursor:pointer;}
.r5 .tile .shade{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(11,11,11,.5),rgba(11,11,11,.35) 40%,rgba(11,11,11,.9));}
.r5 .tile .top,.r5 .tile .bot{position:relative;z-index:2;}
.r5 .tile .top{display:flex;justify-content:space-between;align-items:flex-start;}
.r5 .tile .pl{width:34px;height:34px;border:1.5px solid currentColor;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;opacity:.9;background:rgba(11,11,11,.3);}
.r5 .tile .idx{font-family:var(--display);font-weight:800;font-size:14px;opacity:.75;letter-spacing:.06em;}
.r5 .tile .name{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.02em;line-height:.92;font-size:30px;}
.r5 .tile .foot{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:12px;border-top:1px solid var(--ink-700);}
.r5 .tile .metric{font-weight:600;font-size:13.5px;}

.r5 .ways{padding:90px 0;border-bottom:1px solid var(--line);background:var(--paper);}
.r5 .ways .wh{text-align:center;max-width:46ch;margin:0 auto 48px;}
.r5 .ways .wh .eyebrow{color:var(--gold-deep);font-size:11px;letter-spacing:.3em;text-transform:uppercase;margin-bottom:16px;display:block;}
.r5 .ways .wh h2{font-size:74px;}
.r5 .ways .wh p{color:var(--ink-500);font-size:18px;line-height:1.5;margin-top:18px;}
.r5 .twogrid{display:grid;grid-template-columns:1fr 1fr;gap:22px;}
.r5 .panel{border:1px solid var(--line);background:var(--paper-alt);padding:34px 34px 30px;display:flex;flex-direction:column;}
.r5 .panel.feat{background:var(--ink);color:var(--paper);border-color:var(--ink);}
.r5 .panel .ptop{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.r5 .panel .pe{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-500);}
.r5 .panel.feat .pe{color:var(--gold);}
.r5 .panel .pmost{font-size:10px;letter-spacing:.14em;text-transform:uppercase;background:var(--gold);color:var(--ink);padding:3px 8px;font-weight:600;}
.r5 .panel h3{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.02em;font-size:42px;line-height:.95;margin-bottom:22px;}
.r5 .panel .step{display:grid;grid-template-columns:30px 1fr;gap:16px;padding:16px 0;border-top:1px solid var(--line);}
.r5 .panel.feat .step{border-color:var(--ink-700);}
.r5 .panel .step .sn{font-family:var(--display);font-weight:800;font-size:15px;color:var(--gold-deep);}
.r5 .panel.feat .step .sn{color:var(--gold);}
.r5 .panel .step .sl{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.01em;font-size:17px;}
.r5 .panel .step .sb{font-size:14px;color:var(--ink-500);line-height:1.5;margin-top:5px;}
.r5 .panel.feat .step .sb{color:var(--ink-300);}
.r5 .panel .pcta{margin-top:24px;}

.r5 .why{background:var(--ink);color:var(--paper);padding:88px 0;}
.r5 .why .eyebrow{color:var(--gold);font-size:11px;letter-spacing:.3em;text-transform:uppercase;margin-bottom:18px;display:block;}
.r5 .why h2{font-size:72px;margin-bottom:44px;}
.r5 .why .grid{display:grid;grid-template-columns:repeat(4,1fr);}
.r5 .why .cell{padding:0 26px;border-left:1px solid var(--ink-700);}
.r5 .why .cell:first-child{border-left:none;padding-left:0;}
.r5 .why .cell .k{color:var(--ink-300);font-size:11px;letter-spacing:.2em;text-transform:uppercase;margin-bottom:14px;}
.r5 .why .cell .v{font-family:var(--display);font-weight:800;text-transform:uppercase;font-size:30px;line-height:.95;}
.r5 .why .cell .d{color:var(--ink-300);font-size:14.5px;line-height:1.5;margin-top:14px;}

.r5 .voices{background:var(--paper-alt);padding:84px 0;border-bottom:1px solid var(--line);}
.r5 .voices h2{font-size:44px;margin-bottom:40px;}
.r5 .voices .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
.r5 .voices .q{background:var(--paper);border:1px solid var(--line);padding:30px;display:flex;flex-direction:column;justify-content:space-between;min-height:300px;}
.r5 .voices .q .quote{font-size:19px;line-height:1.45;font-weight:500;}
.r5 .voices .q .metric{font-family:var(--display);font-weight:800;text-transform:uppercase;color:var(--gold-deep);font-size:16px;margin:20px 0;line-height:1;}
.r5 .voices .q .who{border-top:1px solid var(--line);padding-top:14px;}
.r5 .voices .q .who .nm{font-weight:700;font-size:15px;}
.r5 .voices .q .who .co{color:var(--ink-500);font-size:13px;margin-top:2px;}

.r5 .close{position:relative;overflow:hidden;background:var(--ink);color:var(--paper);padding:118px 0;}
.r5 .close .mono{position:absolute;width:600px;height:600px;right:-130px;top:-70px;color:var(--gold);opacity:.12;}
.r5 .close .inner{position:relative;z-index:2;}
.r5 .close .kicker{color:var(--stone);margin-bottom:24px;display:block;}
.r5 .close h2{font-size:120px;max-width:12ch;}
.r5 .close .ctarow{display:flex;align-items:center;gap:22px;margin-top:40px;flex-wrap:wrap;}
.r5 .close .ctarow .note{color:var(--stone);font-size:15px;max-width:32ch;}

.r5 .foot{background:var(--ink);color:var(--paper);padding:58px 0 40px;border-top:1px solid var(--ink-700);}
.r5 .foot .top{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:40px;border-bottom:1px solid var(--ink-700);gap:30px;flex-wrap:wrap;}
.r5 .foot .brand{display:flex;align-items:center;gap:13px;}
.r5 .foot .brand .mk{width:30px;height:30px;color:var(--paper);}
.r5 .foot .brand .wm{font-family:var(--display);font-weight:800;text-transform:uppercase;font-size:16px;}
.r5 .foot .cols{display:flex;gap:64px;}
.r5 .foot .col h4{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-300);margin-bottom:14px;}
.r5 .foot .col a{display:block;color:var(--paper);text-decoration:none;font-size:15px;margin-bottom:9px;}
.r5 .foot .base{display:flex;justify-content:space-between;align-items:center;padding-top:24px;gap:20px;flex-wrap:wrap;}
.r5 .foot .base .sig{font-family:var(--display);font-weight:800;text-transform:uppercase;font-size:15px;}
.r5 .foot .base .sig b{color:var(--gold);}
.r5 .foot .base .fine{color:var(--ink-300);font-size:13px;}

.r5 .modal{position:fixed;inset:0;z-index:1000;background:rgba(8,8,7,.94);display:flex;align-items:center;justify-content:center;padding:32px;}
.r5 .modal .box{width:min(1040px,100%);}
.r5 .modal .vwrap{position:relative;width:100%;aspect-ratio:16/9;background:#000;border:1px solid var(--ink-700);}
.r5 .modal .vwrap iframe{position:absolute;inset:0;width:100%;height:100%;border:0;}
.r5 .modal .mhead{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:14px;color:var(--paper);}
.r5 .modal .mhead .mt{font-family:var(--display);font-weight:800;text-transform:uppercase;font-size:24px;letter-spacing:-.01em;}
.r5 .modal .mhead .mc{background:none;border:1px solid #4A4843;color:var(--paper);width:40px;height:40px;font-size:18px;cursor:pointer;}

@media(max-width:980px){
  .r5 .hero .inner{grid-template-columns:1fr;}
  .r5 .deck{height:440px;margin-top:20px;}
  .r5 .hero h1{font-size:60px;}
  .r5 .twogrid{grid-template-columns:1fr;}
  .r5 .why .grid{grid-template-columns:1fr 1fr;gap:30px 0;}
  .r5 .voices .grid{grid-template-columns:1fr;}
  .r5 .tile,.r5 .feature .fttl{}
  .r5 [style*="grid-column"]{grid-column:span 12 !important;}
  .r5 .close h2{font-size:64px;}
  .r5 .work .head h2{font-size:48px;}
}
`;

export default function HomeR5Preview() {
  const [tab, setTab] = useState('All');
  const [video, setVideo] = useState(null);
  const shown = tab === 'All' ? PORTFOLIO : PORTFOLIO.filter((p) => p.cat === tab);

  return (
    <div className="r5">
      <style>{CSS}</style>

      {/* NAV */}
      <nav className="nav"><div className="wrap row">
        <div className="brand"><BrandMark kind="mono" className="mk mark" /><span className="wm">Ahead of Market</span></div>
        <div className="links kicker">
          <a href="#work">Work</a><a href="#hire">How to hire</a><a href="#why">Why us</a><a href="#contact">Contact</a>
        </div>
        <a className="btn gold" href="#contact">Start a project ↗</a>
      </div></nav>

      {/* HERO */}
      <header className="hero">
        <BrandMark kind="globe" className="ghost mark" />
        <div className="wrap inner">
          <div>
            <span className="pill"><span className="ledot" /> Now streaming · Live reels</span>
            <h1 className="disp">Brand films for the ones who <span className="gold">refuse to follow</span><span className="dot" /></h1>
            <div className="sub"><p>Brand films, websites, and ads for real businesses. Hire us online by sending a few files, or hire us in person. We reply within 24 hours.</p></div>
            <div className="cta">
              <a className="btn gold" href="#contact">Start a project ↗</a>
              <a className="btn ghost-light" href="#work">▶&nbsp; Watch the reel</a>
            </div>
          </div>
          <div className="deck">
            <div className="reel back"><LazyGumlet id={HERO_DECK[2].id} portrait /><div className="scrim" /></div>
            <div className="reel mid"><LazyGumlet id={HERO_DECK[1].id} portrait /><div className="scrim" /></div>
            <div className="reel front" onClick={() => setVideo(HERO_DECK[0])}>
              <LazyGumlet id={HERO_DECK[0].id} eager portrait />
              <div className="scrim" /><span className="badge">Reel</span><span className="time">{HERO_DECK[0].time}</span>
              <div className="play">▶</div>
              <div className="meta"><div className="t">{HERO_DECK[0].tag}</div><div className="c">{HERO_DECK[0].client}</div></div>
            </div>
          </div>
        </div>
      </header>

      {/* TICKER */}
      <div className="ticker"><div className="row">
        {[...TICKER, ...TICKER].map((t, i) => (
          <React.Fragment key={i}><span className="it">{t}</span><span className="sep">/</span></React.Fragment>
        ))}
      </div></div>

      {/* PORTFOLIO */}
      <section className="work" id="work"><div className="wrap">
        <div className="head">
          <div>
            <h2 className="disp">The portfolio<span className="dot" /></h2>
            <div className="sub">Real projects. Real clients. All of it shipped.</div>
          </div>
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
        </div>

        <div className="feature" onClick={() => setVideo(FEATURED)}>
          <LazyGumlet id={FEATURED.id} eager className="vid" />
          <div className="shade" />
          <div className="ftop"><span className="ftag">Featured · {FEATURED.tag}</span><span className="play">▶</span></div>
          <div className="fbot">
            <div className="fttl">{FEATURED.t}</div>
            <div className="fsub">{FEATURED.s}</div>
          </div>
        </div>

        <div className="grid12">
          {shown.map((p, i) => (
            <div key={p.t} className="tile" style={{ gridColumn: `span ${SPANS[i % 3]}` }} onClick={() => setVideo(p)}>
              <LazyGumlet id={p.id} className="vid" />
              <div className="shade" />
              <div className="top"><span className="idx">{String(i + 1).padStart(2, '0')}</span><span className="pl">▶</span></div>
              <div className="bot">
                <div className="name">{p.t}</div>
                <div className="foot"><span className="metric">{p.metric}</span><span className="lbl">{p.tag}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div></section>

      {/* TWO WAYS */}
      <section className="ways" id="hire"><div className="wrap">
        <div className="wh">
          <span className="eyebrow">How to hire us</span>
          <h2 className="disp">Two ways. <span className="gold">Pick one</span><span className="dot" /></h2>
          <p>You do not need a meeting to start. Most clients hire us online and never visit. Some prefer to shake hands. Both work.</p>
        </div>
        <div className="twogrid">
          <div className="panel feat">
            <div className="ptop"><span className="pe">Online</span><span className="pmost">Most clients</span></div>
            <h3>Hire us online.</h3>
            {ONLINE_STEPS.map((s) => (
              <div className="step" key={s[0]}><span className="sn">{s[0]}</span><div><div className="sl">{s[1]}</div><div className="sb">{s[2]}</div></div></div>
            ))}
            <div className="pcta"><a className="btn gold" href="#contact">Send your files ↗</a></div>
          </div>
          <div className="panel">
            <div className="ptop"><span className="pe">In person</span></div>
            <h3>Hire us in person.</h3>
            {PERSON_STEPS.map((s) => (
              <div className="step" key={s[0]}><span className="sn">{s[0]}</span><div><div className="sl">{s[1]}</div><div className="sb">{s[2]}</div></div></div>
            ))}
            <div className="pcta"><a className="btn ghost-ink" href="#contact">Book a visit ↗</a></div>
          </div>
        </div>
      </div></section>

      {/* WHY IT WORKS */}
      <section className="why" id="why"><div className="wrap">
        <span className="eyebrow">Why us</span>
        <h2 className="disp">Why it <span className="gold">works</span><span className="dot" /></h2>
        <div className="grid">
          {TRUST.map((m) => (
            <div className="cell" key={m.k}><div className="k">{m.k}</div><div className="v disp">{m.v}</div><div className="d">{m.d}</div></div>
          ))}
        </div>
      </div></section>

      {/* TESTIMONIALS */}
      <section className="voices"><div className="wrap">
        <h2 className="disp">Proof, not promises<span className="dot" /></h2>
        <div className="grid">
          {VOICES.map((v) => (
            <div className="q" key={v.n}>
              <div className="quote">{'“'}{v.q}{'”'}</div>
              <div><div className="metric">{v.m}</div>
                <div className="who"><div className="nm">{v.n}</div><div className="co">{v.c}</div></div></div>
            </div>
          ))}
        </div>
      </div></section>

      {/* CLOSING */}
      <section className="close" id="contact">
        <BrandMark kind="mono" className="mono mark" />
        <div className="wrap inner">
          <span className="kicker">[ Start your brief ]</span>
          <h2 className="disp">Get <span className="gold">ahead</span><span className="dot" /></h2>
          <div className="ctarow">
            <a className="btn gold" href="mailto:hello@aom-inhouse.com">Start a project ↗</a>
            <span className="note">Send a few files or book a call. We reply within 24 hours.</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="foot"><div className="wrap">
        <div className="top">
          <div className="brand"><BrandMark kind="mono" className="mk mark" /><span className="wm">Ahead of Market</span></div>
          <div className="cols">
            <div className="col"><h4>Studio</h4><a href="#work">Work</a><a href="#hire">How to hire</a><a href="#why">Why us</a></div>
            <div className="col"><h4>Connect</h4><a href="mailto:hello@aom-inhouse.com">hello@aom-inhouse.com</a><a href="tel:6023732164">602 373 2164</a><a href="#">Instagram</a></div>
          </div>
        </div>
        <div className="base">
          <div className="sig">One vision. Many worlds ahead<b>.</b></div>
          <div className="fine">© 2026 Ahead of Market. All rights reserved.</div>
        </div>
      </div></footer>

      {/* VIDEO MODAL */}
      {video && (
        <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setVideo(null); }}>
          <div className="box">
            <div className="mhead">
              <span className="mt">{video.client || video.t}</span>
              <button className="mc" onClick={() => setVideo(null)} aria-label="Close">×</button>
            </div>
            <div className="vwrap">
              <iframe src={playerEmbed(video.id)} title={video.client || video.t} allow="autoplay; fullscreen; encrypted-media" allowFullScreen />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
