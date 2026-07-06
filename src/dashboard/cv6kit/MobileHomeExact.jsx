import React, { useState } from 'react';

/**
 * MobileHomeExact — the design's mobile Home, transcribed VERBATIM from
 * ui_kits/mobile/index.html (the "Home · Menu closed" frame). It uses the design's
 * own classes (ported, scoped, in home.css under [data-cv6kit].cvhome) and copies
 * the Catch Up card's inline styles exactly as the design wrote them. The fake
 * iPhone clock row is dropped (Patrik: the time is just for show); the live app is
 * full-bleed with real safe-area insets, handled in home.css. Data flows into the
 * real slots: Catch Up <- catchup[], All rooms <- agents + projectRooms.
 */

// Corner wordmark, the exact inline mark the rest of CV6 uses.
function CornerMark() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110.72 24.00" fill="var(--fg)" style={{ display: 'block', height: 24, width: 'auto' }}>
      <g transform="scale(0.034942,0.034942)">
        <g transform="translate(-296.997118,1009.000000) scale(0.100000,-0.100000)"><path d="M2972 6658 l3 -3433 475 0 475 0 5 2955 5 2955 2818 3 2817 2 0 475 0 475 -3300 0 -3300 0 2 -3432z" /><path d="M5120 8516 c0 -2 33 -17 73 -32 856 -325 1618 -949 2196 -1798 l101 -149 213 -43 c344 -69 672 -159 996 -274 79 -28 146 -49 148 -46 11 10 -162 274 -302 461 -580 774 -1380 1348 -2322 1664 -272 92 -652 174 -918 201 -60 5 -127 13 -147 15 -21 3 -38 3 -38 1z" /><path d="M4950 8182 c0 -4 21 -28 46 -52 66 -65 208 -236 308 -374 198 -272 371 -576 526 -926 l47 -105 237 -17 c258 -18 470 -38 725 -69 90 -11 166 -17 168 -15 17 17 -289 379 -484 572 -346 344 -690 593 -1108 801 -158 79 -465 201 -465 185z" /><path d="M4432 7458 l3 -722 525 3 c289 1 527 4 529 7 5 5 -147 304 -220 431 -185 321 -408 614 -635 834 -99 95 -185 169 -198 169 -3 0 -5 -325 -4 -722z" /><path d="M4508 6373 l-78 -4 0 -693 0 -693 790 1 c628 1 790 4 790 14 0 7 -16 92 -36 189 -70 348 -169 711 -281 1038 l-48 140 -75 6 c-77 7 -924 8 -1062 2z" /><path d="M6020 6347 c0 -2 16 -50 35 -108 99 -289 199 -674 270 -1032 26 -127 47 -232 48 -233 1 -1 124 -9 272 -18 308 -19 740 -57 988 -86 225 -27 211 -28 203 16 -12 60 -135 432 -188 564 -144 363 -341 756 -383 765 -195 44 -1245 155 -1245 132z" /><path d="M7730 6117 c0 -2 33 -73 74 -158 159 -332 311 -754 406 -1126 6 -24 12 -43 14 -43 20 0 435 -78 559 -105 174 -38 502 -121 607 -154 35 -11 65 -19 67 -17 5 5 -28 163 -68 321 -64 251 -200 646 -280 809 -20 41 -32 52 -69 66 -25 10 -126 49 -225 88 -298 115 -573 201 -909 282 -162 40 -176 43 -176 37z" /><path d="M4725 4620 c-148 -4 -276 -8 -283 -9 -10 -1 -12 -143 -10 -693 l3 -693 815 -3 c448 -2 834 0 858 3 l42 6 0 172 c0 232 -16 563 -41 842 -18 208 -36 365 -42 371 -7 7 -1115 11 -1342 4z" /><path d="M6425 4584 c5 -22 30 -292 46 -504 6 -80 14 -305 18 -500 l6 -355 750 -3 c413 -1 765 0 784 3 l34 6 -7 162 c-8 203 -23 395 -42 562 -17 155 -73 497 -83 507 -22 24 -926 112 -1368 134 -136 6 -142 6 -138 -12z" /><path d="M8304 4383 c47 -236 84 -600 94 -943 l7 -215 580 0 580 0 -1 250 c-1 266 -27 611 -47 632 -26 25 -461 149 -728 207 -141 31 -471 96 -486 96 -2 0 -2 -12 1 -27z" /></g>
      </g>
      <g transform="translate(31.06,19.920) scale(0.02400,-0.02400)">
        <g transform="translate(0.00,0)"><path d="M375.6148734912276 -13.670593746006489Q299.17066349834204 -13.670593746006489 238.62717498093843 7.702420189976692Q178.08368646353483 29.075434125959873 135.77228194847703 71.77184307947755Q93.46087743341923 114.46825203299522 71.23275538906455 177.2757788784802Q49.00463334470987 240.08330572396517 49.00463334470987 322.78564453125Q49.00463334470987 407.33319963514805 71.73672315850854 472.20820036157966Q94.4688129723072 537.0832010880113 136.77029951661825 582.3768698051572Q179.0717860609293 627.6705385223031 236.98832048475742 650.6705661341548Q294.90485490858555 673.6705937460065 366.1030893474817 673.6705937460065Q421.4243101105094 673.6705937460065 468.17815290391445 659.4543488509953Q514.9319956973195 645.2381039559841 549.1958218552172 617.9802032932639Q583.4596480131149 590.7223026305437 602.888210721314 551.982254024595Q622.316773429513 513.2422054186463 623.0231381356716 464.3731854110956L489.53693353384733 428.50458393245935Q489.88220505416393 471.39777095615864 471.3999030701816 499.3424111008644Q452.9176010861993 527.2870512455702 423.61968848854303 541.6998315230012Q394.3217758908868 556.1126118004322 361.12304735928774 556.1126118004322Q332.4639325812459 556.1126118004322 303.48544723168015 544.3148532435298Q274.5069618821144 532.5170946866274 251.09405662864447 506.0724240243435Q227.68115137517452 479.6277533620596 213.52032155916095 436.99646674096584Q199.35949174314737 394.3651801198721 199.35949174314737 331.7219277024269Q199.35949174314737 250.80877685546875 222.73266407847404 200.70138404518366Q246.10583641380072 150.59399123489857 287.2370954230428 127.07604617252946Q328.36835443228483 103.55810111016035 379.42835053801537 103.55810111016035Q433.62708197534084 103.55810111016035 464.26624455302954 126.04620216041803Q494.90540713071823 148.53430321067572 508.39765760302544 184.21106368675828Q521.8899080753326 219.88782416284084 523.1082313135266 259.66211760789156L649.0310155451298 238.85675339400768Q648.1579667329788 185.62273927778006 633.2016049325466 139.51568216085434Q618.2452431321144 93.40862504392862 586.0686977319419 58.9523271843791Q553.8921523317695 24.49602932482958 501.8605366051197 5.412717789411545Q449.82892087846994 -13.670593746006489 375.6148734912276 -13.670593746006489Z" /></g>
        <g transform="translate(670.00,0)"><path d="M304.44445994496346 -13.670593746006489Q225.22241307795048 -13.670593746006489 165.0181877501309 17.64095899835229Q104.8139624223113 48.95251174271107 70.6771499402821 110.69057936966419Q36.54033745825291 172.42864699661732 36.54033745825291 263.9483027383685Q36.54033745825291 356.3529629185796 71.11171807348728 417.3568696528673Q105.68309868872166 478.36077638715506 166.2166692353785 508.6802050881088Q226.75023978203535 538.9996337890625 303.9920034259558 538.9996337890625Q382.59887743741274 538.9996337890625 443.19793943315744 507.9281921386719Q503.79700142890215 476.85675048828125 538.2493344247341 415.5234375Q572.7016674205661 354.19012451171875 572.7016674205661 262.16247510164976Q572.7016674205661 168.6150507852435 537.5648563914001 107.12502979114652Q502.4280453622341 45.63500879704952 441.4877362921834 15.982207525521517Q380.5474272221327 -13.670593746006489 304.44445994496346 -13.670593746006489ZM309.0753789022565 92.86779639869928Q347.9805331751704 92.86779639869928 374.5066579170525 111.04656691849232Q401.0327826589346 129.22533743828535 414.6798168346286 165.55300394818187Q428.32685101032257 201.88067045807838 428.32685101032257 254.00396486371756Q428.32685101032257 308.992308601737 413.76316034048796 347.4747006855905Q399.19946967065334 385.957092769444 371.09396919235587 406.69931127130985Q342.9884687140584 427.4415297731757 300.4801640585065 427.4415297731757Q262.57104201614857 427.4415297731757 235.55483524501324 409.49890257790685Q208.5386284738779 391.556275382638 194.80825079232454 355.4667360819876Q181.07787311077118 319.37719678133726 181.07787311077118 265.94036719948053Q181.07787311077118 181.0629844069481 214.82631792500615 136.9653904028237Q248.57476273924112 92.86779639869928 309.0753789022565 92.86779639869928Z" /></g>
        <g transform="translate(1269.00,0)"><path d="M66.48876517266035 0V253.72314842045307L66.48082963377237 525.325072273612H185.48723348230124L185.56230430305004 346.22208465635777H205.28447614610195Q212.9115494042635 412.83275204896927 232.2111421637237 454.8664780892432Q251.51073492318392 496.9002041295171 286.6614375039935 517.1920139379799Q321.8121400848031 537.4838237464428 374.2167537584901 537.4838237464428Q383.0858289897442 537.4838237464428 393.61563957855105 536.6425476074219Q404.1454501673579 535.801271468401 418.0820297971368 532.7972484752536L412.3717641681433 380.4662606343627Q396.5900903120637 387.25190225988626 378.87591940164566 389.9066539928317Q361.1617484912276 392.56140572577715 347.2371913343668 392.56140572577715Q308.1934848353267 392.56140572577715 279.8879069983959 374.97778610885143Q251.58232916146517 357.3941664919257 234.5266641303897 323.804558891803Q217.4709990993142 290.21495129168034 210.80010598897934 241.6473655179143V0Z" /></g>
        <g transform="translate(1693.00,0)"><path d="M66.48876517266035 0V318.36537486314774L66.48082963377237 525.325072273612H183.96745857596397L183.22905234992504 367.7458331435919H202.7885049507022Q215.9473174586892 425.3013790100813 239.7846301868558 463.3945838101208Q263.6219429150224 501.48778861016035 300.3957190141082 520.2437111996114Q337.169495113194 538.9996337890625 386.8519311323762 538.9996337890625Q477.9072967991233 538.9996337890625 525.3020433671772 475.0493093840778Q572.6967899352312 411.0989849790931 572.6967899352312 273.91298228502274V0H428.20289393514395V258.38948956131935Q428.20289393514395 342.06041172891855 403.843607340008 380.4613904207945Q379.4843207448721 418.8623691126704 331.80944533646107 418.8623691126704Q291.6146758571267 418.8623691126704 264.8108116053045 394.1319885253906Q238.00694735348225 369.4016079381108 224.3321446031332 328.54817708581686Q210.65734185278416 287.6947462335229 210.0064648836851 238.3216276690364V0Z" /></g>
        <g transform="translate(2314.00,0)"><path d="M310.38074021041393 -13.670593746006489Q245.38886466622353 -13.670593746006489 194.7521146722138 4.154812768101692Q144.11536467820406 21.980219282209873 108.88531978428364 56.212364319711924Q73.65527489036322 90.44450935721397 55.09780617430806 139.99407159909606Q36.54033745825291 189.54363384097815 36.54033745825291 252.99591306596994Q36.54033745825291 315.36493307352066 54.37758915126324 367.8430522121489Q72.21484084427357 420.32117135077715 106.12744092196226 458.6921723373234Q140.04004099965096 497.0631733238697 189.16885690763593 518.0314035564661Q238.2976728156209 538.9996337890625 300.06732419878244 538.9996337890625Q360.17804100364447 538.9996337890625 407.01315477117896 519.2695932537317Q453.84826853871346 499.53955271840096 485.2013884037733 460.67264157161117Q516.5545082688332 421.8057304248214 531.4235907644033 365.3732973113656Q546.2926732599735 308.94086419790983 541.6737186461687 235.5202108696103L130.2769736647606 232.44483196735382V311.01556880772114L459.01626344025135 314.0671439990401L408.4137059748173 274.05916195362806Q414.87793792039156 327.23817080259323 401.0781925730407 361.21070159226656Q387.2784472256899 395.1832323819399 360.63534884899855 411.30047922208905Q333.9922504723072 427.4177260622382 301.53155905008316 427.4177260622382Q263.6463046595454 427.4177260622382 234.82659984752536 407.1636057049036Q206.0068950355053 386.909485347569 190.12777249887586 348.6909484863281Q174.24864996224642 310.47241162508726 174.24864996224642 255.59899950772524Q174.24864996224642 171.10662696510553 211.42147754505277 131.18166872113943Q248.59430512785912 91.25671047717333 309.9284086674452 91.25671047717333Q338.08729092776775 91.25671047717333 357.4009539857507 98.75869872048497Q376.7146170437336 106.26068696379662 389.429064065218 118.21708218753338Q402.14351108670235 130.17347741127014 409.6515963077545 145.24501206725836Q417.1596815288067 160.31654672324657 421.5248529314995 175.45167177915573L546.70154825598 147.9360390305519Q538.4593602716923 111.13842434436083 520.5525578074157 81.42025224119425Q502.6457553431392 51.70208013802767 473.70333886519074 30.426385547965765Q444.7609223872423 9.150690957903862 404.4753999263048 -2.2599513940513134Q364.1898774653673 -13.670593746006489 310.38074021041393 -13.670593746006489Z" /></g>
        <g transform="translate(2885.00,0)"><path d="M66.48876517266035 0V253.72314842045307L66.48082963377237 525.325072273612H185.48723348230124L185.56230430305004 346.22208465635777H205.28447614610195Q212.9115494042635 412.83275204896927 232.2111421637237 454.8664780892432Q251.51073492318392 496.9002041295171 286.6614375039935 517.1920139379799Q321.8121400848031 537.4838237464428 374.2167537584901 537.4838237464428Q383.0858289897442 537.4838237464428 393.61563957855105 536.6425476074219Q404.1454501673579 535.801271468401 418.0820297971368 532.7972484752536L412.3717641681433 380.4662606343627Q396.5900903120637 387.25190225988626 378.87591940164566 389.9066539928317Q361.1617484912276 392.56140572577715 347.2371913343668 392.56140572577715Q308.1934848353267 392.56140572577715 279.8879069983959 374.97778610885143Q251.58232916146517 357.3941664919257 234.5266641303897 323.804558891803Q217.4709990993142 290.21495129168034 210.80010598897934 241.6473655179143V0Z" /></g>
      </g>
    </svg>
  );
}

