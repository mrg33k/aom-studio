import{r as t,j as g}from"./index-fiQlnY3a.js";import{M as $,u as P,l as S,o as A,e as D,L as K,h as z}from"./phone-9hQNVx6L.js";class T extends t.Component{getSnapshotBeforeUpdate(l){const e=this.props.childRef.current;if(e&&l.isPresent&&!this.props.isPresent){const n=this.props.sizeRef.current;n.height=e.offsetHeight||0,n.width=e.offsetWidth||0,n.top=e.offsetTop,n.left=e.offsetLeft}return null}componentDidUpdate(){}render(){return this.props.children}}function U({children:i,isPresent:l}){const e=t.useId(),n=t.useRef(null),x=t.useRef({width:0,height:0,top:0,left:0}),{nonce:a}=t.useContext($);return t.useInsertionEffect(()=>{const{width:d,height:o,top:h,left:s}=x.current;if(l||!n.current||!d||!o)return;n.current.dataset.motionPopId=e;const c=document.createElement("style");return a&&(c.nonce=a),document.head.appendChild(c),c.sheet&&c.sheet.insertRule(`
          [data-motion-pop-id="${e}"] {
            position: absolute !important;
            width: ${d}px !important;
            height: ${o}px !important;
            top: ${h}px !important;
            left: ${s}px !important;
          }
        `),()=>{document.head.removeChild(c)}},[l]),g.jsx(T,{isPresent:l,childRef:n,sizeRef:x,children:t.cloneElement(i,{ref:n})})}const X=({children:i,initial:l,isPresent:e,onExitComplete:n,custom:x,presenceAffectsLayout:a,mode:d})=>{const o=P(B),h=t.useId(),s=t.useCallback(f=>{o.set(f,!0);for(const C of o.values())if(!C)return;n&&n()},[o,n]),c=t.useMemo(()=>({id:h,initial:l,isPresent:e,custom:x,onExitComplete:s,register:f=>(o.set(f,!1),()=>o.delete(f))}),a?[Math.random(),s]:[e,s]);return t.useMemo(()=>{o.forEach((f,C)=>o.set(C,!1))},[e]),t.useEffect(()=>{!e&&!o.size&&n&&n()},[e]),d==="popLayout"&&(i=g.jsx(U,{isPresent:e,children:i})),g.jsx(S.Provider,{value:c,children:i})};function B(){return new Map}const v=i=>i.key||"";function w(i){const l=[];return t.Children.forEach(i,e=>{t.isValidElement(e)&&l.push(e)}),l}const H=({children:i,custom:l,initial:e=!0,onExitComplete:n,presenceAffectsLayout:x=!0,mode:a="sync",propagate:d=!1})=>{const[o,h]=A(d),s=t.useMemo(()=>w(i),[i]),c=d&&!o?[]:s.map(v),f=t.useRef(!0),C=t.useRef(s),y=P(()=>new Map),[I,L]=t.useState(s),[p,k]=t.useState(s);D(()=>{f.current=!1,C.current=s;for(let u=0;u<p.length;u++){const r=v(p[u]);c.includes(r)?y.delete(r):y.get(r)!==!0&&y.set(r,!1)}},[p,c.length,c.join("-")]);const M=[];if(s!==I){let u=[...s];for(let r=0;r<p.length;r++){const m=p[r],E=v(m);c.includes(E)||(u.splice(r,0,m),M.push(m))}a==="wait"&&M.length&&(u=M),k(w(u)),L(s);return}const{forceRender:R}=t.useContext(K);return g.jsx(g.Fragment,{children:p.map(u=>{const r=v(u),m=d&&!o?!1:s===p||c.includes(r),E=()=>{if(y.has(r))y.set(r,!0);else return;let j=!0;y.forEach(b=>{b||(j=!1)}),j&&(R==null||R(),k(C.current),d&&(h==null||h()),n&&n())};return g.jsx(X,{isPresent:m,initial:!f.current||e?void 0:!1,custom:m?void 0:l,presenceAffectsLayout:x,mode:a,onExitComplete:m?void 0:E,children:u},r)})})};/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O=z("Menu",[["line",{x1:"4",x2:"20",y1:"12",y2:"12",key:"1e0a9i"}],["line",{x1:"4",x2:"20",y1:"6",y2:"6",key:"1owob3"}],["line",{x1:"4",x2:"20",y1:"18",y2:"18",key:"yk5zj1"}]]);/**
 * @license lucide-react v0.344.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V=z("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);export{H as A,O as M,V as X};
