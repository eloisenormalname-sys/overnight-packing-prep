// Stable IDs connect default updates, personal edits, and completion state.
export function freshState() { return {schema:1, progress:{}, patches:{}, added:[], removed:[], order:{}, collapsed:{}}; }
export function validateState(value) {
  if (!value || value.schema !== 1) throw new Error('This is not an Overnight backup.');
  const result = freshState();
  const safeId = id => typeof id === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(id) && !['constructor','prototype','__proto__'].includes(id);
  const object = v => v && typeof v === 'object' && !Array.isArray(v);
  for (const key of ['progress','patches','order','collapsed']) if (!object(value[key])) throw new Error('The backup is incomplete.');
  if (!Array.isArray(value.added) || !Array.isArray(value.removed)) throw new Error('The backup is incomplete.');
  const label = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 200;
  const minutes = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1440;
  for (const [id,status] of Object.entries(value.progress)) { if(!safeId(id)||!['done','skipped'].includes(status)) throw new Error('Invalid progress.'); result.progress[id]=status; }
  for (const [id,patch] of Object.entries(value.patches)) {
    if (!safeId(id)||!object(patch)) throw new Error('Invalid edit.');
    const clean={};
    if ('label' in patch) {if(!label(patch.label)) throw new Error('Invalid task name.'); clean.label=patch.label.trim();}
    if ('minutes' in patch) {if(!minutes(patch.minutes)) throw new Error('Invalid minutes.'); clean.minutes=patch.minutes;}
    result.patches[id]=clean;
  }
  const ids=new Set();
  for(const item of value.added) {
    if (!object(item)||!safeId(item.id)||!item.id.startsWith('custom-')||ids.has(item.id)||!safeId(item.section)||!label(item.label)||!minutes(item.minutes)) throw new Error('Invalid added task.');
    ids.add(item.id); result.added.push({id:item.id,section:item.section,label:item.label.trim(),minutes:item.minutes});
  }
  for(const id of value.removed) { if(!safeId(id)) throw new Error('Invalid removed task.'); result.removed.push(id); }
  for(const [id,order] of Object.entries(value.order)) { if(!safeId(id)||!Array.isArray(order)||!order.every(safeId)) throw new Error('Invalid order.'); result.order[id]=[...new Set(order)]; }
  for(const [id,closed] of Object.entries(value.collapsed)) {if(!safeId(id)||typeof closed!=='boolean') throw new Error('Invalid section state.'); result.collapsed[id]=closed;}
  if(result.added.length > 500) throw new Error('Too many tasks.');
  return result;
}
export function routineFor(defaults,state) {
  return defaults.sections.map(section => {
    const items=[...section.items.filter(item=>!state.removed.includes(item.id)).map(item=>({...item,...state.patches[item.id]})),...state.added.filter(item=>item.section===section.id).map(item=>({...item}))];
    const order=state.order[section.id]||[];
    const ordered=order.map(id=>items.find(item=>item.id===id)).filter(Boolean);
    return {...section,items:[...ordered,...items.filter(item=>!order.includes(item.id))]};
  });
}
export function isResolved(item,state) {return state.progress[item.id]==='done'||(item.optional&&state.progress[item.id]==='skipped');}
export function totals(items,state) {return items.reduce((sum,item)=>({count:sum.count+1,done:sum.done+(isResolved(item,state)?1:0),minutes:sum.minutes+item.minutes,remaining:sum.remaining+(isResolved(item,state)?0:item.minutes)}),{count:0,done:0,minutes:0,remaining:0});}
export function editsFrom(defaults,draft,state) {
  const next={...state,patches:{},removed:[],added:[],order:{}};
  const all=draft.flatMap(s=>s.items);
  for(const base of defaults.sections.flatMap(s=>s.items)) {
    const item=all.find(i=>i.id===base.id);
    if(!item) {next.removed.push(base.id); continue;}
    const patch={};
    if(item.label!==base.label) patch.label=item.label;
    if(item.minutes!==base.minutes) patch.minutes=item.minutes;
    if(Object.keys(patch).length) next.patches[item.id]=patch;
  }
  for(const section of draft) {
    next.order[section.id]=section.items.map(i=>i.id);
    next.added.push(...section.items.filter(i=>i.id.startsWith('custom-')).map(i=>({id:i.id,label:i.label,minutes:i.minutes,section:section.id})));
  }
  return validateState(next);
}
