import{d2 as y,r as d,eQ as p,ed as w,y as v,P as x,dR as f,cM as i,d9 as h,da as r,de as C,d as s,dc as o,dd as e,db as Q,dS as M,cV as n,df as m,eP as L,cN as c}from"./index.d880ed97.js";import{Q as S,a as g}from"./QFab.5908d0d1.js";import{Q as z}from"./QMarkupTable.a903c0b9.js";import{u as D}from"./use-quasar.fff60b60.js";import{S as T}from"./SimpleHeaderMap.94199be9.js";import{O}from"./OrganizationsList.a1963a43.js";import"./CartoLayers.620906c1.js";import"./WMTS.c1c6dbd5.js";const H={name:"customLocationDetailsPage",components:{OrganizationsList:O,SimpleHeaderMap:T},setup(){const{dialog:a}=D(),l=d([1637531,5766419]),u=d([]),t=d(null);return{center:l,markLocations:u,confirmDialog:a,formatDate:p,customLocation:t}},methods:{goTo(){var l;this.confirm=!0;const a=`${(l=this.customLocation)==null?void 0:l.name}`;this.confirmDialog({title:`${this.$t("confirm")}`,message:`${this.$t("navigateToCustomLocation")}: ${a}`,cancel:!0,persistent:!0}).onOk(()=>{this.$router.push({path:"/",query:{lat:this.customLocation.lat,lng:this.customLocation.lng,navigate:!0,customLocation:!0,name:a}})})},showOnMap(){this.$router.push({path:"/",query:{lat:this.customLocation.lat,lng:this.customLocation.lng,customLocation:!0}})}},created(){this.customLocation=this.$route.meta.customLocation;const a=w([this.customLocation.lng,this.customLocation.lat]);this.center=a;const l=new v(new x(a));this.markLocations=[l]}},N={class:"text-overline text-orange-9"},P={class:"row no-wrap items-center"},V={class:"col text-h6 ellipsis"},q={class:"text-grey text-caption q-pt-md items-center"},B={key:0},$={class:"text-left table-row-fit"},A={class:"text-left table-row-fit"},F={class:"text-left table-row-fit"},I={class:"text-left table-row-fit"},E={key:1},G={class:"text-left table-row-fit"},K={class:"text-left table-row-fit"},R={key:2},Y={class:"text-left table-row-fit"},j={class:"text-left table-row-fit"},J={key:3},U={class:"text-left table-row-fit"},W={class:"text-left table-row-fit"},X={key:4},Z={class:"text-left table-row-fit"},tt={class:"text-left table-row-fit"},ot={key:5},at={class:"text-left table-row-fit"},et={class:"text-left table-row-fit"},st={key:6},it={class:"text-left table-row-fit"},nt={class:"text-left table-row-fit"},ct={key:7},lt={class:"text-left table-row-fit"},rt={class:"text-left table-row-fit"},mt=["innerHTML"];function dt(a,l,u,t,ut,_){const b=f("SimpleHeaderMap"),k=f("OrganizationsList");return i(),h(C,{class:"cave-top"},{default:r(()=>[s(b,{center:t.center,markLocations:t.markLocations},null,8,["center","markLocations"]),s(m,null,{default:r(()=>[o("div",N,e(a.$t("customLocationDetails")),1),o("div",P,[o("div",V,[Q(e(t.customLocation.name),1),t.customLocation.isAuthor?(i(),h(M,{key:0,name:"check"})):n("",!0)])]),s(S,{class:"absolute",style:{top:"0",right:"12px",transform:"translateY(-50%)"},"vertical-actions-align":"right",color:"primary",glossy:"",icon:"keyboard_arrow_down",direction:"down"},{default:r(()=>[s(g,{"label-position":"left",color:"green",icon:"map",label:a.$t("mainMap"),onClick:_.showOnMap},null,8,["label","onClick"]),s(g,{"label-position":"left",color:"orange",icon:"assist_walker",label:a.$t("navigate"),onClick:_.goTo},null,8,["label","onClick"])]),_:1})]),_:1}),s(m,{horizontal:""},{default:r(()=>[s(m,null,{default:r(()=>[o("div",q,e(a.$t("date"))+": "+e(t.formatDate(t.customLocation.createdDate)),1)]),_:1})]),_:1}),s(L),s(z,null,{default:r(()=>[o("tbody",null,[t.customLocation.organizations?(i(),c("tr",B,[o("td",$,e(a.$t("organizations")),1),o("td",A,[s(k,{organizations:t.customLocation.organizations},null,8,["organizations"])])])):n("",!0),o("tr",null,[o("td",F,e(a.$t("latLng")),1),o("td",I,e(t.customLocation.lat)+", "+e(t.customLocation.lng),1)]),t.customLocation.xgk?(i(),c("tr",E,[o("td",G,e(a.$t("GKCoordinates")),1),o("td",K,e(t.customLocation.xgk)+", "+e(t.customLocation.ygk),1)])):n("",!0),t.customLocation.type?(i(),c("tr",R,[o("td",Y,e(a.$t("customLocationType")),1),o("td",j,e(a.$t(`customLocationTypes.${t.customLocation.type}`)),1)])):n("",!0),t.customLocation.status?(i(),c("tr",J,[o("td",U,e(a.$t("customLocationStatus")),1),o("td",W,e(a.$t(`customLocationStatuses.${t.customLocation.status}`)),1)])):n("",!0),t.customLocation.elevation?(i(),c("tr",X,[o("td",Z,e(a.$t("elevation")),1),o("td",tt,e(parseInt(t.customLocation.elevation))+" "+e(a.$t("elevationAbrv")),1)])):n("",!0),t.customLocation.geology?(i(),c("tr",ot,[o("td",at,e(a.$t("geology")),1),o("td",et,e(t.customLocation.geology),1)])):n("",!0),t.customLocation.settlement?(i(),c("tr",st,[o("td",it,e(a.$t("settlement")),1),o("td",nt,e(t.customLocation.settlement),1)])):n("",!0),t.customLocation.municipalty?(i(),c("tr",ct,[o("td",lt,e(a.$t("municipalty")),1),o("td",rt,e(t.customLocation.municipalty),1)])):n("",!0)])]),_:1}),s(L),s(m,null,{default:r(()=>[o("div",{class:"q-ml-sm",innerHTML:t.customLocation.description},null,8,mt)]),_:1})]),_:1})}var pt=y(H,[["render",dt]]);export{pt as default};