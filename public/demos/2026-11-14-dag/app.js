"use strict";
const $ = id => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const state = {data:null, live:true, playing:false, cursor:0, selected:null, pinned:false,
  scale:1, x:0, y:0, fit:true, topology:"", busy:false, revision:0, last:performance.now(), view:"graph"};
const clean = value => String(value ?? "");
const label = value => clean(value).replace(/[_-]+/g," ").replace(/^./,c=>c.toUpperCase());
const short = (value,n=42) => clean(value).length > n ? clean(value).slice(0,n-1)+"…" : clean(value);
const statusLabel = value => ({SUCCEEDED:"Complete",RUNNING:"Active",PENDING:"Queued",RECOVERING:"Recovering",SKIPPED:"Not selected",REPLAN_REQUIRED:"Needs a new plan",ABORTED:"Stopped",FAILED:"Failed",WAITING:"Waiting",CHECKING_GOAL:"Verifying goal"}[value] || label(value));
function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=clean(text);return node;}
function svg(tag,attrs={},text){const node=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,clean(v));if(text!==undefined)node.textContent=clean(text);return node;}
function badge(status){return el("span","status-pill "+clean(status).toLowerCase(),statusLabel(status));}
function announce(message){$("toast").textContent=message;$("toast").hidden=false;clearTimeout(announce.timer);announce.timer=setTimeout(()=>$("toast").hidden=true,2200);}
function setTheme(theme){document.documentElement.dataset.theme=theme;try{localStorage.setItem("graph-workspace-theme",theme);}catch{}$("theme").setAttribute("aria-label",theme==="dark"?"Switch to light theme":"Switch to dark theme");}
try{setTheme(localStorage.getItem("graph-workspace-theme")||"light");}catch{setTheme("light");}
$("theme").onclick=()=>setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark");
$("copy-link").onclick=async()=>{try{await navigator.clipboard.writeText(location.href);announce("Local workspace link copied");}catch{announce(location.href);}};

