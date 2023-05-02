import{Q as kt}from"./QResizeObserver.7628afe8.js";import{Q as Ft,a as Lt}from"./QFab.975ed23a.js";import{i as Tt,$ as V,a0 as It,c as T,g as Rt,x as At,h as j,s as ut,aB as St,aC as w,aD as ht,aE as Mt,aF as z,aG as Bt,aH as Xt,_ as I,j as y,P as k,Q as g,l as $t,aI as bt,ar as Dt,aJ as J,r as v,al as p,d as h,aK as et,k as F,V as dt,W as G,S as b,U as E,am as ft,aL as pt,Z as M,aM as gt,F as D,O as mt,aN as Nt,m as q,N as Yt,aO as _t,as as Pt,aP as Ot,aQ as Gt,aq as qt,aR as Ut,ah as Vt,ak as zt}from"./index.18ea7970.js";import{E as vt,B as Qt,i as W,V as yt,l as nt,a as Kt,O as Ht,u as ot,e as jt,g as Wt,S as Zt,T as Jt,L as rt,c as te,F as U,P as tt,b as xt,C as ee}from"./CartoLayers.0bad73e0.js";import{Q as ne}from"./QPage.d44e45a6.js";import{u as oe}from"./use-quasar.c588333e.js";const re={position:{type:String,default:"bottom-right",validator:o=>["top-right","top-left","bottom-right","bottom-left","top","right","bottom","left"].includes(o)},offset:{type:Array,validator:o=>o.length===2},expand:Boolean};function ie(){const{props:o,proxy:{$q:e}}=Rt(),t=Tt(It,V);if(t===V)return console.error("QPageSticky needs to be child of QLayout"),V;const n=T(()=>{const d=o.position;return{top:d.indexOf("top")>-1,right:d.indexOf("right")>-1,bottom:d.indexOf("bottom")>-1,left:d.indexOf("left")>-1,vertical:d==="top"||d==="bottom",horizontal:d==="left"||d==="right"}}),r=T(()=>t.header.offset),i=T(()=>t.right.offset),a=T(()=>t.footer.offset),s=T(()=>t.left.offset),c=T(()=>{let d=0,f=0;const m=n.value,_=e.lang.rtl===!0?-1:1;m.top===!0&&r.value!==0?f=`${r.value}px`:m.bottom===!0&&a.value!==0&&(f=`${-a.value}px`),m.left===!0&&s.value!==0?d=`${_*s.value}px`:m.right===!0&&i.value!==0&&(d=`${-_*i.value}px`);const x={transform:`translate(${d}, ${f})`};return o.offset&&(x.margin=`${o.offset[1]}px ${o.offset[0]}px`),m.vertical===!0?(s.value!==0&&(x[e.lang.rtl===!0?"right":"left"]=`${s.value}px`),i.value!==0&&(x[e.lang.rtl===!0?"left":"right"]=`${i.value}px`)):m.horizontal===!0&&(r.value!==0&&(x.top=`${r.value}px`),a.value!==0&&(x.bottom=`${a.value}px`)),x}),l=T(()=>`q-page-sticky row flex-center fixed-${o.position} q-page-sticky--${o.expand===!0?"expand":"shrink"}`);function u(d){const f=At(d.default);return j("div",{class:l.value,style:c.value},o.expand===!0?f:[j("div",f)])}return{$layout:t,getStickyContent:u}}var Q=ut({name:"QPageSticky",props:re,setup(o,{slots:e}){const{getStickyContent:t}=ie();return()=>t(e)}}),S={ADD:"add",REMOVE:"remove"},Et=globalThis&&globalThis.__extends||function(){var o=function(e,t){return o=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(n,r){n.__proto__=r}||function(n,r){for(var i in r)Object.prototype.hasOwnProperty.call(r,i)&&(n[i]=r[i])},o(e,t)};return function(e,t){if(typeof t!="function"&&t!==null)throw new TypeError("Class extends value "+String(t)+" is not a constructor or null");o(e,t);function n(){this.constructor=e}e.prototype=t===null?Object.create(t):(n.prototype=t.prototype,new n)}}(),it={LENGTH:"length"},Y=function(o){Et(e,o);function e(t,n,r){var i=o.call(this,t)||this;return i.element=n,i.index=r,i}return e}(vt),ae=function(o){Et(e,o);function e(t,n){var r=o.call(this)||this;r.on,r.once,r.un;var i=n||{};if(r.unique_=!!i.unique,r.array_=t||[],r.unique_)for(var a=0,s=r.array_.length;a<s;++a)r.assertUnique_(r.array_[a],a);return r.updateLength_(),r}return e.prototype.clear=function(){for(;this.getLength()>0;)this.pop()},e.prototype.extend=function(t){for(var n=0,r=t.length;n<r;++n)this.push(t[n]);return this},e.prototype.forEach=function(t){for(var n=this.array_,r=0,i=n.length;r<i;++r)t(n[r],r,n)},e.prototype.getArray=function(){return this.array_},e.prototype.item=function(t){return this.array_[t]},e.prototype.getLength=function(){return this.get(it.LENGTH)},e.prototype.insertAt=function(t,n){this.unique_&&this.assertUnique_(n),this.array_.splice(t,0,n),this.updateLength_(),this.dispatchEvent(new Y(S.ADD,n,t))},e.prototype.pop=function(){return this.removeAt(this.getLength()-1)},e.prototype.push=function(t){this.unique_&&this.assertUnique_(t);var n=this.getLength();return this.insertAt(n,t),this.getLength()},e.prototype.remove=function(t){for(var n=this.array_,r=0,i=n.length;r<i;++r)if(n[r]===t)return this.removeAt(r)},e.prototype.removeAt=function(t){var n=this.array_[t];return this.array_.splice(t,1),this.updateLength_(),this.dispatchEvent(new Y(S.REMOVE,n,t)),n},e.prototype.setAt=function(t,n){var r=this.getLength();if(t<r){this.unique_&&this.assertUnique_(n,t);var i=this.array_[t];this.array_[t]=n,this.dispatchEvent(new Y(S.REMOVE,i,t)),this.dispatchEvent(new Y(S.ADD,n,t))}else{for(var a=r;a<t;++a)this.insertAt(a,void 0);this.insertAt(t,n)}},e.prototype.updateLength_=function(){this.set(it.LENGTH,this.array_.length)},e.prototype.assertUnique_=function(t,n){for(var r=0,i=this.array_.length;r<i;++r)if(this.array_[r]===t&&r!==n)throw new St(58)},e}(Qt),se=ae;function ce(o,e,t,n,r){Ct(o,e,t||0,n||o.length-1,r||le)}function Ct(o,e,t,n,r){for(;n>t;){if(n-t>600){var i=n-t+1,a=e-t+1,s=Math.log(i),c=.5*Math.exp(2*s/3),l=.5*Math.sqrt(s*c*(i-c)/i)*(a-i/2<0?-1:1),u=Math.max(t,Math.floor(e-a*c/i+l)),d=Math.min(n,Math.floor(e+(i-a)*c/i+l));Ct(o,e,u,d,r)}var f=o[e],m=t,_=n;for(B(o,t,e),r(o[n],f)>0&&B(o,t,n);m<_;){for(B(o,m,_),m++,_--;r(o[m],f)<0;)m++;for(;r(o[_],f)>0;)_--}r(o[t],f)===0?B(o,t,_):(_++,B(o,_,n)),_<=e&&(t=_+1),e<=_&&(n=_-1)}}function B(o,e,t){var n=o[e];o[e]=o[t],o[t]=n}function le(o,e){return o<e?-1:o>e?1:0}class ue{constructor(e=9){this._maxEntries=Math.max(4,e),this._minEntries=Math.max(2,Math.ceil(this._maxEntries*.4)),this.clear()}all(){return this._all(this.data,[])}search(e){let t=this.data;const n=[];if(!O(e,t))return n;const r=this.toBBox,i=[];for(;t;){for(let a=0;a<t.children.length;a++){const s=t.children[a],c=t.leaf?r(s):s;O(e,c)&&(t.leaf?n.push(s):H(e,c)?this._all(s,n):i.push(s))}t=i.pop()}return n}collides(e){let t=this.data;if(!O(e,t))return!1;const n=[];for(;t;){for(let r=0;r<t.children.length;r++){const i=t.children[r],a=t.leaf?this.toBBox(i):i;if(O(e,a)){if(t.leaf||H(e,a))return!0;n.push(i)}}t=n.pop()}return!1}load(e){if(!(e&&e.length))return this;if(e.length<this._minEntries){for(let n=0;n<e.length;n++)this.insert(e[n]);return this}let t=this._build(e.slice(),0,e.length-1,0);if(!this.data.children.length)this.data=t;else if(this.data.height===t.height)this._splitRoot(this.data,t);else{if(this.data.height<t.height){const n=this.data;this.data=t,t=n}this._insert(t,this.data.height-t.height-1,!0)}return this}insert(e){return e&&this._insert(e,this.data.height-1),this}clear(){return this.data=A([]),this}remove(e,t){if(!e)return this;let n=this.data;const r=this.toBBox(e),i=[],a=[];let s,c,l;for(;n||i.length;){if(n||(n=i.pop(),c=i[i.length-1],s=a.pop(),l=!0),n.leaf){const u=he(e,n.children,t);if(u!==-1)return n.children.splice(u,1),i.push(n),this._condense(i),this}!l&&!n.leaf&&H(n,r)?(i.push(n),a.push(s),s=0,c=n,n=n.children[0]):c?(s++,n=c.children[s],l=!1):n=null}return this}toBBox(e){return e}compareMinX(e,t){return e.minX-t.minX}compareMinY(e,t){return e.minY-t.minY}toJSON(){return this.data}fromJSON(e){return this.data=e,this}_all(e,t){const n=[];for(;e;)e.leaf?t.push(...e.children):n.push(...e.children),e=n.pop();return t}_build(e,t,n,r){const i=n-t+1;let a=this._maxEntries,s;if(i<=a)return s=A(e.slice(t,n+1)),R(s,this.toBBox),s;r||(r=Math.ceil(Math.log(i)/Math.log(a)),a=Math.ceil(i/Math.pow(a,r-1))),s=A([]),s.leaf=!1,s.height=r;const c=Math.ceil(i/a),l=c*Math.ceil(Math.sqrt(a));at(e,t,n,l,this.compareMinX);for(let u=t;u<=n;u+=l){const d=Math.min(u+l-1,n);at(e,u,d,c,this.compareMinY);for(let f=u;f<=d;f+=c){const m=Math.min(f+c-1,d);s.children.push(this._build(e,f,m,r-1))}}return R(s,this.toBBox),s}_chooseSubtree(e,t,n,r){for(;r.push(t),!(t.leaf||r.length-1===n);){let i=1/0,a=1/0,s;for(let c=0;c<t.children.length;c++){const l=t.children[c],u=K(l),d=pe(e,l)-u;d<a?(a=d,i=u<i?u:i,s=l):d===a&&u<i&&(i=u,s=l)}t=s||t.children[0]}return t}_insert(e,t,n){const r=n?e:this.toBBox(e),i=[],a=this._chooseSubtree(r,this.data,t,i);for(a.children.push(e),$(a,r);t>=0&&i[t].children.length>this._maxEntries;)this._split(i,t),t--;this._adjustParentBBoxes(r,i,t)}_split(e,t){const n=e[t],r=n.children.length,i=this._minEntries;this._chooseSplitAxis(n,i,r);const a=this._chooseSplitIndex(n,i,r),s=A(n.children.splice(a,n.children.length-a));s.height=n.height,s.leaf=n.leaf,R(n,this.toBBox),R(s,this.toBBox),t?e[t-1].children.push(s):this._splitRoot(n,s)}_splitRoot(e,t){this.data=A([e,t]),this.data.height=e.height+1,this.data.leaf=!1,R(this.data,this.toBBox)}_chooseSplitIndex(e,t,n){let r,i=1/0,a=1/0;for(let s=t;s<=n-t;s++){const c=X(e,0,s,this.toBBox),l=X(e,s,n,this.toBBox),u=ge(c,l),d=K(c)+K(l);u<i?(i=u,r=s,a=d<a?d:a):u===i&&d<a&&(a=d,r=s)}return r||n-t}_chooseSplitAxis(e,t,n){const r=e.leaf?this.compareMinX:de,i=e.leaf?this.compareMinY:fe,a=this._allDistMargin(e,t,n,r),s=this._allDistMargin(e,t,n,i);a<s&&e.children.sort(r)}_allDistMargin(e,t,n,r){e.children.sort(r);const i=this.toBBox,a=X(e,0,t,i),s=X(e,n-t,n,i);let c=P(a)+P(s);for(let l=t;l<n-t;l++){const u=e.children[l];$(a,e.leaf?i(u):u),c+=P(a)}for(let l=n-t-1;l>=t;l--){const u=e.children[l];$(s,e.leaf?i(u):u),c+=P(s)}return c}_adjustParentBBoxes(e,t,n){for(let r=n;r>=0;r--)$(t[r],e)}_condense(e){for(let t=e.length-1,n;t>=0;t--)e[t].children.length===0?t>0?(n=e[t-1].children,n.splice(n.indexOf(e[t]),1)):this.clear():R(e[t],this.toBBox)}}function he(o,e,t){if(!t)return e.indexOf(o);for(let n=0;n<e.length;n++)if(t(o,e[n]))return n;return-1}function R(o,e){X(o,0,o.children.length,e,o)}function X(o,e,t,n,r){r||(r=A(null)),r.minX=1/0,r.minY=1/0,r.maxX=-1/0,r.maxY=-1/0;for(let i=e;i<t;i++){const a=o.children[i];$(r,o.leaf?n(a):a)}return r}function $(o,e){return o.minX=Math.min(o.minX,e.minX),o.minY=Math.min(o.minY,e.minY),o.maxX=Math.max(o.maxX,e.maxX),o.maxY=Math.max(o.maxY,e.maxY),o}function de(o,e){return o.minX-e.minX}function fe(o,e){return o.minY-e.minY}function K(o){return(o.maxX-o.minX)*(o.maxY-o.minY)}function P(o){return o.maxX-o.minX+(o.maxY-o.minY)}function pe(o,e){return(Math.max(e.maxX,o.maxX)-Math.min(e.minX,o.minX))*(Math.max(e.maxY,o.maxY)-Math.min(e.minY,o.minY))}function ge(o,e){const t=Math.max(o.minX,e.minX),n=Math.max(o.minY,e.minY),r=Math.min(o.maxX,e.maxX),i=Math.min(o.maxY,e.maxY);return Math.max(0,r-t)*Math.max(0,i-n)}function H(o,e){return o.minX<=e.minX&&o.minY<=e.minY&&e.maxX<=o.maxX&&e.maxY<=o.maxY}function O(o,e){return e.minX<=o.maxX&&e.minY<=o.maxY&&e.maxX>=o.minX&&e.maxY>=o.minY}function A(o){return{children:o,height:1,leaf:!0,minX:1/0,minY:1/0,maxX:-1/0,maxY:-1/0}}function at(o,e,t,n,r){const i=[e,t];for(;i.length;){if(t=i.pop(),e=i.pop(),t-e<=n)continue;const a=e+Math.ceil((t-e)/n/2)*n;ce(o,a,e,t,r),i.push(e,a,a,t)}}var me=function(){function o(e){this.rbush_=new ue(e),this.items_={}}return o.prototype.insert=function(e,t){var n={minX:e[0],minY:e[1],maxX:e[2],maxY:e[3],value:t};this.rbush_.insert(n),this.items_[w(t)]=n},o.prototype.load=function(e,t){for(var n=new Array(t.length),r=0,i=t.length;r<i;r++){var a=e[r],s=t[r],c={minX:a[0],minY:a[1],maxX:a[2],maxY:a[3],value:s};n[r]=c,this.items_[w(s)]=c}this.rbush_.load(n)},o.prototype.remove=function(e){var t=w(e),n=this.items_[t];return delete this.items_[t],this.rbush_.remove(n)!==null},o.prototype.update=function(e,t){var n=this.items_[w(t)],r=[n.minX,n.minY,n.maxX,n.maxY];ht(r,e)||(this.remove(t),this.insert(e,t))},o.prototype.getAll=function(){var e=this.rbush_.all();return e.map(function(t){return t.value})},o.prototype.getInExtent=function(e){var t={minX:e[0],minY:e[1],maxX:e[2],maxY:e[3]},n=this.rbush_.search(t);return n.map(function(r){return r.value})},o.prototype.forEach=function(e){return this.forEach_(this.getAll(),e)},o.prototype.forEachInExtent=function(e,t){return this.forEach_(this.getInExtent(e),t)},o.prototype.forEach_=function(e,t){for(var n,r=0,i=e.length;r<i;r++)if(n=t(e[r]),n)return n;return n},o.prototype.isEmpty=function(){return W(this.items_)},o.prototype.clear=function(){this.rbush_.clear(),this.items_={}},o.prototype.getExtent=function(e){var t=this.rbush_.toJSON();return Mt(t.minX,t.minY,t.maxX,t.maxY,e)},o.prototype.concat=function(e){this.rbush_.load(e.rbush_.all());for(var t in e.items_)this.items_[t]=e.items_[t]},o}(),st=me,C={ADDFEATURE:"addfeature",CHANGEFEATURE:"changefeature",CLEAR:"clear",REMOVEFEATURE:"removefeature",FEATURESLOADSTART:"featuresloadstart",FEATURESLOADEND:"featuresloadend",FEATURESLOADERROR:"featuresloaderror"};function _e(o,e){return[[-1/0,-1/0,1/0,1/0]]}var ve=!1;function ye(o,e,t,n,r,i,a){var s=new XMLHttpRequest;s.open("GET",typeof o=="function"?o(t,n,r):o,!0),e.getType()=="arraybuffer"&&(s.responseType="arraybuffer"),s.withCredentials=ve,s.onload=function(c){if(!s.status||s.status>=200&&s.status<300){var l=e.getType(),u=void 0;l=="json"||l=="text"?u=s.responseText:l=="xml"?(u=s.responseXML,u||(u=new DOMParser().parseFromString(s.responseText,"application/xml"))):l=="arraybuffer"&&(u=s.response),u?i(e.readFeatures(u,{extent:t,featureProjection:r}),e.readProjection(u)):a()}else a()},s.onerror=a,s.send()}function ct(o,e){return function(t,n,r,i,a){var s=this;ye(o,e,t,n,r,function(c,l){s.addFeatures(c),i!==void 0&&i(c)},a||yt)}}var wt=globalThis&&globalThis.__extends||function(){var o=function(e,t){return o=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(n,r){n.__proto__=r}||function(n,r){for(var i in r)Object.prototype.hasOwnProperty.call(r,i)&&(n[i]=r[i])},o(e,t)};return function(e,t){if(typeof t!="function"&&t!==null)throw new TypeError("Class extends value "+String(t)+" is not a constructor or null");o(e,t);function n(){this.constructor=e}e.prototype=t===null?Object.create(t):(n.prototype=t.prototype,new n)}}(),L=function(o){wt(e,o);function e(t,n,r){var i=o.call(this,t)||this;return i.feature=n,i.features=r,i}return e}(vt),xe=function(o){wt(e,o);function e(t){var n=this,r=t||{};n=o.call(this,{attributions:r.attributions,interpolate:!0,projection:void 0,state:"ready",wrapX:r.wrapX!==void 0?r.wrapX:!0})||this,n.on,n.once,n.un,n.loader_=yt,n.format_=r.format,n.overlaps_=r.overlaps===void 0?!0:r.overlaps,n.url_=r.url,r.loader!==void 0?n.loader_=r.loader:n.url_!==void 0&&(z(n.format_,7),n.loader_=ct(n.url_,n.format_)),n.strategy_=r.strategy!==void 0?r.strategy:_e;var i=r.useSpatialIndex!==void 0?r.useSpatialIndex:!0;n.featuresRtree_=i?new st:null,n.loadedExtentsRtree_=new st,n.loadingExtentsCount_=0,n.nullGeometryFeatures_={},n.idIndex_={},n.uidIndex_={},n.featureChangeKeys_={},n.featuresCollection_=null;var a,s;return Array.isArray(r.features)?s=r.features:r.features&&(a=r.features,s=a.getArray()),!i&&a===void 0&&(a=new se(s)),s!==void 0&&n.addFeaturesInternal(s),a!==void 0&&n.bindFeaturesCollection_(a),n}return e.prototype.addFeature=function(t){this.addFeatureInternal(t),this.changed()},e.prototype.addFeatureInternal=function(t){var n=w(t);if(!this.addToIndex_(n,t)){this.featuresCollection_&&this.featuresCollection_.remove(t);return}this.setupChangeEvents_(n,t);var r=t.getGeometry();if(r){var i=r.getExtent();this.featuresRtree_&&this.featuresRtree_.insert(i,t)}else this.nullGeometryFeatures_[n]=t;this.dispatchEvent(new L(C.ADDFEATURE,t))},e.prototype.setupChangeEvents_=function(t,n){this.featureChangeKeys_[t]=[nt(n,Kt.CHANGE,this.handleFeatureChange_,this),nt(n,Ht.PROPERTYCHANGE,this.handleFeatureChange_,this)]},e.prototype.addToIndex_=function(t,n){var r=!0,i=n.getId();return i!==void 0&&(i.toString()in this.idIndex_?r=!1:this.idIndex_[i.toString()]=n),r&&(z(!(t in this.uidIndex_),30),this.uidIndex_[t]=n),r},e.prototype.addFeatures=function(t){this.addFeaturesInternal(t),this.changed()},e.prototype.addFeaturesInternal=function(t){for(var n=[],r=[],i=[],a=0,s=t.length;a<s;a++){var c=t[a],l=w(c);this.addToIndex_(l,c)&&r.push(c)}for(var a=0,u=r.length;a<u;a++){var c=r[a],l=w(c);this.setupChangeEvents_(l,c);var d=c.getGeometry();if(d){var f=d.getExtent();n.push(f),i.push(c)}else this.nullGeometryFeatures_[l]=c}if(this.featuresRtree_&&this.featuresRtree_.load(n,i),this.hasListener(C.ADDFEATURE))for(var a=0,m=r.length;a<m;a++)this.dispatchEvent(new L(C.ADDFEATURE,r[a]))},e.prototype.bindFeaturesCollection_=function(t){var n=!1;this.addEventListener(C.ADDFEATURE,function(r){n||(n=!0,t.push(r.feature),n=!1)}),this.addEventListener(C.REMOVEFEATURE,function(r){n||(n=!0,t.remove(r.feature),n=!1)}),t.addEventListener(S.ADD,function(r){n||(n=!0,this.addFeature(r.element),n=!1)}.bind(this)),t.addEventListener(S.REMOVE,function(r){n||(n=!0,this.removeFeature(r.element),n=!1)}.bind(this)),this.featuresCollection_=t},e.prototype.clear=function(t){if(t){for(var n in this.featureChangeKeys_){var r=this.featureChangeKeys_[n];r.forEach(ot)}this.featuresCollection_||(this.featureChangeKeys_={},this.idIndex_={},this.uidIndex_={})}else if(this.featuresRtree_){var i=function(c){this.removeFeatureInternal(c)}.bind(this);this.featuresRtree_.forEach(i);for(var a in this.nullGeometryFeatures_)this.removeFeatureInternal(this.nullGeometryFeatures_[a])}this.featuresCollection_&&this.featuresCollection_.clear(),this.featuresRtree_&&this.featuresRtree_.clear(),this.nullGeometryFeatures_={};var s=new L(C.CLEAR);this.dispatchEvent(s),this.changed()},e.prototype.forEachFeature=function(t){if(this.featuresRtree_)return this.featuresRtree_.forEach(t);this.featuresCollection_&&this.featuresCollection_.forEach(t)},e.prototype.forEachFeatureAtCoordinateDirect=function(t,n){var r=[t[0],t[1],t[0],t[1]];return this.forEachFeatureInExtent(r,function(i){var a=i.getGeometry();if(a.intersectsCoordinate(t))return n(i)})},e.prototype.forEachFeatureInExtent=function(t,n){if(this.featuresRtree_)return this.featuresRtree_.forEachInExtent(t,n);this.featuresCollection_&&this.featuresCollection_.forEach(n)},e.prototype.forEachFeatureIntersectingExtent=function(t,n){return this.forEachFeatureInExtent(t,function(r){var i=r.getGeometry();if(i.intersectsExtent(t)){var a=n(r);if(a)return a}})},e.prototype.getFeaturesCollection=function(){return this.featuresCollection_},e.prototype.getFeatures=function(){var t;return this.featuresCollection_?t=this.featuresCollection_.getArray().slice(0):this.featuresRtree_&&(t=this.featuresRtree_.getAll(),W(this.nullGeometryFeatures_)||jt(t,Wt(this.nullGeometryFeatures_))),t},e.prototype.getFeaturesAtCoordinate=function(t){var n=[];return this.forEachFeatureAtCoordinateDirect(t,function(r){n.push(r)}),n},e.prototype.getFeaturesInExtent=function(t,n){var r=this;if(this.featuresRtree_){var i=n&&n.canWrapX()&&this.getWrapX();if(!i)return this.featuresRtree_.getInExtent(t);var a=Bt(t,n);return[].concat.apply([],a.map(function(s){return r.featuresRtree_.getInExtent(s)}))}else return this.featuresCollection_?this.featuresCollection_.getArray().slice(0):[]},e.prototype.getClosestFeatureToCoordinate=function(t,n){var r=t[0],i=t[1],a=null,s=[NaN,NaN],c=1/0,l=[-1/0,-1/0,1/0,1/0],u=n||Jt;return this.featuresRtree_.forEachInExtent(l,function(d){if(u(d)){var f=d.getGeometry(),m=c;if(c=f.closestPointXY(r,i,s,c),c<m){a=d;var _=Math.sqrt(c);l[0]=r-_,l[1]=i-_,l[2]=r+_,l[3]=i+_}}}),a},e.prototype.getExtent=function(t){return this.featuresRtree_.getExtent(t)},e.prototype.getFeatureById=function(t){var n=this.idIndex_[t.toString()];return n!==void 0?n:null},e.prototype.getFeatureByUid=function(t){var n=this.uidIndex_[t];return n!==void 0?n:null},e.prototype.getFormat=function(){return this.format_},e.prototype.getOverlaps=function(){return this.overlaps_},e.prototype.getUrl=function(){return this.url_},e.prototype.handleFeatureChange_=function(t){var n=t.target,r=w(n),i=n.getGeometry();if(!i)r in this.nullGeometryFeatures_||(this.featuresRtree_&&this.featuresRtree_.remove(n),this.nullGeometryFeatures_[r]=n);else{var a=i.getExtent();r in this.nullGeometryFeatures_?(delete this.nullGeometryFeatures_[r],this.featuresRtree_&&this.featuresRtree_.insert(a,n)):this.featuresRtree_&&this.featuresRtree_.update(a,n)}var s=n.getId();if(s!==void 0){var c=s.toString();this.idIndex_[c]!==n&&(this.removeFromIdIndex_(n),this.idIndex_[c]=n)}else this.removeFromIdIndex_(n),this.uidIndex_[r]=n;this.changed(),this.dispatchEvent(new L(C.CHANGEFEATURE,n))},e.prototype.hasFeature=function(t){var n=t.getId();return n!==void 0?n in this.idIndex_:w(t)in this.uidIndex_},e.prototype.isEmpty=function(){return this.featuresRtree_?this.featuresRtree_.isEmpty()&&W(this.nullGeometryFeatures_):this.featuresCollection_?this.featuresCollection_.getLength()===0:!0},e.prototype.loadFeatures=function(t,n,r){for(var i=this.loadedExtentsRtree_,a=this.strategy_(t,n,r),s=function(d,f){var m=a[d],_=i.forEachInExtent(m,function(x){return Xt(x.extent,m)});_||(++c.loadingExtentsCount_,c.dispatchEvent(new L(C.FEATURESLOADSTART)),c.loader_.call(c,m,n,r,function(x){--this.loadingExtentsCount_,this.dispatchEvent(new L(C.FEATURESLOADEND,void 0,x))}.bind(c),function(){--this.loadingExtentsCount_,this.dispatchEvent(new L(C.FEATURESLOADERROR))}.bind(c)),i.insert(m,{extent:m.slice()}))},c=this,l=0,u=a.length;l<u;++l)s(l);this.loading=this.loader_.length<4?!1:this.loadingExtentsCount_>0},e.prototype.refresh=function(){this.clear(!0),this.loadedExtentsRtree_.clear(),o.prototype.refresh.call(this)},e.prototype.removeLoadedExtent=function(t){var n=this.loadedExtentsRtree_,r;n.forEachInExtent(t,function(i){if(ht(i.extent,t))return r=i,!0}),r&&n.remove(r)},e.prototype.removeFeature=function(t){if(!!t){var n=w(t);n in this.nullGeometryFeatures_?delete this.nullGeometryFeatures_[n]:this.featuresRtree_&&this.featuresRtree_.remove(t);var r=this.removeFeatureInternal(t);r&&this.changed()}},e.prototype.removeFeatureInternal=function(t){var n=w(t),r=this.featureChangeKeys_[n];if(!!r){r.forEach(ot),delete this.featureChangeKeys_[n];var i=t.getId();return i!==void 0&&delete this.idIndex_[i.toString()],delete this.uidIndex_[n],this.dispatchEvent(new L(C.REMOVEFEATURE,t)),t}},e.prototype.removeFromIdIndex_=function(t){var n=!1;for(var r in this.idIndex_)if(this.idIndex_[r]===t){delete this.idIndex_[r],n=!0;break}return n},e.prototype.setLoader=function(t){this.loader_=t},e.prototype.setUrl=function(t){z(this.format_,7),this.url_=t,this.setLoader(ct(t,this.format_))},e}(Zt),Ee=xe;const Ce={name:"PageFullScreen",methods:{tweak(){return{height:this.$q.screen.height-50+"px"}},myTweak(o){o||(o=0);const e=this.$q.platform.is.cordova?`calc(100vh - ${o}px)`:window.innerHeight-o+"px";return this.$store.state.windowSize=e,{minHeight:e}}}};function we(o,e,t,n,r,i){return y(),k(ne,{"style-fn":i.tweak,class:"scroll-y fhpadd"},{default:g(()=>[$t(o.$slots,"default")]),_:3},8,["style-fn"])}var ke=I(Ce,[["render",we]]);const N=bt("location",{state:()=>({foregroundLocationActivated:!1,isCordova:Dt.is.cordova,projection:null,rotation:45,watchId:null,locationTracking:!1,navigationActive:!1,myLocation:{},myTrack:[],navigateTo:[]}),getters:{getProjection(o){return o.projection},getRotation(o){return o.rotation},getLocationTracking(o){return o.locationTracking},getNavigationActive(o){return o.navigationActive},getMyLocation(o){return o.myLocation},getMyLocationAccuracy(o){return o.myLocation.accuracy},getMyLocationCoordinates(o){return o.myLocation.coordinates},getMyTrack(o){return o.myTrack},getNavigateTo(o){return o.navigateTo},foregroundNotNeeded(o){return!o.locationTracking&&!o.navigationActive}},actions:{initialize(o){this.projection=o,this.watchId&&navigator.compass.clearWatch(this.watchId),this.isCordova&&(window.BackgroundGeolocation.configure({locationProvider:window.BackgroundGeolocation.DISTANCE_FILTER_PROVIDER,desiredAccuracy:window.BackgroundGeolocation.MEDIUM_ACCURACY,stationaryRadius:10,distanceFilter:10,stopOnTerminate:!1,debug:!0,startForeground:!0,notificationsEnabled:!0,httpHeaders:{"X-Auth":"\u010De ga rabi\u0161"},interval:5e3,fastestInterval:2e3,activitiesInterval:1e3}),window.BackgroundGeolocation.on("authorization",e=>{e!==window.BackgroundGeolocation.AUTHORIZED&&setTimeout(()=>{navigator.notification.confirm("Please enable location access",t=>{t===1&&window.BackgroundGeolocation.showAppSettings()},"Kataster jam")},1e3)}),window.BackgroundGeolocation.on("location",e=>{this.newLocationUpdate(e)}),this.watchId=navigator.compass.watchHeading(e=>{this.rotation=e.magneticHeading},e=>{alert("Compass error: "+e.code)},{frequency:1e3})),navigator.geolocation.watchPosition(e=>{this.foregroundLocationActivated&&e.coords.accuracy>10&&this.isCordova||this.newLocationUpdate(e.coords)},(e,t)=>{console.error("Error when trying to fetch location",e,t)},{enableHighAccuracy:!0})},newLocationUpdate(o){const e=J([o.longitude,o.latitude]);this.myLocation={coordinates:e,accuracy:o.accuracy,latitude:o.latitude,longitude:o.longitude},this.getLocationTracking&&this.updateMyTrack(e),this.getNavigationActive&&this.updateNavigation(e)},toggleLocationTracking(){this.locationTracking=!this.locationTracking,this.locationTracking&&this.isCordova&&window.BackgroundGeolocation.configure({notificationTitle:"Location tracking",notificationText:"Tracking your location is in progress"}),this.locationTracking?this.startForeground():this.stopForeground()},stopNavigation(){this.navigationActive=!1,this.stopForeground(),this.updateNavigation([])},startNavigation(o){this.goTo=o,this.navigateTo.length===2&&(this.navigateTo[0]=this.goTo.getGeometry().getCoordinates()),this.isCordova&&window.BackgroundGeolocation.configure({notificationTitle:"Navigation",notificationText:"Navigation to a location is in progress"}),this.navigationActive=!0,this.startForeground()},startForeground(){this.foregroundLocationActivated||(this.isCordova&&window.BackgroundGeolocation.start(),this.foregroundLocationActivated=!0)},stopForeground(){this.foregroundLocationActivated&&this.foregroundNotNeeded&&(this.isCordova&&window.BackgroundGeolocation.stop(),this.foregroundLocationActivated=!1)},updateMyTrack(o){this.myTrack.push(o)},updateNavigation(o){this.navigateTo=o.length===0?[]:[this.goTo.getGeometry().getCoordinates(),o]}}}),Fe={setup(){const o=N(),e=v(5),t=v("red");return{store:o,strokeWidth:e,strokeColor:t}},computed:{myTrack(){return this.store.getMyTrack}}};function Le(o,e,t,n,r,i){const a=p("ol-geom-line-string"),s=p("ol-style-stroke"),c=p("ol-style"),l=p("ol-feature"),u=p("ol-source-vector"),d=p("ol-vector-layer");return y(),k(d,null,{default:g(()=>[h(u,null,{default:g(()=>[h(l,null,{default:g(()=>[h(a,{coordinates:i.myTrack},null,8,["coordinates"]),h(c,null,{default:g(()=>[h(s,{color:n.strokeColor,width:n.strokeWidth},null,8,["color","width"])]),_:1})]),_:1})]),_:1})]),_:1})}var Te=I(Fe,[["render",Le]]);const Ie=j("div",{class:"q-space"});var Z=ut({name:"QSpace",setup(){return()=>Ie}});const Re={setup(){const o=v(!0),e=v("top"),t=N(),n=v(3),r=v("green");return{dialog:o,position:e,store:t,strokeWidth:n,strokeColor:r}},data(){return{currentCenter:this.center,currentZoom:this.zoom,currentResolution:this.resolution,fixedCenter:!1,name:this.$route.query.name}},computed:{bearing(){return(([t,n],[r,i])=>{const a=r-t,s=i-n;return(Math.atan2(a,s)*180/Math.PI+360)%360})(this.store.getNavigateTo[1],this.store.getNavigateTo[0])-this.store.getRotation},navigateTo(){return this.store.getNavigateTo},navigationInProgress(){return this.store.getNavigateTo.length>0},distance(){const o=new rt(this.store.getNavigateTo),e=et(o);return e>1e3?(e/1e3).toFixed(2):parseInt(e)},distanceUnit(){const o=new rt(this.store.getNavigateTo);return et(o)>1e3?"km":"m"}},methods:{stopNavigation(){this.store.stopNavigation()}}},Ae={class:"text-weight-bold"},Se={class:"text-grey"};function Me(o,e,t,n,r,i){const a=p("ol-geom-line-string"),s=p("ol-style-stroke"),c=p("ol-style"),l=p("ol-feature"),u=p("ol-source-vector"),d=p("ol-vector-layer");return y(),F(D,null,[h(gt,{modelValue:i.navigationInProgress,"onUpdate:modelValue":e[0]||(e[0]=f=>i.navigationInProgress=f),position:n.position,seamless:"",class:"q-dialog__top50"},{default:g(()=>[h(dt,{style:{width:"350px"}},{default:g(()=>[h(G,{class:"row items-center no-wrap"},{default:g(()=>[b("div",null,[b("div",Ae,E(o.$t("goTo"))+": "+E(r.name),1),b("div",Se,E(o.$t("distance"))+": "+E(i.distance)+" "+E(i.distanceUnit),1)]),h(Z),h(ft,{name:"navigation",style:pt({rotate:i.bearing+"deg"}),size:"lg"},null,8,["style"]),h(M,{flat:"",round:"",icon:"stop",onClick:i.stopNavigation},null,8,["onClick"])]),_:1})]),_:1})]),_:1},8,["modelValue","position"]),h(d,null,{default:g(()=>[h(u,null,{default:g(()=>[h(l,null,{default:g(()=>[h(a,{coordinates:i.navigateTo},null,8,["coordinates"]),h(c,null,{default:g(()=>[h(s,{color:n.strokeColor,width:n.strokeWidth},null,8,["color","width"])]),_:1})]),_:1})]),_:1})]),_:1})],64)}var Be=I(Re,[["render",Me]]);const Xe={props:["view"],emits:["centerChanged"],components:{TrackingLayer:Te,NavigationLayer:Be},setup(){const o=N(),e=v([]),t=v([]),{myLocation:n}=mt(o);return{store:o,myLocationCoordinates:e,myLocationFeatures:t,myLocation:n}},computed:{rotation(){return this.store.getRotation}},watch:{myLocation(o,e){const t=te([o.longitude,o.latitude],this.store.getMyLocationAccuracy);this.myLocationFeatures=[new U(t.transform("EPSG:4326",this.store.getProjection)),new U(new tt(this.store.getMyLocationCoordinates))],this.myLocationCoordinates=o.coordinates,this.$emit("centerChanged",this.store.getMyLocationCoordinates)}}};function $e(o,e,t,n,r,i){const a=p("ol-source-vector"),s=p("ol-vector-layer"),c=p("ol-overlay"),l=p("TrackingLayer"),u=p("NavigationLayer");return y(),F(D,null,[h(s,null,{default:g(()=>[h(a,{features:n.myLocationFeatures},null,8,["features"])]),_:1}),n.myLocationFeatures.length>0?(y(),k(c,{key:0,position:n.myLocationCoordinates,positioning:"center-center"},{default:g(d=>[h(ft,{name:"navigation",class:Nt(d),style:pt({rotate:i.rotation+"deg"}),size:"lg"},null,8,["class","style"])]),_:1},8,["position"])):q("",!0),h(l),h(u)],64)}var be=I(Xe,[["render",$e]]);const De={setup(){const o=Yt(),e=v([]),t=v(new Ee);return o.loadForMap().then(()=>{o.customLocationsForMap.map(n=>e.value.push(n))}),{vectorSource:t,store:o,customLocations:e}}};function Ne(o,e,t,n,r,i){const a=p("ol-geom-point"),s=p("ol-style-icon"),c=p("ol-style"),l=p("ol-feature"),u=p("ol-source-vector"),d=p("ol-vector-layer");return y(),k(d,null,{default:g(()=>[h(u,{ref:"vectorSource"},{default:g(()=>[(y(!0),F(D,null,_t(n.customLocations,f=>(y(),k(l,{key:f.id,properties:{id:f.id,name:f.name,lat:f.lat.toFixed(5),lng:f.lng.toFixed(5),type:"poi"}},{default:g(()=>[h(a,{coordinates:f.latLng},null,8,["coordinates"]),h(c,null,{default:g(()=>[h(s,{src:f.icon,scale:1},null,8,["src"])]),_:2},1024)]),_:2},1032,["properties"]))),128))]),_:1},512)]),_:1})}var Ye=I(De,[["render",Ne]]);function lt(o){if(o===!1)return 0;if(o===!0||o===void 0)return 1;const e=parseInt(o,10);return isNaN(e)?0:e}var Pe=Pt({name:"close-popup",beforeMount(o,{value:e}){const t={depth:lt(e),handler(n){t.depth!==0&&setTimeout(()=>{const r=Ot(o);r!==void 0&&Gt(r,n,t.depth)})},handlerKey(n){qt(n,13)===!0&&t.handler(n)}};o.__qclosepopup=t,o.addEventListener("click",t.handler),o.addEventListener("keyup",t.handlerKey)},updated(o,{value:e,oldValue:t}){e!==t&&(o.__qclosepopup.depth=lt(e))},beforeUnmount(o){const e=o.__qclosepopup;o.removeEventListener("click",e.handler),o.removeEventListener("keyup",e.handlerKey),delete o.__qclosepopup}});const Oe={setup(){const o=oe(),e=xt(),t=N();e.hideDrawer();const n=v(!1),{showBottomDrawer:r}=mt(e);return{dialog:n,confirmDialog:o.dialog,mapStore:e,locationStore:t,showBottomDrawer:r}},computed:{clickedFeature(){return this.mapStore.getClickedFeature},drawerLoading(){return this.mapStore.getDrawerLoading}},methods:{hideDrawer(){this.mapStore.hideDrawer()},goTo(){const o=`[${this.clickedFeature.id}] ${this.clickedFeature.name}`;this.confirmDialog({title:`${this.$t("confirm")}`,message:`${this.$t(this.clickedFeature.type==="cave"?"navigateToCave":"navigateToCustomLocation")}: ${o}`,cancel:!0,persistent:!0}).onOk(()=>{const e=J([this.clickedFeature.lng,this.clickedFeature.lat]),t=new U(new tt(e));this.locationStore.startNavigation(t)})},info(o){this.$router.push({name:this.clickedFeature.type==="cave"?"caves-details":"custom-locations-details",params:{id:o}})}},watch:{showBottomDrawer(o,e){this.dialog=o}}},Ge={class:"q-pa-md q-gutter-sm"},qe={key:0,class:"text-weight-bold"},Ue={key:1,class:"text-weight-bold"},Ve={key:0,class:"text-grey"},ze={class:"text-grey"};function Qe(o,e,t,n,r,i){return y(),F("div",Ge,[h(gt,{modelValue:n.dialog,"onUpdate:modelValue":e[2]||(e[2]=a=>n.dialog=a),position:"bottom",onHide:i.hideDrawer,seamless:""},{default:g(()=>[h(dt,{style:{width:"350px"}},{default:g(()=>[i.drawerLoading?(y(),k(G,{key:0,class:"row justify-center items-center"},{default:g(()=>[h(Ut,{color:"primary",size:"3em",thickness:2})]),_:1})):(y(),F(D,{key:1},[h(G,{class:"row items-center q-pb-none"},{default:g(()=>[i.clickedFeature.type!=="click"?(y(),F("div",qe,"["+E(i.clickedFeature.id)+"] "+E(i.clickedFeature.name),1)):(y(),F("div",Ue,E(o.$t("clickInfo"))+":",1)),h(Z),Vt(h(M,{icon:"close",flat:"",round:"",dense:""},null,512),[[Pe]])]),_:1}),h(G,{class:"row items-center no-wrap"},{default:g(()=>[b("div",null,[i.clickedFeature.type==="cave"?(y(),F("div",Ve,E(o.$t("length"))+": "+E(i.clickedFeature.length)+" m, "+E(o.$t("depth"))+": "+E(i.clickedFeature.depth)+" m",1)):q("",!0),b("div",ze,E(o.$t("lat"))+": "+E(i.clickedFeature.lat)+", "+E(o.$t("lng"))+": "+E(i.clickedFeature.lng),1)]),h(Z),i.clickedFeature.type!=="click"?(y(),k(M,{key:0,flat:"",round:"",icon:"info",onClick:e[0]||(e[0]=a=>i.info(i.clickedFeature.id))})):q("",!0),h(M,{flat:"",round:"",icon:"assist_walker",onClick:e[1]||(e[1]=a=>i.goTo())})]),_:1})],64))]),_:1})]),_:1},8,["modelValue","onHide"])])}var Ke=I(Oe,[["render",Qe]]);const He=zt({name:"IndexPage",components:{PageFullScreen:ke,CartoLayers:ee,LocationLayers:be,CustomLocationLayers:Ye,DetailsDrawer:Ke},setup(){const o=N(),e=xt(),t=v([1637531,5766419]),n=v("EPSG:3857"),r=v(8),i=v(!1),a=v([]),s=v(null),c=v(""),l=v("");return e.saveMapRef(l),{store:o,center:t,projection:n,zoom:r,view:c,mapRef:l,markLocations:a,goTo:s,customLocations:i,mapStore:e}},data(){if(this.$route.query.lat&&this.$route.query.lng){const o=J([this.$route.query.lng,this.$route.query.lat]),e=new U(new tt(o));this.markLocations=[e],this.center=o,this.zoom=15,this.goTo=this.$route.query.navigate?e:null}return this.customLocations=this.$route.query.customLocation,{currentCenter:this.center,currentZoom:this.zoom,currentResolution:this.resolution,fixedCenter:!1}},computed:{trackLocationIcon(){return this.store.getLocationTracking},navigationActive(){return this.store.getNavigationActive},isCenterFixed(){return this.fixedCenter}},methods:{async onMapClick(o){if(o.coordinate){const e=this.mapRef.map.getFeaturesAtPixel(o.pixel);await this.mapStore.mapClick(o.coordinate,e)}},zoomChanged(o){this.currentZoom=o},trackingClicked(o){this.store.toggleLocationTracking()},myLocationClicked(o){this.center=this.store.getMyLocationCoordinates,this.fixedCenter=!0,this.zoom=this.zoom<15?15:this.currentZoom},resolutionChanged(o){this.currentResolution=o},centerChanged(o){this.view!==""&&(this.currentCenter=o,this.view.getInteracting()?this.fixedCenter=!1:this.fixedCenter&&(this.center=o))},onScreenOrientationChange(){this.mapRef.updateSize()}},watch:{view(o,e){this.store.initialize(o.getProjection()),this.goTo&&this.store.startNavigation(this.goTo)}},mounted(){this.mapRef.map.on("click",async o=>{await this.onMapClick(o)})}});function je(o,e,t,n,r,i){const a=p("ol-view"),s=p("CartoLayers"),c=p("LocationLayers"),l=p("CustomLocationLayers"),u=p("ol-source-vector"),d=p("ol-vector-layer"),f=p("ol-map"),m=p("DetailsDrawer"),_=p("PageFullScreen");return y(),k(_,{style:{background:"#eee"}},{default:g(()=>[h(f,{loadTilesWhileAnimating:"",loadTilesWhileInteracting:"",style:{height:"100%"},moveTolerance:5,ref:"mapRef"},{default:g(()=>[h(a,{ref:"view",enableRotation:!1,center:o.center,zoom:o.zoom,projection:o.projection,onZoomChanged:o.zoomChanged,onCenterChanged:o.centerChanged,onResolutionChanged:o.resolutionChanged},null,8,["center","zoom","projection","onZoomChanged","onCenterChanged","onResolutionChanged"]),h(s),h(c,{view:o.view,onCenterChanged:o.centerChanged},null,8,["view","onCenterChanged"]),o.customLocations?(y(),k(l,{key:0})):q("",!0),h(d,null,{default:g(()=>[h(u,{features:o.markLocations},null,8,["features"])]),_:1}),h(kt,{onResize:o.onScreenOrientationChange},null,8,["onResize"])]),_:1},512),h(Q,{position:"top-right",offset:[18,18]},{default:g(()=>[h(Ft,{size:"100px","external-label":"",color:"purple",icon:"layers",direction:"left"},{default:g(()=>[(y(!0),F(D,null,_t(o.mapStore.getLayers,x=>(y(),k(Lt,{key:x.name,padding:"3px","label-class":"bg-grey-3 text-grey-8","external-label":"","label-position":"bottom",color:x.active?"red":"primary",onClick:We=>x.active=!x.active,icon:`img:${x.preview}`,label:x.label},null,8,["color","onClick","icon","label"]))),128))]),_:1})]),_:1}),h(Q,{position:"bottom-left",offset:[18,18]},{default:g(()=>[h(M,{fab:"",icon:o.isCenterFixed?"my_location":"location_searching",color:"accent",onClick:o.myLocationClicked},null,8,["icon","onClick"])]),_:1}),h(Q,{position:"bottom-right",offset:[18,18]},{default:g(()=>[h(M,{fab:"",icon:o.trackLocationIcon?"stop_circle":"play_arrow",color:"accent",onClick:o.trackingClicked},null,8,["icon","onClick"])]),_:1}),h(m)]),_:1})}var rn=I(He,[["render",je]]);export{rn as default};