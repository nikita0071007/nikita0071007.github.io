import assert from 'node:assert/strict';
import {test} from 'node:test';
import {HISTORY_KEY, MEETING_AREA, createHouseHistory, createTerraceMeetings} from '../life/house-life.js';

const ids = ['community','analyst','producer','resident-lena'];
const storage = (initial=null) => {
  const values = new Map([[HISTORY_KEY,initial]]);
  return {getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
};

test('meeting history, shared counts and pause survive a reload',()=>{
  const data = storage();
  const history = createHouseHistory(ids,data);
  assert.equal(history.count('community','analyst'),0);
  history.record('community','analyst');
  history.record('analyst','community');
  assert.equal(history.record('community','coach'),null);
  history.setRunning(false);
  const loaded = createHouseHistory(ids,data);
  assert.equal(loaded.running,false);
  assert.equal(loaded.count('community','analyst'),2);
  assert.equal(loaded.total,2);
  assert.deepEqual(loaded.journal.map(event=>event.count),[2,1]);
  for(let i=0;i<30;i++) loaded.record('community','analyst');
  assert.equal(loaded.journal.length,24);
  assert.equal(loaded.journal[0].count,32);
});

test('another open tab can save without replacing recent meetings',()=>{
  const data = storage();
  const first = createHouseHistory(ids,data), second = createHouseHistory(ids,data);
  first.record('community','analyst');
  second.record('analyst','community');
  assert.equal(createHouseHistory(ids,data).count('analyst','community'),2);
});

test('corrupt, stale and blocked storage preserve a usable session',()=>{
  const history = createHouseHistory(ids,storage('{'));
  assert.equal(history.running,true);
  const stale = createHouseHistory(ids,storage(JSON.stringify({version:1,pairs:{'coach|community':19,'community|producer':1},journal:[{a:'coach',b:'community',count:19}]})));
  assert.equal(stale.total,1);
  assert.deepEqual(stale.journal,[]);
  const blocked = createHouseHistory(ids,{getItem(){throw new Error('blocked')},setItem(){throw new Error('blocked')}});
  blocked.record('community','analyst');
  blocked.setRunning(false);
  assert.equal(blocked.saved,false);
  assert.equal(blocked.running,false);
  assert.equal(blocked.total,1);
});

function simulate(count) {
  const history = createHouseHistory(ids,storage());
  const entries = ids.slice(0,count).map(id=>{
    const person = {userData:{id},rotation:{y:0},position:{set(x,y,z){Object.assign(this,{x,y,z})}}};
    const avatar = {
      faceTowards(host,heading){host.rotation.y=heading;return true},
      duration:()=>1,
      updateScene(dt,host,pose,speaking){this.pose=pose;this.speaking=speaking}
    };
    return {person,avatar};
  });
  const departed = [];
  const meetings = createTerraceMeetings({history,available:()=>entries,onEnter(){},onChange(){},onLeave:({person})=>departed.push(person)});
  const until = predicate=>{
    for(let step=0;step<900&&!predicate();step++) meetings.update(.05);
    assert.ok(predicate(),'simulation did not reach the expected phase');
  };
  return {history,entries,departed,meetings,until};
}

test('two actors arrive, take turns talking, leave and record exactly once',()=>{
  const {history,entries,departed,meetings,until}=simulate(2);
  until(()=>meetings.meeting?.phase==='arriving');
  assert.ok(meetings.has(entries[0].person));
  until(()=>meetings.meeting?.phase==='talking');
  for(let i=0;i<2;i++){
    const {person,avatar}=entries[i];
    const seat=MEETING_AREA.seats[i];
    assert.equal(person.position.x,seat.x);
    assert.equal(person.position.z,seat.z);
    assert.equal(person.rotation.y,seat.heading);
    assert.equal(avatar.pose,'SitDown');
    assert.equal(avatar.speaking,i===0);
  }
  until(()=>meetings.meeting.line===1);
  assert.equal(entries[1].avatar.speaking,true);
  assert.equal(entries[0].avatar.speaking,false);
  assert.equal(history.total,0);
  until(()=>meetings.meeting===null);
  assert.equal(history.total,1);
  assert.deepEqual(departed,entries.map(entry=>entry.person));
});

test('pausing freezes a scene, and manual selection cancels incomplete meetings',()=>{
  const {history,entries,departed,meetings,until}=simulate(2);
  until(()=>meetings.meeting?.phase==='talking');
  history.setRunning(false);
  const {phase,elapsed}=meetings.meeting;
  for(let step=0;step<250;step++) meetings.update(.05);
  assert.equal(meetings.meeting.phase,phase);
  assert.equal(meetings.meeting.elapsed,elapsed);
  history.setRunning(true);
  until(()=>meetings.meeting.line===1);
  meetings.cancelIfInvolved(entries[0].person);
  assert.equal(meetings.meeting,null);
  assert.equal(history.total,0);
  assert.equal(departed.length,2);
});

test('a rotating group reconnects with people it already knows',()=>{
  const {history,meetings,until}=simulate(4);
  for(let n=1;n<=3;n++) until(()=>history.total===n&&meetings.meeting===null);
  assert.deepEqual(history.journal.map(({count})=>count),[2,1,1]);
  assert.equal(new Set(history.journal.flatMap(({a,b})=>[a,b])).size,4);
});