function pipeline(data){
  const phase=data.pipeline.phase,s=data.snapshot;
  let index=({waiting:0,context:0,server:0,generating:0,validating:1,ready:2,executing:3,done:4,error:3,rejected:1})[phase]??0;
  if(phase==="error"&&!s.plan)index=0;
  const root=$("pipeline-stages");root.replaceChildren();
  [data.pipeline.inference_calls===undefined&&data.validation.inference_calls===undefined?"Load plan":"Generate plan","Validate","Assign tasks","Execute"].forEach((text,i)=>{
    if(i)root.append(el("span","stage-line"));
    const isDone=i<index||phase==="done",current=i===index;
    const step=el("div","pipeline-step"+(isDone?" done":current?" active":"")+((phase==="rejected"||phase==="error")&&current?" error":""));
    step.append(el("span","step-number",isDone?"✓":i+1),el("span","",text));root.append(step);
  });
  const calls=data.pipeline.inference_calls??data.validation.inference_calls;
  $("call-count").textContent=calls===undefined?"Saved graph · local execution":`${calls} model ${calls===1?"call":"calls"} · local Ollama`;
  $("pipeline-message").textContent=phase==="executing"?(state.live?"Observing live robot execution.":"Replaying recorded execution; physics is unaffected."):phase==="done"?"Task complete. Replay the run or select an action to inspect it.":data.pipeline.message||"Observing the selected local run.";
}
function render(data){
  state.data=data;const s=data.snapshot,plan=s.plan,nodes=plan?.nodes||[];
  $("connection").className="connection";$("connection").replaceChildren(el("i"),document.createTextNode("Local connection"));
  $("run-name").textContent=data.run_name;
  $("task-title").textContent=data.pipeline.prompt?"Task orchestration":plan?"Coordinated execution":"From intention to action.";
  $("task-prompt").textContent=data.pipeline.prompt||label(plan?.plan_id||"Waiting for a planning or execution trace");
  const displayStatus=s.status==="WAITING"?({generating:"RUNNING",validating:"RUNNING",ready:"PENDING",rejected:"FAILED",error:"FAILED"}[data.pipeline.phase]||"WAITING"):s.status;
  $("run-status").className="status-pill "+displayStatus.toLowerCase();
  $("run-status").textContent=s.status==="WAITING"?({generating:"Generating",validating:"Validating",ready:"Ready",rejected:"Plan rejected",error:"Stopped"}[data.pipeline.phase]||"Waiting"):statusLabel(s.status);
  pipeline(data);
  const errors=data.pipeline.errors?.length?data.pipeline.errors:data.validation.errors||[];
  const message=s.error?.message||errors.join(" · ")||data.reader_error;
  $("notice").hidden=!message;$("notice").textContent=message||"";
  $("node-count").textContent=`${nodes.length} ${nodes.length===1?"action":"actions"}`;
  $("draft-badge").hidden=!data.provisional;
  $("canvas-caption").textContent=data.provisional?"GENERATING · PROVISIONAL GRAPH":"TASK FLOW";
  $("empty-state").hidden=nodes.length>0;
  $("generation-detail").textContent=data.pipeline.characters?`${data.pipeline.characters.toLocaleString()} characters received`:(data.pipeline.phase==="server"?"Preparing the model…":"");
  $("download-plan").hidden=!plan||data.provisional;
  $("recording").hidden=!data.has_video;
  if(!state.pinned||!nodes.some(n=>n.id===state.selected)){
    state.selected=nodes.find(n=>["RECOVERING","RUNNING"].includes(s.node_states[n.id]))?.id||state.selected||nodes[0]?.id||null;
  }
  drawGraph(data);renderRobots(data);renderDetail(data);renderActivity(data);
  $("timeline").max=Math.max(s.max_time_s,.001);$("timeline").value=s.time_s;
  $("timeline").disabled=s.max_time_s<=0;
  $("time").textContent=`${s.time_s.toFixed(1)} s`;
  $("follow").classList.toggle("active",state.live);
  $("follow").lastChild.textContent=s.final&&state.live?" Latest":" Live";
  $("play").textContent=state.playing?"Ⅱ":"▶";
  $("play").setAttribute("aria-label",state.playing?"Pause replay":"Play replay");
  $("play").disabled=s.max_time_s<=0;$("previous").disabled=s.max_time_s<=0;$("next").disabled=s.max_time_s<=0;
  $("mode-label").textContent=state.live?(s.final?"Recorded run · latest state":"Live observation"):"Replay · simulation time";
}

