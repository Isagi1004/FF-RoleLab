/* FF RoleLab — static client-side recommendation engine. */
const characters = window.FF_CHARACTERS || [];

const roleInfo = {
  "Rusher":{focus:["Damage","Mobility","Survival"],desc:"Win the first contact with fast entry, close-range pressure, and enough sustain to keep pushing."},
  "Support":{focus:["Team","Survival","Info"],desc:"Keep teammates in the fight with utility, recovery, and information that helps the squad make cleaner plays."},
  "Sniper":{focus:["Damage","Info","Survival"],desc:"Create long-range pressure, spot targets, and keep enough flexibility to reposition after a pick."},
  "Flanker":{focus:["Mobility","Damage","Info"],desc:"Take off-angles, disrupt the enemy line, and escape before the fight turns against you."},
  "IGL / Strategist":{focus:["Info","Team","Survival"],desc:"Prioritize team information, controlled rotations, and utility that helps your squad commit together."},
  "Defender / Anchor":{focus:["Survival","Team","Damage"],desc:"Hold a useful position, stay alive under pressure, and help teammates stabilize the fight."},
  "Solo Clutch":{focus:["Survival","Damage","Mobility"],desc:"Build for independent decisions: survive a bad trade, reposition fast, and finish isolated opponents."}
};
const $ = id => document.getElementById(id);
const storageKeys = {favorites:"ffrolelab_favorites_v1",ratings:"ffrolelab_ratings_v1"};
let activeTag = "All";
let currentBuilds = [];
let toastTimer;