function dotStyle(status) {
  const v = String(status || '').toLowerCase();
  if (v === 'online' || v === 'active') return { background: 'var(--status-online)', boxShadow: 'var(--glow-online)' };
  if (v === 'working' || v === 'running') return { background: 'var(--status-working)' };
  if (v === 'blocked' || v === 'attention' || v === 'needs_you') return { background: 'var(--warn)' };
  return { background: 'var(--faint)' };
}

const Folder = ({ c }) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={c || 'var(--violet-400)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
);

export const SAMPLE_HOME_M = {
  catchup: [{ id: 'c1', senderName: 'Dana Whitfield · Acme', roomName: 'Re: Q2 partnership scope', messagePreview: 'wants to expand the pilot to three teams; needs revised pricing by Friday.' }],
  agents: [{ slug: 'elon', name: 'Elon', status: 'online' }, { slug: 'rex', name: 'Rex', status: 'working' }, { slug: 'gary', name: 'Gary', status: 'attention' }],
  projectRooms: [
    { slug: 'space-rising', name: 'Space Rising', color: 'var(--violet-400)', tasks: Array.from({ length: 28 }) },
    { slug: 'corner', name: 'Corner', color: 'var(--accent)', tasks: Array.from({ length: 84 }) },
  ],
};

export function MobileHomeExact({ user, agents = [], projectRooms = [], catchup = [], onSelectAgent, onSelectProject, onCatchupOpen, onNav, theme = 'glass' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const card = (catchup && catchup[0]) || SAMPLE_HOME_M.catchup[0];
  const count = (catchup && catchup.length) || 0;
  // null (not 0) when there's nothing to count — a column of literal "0"s is noise
  const projCount = (p) => (Array.isArray(p?.tasks) ? (p.tasks.length || null) : (typeof p?.tasks === 'number' ? (p.tasks || null) : null));
  const rooms = [
    ...agents.map((a) => ({ kind: 'agent', raw: a, name: a.name || a.slug, status: a.status })),
    ...projectRooms.map((p) => ({ kind: 'project', raw: p, name: p.name || p.slug, color: p.color, count: projCount(p) })),
  ];

  return (
    <div data-cv6kit className="cvhome" data-theme={theme}>
      <div className="bg1" />
      <div className="bg2" />

      <div className="body full">
        <div className="brandrow"><CornerMark /></div>

        {/* Empty catch-up = no section at all (Patrik 2026-07-06). Previously this fell
            back to the SAMPLE card (fake data) under a '1 of 5' label when count was 0. */}
        {count > 0 && (<>
        <div className="secrow">
          <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span className="eyebrow">Catch up</span>
            <span style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: 'var(--accent-weak)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span>
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)' }}>1 of {count} · swipe →</span>
        </div>

        {/* Catch Up card — inline styles copied verbatim from the design, content bound to real data */}
        <div style={{ margin: '0 22px 18px' }}>
          <div className="glassy" onClick={() => onCatchupOpen && onCatchupOpen(card)} style={{ background: 'rgba(18,21,28,.975)', border: '1px solid var(--hair)', borderRadius: 18, boxShadow: 'var(--shadow-deck)', overflow: 'hidden', cursor: onCatchupOpen ? 'pointer' : 'default' }}>
            <div style={{ padding: '14px 16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(244,114,182,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--pink-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{card.senderName}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{card.roomName}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--pink-400)', background: 'rgba(244,114,182,.16)', padding: '3px 8px', borderRadius: 6 }}>Email</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--surface-2)', borderRadius: 10, padding: '11px 12px', marginBottom: 14 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)" style={{ flex: 'none', marginTop: 1 }}><path d="M12 3l1.6 4.9L18.5 9l-4.9 1.6L12 15l-1.6-4.4L5.5 9l4.9-1.1Z" /></svg>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--fg)' }}><span style={{ fontWeight: 600 }}>Summary:</span> {card.messagePreview}</div>
              </div>
              <div className="eyebrow" style={{ marginBottom: 9 }}>Action items</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, color: 'var(--fg)', lineHeight: 1.4 }}><span style={{ width: 16, height: 16, borderRadius: 5, border: '2px solid var(--accent)', flex: 'none', marginTop: 1 }} /><span>Send revised 3-team pricing by Friday</span></div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, color: 'var(--fg)', lineHeight: 1.4 }}><span style={{ width: 16, height: 16, borderRadius: 5, border: '2px solid var(--accent)', flex: 'none', marginTop: 1 }} /><span>Confirm the rollout timeline</span></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', border: '1px solid var(--hair)', borderRadius: 11, background: 'var(--surface-2)', marginBottom: 15 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: 'linear-gradient(135deg,#26303f,#161b24)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--pink-400)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>partnership-terms.pdf</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--faint)' }}>240 KB</div></div>
                <button style={{ height: 30, padding: '0 12px', borderRadius: 8, border: 'none', background: 'var(--accent-weak)', color: 'var(--accent)', fontSize: 11.5, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>Review</button>
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--divider)', padding: '12px 14px' }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Suggested actions</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button style={{ height: 42, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>Draft reply</button>
                <button style={{ height: 42, borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>Add to Tracker</button>
              </div>
            </div>
          </div>
        </div>
        </>)}

        <div className="roomshdr"><span className="eyebrow">All rooms</span><span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>See all</span></div>
        {/* scroll-end padding so the floating FABs + surface badge never sit over the
            last rows — the list ended flush at the viewport bottom (loop R3 verify) */}
        <div className="rooms" style={{ paddingBottom: 96 }}>
          {rooms.map((r, i) => {
            const last = i === rooms.length - 1;
            const style = last ? { borderBottom: 'none' } : undefined;
            return r.kind === 'agent' ? (
              <div className="room" key={'a' + i} style={style} onClick={() => onSelectAgent && onSelectAgent(r.raw)}>
                <span className="dot" style={dotStyle(r.status)} />
                <span className="rn">{r.name}</span>
                <span className="tag">AGENT</span>
              </div>
            ) : (
              <div className="room" key={'p' + i} style={style} onClick={() => onSelectProject && onSelectProject(r.raw)}>
                <Folder c={r.color} />
                <span className="rn" style={{ fontWeight: 500 }}>{r.name}</span>
                {r.count != null && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{r.count}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Menu FAB: hamburger + profile, opens the rail */}
      {!menuOpen && (
        <button className="menufab" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
          <span className="lines"><i /><i /><i /></span>
          <span className="mav">P<span className="mdot" /></span>
        </button>
      )}

      {menuOpen && (
        <div className="rail">
          <div className="av">P</div>
          <div className="rdiv" style={{ marginTop: 15 }} />
          <div className="rnav">
            {[
              { key: 'home', label: 'Home', on: true, d: 'M3 11l9-7 9 7M5 9.8V20h14V9.8' },
              { key: 'chat', label: 'Chat', d: 'M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z' },
              { key: 'organize', label: 'Organize', d: 'M12 4 3 8l9 4 9-4-9-4ZM3 12l9 4 9-4' },
              { key: 'review', label: 'Review', d: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z' },
              { key: 'support', label: 'Support', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z' },
              { key: 'tracker', label: 'Tracker', d: 'M12 2v3M12 19v3M2 12h3M19 12h3' },
            ].map((it) => (
              <div className="ri" key={it.key} onClick={() => { setMenuOpen(false); if (it.key !== 'home' && onNav) onNav(it.key); }}>
                {it.on && <span className="ind" />}
                <div className={'rsq' + (it.on ? ' on' : '')}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={it.d} /></svg></div>
                <span className={'rl' + (it.on ? ' on' : '')}>{it.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MobileHomeExact;
