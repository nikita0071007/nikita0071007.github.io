export const HISTORY_KEY = 'gusevmade-house-meetings-v1';
const JOURNAL_LIMIT = 24;
export const MEETING_AREA = {
  x: 7.75,
  z: 16.2,
  floor: .67,
  seats: [
    {x: 6.86, z: 16.25, heading: Math.PI / 2, path: [[5.25, 18.4], [6.86, 17.72], [6.86, 16.25]]},
    {x: 8.64, z: 16.25, heading: -Math.PI / 2, path: [[10.25, 18.4], [8.64, 17.72], [8.64, 16.25]]}
  ]
};

const pairKey = (a, b) => a < b ? a + '|' + b : b + '|' + a;

export function createHouseHistory(ids, storage) {
  const residents = new Set(ids);
  const validPair = (a, b) => a !== b && residents.has(a) && residents.has(b);

  function read() {
    try {
      const data = JSON.parse(storage?.getItem(HISTORY_KEY) || 'null');
      if (data?.version !== 1) return null;
      const pairs = {};
      for (const [key, value] of Object.entries(data.pairs || {})) {
        const [a, b, extra] = key.split('|');
        if (!extra && validPair(a, b) && Number.isInteger(value) && value > 0) {
          pairs[pairKey(a, b)] = Math.min(999, value);
        }
      }
      const journal = Array.isArray(data.journal) ? data.journal.filter(event =>
        event && validPair(event.a, event.b) && Number.isInteger(event.count) &&
        event.count > 0 && event.count <= 999
      ).slice(0, JOURNAL_LIMIT).map(({a, b, count}) => ({a, b, count})) : [];
      return {version: 1, running: data.running !== false, pairs, journal};
    } catch {
      return null;
    }
  }

  let state = read() || {version: 1, running: true, pairs: {}, journal: []};
  let saved = null;
  function save() {
    try {
      if (!storage) throw new Error('Storage unavailable');
      storage.setItem(HISTORY_KEY, JSON.stringify(state));
      saved = true;
    } catch {
      saved = false;
    }
  }

  return {
    get running() { return state.running; },
    get journal() { return state.journal; },
    get saved() { return saved; },
    get total() { return Object.values(state.pairs).reduce((sum, value) => sum + value, 0); },
    count(a, b) { return state.pairs[pairKey(a, b)] || 0; },
    setRunning(running) {
      if (saved !== false) state = read() || state;
      state.running = running;
      save();
    },
    record(a, b) {
      if (!validPair(a, b)) return null;
      // Read the latest completed meetings before saving from another open tab.
      if (saved !== false) state = read() || state;
      const key = pairKey(a, b);
      const count = Math.min(999, (state.pairs[key] || 0) + 1);
      state.pairs[key] = count;
      const event = {a, b, count};
      state.journal = [event, ...state.journal].slice(0, JOURNAL_LIMIT);
      save();
      return event;
    }
  };
}

function choosePair(available, history) {
  const candidates = [];
  const visits = new Map(available.map(({person})=>[person.userData.id,0]));
  for (let i = 0; i < available.length; i++) {
    for (let j = i + 1; j < available.length; j++) {
      const first = available[i], second = available[j];
      const a = first.person.userData.id, b = second.person.userData.id;
      const count = history.count(a,b);
      visits.set(a,visits.get(a)+count);
      visits.set(b,visits.get(b)+count);
      candidates.push({first,second,a,b,count});
    }
  }
  const last = history.journal[0];
  const others = last ? candidates.filter(({a,b})=>pairKey(a,b)!==pairKey(last.a,last.b)) : candidates;
  const pool = others.length ? others : candidates;
  const returning = history.total % 3 === 2;
  pool.sort((a,b)=>{
    const known = returning ? Number(b.count>0)-Number(a.count>0) : a.count-b.count;
    return known || visits.get(a.a)+visits.get(a.b)-visits.get(b.a)-visits.get(b.b);
  });
  return pool[0];
}

function linesFor(count) {
  if (!count) return ['Привет! Можно присесть?', 'Конечно. Как проходит день?', 'Хорошо. Здесь приятно отдохнуть.'];
  if (count < 3) return ['Приятно снова встретиться!', 'Хорошо, что нашлось время поговорить.', 'Давай увидимся здесь ещё.'];
  return ['Здорово снова встретиться!', 'Мне нравится здесь с тобой общаться.', 'Договорились, до следующей встречи!'];
}