function selectNode(id){state.selected=id;state.pinned=true;if(state.data){drawGraph(state.data);renderDetail(state.data);}}
function conditionText(condition){
  if(condition?.always)return "always";if(condition?.otherwise)return "otherwise";
  if(condition?.state)return `${[condition.state,...(Array.isArray(condition.path)?condition.path:[])].join(".")} ${condition.op||""} ${JSON.stringify(condition.value)}`;
  if(Array.isArray(condition?.all))return condition.all.map(conditionText).join(" & ");
  if(Array.isArray(condition?.any))return condition.any.map(conditionText).join(" or ");
  if(condition?.not)return "not "+conditionText(condition.not);return "dependency";
}
function drawGraph(data){
  const s=data.snapshot,g=data.geometry,plan=s.plan||{},specs=new Map((plan.nodes||[]).map(n=>[n.id,n]));
  const key=JSON.stringify([g,data.assignments,plan.nodes]);
  if(key!==state.topology){
    state.topology=key;$("edges").replaceChildren();$("nodes").replaceChildren();
    for(const edge of g.edges){
      const a=g.nodes[edge.source],b=g.nodes[edge.target];if(!a||!b)continue;
      const x1=a.x+a.width/2,y1=a.y+a.height,x2=b.x+b.width/2,y2=b.y,mid=(y1+y2)/2;
      const group=svg("g",{"data-source":edge.source,"data-target":edge.target,"data-index":edge.index??""});
      group.append(svg("path",{d:`M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2-3}`,class:"edge-path"}));
      const text=conditionText(edge.condition);group.append(svg("title",{},text));
      const textNode=svg("text",{x:(x1+x2)/2+8,y:mid-2,class:"edge-label"},short(text,32));group.append(textNode);$("edges").append(group);
    }
    for(const [id,pos]of Object.entries(g.nodes)){
      const spec=specs.get(id),group=svg("g",{transform:`translate(${pos.x},${pos.y})`,class:"node",tabindex:spec?"0":"-1",role:spec?"button":"img","data-node":id});
      group.append(svg("rect",{width:pos.width,height:pos.height,rx:pos.terminal?16:9}));
      if(pos.terminal){group.append(svg("text",{x:pos.width/2,y:20,"text-anchor":"middle",class:"node-label"},"Task outcome"));}
      else{
        group.append(svg("circle",{cx:18,cy:18,r:3,class:"node-dot"}));
        group.append(svg("text",{x:30,y:22,class:"node-label"},short(label(spec.name||spec.skill),22)));
        const assigned=data.assignments[id]||[];
        const bindings=Object.fromEntries(Object.entries(spec.inputs||{}).map(([k,v])=>[k,s.global_state[v]??plan.global_state?.[v]?.value]));
        const detail=bindings.grasp_site||spec.args?.grasp_site;
        group.append(svg("text",{x:30,y:38,class:"node-subtitle"},short((assigned.length?assigned.map(r=>r.toUpperCase()).join(" + "):"Awaiting assignment")+(detail?"  ·  "+label(detail):assigned.length>1?"  ·  Shared action":""),38)));
        group.append(svg("text",{x:pos.width-15,y:22,"text-anchor":"end",class:"node-status"},""));
        group.addEventListener("click",()=>selectNode(id));group.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();selectNode(id);}});
      }
      $("nodes").append(group);
    }
    if(state.fit)fitGraph();
  }
  for(const group of $("nodes").children){
    const id=group.dataset.node,terminal=g.nodes[id]?.terminal,status=terminal?s.status:s.node_states[id]||"PENDING";
    group.setAttribute("class",`node ${status.toLowerCase()}${terminal?" terminal":""}${id===state.selected?" selected":""}${data.provisional?" draft":""}`);
    const spec=specs.get(id);group.setAttribute("aria-label",terminal?"Task outcome":`${label(spec?.name||spec?.skill)} · ${(data.assignments[id]||[]).join(" and ")} · ${statusLabel(status)}`);
    const mark=group.querySelector(".node-status");if(mark)mark.textContent=({SUCCEEDED:"✓",RUNNING:"•••",RECOVERING:"↻",FAILED:"!",ABORTED:"!",SKIPPED:"–"}[status]||"");
  }
  const selected=new Set(s.selected_edges.map(e=>`${e.node_id}:${e.edge_index}`));
  for(const group of $("edges").children){
    const source=group.dataset.source,target=group.dataset.target;
    const chosen=selected.has(`${source}:${group.dataset.index}`)||(s.variant==="dependency"&&s.node_states[source]==="SUCCEEDED");
    const active=chosen&&["RUNNING","RECOVERING"].includes(s.node_states[target]);
    const skipped=s.node_states[target]==="SKIPPED"||s.node_states[source]==="SKIPPED";
    group.querySelector("path").setAttribute("class",`edge-path${chosen?" selected-edge":""}${active?" active-edge":""}${skipped?" skipped-edge":""}`);
    group.querySelector("text").style.display=$("conditions").checked?"":"none";
  }
  transform();
}
function transform(){$("viewport").setAttribute("transform",`translate(${state.x},${state.y}) scale(${state.scale})`);}
function fitGraph(){if(!state.data)return;const box=$("graph").getBoundingClientRect(),g=state.data.geometry;if(!box.width||!box.height)return;
  state.scale=Math.min(1.18,(box.width-55)/g.width,(box.height-68)/g.height);state.x=(box.width-g.width*state.scale)/2;state.y=(box.height-g.height*state.scale)/2;state.fit=true;transform();}