function readStore(key,fallback){try{return JSON.parse(localStorage.getItem(key)) ?? fallback}catch{return fallback}}
function writeStore(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{showToast("Browser storage is unavailable.")}}
function getFavorites(){return readStore(storageKeys.favorites,[])}
function getRatings(){return readStore(storageKeys.ratings,{})}
function showToast(message){const toast=$("toast");toast.textContent=message;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),2200)}
function hashString(s){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h)}
function roleScore(c,role,weapon,mode,aggression){
  const info=roleInfo[role]; let score=38;
  if(c.roles.includes(role)) score+=19;
  c.tags.forEach((tag,idx)=>{const focusIndex=info.focus.indexOf(tag);if(focusIndex>=0)score += [11,7,4][focusIndex]||2});
  if(weapon!=="Mixed" && c.weapons.includes(weapon))score+=9;
  if(mode==="All modes")score+=3;else if(c.modes.includes(mode))score+=8;else score-=20;
  score+=Math.max(0,12-Math.abs(c.aggression-aggression)*0.22);
  // Officially patch-updated entries receive a small evidence bonus, not a claim of being meta-best.
  if(c.status==="patch-verified")score+=4;
  score += (hashString(c.id+role+weapon+mode)%5);
  return Math.max(20,Math.min(98,Math.round(score)));
}
function chooseBuilds(){
  const role=$("roleSelect").value, mode=$("modeSelect").value, weapon=$("weaponSelect").value, aggression=Number($("aggression").value);
  const info=roleInfo[role];
  let pool=characters.filter(c=>c.type==="Active"||c.type==="Passive").filter(c=>mode==="All modes"||c.modes.includes(mode));
  if(weapon!=="Mixed"){
    const matched=pool.filter(c=>c.weapons.includes(weapon));
    if(matched.length>=8)pool=matched;
  }
  const ranked=pool.map(c=>({...c,score:roleScore(c,role,weapon,mode,aggression)})).sort((a,b)=>b.score-a.score);
  const activePool=ranked.filter(c=>c.type==="Active");
  const passivePool=ranked.filter(c=>c.type==="Passive");
  const builds=[];
  const activeChoices=activePool.slice(0,Math.min(3,activePool.length));
  activeChoices.forEach((active,n)=>{
    const selected=[active];
    while(selected.length<4){
      const candidates=passivePool.filter(c=>!selected.some(s=>s.id===c.id));
      if(!candidates.length)break;
      candidates.sort((a,b)=>comboScore(b,selected,info)-comboScore(a,selected,info));
      selected.push(candidates[0]);
    }
    if(selected.length<4)return;
    const avg=selected.reduce((sum,c)=>sum+c.score,0)/selected.length;
    const coverage=[...new Set(selected.flatMap(c=>c.tags))];
    const evidencePenalty=selected.filter(c=>c.status==="needs-review").length*1.5;
    const synergyBonus=comboSynergy(selected);
    const score=Math.max(30,Math.min(98,Math.round(avg+synergyBonus-evidencePenalty)));
    const title=["Best role fit","Utility-focused alternative","High-tempo alternative"][n]||`Alternative ${n+1}`;
    const rationale=buildRationale(selected,role,weapon,mode);
    builds.push({id:`${role}|${mode}|${weapon}|${aggression}|${selected.map(c=>c.id).join("-")}`,role,mode,weapon,aggression,characters:selected.map(c=>c.id),score,title,desc:rationale,tags:coverage.slice(0,4),evidence:selected.some(c=>c.status==="needs-review")?"Contains entries needing in-game verification":"Contains patch-updated entries"});
  });
  currentBuilds=builds;
  $("resultsTitle").innerHTML=`${escapeHtml(role)} <span>loadout</span>`;
  $("resultCount").textContent=`${builds.length} builds · ${characters.length} roster entries`;
  renderBuilds(); updateSavedCount();
}
function comboScore(c,selected,info){
  const used=selected.flatMap(x=>x.tags);
  const uniqueCoverage=c.tags.filter(t=>info.focus.includes(t)&&!used.includes(t)).length*8;
  const synergy=selected.reduce((sum,s)=>sum+pairSynergy(c,s),0);
  const duplicatePenalty=c.tags.every(t=>used.includes(t))?5:0;
  return c.score+uniqueCoverage+synergy-duplicatePenalty;
}
function pairSynergy(a,b){
  const pair=new Set([a.name,b.name]);
  const rules=[
    [["Moco","Maro"],8],[["Moco","Rin"],5],[["Moco","Shirou"],5],[["Alok","Jota"],7],[["Alok","Tatsuya"],5],[["Kassie","Thiva"],6],[["Dimitri","Sonia"],6],[["Nairi","Steffie"],6],[["Skyler","Nairi"],5],[["Koda","Maro"],5],[["Koda","Moco"],6],[["Oscar","Jota"],6],[["Ray","Jota"],6],[["Kenta","Hayato"],5],[["Kenta","Jota"],5],[["D-bee","Luna"],6],[["D-bee","Kelly"],5],[["Morse","Joseph"],5],[["Ryden","Clu"],5],[["Ignis","Skyler"],5]
  ];
  return rules.reduce((n,[names,points])=>n+(names.every(name=>pair.has(name))?points:0),0);
}
function comboSynergy(selected){let total=0;for(let i=0;i<selected.length;i++)for(let j=i+1;j<selected.length;j++)total+=pairSynergy(selected[i],selected[j]);return Math.min(8,total/3)}
function buildRationale(selected,role,weapon,mode){
  const tags=[...new Set(selected.flatMap(c=>c.tags))];
  const focus=roleInfo[role].focus.filter(t=>tags.includes(t)).slice(0,3).join(", ").toLowerCase();
  const active=selected[0];
  return `${active.name} provides the active playmaking tool, backed by passives covering ${focus||"general combat utility"}. ${weapon==="Mixed"?"Flexible weapon fit":`${weapon} fit`} for ${mode.toLowerCase()}; scores estimate role suitability, not win rate.`;
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
function getCharacter(id){return characters.find(c=>c.id===id)}
function initials(name){return name.split(/\s+/).map(p=>p[0]).join("").slice(0,2).toUpperCase()}
function renderBuilds(){
  const favorites=getFavorites(),ratings=getRatings();
  $("results").innerHTML=currentBuilds.map((build,i)=>{
    const chars=build.characters.map(getCharacter).filter(Boolean);
    const isFav=favorites.some(x=>x.id===build.id);
    return `<article class="build-card ${i===0?"featured":""}">
      <div class="build-top"><div><div class="build-label">${i===0?"★ BEST MATCH":`OPTION 0${i+1}`} / ${escapeHtml(build.title.toUpperCase())}</div><h4>${escapeHtml(build.title)}</h4><p class="build-desc">${escapeHtml(build.desc)}</p></div><div class="score-block"><div class="score">${build.score}</div><small>FIT SCORE</small></div></div>
      <div class="skill-row">${chars.map((c,j)=>`<div class="skill-slot"><small>${j===0&&c.type==="Active"?"ACTIVE SKILL":`PASSIVE 0${j}`}</small><strong>${escapeHtml(c.name)}</strong><span>${escapeHtml(c.skill)}</span><em class="data-status ${c.status==="patch-verified"?"status-verified":"status-review"}">${c.status==="patch-verified"?"PATCH NOTE":"VERIFY DATA"}</em></div>`).join("")}</div>
      <div class="build-bottom"><div class="build-tags">${build.tags.map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("")}</div><div class="build-actions"><label class="sr-only" for="rating-${i}">Rate ${escapeHtml(build.title)}</label><select class="rate-select" id="rating-${i}" data-rate="${escapeHtml(build.id)}" aria-label="Rate this build"><option value="">Rate build</option>${[5,4,3,2,1].map(v=>`<option value="${v}" ${Number(ratings[build.id])===v?"selected":""}>${"★".repeat(v)}${"☆".repeat(5-v)}</option>`).join("")}</select><button class="icon-button ${isFav?"is-favorite":""}" data-favorite="${escapeHtml(build.id)}" aria-label="${isFav?"Remove from":"Add to"} favorites" title="${isFav?"Remove from":"Add to"} favorites">${isFav?"♥":"♡"}</button><button class="icon-button" data-copy="${escapeHtml(build.id)}" aria-label="Copy build details" title="Copy build">↗</button></div></div>
    </article>`;
  }).join("");
  if(!currentBuilds.length)$("results").innerHTML='<div class="empty-state">No combinations fit these filters. Try another mode or weapon style.</div>';
}
function buildById(id){return currentBuilds.find(b=>b.id===id)}
function saveFavorite(id){
  const build=buildById(id);if(!build)return;
  let favs=getFavorites();const existing=favs.some(b=>b.id===id);
  favs=existing?favs.filter(b=>b.id!==id):[{...build,savedAt:Date.now()},...favs];
  writeStore(storageKeys.favorites,favs);renderBuilds();renderSaved();updateSavedCount();showToast(existing?"Removed from favorites":"Build saved to favorites");
}
function updateSavedCount(){$("savedCount").textContent=getFavorites().length}
function renderSaved(){
  const favs=getFavorites();
  $("savedBuilds").innerHTML=favs.length?favs.map((b,i)=>`<article class="saved-card"><div class="build-label">SAVED BUILD 0${i+1}</div><h4>${escapeHtml(b.title)}</h4><p><strong>${escapeHtml(b.role)}</strong> · ${escapeHtml(b.mode)} · ${escapeHtml(b.weapon)}<br>Fit score: ${Number(b.score)||"—"} / 100</p><div class="build-tags">${(b.tags||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("")}</div><div style="display:flex;gap:8px;margin-top:14px"><button class="button button-ghost" data-restore="${escapeHtml(b.id)}">Use settings</button><button class="button button-ghost" data-unsave="${escapeHtml(b.id)}">Remove</button></div></article>`).join(""):'<div class="empty-state saved-empty">No saved builds yet. Tap the ♡ icon on a combination to keep it here.</div>';
}
function renderLibrary(){
  const query=$("searchInput").value.trim().toLowerCase();
  const list=characters.filter(c=>{
    const tagMatch=activeTag==="All"|| (activeTag==="Patch verified"?c.status==="patch-verified":activeTag==="Needs verification"?c.status==="needs-review":c.tags.includes(activeTag));
    return tagMatch&&(!query||[c.name,c.skill,c.desc,...c.tags,...c.roles,c.status,c.note].join(" ").toLowerCase().includes(query));
  });
  $("characterGrid").innerHTML=list.map(c=>`<article class="character-card"><div class="char-head"><div class="char-avatar">${initials(c.name)}</div><div><h4>${escapeHtml(c.name)}</h4><small>${escapeHtml(c.type)} · ${escapeHtml(c.note)}</small></div></div><div class="char-skill">${escapeHtml(c.skill)}</div><p class="char-desc">${escapeHtml(c.desc)}</p><div class="char-tags">${c.tags.map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("")}</div><div class="data-status-line"><span class="data-status ${c.status==="patch-verified"?"status-verified":"status-review"}">${c.status==="patch-verified"?"Official patch update":"Needs in-game verification"}</span></div></article>`).join("");
  if(!list.length)$("characterGrid").innerHTML='<div class="empty-state" style="grid-column:1/-1">No profiles match your search.</div>';
  $("libraryCount").textContent=`${list.length} / ${characters.length} characters`;
}
function copyBuild(id){
  const b=buildById(id);if(!b)return;
  const names=b.characters.map(id=>{const c=getCharacter(id);return c?`${c.name} — ${c.skill}`:id}).join("\n");
  const text=`FF RoleLab — ${b.title}\nRole: ${b.role}\nMode: ${b.mode}\nWeapon: ${b.weapon}\nFit score: ${b.score}/100\n${names}\n\nSuitability estimate, not a win-rate prediction.`;
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(()=>showToast("Build copied")).catch(()=>fallbackCopy(text));
  else fallbackCopy(text);
}
function fallbackCopy(text){const area=document.createElement("textarea");area.value=text;document.body.appendChild(area);area.select();try{document.execCommand("copy");showToast("Build copied")}catch{showToast("Copy not available in this browser")}area.remove()}

$("aggression").addEventListener("input",()=>{$("aggressionValue").textContent=`${$("aggression").value} / 100`});
$("generateBtn").addEventListener("click",chooseBuilds);
$("rerollBtn").addEventListener("click",()=>{chooseBuilds();showToast("Combinations refreshed")});
$("roleSelect").addEventListener("change",chooseBuilds);$("modeSelect").addEventListener("change",chooseBuilds);$("weaponSelect").addEventListener("change",chooseBuilds);
$("results").addEventListener("click",e=>{const fav=e.target.closest("[data-favorite]");const copy=e.target.closest("[data-copy]");if(fav)saveFavorite(fav.dataset.favorite);if(copy)copyBuild(copy.dataset.copy)});
$("results").addEventListener("change",e=>{const sel=e.target.closest("[data-rate]");if(!sel)return;const ratings=getRatings();if(sel.value)ratings[sel.dataset.rate]=Number(sel.value);else delete ratings[sel.dataset.rate];writeStore(storageKeys.ratings,ratings);showToast(sel.value?`Rating saved: ${sel.value}/5`:"Rating cleared")});
$("tagFilters").addEventListener("click",e=>{const btn=e.target.closest("[data-tag]");if(!btn)return;activeTag=btn.dataset.tag;document.querySelectorAll("#tagFilters .chip").forEach(c=>c.classList.toggle("selected",c===btn));renderLibrary()});
$("searchInput").addEventListener("input",renderLibrary);
$("savedBuilds").addEventListener("click",e=>{const remove=e.target.closest("[data-unsave]");const restore=e.target.closest("[data-restore]");if(remove){writeStore(storageKeys.favorites,getFavorites().filter(b=>b.id!==remove.dataset.unsave));renderSaved();renderBuilds();updateSavedCount();showToast("Saved build removed")}if(restore){const b=getFavorites().find(x=>x.id===restore.dataset.restore);if(b){$("roleSelect").value=b.role;$("modeSelect").value=b.mode;$("weaponSelect").value=b.weapon;$("aggression").value=b.aggression;$("aggressionValue").textContent=`${b.aggression} / 100`;chooseBuilds();location.hash="#builder";showToast("Build settings restored")}}});
$("clearSavedBtn").addEventListener("click",()=>{if(!getFavorites().length){showToast("No saved builds to clear");return}if(confirm("Clear all saved builds from this browser?")){writeStore(storageKeys.favorites,[]);renderSaved();renderBuilds();updateSavedCount();showToast("Saved builds cleared")}});
renderLibrary();renderSaved();chooseBuilds();
