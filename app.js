import {freshState,validateState,routineFor,totals,isResolved,editsFrom} from './model.js';
const $=id=>document.getElementById(id);
const KEY='overnight-packing-prep:v1';
let defaults,state=freshState(),draft,storageBlocked=false,waitingWorker;
const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
function status(text,bad=false){$('save-status').textContent=text;$('save-status').style.color=bad?'#a33b43':'';}
function save(){
  if(storageBlocked){status('Saved data needs attention — export a backup first',true);return;}
  try{localStorage.setItem(KEY,JSON.stringify(state));status('Saved on this device');}catch{status('Can’t save here — export a backup',true);}
}
function load(){try{const raw=localStorage.getItem(KEY);if(raw)state=validateState(JSON.parse(raw));}catch{storageBlocked=true;status('Saved data couldn’t be read. Export it before resetting.',true);}}
function refreshStats(){
 const sections=routineFor(defaults,state),all=totals(sections.flatMap(s=>s.items),state);
 $('remaining').textContent=all.remaining;$('done').textContent=all.done;$('count').textContent=all.count;
 $('progress').max=all.count||1;$('progress').value=all.done;$('percent').textContent=`${all.count?Math.round(all.done/all.count*100):0}%`;
 $('total-caption').textContent=`${all.minutes} min total`;
 const skipped=sections.flatMap(s=>s.items).filter(i=>i.optional&&state.progress[i.id]==='skipped').length;
 $('progress-text').textContent=all.count===0?'Add a task to get started.':all.done===all.count?'All ready. Have a lovely night ♡':all.done===0?'Your evening starts here.':`${all.done} of ${all.count} ready${skipped?` · ${skipped} not needed`:''}`;
 for(const section of sections){
  const t=totals(section.items,state);
  $(`meta-${section.id}`).textContent=`${t.done} / ${t.count} ready · ${t.minutes?`${t.remaining} min left`:'Untimed'}`;
  $(`subtotal-${section.id}`).textContent=t.minutes?`${t.remaining} of ${t.minutes} min left`:'No timed tasks';
  for(const item of section.items){const row=$(`row-${item.id}`);row.dataset.resolved=Boolean(isResolved(item,state));row.dataset.skipped=state.progress[item.id]==='skipped';row.querySelector('input').checked=state.progress[item.id]==='done';const skip=row.querySelector('.skip');if(skip){skip.textContent=state.progress[item.id]==='skipped'?'Not needed · Undo':'Not needed';skip.setAttribute('aria-pressed',String(state.progress[item.id]==='skipped'));}}
 }
}
function render(){
 $('sections').replaceChildren();
 routineFor(defaults,state).forEach((section,index)=>{
  const details=el('details','section');details.id=`section-${section.id}`;details.open=!state.collapsed[section.id];
  const summary=el('summary');summary.append(el('span','section-number',String(index+1).padStart(2,'0')));
  const heading=el('div','section-heading');heading.append(el('h3','',section.name));const meta=el('div','section-meta');meta.id=`meta-${section.id}`;heading.append(meta);summary.append(heading,el('span','chevron','⌄'));details.append(summary,el('p','section-hint',section.hint));
  const list=el('div','task-list');
  for(const item of section.items){
   const row=el('div','task');row.id=`row-${item.id}`;
   const label=el('label');const check=el('input');check.type='checkbox';check.id=`check-${item.id}`;
   check.addEventListener('change',()=>{if(check.checked)state.progress[item.id]='done';else delete state.progress[item.id];save();refreshStats();});
   label.append(check,el('span','task-name',item.label));if(item.minutes)label.append(el('span','minutes',`${item.minutes} min`));row.append(label);
   if(item.optional){const skip=el('button','skip','Not needed');skip.type='button';skip.addEventListener('click',()=>{if(state.progress[item.id]==='skipped')delete state.progress[item.id];else state.progress[item.id]='skipped';save();refreshStats();});row.append(skip);}
   list.append(row);
  }
  details.append(list);const foot=el('div','section-foot');foot.append(el('span','','Section subtotal'));const subtotal=el('span');subtotal.id=`subtotal-${section.id}`;foot.append(subtotal);details.append(foot);
  details.addEventListener('toggle',()=>{if(state.collapsed[section.id]!==!details.open){state.collapsed[section.id]=!details.open;save();}});
  $('sections').append(details);
 });refreshStats();
}
function confirmAction(title,body,button='Continue'){
 $('confirm-title').textContent=title;$('confirm-body').textContent=body;$('confirm-ok').textContent=button;$('confirm').showModal();
 return new Promise(resolve=>{const finish=value=>{$('confirm').close();$('confirm-ok').onclick=null;$('confirm-cancel').onclick=null;$('confirm').oncancel=null;resolve(value);};$('confirm-ok').onclick=()=>finish(true);$('confirm-cancel').onclick=()=>finish(false);$('confirm').oncancel=event=>{event.preventDefault();finish(false);};});
}
function renderEditor(focusId){
 $('edit-sections').replaceChildren();
 for(const section of draft){
  const fieldset=el('fieldset','edit-section');fieldset.append(el('legend','',section.name));
  section.items.forEach((item,index)=>{
   const row=el('div','edit-task');const nameLabel=el('label','','Task');const name=el('input');name.value=item.label;name.required=true;name.maxLength=200;name.id=`edit-${item.id}`;name.setAttribute('aria-label',`Task name: ${item.label}`);name.addEventListener('input',()=>item.label=name.value);nameLabel.append(name);
   const timeLabel=el('label','','Minutes');const time=el('input');time.type='number';time.min=0;time.max=1440;time.step='0.5';time.required=true;time.inputMode='decimal';time.value=item.minutes;time.setAttribute('aria-label',`Minutes: ${item.label}`);time.addEventListener('input',()=>item.minutes=time.value===''?NaN:Number(time.value));timeLabel.append(time);row.append(nameLabel,timeLabel);
   const controls=el('div','edit-controls');
   for(const [symbol,delta,word] of [['↑',-1,'up'],['↓',1,'down']]){const button=el('button','',symbol);button.type='button';button.setAttribute('aria-label',`Move ${item.label} ${word}`);button.disabled=index+delta<0||index+delta>=section.items.length;button.onclick=()=>{[section.items[index],section.items[index+delta]]=[section.items[index+delta],section.items[index]];renderEditor(item.id);};controls.append(button);}
   const remove=el('button','','Remove');remove.type='button';remove.setAttribute('aria-label',`Remove ${item.label}`);remove.onclick=()=>{section.items.splice(index,1);renderEditor();};controls.append(remove);row.append(controls);fieldset.append(row);
  });
  const add=el('button','secondary add-item','+ Add item');add.type='button';add.setAttribute('aria-label',`Add item to ${section.name}`);add.onclick=()=>{const id=`custom-${crypto.randomUUID()}`;section.items.push({id,label:'New item',minutes:0});renderEditor(id);};fieldset.append(add);$('edit-sections').append(fieldset);
 }
 if(focusId)$(`edit-${focusId}`).focus();
}
$('edit-button').onclick=()=>{if(!defaults)return;draft=structuredClone(routineFor(defaults,state));$('edit-error').textContent='';renderEditor();$('editor').showModal();};
for(const button of document.querySelectorAll('.close-editor'))button.onclick=()=>$('editor').close();
$('edit-form').onsubmit=event=>{event.preventDefault();try{
 for(const item of draft.flatMap(s=>s.items)){item.label=item.label.trim();if(!item.label||!Number.isFinite(item.minutes)||item.minutes<0||item.minutes>1440)throw new Error('Each item needs a name and minutes from 0 to 1,440.');}
 state=editsFrom(defaults,draft,state);save();render();$('editor').close();
}catch(error){$('edit-error').textContent=error.message;}};
$('reset-button').onclick=async()=>{if(await confirmAction('A fresh start?','Clear all checkmarks and “Not needed” choices for your next overnight. Your edited routine stays the same.','Start fresh')){state.progress={};save();refreshStats();}};
$('help-button').onclick=()=>$('help').showModal();$('close-help').onclick=()=>$('help').close();
$('restore-defaults').onclick=async()=>{if(await confirmAction('Restore the original routine?','Remove your local task edits and additions. Matching checkmarks stay saved. Export a backup first if you want to keep your edits.','Restore routine')){state={...freshState(),progress:state.progress};storageBlocked=false;save();render();$('backup-status').textContent='Original routine restored.';}};
$('export-button').onclick=()=>{
 let content=JSON.stringify({app:'overnight-packing-prep',exportedAt:new Date().toISOString(),state},null,2);
 if(storageBlocked){try{content=localStorage.getItem(KEY)||content;}catch{}}
 const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const a=el('a');a.href=url;a.download=`overnight-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);$('backup-status').textContent='Backup export started. Keep the downloaded JSON file.';
};
$('import-file').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;
 try{if(file.size>1000000)throw new Error('Choose a backup smaller than 1 MB.');const data=JSON.parse(await file.text());if(data.app!=='overnight-packing-prep')throw new Error('Choose an Overnight backup JSON file.');const incoming=validateState(data.state);
 if(await confirmAction('Import this backup?','Replace the current progress and personal edits on this device with this backup.','Import backup')){state=incoming;storageBlocked=false;save();render();$('backup-status').textContent='Backup imported.';}
 }catch(error){$('backup-status').textContent=`Couldn’t import: ${error.message}`;}finally{event.target.value='';}
};
window.addEventListener('storage',event=>{if(event.key===KEY&&!$('editor').open){try{state=event.newValue?validateState(JSON.parse(event.newValue)):freshState();storageBlocked=false;render();status('Synced with your other open tab');}catch{status('Another tab saved unreadable data',true);}}});
async function prepareOffline(){
 if(!('serviceWorker' in navigator)){ $('offline-status').textContent='Offline access isn’t supported in this browser.';return;}
 try{
  const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
  const offer=worker=>{waitingWorker=worker;$('update-button').hidden=false;};if(registration.waiting)offer(registration.waiting);
  registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)offer(worker);if(worker.state==='redundant')$('offline-status').textContent='Offline setup failed. Reopen online to retry.';});});
  await navigator.serviceWorker.ready;
  const setOfflineLabel=()=>$('offline-status').textContent=navigator.onLine?'Ready for offline use':'Offline · Your routine is still here';setOfflineLabel();window.addEventListener('online',setOfflineLabel);window.addEventListener('offline',setOfflineLabel);
  let refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(waitingWorker&&!refreshing){refreshing=true;location.reload();}});
  $('update-button').onclick=()=>{waitingWorker?.postMessage({type:'SKIP_WAITING'});};
 }catch{$('offline-status').textContent='Offline setup unavailable. Reopen online to retry.';}
}
try{
 const response=await fetch('./routine.json');if(!response.ok)throw new Error('Routine unavailable');defaults=await response.json();load();render();prepareOffline();
}catch(error){$('sections').replaceChildren(el('p','error','Your routine couldn’t load. Please reopen this page while online.'));$('edit-button').disabled=true;$('reset-button').disabled=true;$('restore-defaults').disabled=true;$('offline-status').textContent='Offline setup incomplete';}