function zoom(factor){const box=$("graph").getBoundingClientRect(),old=state.scale;state.scale=Math.max(.25,Math.min(2.5,old*factor));state.x=box.width/2-(box.width/2-state.x)*state.scale/old;state.y=box.height/2-(box.height/2-state.y)*state.scale/old;state.fit=false;transform();}
$("fit").onclick=fitGraph;$("zoom-in").onclick=()=>zoom(1.15);$("zoom-out").onclick=()=>zoom(1/1.15);
$("conditions").onchange=()=>state.data&&drawGraph(state.data);
new ResizeObserver(()=>{if(state.fit)fitGraph();}).observe($("canvas"));
let drag=null;$("graph").addEventListener("pointerdown",event=>{if(event.target.closest(".node"))return;drag={x:event.clientX,y:event.clientY,ox:state.x,oy:state.y};$("graph").setPointerCapture(event.pointerId);});
$("graph").addEventListener("pointermove",event=>{if(!drag)return;state.x=drag.ox+event.clientX-drag.x;state.y=drag.oy+event.clientY-drag.y;state.fit=false;transform();});
$("graph").addEventListener("pointerup",()=>drag=null);$("graph").addEventListener("pointercancel",()=>drag=null);
$("graph").addEventListener("wheel",event=>{if(event.ctrlKey||event.metaKey){event.preventDefault();zoom(event.deltaY<0?1.08:1/1.08);}},{passive:false});

