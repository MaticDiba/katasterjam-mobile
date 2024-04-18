import{a as d,Q as r,b as l}from"./QItem.8f060d88.js";import{d2 as h,cJ as k,ee as $,cM as i,d8 as f,d9 as a,d as t,da as n,dc as s,cN as u,e9 as g,F as Q,ek as R,dR as _,el as y,em as v}from"./index.513fe5bd.js";import{Q as w}from"./format.d2497167.js";import{Q as C}from"./QPullToRefresh.819801df.js";import{u as D}from"./use-quasar.47a30d61.js";const O=k({name:"OfflineDataList",components:{},setup(){const{dialog:e}=D(),c=$();return c.searchRecords().then(()=>{console.log("offline records loaded")}),{confirmDialog:e,store:c}},computed:{offlineRecords(){return this.store.getOfflineRecords}},methods:{async refresh(e){await this.store.searchRecords(),e()},click(e){this.$router.push({name:"offline-data-page",params:{id:e}})},deleteRecord(e){this.confirmDialog({title:`${this.$t("confirm")}`,message:`${this.$t("confirmDeleteOfflineRecords")}`,cancel:!0,persistent:!0}).onOk(async()=>{await this.store.deleteAll(e.id),await this.store.searchRecords()})}}});function I(e,c,L,S,b,B){return e.offlineRecords.length===0?(i(),f(d,{key:0},{default:a(()=>[t(l,{class:"text-center"},{default:a(()=>[t(r,{class:"text-h6",style:{"padding-top":"50px"}},{default:a(()=>[n(s(e.$t("noRecords")),1)]),_:1})]),_:1})]),_:1})):(i(),f(C,{key:1,onRefresh:e.refresh},{default:a(()=>[t(w,{ref:"scrollTargetRef",class:"scroll"},{default:a(()=>[(i(!0),u(Q,null,g(e.offlineRecords,(o,m)=>(i(),u("div",{key:m},[t(d,{clickable:"",onClick:p=>e.click(o.id)},{default:a(()=>[t(l,{avatar:"",top:""},{default:a(()=>[t(R,{icon:"info",color:"primary","text-color":"white"})]),_:1}),t(l,null,{default:a(()=>[t(r,{lines:"1"},{default:a(()=>[n(s(o.id)+" - "+s(o.name),1)]),_:2},1024),t(r,{caption:""},{default:a(()=>[n(s(e.$t("size"))+": "+s((parseInt(o.totalSize)/1e6).toFixed(2))+" MB",1)]),_:2},1024),t(r,{"vfeature-if":"offlineRecord.date",caption:""},{default:a(()=>[n(s(e.$t("date"))+": "+s(o.date),1)]),_:2},1024)]),_:2},1024),t(l,{side:""},{default:a(()=>[t(_,{name:"delete",color:"black",size:"lg",onClick:y(p=>e.deleteRecord(o),["stop"])},null,8,["onClick"])]),_:2},1024)]),_:2},1032,["onClick"]),t(v)]))),128))]),_:1},512)]),_:1},8,["onRefresh"]))}var x=h(O,[["render",I]]);export{x as default};
