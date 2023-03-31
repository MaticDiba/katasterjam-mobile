import{Q as g,a as f,b as y}from"./QMarkupTable.42f57d14.js";import{_ as k,r as C,aB as x,j as a,H as m,I as i,Q as F,d as r,K as t,L as o,m as h,M as u,O as Q,ah as D,aF as b,k as c,aC as p,F as v,J as w}from"./index.c223e8cd.js";import{u as E}from"./use-quasar.4127f101.js";import{f as j}from"./date.3d23ecb2.js";const I={name:"ExcursionDetailsPage",setup(){const{dialog:e}=E(),_=C(null);return{confirmDialog:e,formatDate:j,excursion:_}},computed:{favouriteIcon(){return this.excursion.isFavourite?"favorite":"favorite_border"},canJoinExcursion(){return!this.excursion.meParticipant&&!this.excursion.requestedJoin}},methods:{showOnMap(){console.log("todo")},async toggleFavourite(){if(this.excursion.isFavourite)try{await x.delete("/api/favorites/",{data:{excursionId:this.excursion.id}}),this.excursion.isFavourite=!1}catch(e){console.error(e)}else try{await x.post("/api/favorites",{excursionId:this.excursion.id}),this.excursion.isFavourite=!0}catch(e){console.error(e)}},async joinExcursion(){this.confirmDialog({title:`${this.$t("confirm")}`,message:`${this.$t("joinExcursionText")}${this.excursion.name}`,cancel:!0,persistent:!0}).onOk(async()=>{try{await x.post(`/api/excursions/${this.excursion.id}/join`),this.excursion.requestedJoin=!0}catch(e){console.error(e)}})}},created(){this.excursion=this.$route.meta.excursion}},M={class:"text-overline text-orange-9"},O={class:"row no-wrap items-center"},$={class:"col text-h6 ellipsis"},N={class:"text-grey text-caption q-pt-md items-center"},P={class:"text-left table-row-fit"},T={class:"text-left table-row-fit"},B={key:0},J={class:"text-left table-row-fit"},S={class:"text-left table-row-fit"},q={key:0},z={class:"text-left table-row-fit"},L={class:"text-left table-row-fit"},V={class:"text-left table-row-fit"},H={class:"text-left table-row-fit"},A={class:"text-left table-row-fit"},K={class:"text-left table-row-fit"},G={class:"text-left table-row-fit"},R={class:"text-left table-row-fit"},U={class:"text-left table-row-fit"},W={class:"text-left table-row-fit"},X=["innerHTML"];function Y(e,_,Z,s,tt,n){return a(),m(F,{class:"cave-top"},{default:i(()=>[r(u,null,{default:i(()=>[t("div",M,o(e.$t("excursionDetails")),1),t("div",O,[t("div",$,o(s.excursion.name),1)]),r(g,{class:"absolute",style:{top:"10px",right:"12px"},"vertical-actions-align":"right",color:"primary",glossy:"",icon:"keyboard_arrow_down",direction:"down"},{default:i(()=>[r(f,{"label-position":"left",color:"green",icon:"map",label:e.$t("showDataOnMap"),onClick:n.showOnMap},null,8,["label","onClick"]),r(f,{"label-position":"left",color:"red",icon:n.favouriteIcon,label:e.$t("favourite"),onClick:n.toggleFavourite},null,8,["icon","label","onClick"]),n.canJoinExcursion?(a(),m(f,{key:0,"label-position":"left",color:"orange",icon:"check",label:e.$t("joinExcursion"),onClick:n.joinExcursion},null,8,["label","onClick"])):h("",!0)]),_:1})]),_:1}),r(u,{horizontal:""},{default:i(()=>[r(u,null,{default:i(()=>[t("div",N,o(e.$t("excursionParticipants"))+": "+o(s.excursion.participants),1)]),_:1}),r(Q,{vertical:"",class:"justify-around"},{default:i(()=>[r(D,{name:n.favouriteIcon,color:s.excursion.isFavourite?"red":"default",size:"sm"},null,8,["name","color"])]),_:1})]),_:1}),r(b),r(y,null,{default:i(()=>[t("tbody",null,[t("tr",null,[t("td",P,o(e.$t("caves")),1),t("td",T,[(a(!0),c(v,null,p(s.excursion.caves,(l,d)=>(a(),c("span",{key:l.caveNumber},[w(o(l.caveNumber)+" - "+o(l.name),1),d+1<s.excursion.caves.length?(a(),c("span",B,", ")):h("",!0)]))),128))])]),t("tr",null,[t("td",J,o(e.$t("organizations")),1),t("td",S,[(a(!0),c(v,null,p(s.excursion.organizations,(l,d)=>(a(),c("span",{key:l.id},[w(o(l.name),1),d+1<s.excursion.organizations.length?(a(),c("span",q,", ")):h("",!0)]))),128))])]),t("tr",null,[t("td",z,o(e.$t("dateOfExcursion")),1),t("td",L,o(s.formatDate(s.excursion.dateOfExcursion)),1)]),t("tr",null,[t("td",V,o(e.$t("excursionDuration")),1),t("td",H,o(s.excursion.duration)+"h",1)]),t("tr",null,[t("td",A,o(e.$t("excursionPurpose")),1),t("td",K,o(e.$t(`excursionPurposes.${s.excursion.type}`)),1)]),t("tr",null,[t("td",G,o(e.$t("excursionStatus")),1),t("td",R,o(e.$t(`excursionStatuses.${s.excursion.status}`)),1)]),t("tr",null,[t("td",U,o(e.$t("author")),1),t("td",W,o(s.excursion.author),1)])])]),_:1}),r(b),r(u,null,{default:i(()=>[t("div",{class:"q-ml-sm",innerHTML:s.excursion.description},null,8,X)]),_:1})]),_:1})}var at=k(I,[["render",Y]]);export{at as default};
