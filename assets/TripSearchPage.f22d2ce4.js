import{aD as S,bx as b,_ as N,r as P,j as n,k as h,d as a,I as t,N as w,P as x,F as y,H as m,ah as l,aK as k,bC as C,by as _,J as u,L as c,bA as q}from"./index.315eb3dd.js";import{Q as F,c as j,d as p,a as d}from"./format.62b2ae12.js";import{Q as A,a as v}from"./QPullToRefresh.102d278b.js";import{u as D}from"./use-quasar.f252f1be.js";import{f as I}from"./date.3d23ecb2.js";const J=S("excursions",{state:()=>({excursions:[],searchParameters:{name:"",pageNumber:1,sort:null,sortDirection:null,my:!1},totalPages:0,searching:!1,searchAbort:new AbortController}),getters:{getExcursions(e){return e.excursions},getTotalPages(e){return e.totalPages},getQuery(e){return e.searchParameters.name},getPageNumber(e){return e.searchParameters.pageNumber},getCurrentSort(e){return e.searchParameters.sort},getSearchingStatus(e){return e.searching}},actions:{addQueryParameter(e){this.searchParameters.name=e,this.searchParameters.pageNumber=1},onlyMyExcursions(e){this.searchParameters.my=e,this.searchParameters.pageNumber=1},incrementPageNumber(){this.searchParameters.pageNumber++},async searchForExcursions(){this.searching&&this.searchAbort.abort(),this.searching=!0,this.searchAbort=new AbortController;try{const e=await b.get("/api/excursions",{params:this.searchParameters,signal:this.searchAbort.signal});this.totalPages=JSON.parse(e.headers.pagination).totalPages,this.searchParameters.pageNumber>1?e.data.map(r=>this.excursions.push(r)):this.excursions=e.data}catch(e){console.error(e)}finally{this.searching=!1}},async joinExcursion(e){try{await b.post(`/api/excursions/${e.id}/join`);const r=this.excursions.find(g=>g.id===e.id);r.requestedJoin=!0}catch(r){console.error(r)}}}}),M={name:"ExcursionSearchPage",setup(){const{dialog:e}=D(),r=J(),g=P(r.getQuery),i=P(!1);return r.getExcursions.length===0&&r.searchForExcursions().then(()=>{console.log("excursions loaded")}),{confirmDialog:e,store:r,mine:i,query:g,formatDate:I}},computed:{excursions(){return this.store.getExcursions},pageNumber(){return this.store.getPageNumber},totalPages(){return this.store.getTotalPages},currentSort(){return this.store.getCurrentSort},searching(){return this.store.getSearchingStatus}},watch:{query(e,r){this.executeSearch()}},methods:{canJoinExcursion(e){return!e.meParticipant&&!e.requestedJoin},excursionClick(e){this.$router.push({name:"trips-details",params:{id:e}})},joinExcursion({reset:e},r){e(),this.confirmDialog({title:`${this.$t("confirm")}`,message:`${this.$t("joinExcursionText")}${r.name}`,cancel:!0,persistent:!0}).onOk(async()=>{await this.store.joinExcursion(r)})},async onlyMine(){this.store.onlyMyExcursions(this.mine=!this.mine),await this.store.searchForExcursions()},async executeSearch(){this.store.addQueryParameter(this.query),await this.store.searchForExcursions()},async loadMore(){this.store.incrementPageNumber(),await this.store.searchForExcursions()},async refresh(e){await this.store.searchForExcursions(),e()}}};function T(e,r,g,i,L,o){return n(),h(y,null,[a(w,{loading:o.searching,modelValue:i.query,"onUpdate:modelValue":r[1]||(r[1]=s=>i.query=s),debounce:"500",filled:"",placeholder:e.$t("search"),hint:e.$t("searchForExcursion")},{append:t(()=>[i.query!==""?(n(),m(l,{key:0,name:"close",onClick:r[0]||(r[0]=s=>i.query=""),class:"cursor-pointer"})):(n(),m(l,{key:1,name:"search"}))]),after:t(()=>[a(x,{round:"",dense:"",flat:"",icon:"check",onClick:o.onlyMine,color:i.mine?"light-green":""},null,8,["onClick","color"])]),_:1},8,["loading","modelValue","placeholder","hint"]),a(A,{onRefresh:o.refresh},{default:t(()=>[a(F,{ref:"scrollTargetRef",class:"scroll"},{default:t(()=>[(n(!0),h(y,null,k(o.excursions,(s,E)=>(n(),h("div",{key:E},[a(v,{onLeft:f=>o.joinExcursion(f,s)},C({default:t(()=>[a(j,{clickable:"",onClick:f=>o.excursionClick(s.id)},{default:t(()=>[a(p,{avatar:"",top:""},{default:t(()=>[a(_,{icon:"info",color:"primary","text-color":"white"}),s.meParticipant?(n(),m(l,{key:0,name:"check",color:"green",size:"lg"})):s.requestedJoin?(n(),h(y,{key:1},[a(l,{name:"check",color:"grey",size:"smc"}),a(d,{caption:""},{default:t(()=>[u(c(e.$t("requested")),1)]),_:1})],64)):(n(),m(l,{key:2,name:"keyboard_double_arrow_right",size:"lg",color:"primary"}))]),_:2},1024),a(p,null,{default:t(()=>[a(d,{lines:"1"},{default:t(()=>[u(c(s.name),1)]),_:2},1024),a(d,{caption:""},{default:t(()=>[u(c(e.$t("date"))+": "+c(i.formatDate(s.dateOfExcursion)),1)]),_:2},1024),a(d,{caption:""},{default:t(()=>[u(c(e.$t("excursionParticipants"))+": "+c(s.participants),1)]),_:2},1024)]),_:2},1024),a(p,{side:""},{default:t(()=>[(n(!0),h(y,null,k(s.organizations,(f,Q)=>(n(),m(d,{caption:"",key:Q},{default:t(()=>[u(c(f.name),1)]),_:2},1024))),128))]),_:2},1024)]),_:2},1032,["onClick"])]),_:2},[o.canJoinExcursion(s)?{name:"left",fn:t(()=>[a(l,{name:"check"}),u(" "+c(e.$t("joinExcursion")),1)]),key:"0"}:void 0]),1032,["onLeft"]),a(q)]))),128))]),_:1},512)]),_:1},8,["onRefresh"]),a(x,{unelevated:"",color:"light-blue-7",size:"lg",class:"full-width",label:e.$t("loadMore"),onClick:o.loadMore,disabled:o.totalPages<=o.pageNumber},null,8,["label","onClick","disabled"])],64)}var O=N(M,[["render",T]]);export{O as default};