function renderRobots(data){const s=data.snapshot,nodes=s.plan?.nodes||[],ids=[...new Set(Object.values(data.assignments).flat())].sort();
  $("robot-count").textContent=ids.length?`${ids.length} robots`:"—";const root=$("robots");
  if(data.provisional)$("robot-count").textContent=ids.length?`${ids.length} robots · proposed`:"—";
  if(!ids.length){root.replaceChildren();root.append(el("p","muted","Robot assignments appear with the plan."));return;}
  const key=JSON.stringify([data.assignments,s.node_states,s.active_recovery,s.final,data.provisional]);if(root.dataset.snapshot===key)return;root.dataset.snapshot=key;root.replaceChildren();
  for(const id of ids){
    const assigned=nodes.filter(n=>(data.assignments[n.id]||[]).includes(id)),active=!s.final&&assigned.find(n=>["RUNNING","RECOVERING"].includes(s.node_states[n.id]));
    const recovery=Object.values(s.active_recovery||{}).find(r=>Object.values(r.command?.participants||r.bindings||{}).includes(id)||r.robot===id||r.target?.includes(id));
    const next=assigned.find(n=>!s.node_states[n.id]||s.node_states[n.id]==="PENDING");
    const completed=assigned.every(n=>["SUCCEEDED","SKIPPED"].includes(s.node_states[n.id]));
    const status=recovery?"RECOVERING":active?s.node_states[active.id]:completed?"SUCCEEDED":s.final?"ABORTED":"PENDING";
    const task=recovery?.command?.skill?`${label(recovery.command.skill)} · continuation`:active?label(active.name||active.skill):completed?"All assigned actions complete":next?`Next · ${label(next.name||next.skill)}`:"Waiting";
    const row=el("div","robot-row"),top=el("div","robot-top"),description=el("div");description.append(el("div","robot-name",`Robot ${id.toUpperCase()}`),el("div","robot-task",task));
    top.append(el("span","robot-avatar",id.toUpperCase()),description,badge(status));row.append(top);
    const segments=el("div","task-segments");for(const node of [...assigned].sort((a,b)=>(data.geometry.nodes[a.id]?.rank||0)-(data.geometry.nodes[b.id]?.rank||0))){const segment=el("button","task-segment "+(s.node_states[node.id]||"PENDING").toLowerCase());segment.title=`${label(node.name||node.skill)} · ${statusLabel(s.node_states[node.id]||"PENDING")}`;segment.setAttribute("aria-label",`Inspect ${node.id} for ${id}`);segment.onclick=()=>selectNode(node.id);segments.append(segment);}row.append(segments);root.append(row);
  }
}
function section(title){const box=el("div","detail-section");box.append(el("h3","",title));return box;}
function dataRow(key,value){const row=el("div","data-row");row.append(el("span","",label(key)),el("span","",typeof value==="object"?JSON.stringify(value):value));return row;}
function renderDetail(data){const s=data.snapshot,node=s.plan?.nodes?.find(n=>n.id===state.selected),root=$("node-detail");const key=JSON.stringify([node,data.assignments[state.selected],s.node_states[state.selected],s.inputs[state.selected],s.node_timings[state.selected],s.outputs[state.selected],s.activation[state.selected],state.pinned]);if(root.dataset.snapshot===key)return;root.dataset.snapshot=key;const detailsOpen=root.querySelector("details")?.open&&root.dataset.selected===state.selected;root.dataset.selected=state.selected;root.replaceChildren();
  if(!node){root.append(el("div","inspector-empty","Select an action to inspect its inputs, progress, and next steps."));return;}
  const status=s.node_states[node.id]||"PENDING",header=el("div","detail-header");header.append(el("h3","",label(node.name||node.skill)),badge(status));root.append(header,el("div","node-id",node.id));
  if(status==="RECOVERING"){const failure=[...s.events].reverse().find(e=>e.node_id===node.id&&e.failure)?.failure;root.append(el("p","note warning recovery-note",failure?`${failure.code}: ${failure.message}. The engine is running a continuation.`:"A continuation is running; this action has not completed."));}
  $("inspector-mode").textContent=state.pinned?"SELECTED":"FOLLOWING";
  const assigned=section("Assigned to");for(const robot of data.assignments[node.id]||[])assigned.append(el("span","robot-chip",robot.toUpperCase()));root.append(assigned);
  const inputs=s.inputs[node.id]||node.args&&{...node.participants,...node.args}||Object.fromEntries(Object.entries(node.inputs||{}).map(([k,v])=>[k,s.global_state[v]??s.plan.global_state?.[v]?.value??"Not yet available"]));
  const parameters=section("Inputs");for(const [k,v]of Object.entries(inputs))if(!(data.assignments[node.id]||[]).includes(v))parameters.append(dataRow(k,v));root.append(parameters);
  const timing=s.node_timings[node.id],details=section("Execution");details.append(dataRow("activation",node.activation==="all"?"All selected lanes":node.activation||"Dependencies"));
  if(timing?.start_s!=null)details.append(dataRow("started",`${timing.start_s.toFixed(2)} s`));if(timing?.duration_s!=null)details.append(dataRow("duration",`${timing.duration_s.toFixed(2)} s`));
  const waiting=s.activation[node.id]?.waiting_on||[];if(status==="PENDING"&&waiting.length)details.append(el("p","note",`Waiting for ${waiting.join(", ")}.`));
  root.append(details);
  const next=section("Next actions");const successors=node.outbound_edges||s.plan.nodes.filter(n=>n.depends_on?.includes(node.id)).map(n=>({to:n.id}));
  for(const edge of successors){const target=s.plan.nodes.find(n=>n.id===edge.to);if(target){const b=el("button","next-action");b.append(el("span","",label(target.name||target.skill)),el("span","","→"));b.onclick=()=>selectNode(target.id);next.append(b);}else next.append(el("p","muted",edge.to?`${edge.to} · awaiting node`:"Verify task outcome"));}root.append(next);
  if(s.outputs[node.id]){const disclosure=el("details");disclosure.open=!!detailsOpen;disclosure.append(el("summary","","Returned outputs"),el("pre","",JSON.stringify(s.outputs[node.id],null,2)));root.append(disclosure);}
}
function renderActivity(data){const root=$("activity-list"),key=JSON.stringify(data.snapshot.events);if(root.dataset.snapshot===key)return;root.dataset.snapshot=key;root.replaceChildren();for(const event of [...data.snapshot.events].reverse()){
  const row=el("li","activity-row"),text=el("div");let title=label(event.event),detail=event.node_id||"";
  if(event.event==="node_state")title=`${event.node_id} · ${statusLabel(event.to)}`;
  if(event.failure){title=`${event.node_id} · primitive failed`;detail=event.failure.code+" — "+event.failure.message;}
  if(event.event==="failure_continuation_started"){title="Continuation started";detail=event.node_id+" · "+(event.steps||[]).join(" → ");}
  if(event.event==="edge_selected"){title="Route selected";detail=event.node_id+" → "+(event.target||"task outcome");}
  text.append(el("span","",title));if(detail)text.append(el("small","",detail));row.append(el("time","",`${(event.time_s||0).toFixed(2)} s`),text);root.append(row);
  }if(!root.children.length)root.append(el("p","muted","Execution events will appear when the validated graph begins."));
}
function setView(view){state.view=view;$("canvas").hidden=view!=="graph";$("activity-view").hidden=view!=="activity";for(const name of["graph","activity"]){$(name+"-tab").classList.toggle("active",name===view);$(name+"-tab").setAttribute("aria-selected",clean(name===view));}if(view==="graph"&&state.fit)fitGraph();}
$("graph-tab").onclick=()=>setView("graph");$("activity-tab").onclick=()=>setView("activity");
function seek(time){state.live=false;state.playing=false;state.cursor=Math.max(0,Math.min(time,state.data?.snapshot.max_time_s||0));state.revision++;poll();}
$("timeline").oninput=event=>seek(Number(event.target.value));
$("play").onclick=()=>{state.live=false;state.playing=!state.playing;if(state.cursor>=(state.data?.snapshot.max_time_s||0)-.01)state.cursor=0;state.last=performance.now();state.revision++;poll();};
$("follow").onclick=()=>{state.live=true;state.playing=false;state.pinned=false;state.revision++;poll();};
$("previous").onclick=()=>{if(!state.data)return;const time=state.live?state.data.snapshot.time_s:state.cursor;seek([...state.data.snapshot.event_times].reverse().find(t=>t<time-.001)??0);};
$("next").onclick=()=>{if(!state.data)return;const time=state.live?state.data.snapshot.time_s:state.cursor;seek(state.data.snapshot.event_times.find(t=>t>time+.001)??state.data.snapshot.max_time_s);};