export function createTerraceMeetings({history, available, onEnter, onLeave, onChange}) {
  let meeting = null, delay = .85;
  const lineTime = 2.15;

  function setPhase(phase) {
    meeting.phase = phase;
    meeting.elapsed = 0;
    onChange();
  }

  function begin() {
    const pair = choosePair(available(), history);
    if (!pair) return false;
    const actors = [pair.first, pair.second].map((entry, side)=>({
      ...entry, seat: MEETING_AREA.seats[side], side, next: 1, pose: 'Idle'
    }));
    meeting = {
      actors, phase: 'arriving', elapsed: 0, line: 0,
      lines: linesFor(history.count(pair.a, pair.b)), a: pair.a, b: pair.b
    };
    for (const actor of actors) {
      const [x,z] = actor.seat.path[0];
      actor.person.position.set(x, MEETING_AREA.floor, z);
      actor.person.rotation.y = 0;
      onEnter(actor);
    }
    onChange();
    return true;
  }

  function finish() {
    for (const actor of meeting.actors) onLeave(actor);
    meeting = null;
    delay = 6;
    onChange();
  }

  function walk(actor, dt, leaving) {
    const path = actor.seat.path;
    const target = path[actor.next];
    if (!target) return true;
    const {position,rotation} = actor.person;
    const [x,z] = target;
    const dx = x-position.x, dz = z-position.z;
    const distance = Math.hypot(dx,dz);
    if (distance < .018) {
      position.set(x, MEETING_AREA.floor, z);
      actor.next += leaving ? -1 : 1;
      return !path[actor.next];
    }
    const heading = Math.atan2(dx,dz);
    actor.avatar.faceTowards(actor.person, heading, dt);
    if (Math.cos(heading-rotation.y) > .91) {
      const stride = Math.min(distance, 1.17*dt);
      position.x += dx*stride/distance;
      position.z += dz*stride/distance;
      actor.pose = 'Walk';
    }
    return false;
  }

  return {
    get meeting() { return meeting; },
    has(person) { return meeting?.actors.some(actor=>actor.person===person) ?? false; },
    cancelIfInvolved(person) {
      if (this.has(person)) finish();
    },
    update(dt) {
      if (!history.running) return;
      if (!meeting) {
        delay -= dt;
        if (delay <= 0 && !begin()) delay = .7;
        return;
      }
      const {actors,phase} = meeting;
      meeting.elapsed += dt;
      for (const actor of actors) actor.pose = 'Idle';
      if (phase === 'arriving' || phase === 'leaving') {
        const reached = actors.map(actor=>walk(actor,dt,phase==='leaving'));
        if (reached.every(Boolean)) {
          if (phase === 'leaving') {
            finish();
            return;
          }
          setPhase('turning');
        }
      } else if (phase === 'turning') {
        if (actors.map(actor=>actor.avatar.faceTowards(actor.person,actor.seat.heading,dt)).every(Boolean)) {
          setPhase('sitting');
        }
      } else if (phase === 'sitting' || phase === 'rising') {
        const pose = phase==='sitting'?'SitDown':'StandUp';
        for (const actor of actors) actor.pose = pose;
        const duration = Math.max(...actors.map(actor=>actor.avatar.duration(pose))) + .08;
        if (meeting.elapsed >= duration) {
          if (phase === 'sitting') {
            setPhase('talking');
          } else {
            for (const actor of actors) actor.next = actor.seat.path.length-2;
            setPhase('leaving');
          }
        }
      } else if (phase === 'talking') {
        for (const actor of actors) actor.pose = 'SitDown';
        const nextLine = Math.floor(meeting.elapsed/lineTime);
        if (nextLine >= meeting.lines.length) {
          history.record(meeting.a,meeting.b);
          setPhase('rising');
        } else if (nextLine !== meeting.line) {
          meeting.line = nextLine;
          onChange();
        }
      }

      const speaker = meeting.phase==='talking'?meeting.line%2:-1;
      for (const actor of actors) actor.avatar.updateScene(dt,actor.person,actor.pose,speaker===actor.side);
    }
  };
}