// Static replay transport; the graph, assignment and inspector renderers above
// are the execution workspace's renderer. The public page does not run robots.
const embedded = new URLSearchParams(location.search).has('embed');
if (embedded) document.documentElement.classList.add('embedded');
state.live = false;
let archive = null;
function archivedFrame(at) {
  let lo=0, hi=archive.frames.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(archive.frames[mid].snapshot.time_s<=at+1e-8)lo=mid;else hi=mid-1;}
  const frame=archive.frames[lo];
  return {snapshot:{...frame.snapshot,plan:archive.plan,time_s:at},
    geometry:archive.geometry,assignments:archive.assignments,run_name:archive.run_name,
    pipeline:{phase:frame.phase},validation:{},provisional:false,has_video:true};
}
function poll(){
  if(!archive)return;
  const now=performance.now();
  if(state.playing&&!embedded)state.cursor+=(now-state.last)/1000*Number($('speed').value);
  state.last=now;
  if(state.cursor>=archive.duration){state.cursor=archive.duration;state.playing=false;}
  render(archivedFrame(state.cursor));
  $('connection').className='connection';
  $('connection').replaceChildren(el('i'),document.createTextNode('Recorded replay'));
  $('mode-label').textContent=embedded?'Synchronized with video':'Recorded execution';
}
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='dag-replay-time'||!archive)return;
  state.cursor=Math.max(0,Math.min(Number(event.data.time)||0,archive.duration));
  state.playing=false;poll();
});
fetch('./replay.json').then(r=>{if(!r.ok)throw new Error('Trace unavailable');return r.json();}).then(data=>{
  archive=data;poll();parent.postMessage({type:'dag-replay-ready'},location.origin);
}).catch(()=>{$('pipeline-message').textContent='The recorded trace could not be loaded. Reload this page to try again.';});
$('follow').hidden=true;
setInterval(poll,100);
