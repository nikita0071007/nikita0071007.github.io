const {chromium} = require('playwright');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname,'..');
const vendor = path.join(root,'node_modules/three');
const out = path.join(root,'life-qa');
const debug = `
globalThis.lifeQA = (details = false) => {
  const m=houseMeetings.meeting;
  return {
    webgl:renderer.getContext().getParameter(renderer.getContext().VERSION),
    draws:renderer.info.render.calls,loaded:models.size,quality:renderer.getPixelRatio(),
    active:activePerson?.userData.id,detailed:!!activePerson?.userData.detailedHuman,
    position:activePerson?.position.toArray(),phase:human?.phase,
    running:houseHistory.running,total:houseHistory.total,storage:houseHistory.saved,
    journal:houseHistory.journal,visible:!document.hidden,
    meeting:m&&{phase:m.phase,elapsed:m.elapsed,line:m.line,actors:m.actors.map(({person,avatar,pose})=>({
      id:person.userData.id,name:person.userData.name,position:person.position.toArray(),pose,
      hips:avatar.object.getObjectByName('Hips').getWorldPosition(new T.Vector3()).y,
      speech:avatar.object.getObjectByName('LizaSmile').morphTargetInfluences[1],
      sole:details?new T.Box3().setFromObject(avatar.object,true).min.y:null
    }))},
    status:document.getElementById('status').textContent
  };
};`;
const officeDebug = `globalThis.officeQA=(detailed=false)=>{
  const office=scene.getObjectByName('Office interior');
  const subject=roomMode==='upstairs'?upperInterior:roomMode==='garden'?grounds.getObjectByName('Garden and terraces'):office;
  const project=point=>{
    const projected=point.project(camera);
    return [(projected.x+1)*innerWidth/2,(1-projected.y)*innerHeight/2];
  };
  const state={zone:roomZone,mode:roomMode,draws:renderer.info.render.calls,
    models:models.size,fov:camera.fov,camera:camera.position.toArray(),target:controls.target.toArray(),
    background:scene.background.getHex(),fog:!!scene.fog,groups:[upperLevel,facade,grounds,stairs].map(group=>group.visible),
    interiors:[officeInterior.visible,upperInterior.visible],
    workers:people.filter(person=>person.visible&&person.position.y<5.8).length,
    upper:people.filter(person=>person.visible&&person.position.y>=5.8).length,
    occupants:people.filter(person=>person.visible).map(person=>person.userData.id),
    parts:subject.children.filter(mesh=>mesh.isInstancedMesh).reduce((sum,mesh)=>sum+mesh.count,0),
    icons:office.children.filter(mesh=>mesh.name.startsWith('Yuri icon ')).map(mesh=>({
      name:mesh.name,ready:mesh.visible&&!!mesh.material.map?.image?.naturalWidth
    }))};
  if(detailed){
    const bounds=new T.Box3().setFromObject(subject);
    state.seats=[];
    const mat=new T.Matrix4(),position=new T.Vector3();
    for(const mesh of office.children){
      if(!mesh.isInstancedMesh)continue;
      for(let i=0;i<mesh.count;i++){
        mesh.getMatrixAt(i,mat);
        position.setFromMatrixPosition(mat);
        if(Math.abs(position.y-1.039)<.0001&&position.x>7&&position.x<10.6&&position.z>3&&position.z<6){
          state.seats.push([position.x,position.z]);
        }
      }
    }
    state.corners=[];
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
      state.corners.push(project(new T.Vector3(x,y,z)));
    }
    const worker=peopleById.get('analyst');
    state.vera=project(worker.position.clone().add(new T.Vector3(0,1.43,0)));
    state.veraHome=worker.position.distanceTo(new T.Vector3(worker.userData.baseX,worker.userData.baseY,worker.userData.baseZ))<.01;
  }
  return state;
};
`;
const server = http.createServer(async(req,res)=>{
  try {
    const pathname = new URL(req.url,'http://localhost').pathname;
    if (!pathname.startsWith('/life/')) {res.writeHead(404);res.end();return}
    const file = path.join(root,pathname);
    let data = await fs.readFile(file);
    if(pathname==='/life/mountain.html')data=Buffer.from(data.toString().replace('</script></body></html>',debug+officeDebug+'\n</script></body></html>'));
    res.setHeader('content-type',{'.html':'text/html; charset=utf-8','.js':'text/javascript','.glb':'model/gltf-binary','.jpg':'image/jpeg'}[path.extname(file)]||'application/octet-stream');
    res.end(data);
  }catch{
    res.writeHead(404);res.end();
  }
});
const report = (page,details=false)=>page.evaluate(detail=>lifeQA(detail),details);
const phase = (page,name)=>page.waitForFunction(name=>lifeQA().meeting?.phase===name,name,{timeout:40000});
async function configure(page,errors){
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',req=>{
    if(!['GET','HEAD'].includes(req.method()))errors.push('Unexpected HTTP '+req.method());
  });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.160.1/**',route=>{
    const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.160.1/','');
    return route.fulfill({path:path.join(vendor,rel),contentType:'text/javascript'});
  });
  await page.route('https://raw.githubusercontent.com/nikita0071007/office/main/status.json*',route=>
    route.fulfill({path:path.join(out,'status.json'),contentType:'application/json'}));
  await page.route(url=>['/life/human-character.js','/life/liza-face.js','/life/house-life.js','/life/office-interior.js','/life/villa-decor.js','/life/villa-rooms.js','/life/yuri-cabinet.js'].includes(url.pathname)&&!url.search,
    route=>route.fulfill({status:409,body:'Unversioned module'}));
}
async function mobileTest(browser,base,errors){
  const viewport={width:390,height:844};
  const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:true,hasTouch:true,
    recordVideo:{dir:path.join(out,'recordings'),size:viewport}});
  const page=await context.newPage();
  const video=page.video();
  await configure(page,errors);
  await page.addInitScript(()=>localStorage.setItem('gusevmade-mountain-quality','economy'));
  const assets=[];
  page.on('request',req=>{
    const pathname=new URL(req.url()).pathname;
    if(pathname.endsWith('.glb'))assets.push(pathname);
  });
  const url=base+'/life/mountain.html?life=1';
  try{
    await page.goto(url);
    await page.locator('#lifePanel').waitFor();
    const panel=await page.locator('#lifePanel').boundingBox();
    assert.ok(panel.x>=0&&panel.y>=viewport.height/2&&panel.x+panel.width<=viewport.width&&panel.y+panel.height<=viewport.height,panel);
    await phase(page,'arriving');
    const start=await report(page);
    assert.match(start.webgl,/WebGL/);
    assert.ok(start.draws>100);
    assert.equal(start.loaded,2);
    assert.deepEqual(assets,['/life/assets/liza.glb','/life/assets/crew/analyst.glb']);
    assert.equal(start.quality,.65);
    await page.waitForFunction(x=>lifeQA().meeting?.actors[0].position[0]>x+.35,start.meeting.actors[0].position[0]);
    const walking=await report(page,true);
    assert.equal(walking.meeting.actors[0].pose,'Walk');
    assert.ok(walking.meeting.actors.every(actor=>actor.sole>=.65));
    await page.screenshot({path:path.join(out,'terrace-walking.png')});
    await phase(page,'talking');
    await page.waitForFunction(()=>lifeQA().meeting.actors[0].speech>.27);
    const seated=await report(page,true);
    assert.ok(seated.meeting.actors.every((actor,i)=>actor.hips<start.meeting.actors[i].hips-.15&&Math.abs(actor.sole-.67)<.03));
    await page.locator('#lifeBubble').waitFor();
    assert.match(await page.locator('#lifeBubble').textContent(),/Лиза.*Привет/);
    await page.screenshot({path:path.join(out,'terrace-mobile.png')});
    await page.waitForFunction(()=>lifeQA().meeting.line===1&&lifeQA().meeting.actors[1].speech>.27);
    assert.match(await page.locator('#lifeBubble').textContent(),/Вера.*Привет/);
    await phase(page,'rising');
    assert.equal((await report(page)).total,1);
    await phase(page,'leaving');
    await page.getByText('Журнал встреч',{exact:true}).tap();
    await page.locator('#lifeJournal li').first().waitFor();
    assert.match(await page.locator('#lifeJournal li').first().textContent(),/Лиза и Вера познакомились/);
    await page.waitForFunction(()=>lifeQA().meeting===null);
    await page.screenshot({path:path.join(out,'terrace-journal.png')});
    // Close the recording after one complete meeting. Persistence is checked on a new page.
    await page.close();
  }finally{
    await context.close();
  }
  await video.saveAs(path.join(out,'terrace-mobile.webm'));
  console.log('Mobile WebGL meeting passed: walking, seating, turn-taking, feet and one saved event');

  // Use a fresh mobile context for pause, reload, and manual controls.
  const mobile=await browser.newPage({viewport,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await configure(mobile,errors);
  await mobile.addInitScript(()=>localStorage.setItem('gusevmade-mountain-quality','economy'));
  await mobile.goto(url);
  await phase(mobile,'talking');
  const before=await report(mobile);
  await mobile.locator('#lifePause').tap();
  const paused=await report(mobile);
  await mobile.waitForTimeout(500);
  assert.equal((await report(mobile)).meeting.elapsed,paused.meeting.elapsed);
  assert.equal(paused.running,false);
  assert.ok(await mobile.locator('#lifeBubble').isHidden());
  await mobile.locator('#lifePause').tap();
  await mobile.waitForFunction(()=>lifeQA().total===1);
  await mobile.locator('#lifePause').tap();
  const saved=await report(mobile);
  assert.equal(saved.storage,true);
  await mobile.reload();
  const reloaded=await report(mobile);
  assert.equal(reloaded.running,false);
  assert.equal(reloaded.meeting,null);
  assert.deepEqual(reloaded.journal,saved.journal);
  await mobile.getByText('Журнал встреч',{exact:true}).tap();
  assert.match(await mobile.locator('#lifeJournal li').first().textContent(),/познакомились/);
  await mobile.locator('#lifePause').tap();
  await phase(mobile,'arriving');
  const frozen=await mobile.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,value:true});
    document.dispatchEvent(new Event('visibilitychange'));
    return lifeQA().meeting.actors.map(actor=>actor.position);
  });
  await mobile.waitForTimeout(600);
  assert.deepEqual((await report(mobile)).meeting.actors.map(actor=>actor.position),frozen);
  await mobile.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))});
  await phase(mobile,'talking');
  await mobile.locator('#humanFocus').tap();
  await mobile.getByText('На террасе. Выбери действие.',{exact:true}).waitFor();
  const manual=await report(mobile);
  assert.equal(manual.active,'community');
  assert.equal(manual.meeting,null);
  assert.equal(manual.total,1);
  await mobile.getByRole('button',{name:'Ходить'}).tap();
  await mobile.waitForFunction(z=>Math.abs(lifeQA().position[2]-z)>.28,manual.position[2]);
  assert.ok(await mobile.locator('#lifePanel').isHidden());
  assert.equal(before.loaded,2);
  await mobile.close();
  console.log('Pause, journal reload, background freeze, and handover to manual controls passed');
}
async function desktopTest(browser,base,errors){
  const desktop=await browser.newPage({viewport:{width:1040,height:720},deviceScaleFactor:1});
  await configure(desktop,errors);
  await desktop.addInitScript(()=>localStorage.setItem('gusevmade-mountain-quality','normal'));
  let attempts=0;
  await desktop.route(url=>url.pathname==='/life/assets/liza.glb',route=>{
    attempts++;
    return attempts===1?route.fulfill({status:503,body:'Intentional model download failure'}):route.continue();
  });
  await desktop.goto(base+'/life/mountain.html?liza=1');
  await desktop.getByRole('button',{name:'Повторить загрузку'}).waitFor();
  assert.equal((await report(desktop)).detailed,false);
  await desktop.getByRole('button',{name:'Повторить загрузку'}).click();
  await desktop.getByText('На террасе. Выбери действие.',{exact:true}).waitFor();
  assert.equal((await report(desktop)).detailed,true);
  await desktop.locator('#lifeFocus').click();
  await phase(desktop,'talking');
  await desktop.locator('#lifeBubble').waitFor();
  const header=await desktop.locator('header').boundingBox();
  const bubble=await desktop.locator('#lifeBubble').boundingBox();
  assert.ok(bubble.y>=header.y+header.height,JSON.stringify({header,bubble}));
  await desktop.screenshot({path:path.join(out,'terrace-desktop.png')});
  await desktop.waitForFunction(()=>lifeQA().loaded===13,null,{timeout:40000});
  const state=await report(desktop);
  assert.match(state.status,/из 10 рабочих статусов/);
  assert.match(state.webgl,/WebGL/);
  assert.equal(await desktop.getByRole('link',{name:'2D'}).getAttribute('href'),'./mobile.html');
  await desktop.close();
  console.log('Desktop: failure fallback, retry, scene, 13 models, status GET and 2D link passed');
}
const officeState=(page,detailed=false)=>page.evaluate(detail=>officeQA(detail),detailed);
async function checkOfficeBounds(page){
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const {corners}=await officeState(page,true);
  const {width,height}=page.viewportSize();
  const header=await page.locator('header').boundingBox();
  const panel=await page.locator('#officePanel').boundingBox();
  assert.ok(panel.x>=0&&panel.x+panel.width<=width&&panel.y+panel.height<=height);
  for(const [x,y] of corners){
    assert.ok(x>=0&&x<=width&&y>=header.y+header.height-3&&y<=panel.y+3,
      JSON.stringify({point:[x,y],header,panel,viewport:[width,height]}));
  }
}
async function officeTest(browser,base,errors){
  const url=base+'/life/mountain.html';
  const desktop=await browser.newPage({viewport:{width:1360,height:900},deviceScaleFactor:1});
  await configure(desktop,errors);
  await desktop.addInitScript(()=>{
    localStorage.setItem('gusevmade-mountain-quality','normal');
    localStorage.setItem('gusevmade-house-meetings-v1',JSON.stringify({version:1,running:false,pairs:{},journal:[]}));
  });
  await desktop.goto(url+'?office=1');
  await desktop.locator('#officePanel').waitFor();
  await desktop.waitForFunction(()=>officeQA().models===13,null,{timeout:30000});
  await checkOfficeBounds(desktop);
  const overview=await officeState(desktop);
  assert.equal(overview.zone,'overview');
  assert.deepEqual(overview.groups,[false,false,false,false]);
  assert.equal(overview.workers,9);
  assert.equal(overview.upper,0);
  assert.equal(overview.fov,34);
  assert.ok(overview.parts>700&&overview.draws<250,JSON.stringify(overview));
  await desktop.screenshot({path:path.join(out,'office-overview.png')});
  for(const name of ['work','security','editorial','meeting','kitchen','lounge']){
    const tab=desktop.locator('[data-office-zone="'+name+'"]');
    await tab.click();
    assert.equal(await tab.getAttribute('aria-pressed'),'true');
    const state=await officeState(desktop);
    assert.equal(state.zone,name);
    assert.notDeepEqual(state.target,overview.target);
    if(['security','editorial','kitchen','meeting'].includes(name))await desktop.screenshot({path:path.join(out,'office-'+name+'.png')});
  }
  const beforeNight=await officeState(desktop);
  await desktop.locator('#night').click();
  assert.notEqual((await officeState(desktop)).background,beforeNight.background);
  await desktop.locator('#night').click();
  await desktop.locator('#labels').click();
  assert.equal(await desktop.locator('#labels').getAttribute('aria-pressed'),'true');
  await desktop.locator('#labels').click();
  await desktop.mouse.move(620,400);
  await desktop.mouse.down();
  await desktop.mouse.move(717,446,{steps:6});
  await desktop.mouse.up();
  assert.notDeepEqual((await officeState(desktop)).camera,beforeNight.camera);
  await desktop.waitForTimeout(750);
  await desktop.locator('[data-office-zone=work]').click();
  await desktop.waitForTimeout(250);
  const {vera}=await officeState(desktop,true);
  await desktop.mouse.click(...vera);
  await desktop.getByText('На террасе. Выбери действие.',{exact:true}).waitFor();
  assert.equal((await report(desktop)).active,'analyst');
  assert.ok(await desktop.locator('#officePanel').isHidden());
  assert.deepEqual((await officeState(desktop)).groups,[true,true,true,true]);
  await desktop.locator('#ground').click();
  assert.equal((await officeState(desktop,true)).veraHome,true);
  await desktop.locator('#lifeFocus').click();
  await desktop.locator('#lifePanel').waitFor();
  assert.ok(await desktop.locator('#officePanel').isHidden());
  assert.deepEqual((await officeState(desktop)).groups,[true,true,true,true]);
  await desktop.locator('#ground').click();
  await desktop.locator('#officeClose').click();
  assert.equal((await officeState(desktop)).fov,46);
  assert.equal(await desktop.locator('#ground').evaluate(element=>element===document.activeElement),true);
  await desktop.close();
  console.log('Office desktop: full cutaway, 13 models, four zone controls, orbit, selecting and returning a resident, terrace and house passed');

  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await configure(mobile,errors);
  await mobile.addInitScript(()=>localStorage.setItem('gusevmade-mountain-quality','economy'));
  await mobile.goto(url+'?office=meeting');
  await mobile.locator('#officePanel').waitFor();
  assert.equal((await officeState(mobile)).zone,'meeting');
  await mobile.getByRole('button',{name:'Обзор',exact:true}).tap();
  await checkOfficeBounds(mobile);
  const tabWidth=await mobile.locator('#officeTabs').evaluate(tabs=>[tabs.clientWidth,tabs.scrollWidth]);
  assert.ok(tabWidth[1]<=tabWidth[0]+1,JSON.stringify(tabWidth));
  await mobile.screenshot({path:path.join(out,'office-mobile.png')});
  await mobile.getByRole('button',{name:'Отдых',exact:true}).tap();
  assert.equal((await officeState(mobile)).zone,'lounge');
  await mobile.screenshot({path:path.join(out,'office-mobile-lounge.png')});
  await mobile.getByRole('button',{name:'Обзор',exact:true}).tap();
  await mobile.setViewportSize({width:844,height:390});
  await mobile.waitForTimeout(350);
  await checkOfficeBounds(mobile);
  await mobile.screenshot({path:path.join(out,'office-landscape.png')});
  const economy=await report(mobile);
  assert.equal(economy.quality,.65);
  assert.equal(economy.loaded,0);
  await mobile.locator('#officeClose').tap();
  assert.deepEqual((await officeState(mobile)).groups,[true,true,true,true]);
  await mobile.goto(url.replace('mountain.html','mobile.html'));
  const fallback=await mobile.locator('#office').evaluate(c=>[c.width,c.height]);
  assert.ok(fallback.every(size=>size>200));
  await mobile.close();
  console.log('Office mobile: portrait and landscape framing, taps, economy mode and mobile 2D canvas passed');
}

async function villaTest(browser,base,errors){
  const url=base+'/life/mountain.html';
  const desktop=await browser.newPage({viewport:{width:1360,height:900},deviceScaleFactor:1});
  await configure(desktop,errors);
  await desktop.addInitScript(()=>{
    localStorage.setItem('gusevmade-mountain-quality','normal');
    localStorage.setItem('gusevmade-house-meetings-v1',JSON.stringify({version:1,running:false,pairs:{},journal:[]}));
  });
  await desktop.goto(url+'?upstairs=1');
  await desktop.locator('#officePanel').waitFor();
  await desktop.waitForFunction(()=>officeQA().models===13,null,{timeout:35000});
  await checkOfficeBounds(desktop);
  const upstairs=await officeState(desktop);
  assert.equal(upstairs.mode,'upstairs');
  assert.equal(upstairs.zone,'overview');
  assert.deepEqual(upstairs.groups,[false,false,false,false]);
  assert.deepEqual(upstairs.interiors,[false,true]);
  assert.deepEqual(upstairs.occupants.sort(),['resident-grandma','resident-lena','resident-nikita','video']);
  assert.ok(upstairs.draws>35&&upstairs.draws<220,JSON.stringify(upstairs));
  await desktop.screenshot({path:path.join(out,'villa-upstairs.png')});
  for(const zone of ['director','therapy','studio','grandma','gym']){
    const tab=desktop.locator('[data-office-zone="'+zone+'"]');
    await tab.click();
    assert.equal((await officeState(desktop)).zone,zone);
    assert.equal(await tab.getAttribute('aria-pressed'),'true');
    assert.notDeepEqual((await officeState(desktop)).target,upstairs.target);
    await desktop.screenshot({path:path.join(out,'villa-'+zone+'.png')});
  }
  await desktop.locator('#ground').click();
  await desktop.locator('[data-office-zone=kitchen]').click();
  const kitchen=await officeState(desktop,true);
  assert.deepEqual(kitchen.interiors,[true,false]);
  assert.equal(kitchen.seats.length,6);
  assert.equal(new Set(kitchen.seats.map(point=>point.join(','))).size,6);
  await desktop.screenshot({path:path.join(out,'villa-kitchen.png')});
  await desktop.locator('#garden').click();
  await checkOfficeBounds(desktop);
  const garden=await officeState(desktop);
  assert.equal(garden.mode,'garden');
  assert.deepEqual(garden.groups,[true,true,true,true]);
  assert.deepEqual(garden.interiors,[true,true]);
  await desktop.screenshot({path:path.join(out,'villa-garden.png')});
  await desktop.locator('#officeClose').click();
  assert.equal((await officeState(desktop)).mode,null);
  assert.equal(await desktop.locator('#garden').evaluate(element=>element===document.activeElement),true);
  await desktop.close();
  console.log('Villa desktop: upper residents, five separate room views, six real kitchen chairs, garden and house passed');

  const phone=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await configure(phone,errors);
  await phone.addInitScript(()=>localStorage.setItem('gusevmade-mountain-quality','economy'));
  await phone.goto(url+'?upstairs=gym');
  await phone.locator('#officePanel').waitFor();
  assert.equal((await officeState(phone)).zone,'gym');
  await phone.screenshot({path:path.join(out,'villa-gym-mobile.png')});
  await phone.getByRole('button',{name:'Обзор',exact:true}).tap();
  await checkOfficeBounds(phone);
  await phone.locator('#garden').tap();
  await checkOfficeBounds(phone);
  assert.equal((await officeState(phone)).fog,false);
  await phone.locator('#upper').tap();
  await phone.setViewportSize({width:844,height:390});
  await phone.waitForTimeout(350);
  await checkOfficeBounds(phone);
  await phone.screenshot({path:path.join(out,'villa-upstairs-landscape.png')});
  await phone.locator('#lifeFocus').tap();
  await phone.locator('#lifePanel').waitFor();
  assert.equal((await officeState(phone)).mode,null);
  assert.deepEqual((await officeState(phone)).interiors,[true,true]);
  if(process.env.VILLA_DETAIL_RECHECK){
    await phase(phone,'talking');
    const terrace=await report(phone,true);
    assert.ok(terrace.meeting.actors.every(actor=>Math.abs(actor.sole-.67)<.03));
  }
  await phone.close();
  console.log('Villa mobile: gym deep link, both orientations and return to the social terrace passed');
}

async function cabinetTest(browser,base,errors){
  const url=base+'/life/mountain.html';
  const desktop=await browser.newPage({viewport:{width:1360,height:900},deviceScaleFactor:1});
  await configure(desktop,errors);
  await desktop.addInitScript(()=>{
    localStorage.setItem('gusevmade-mountain-quality','normal');
    localStorage.setItem('gusevmade-house-meetings-v1',JSON.stringify({version:1,running:false,pairs:{},journal:[]}));
  });
  const requested=new Set();
  desktop.on('request',request=>{
    if(request.url().includes('/assets/icons/'))requested.add(request.url());
  });
  await desktop.goto(url+'?office=editorial');
  await desktop.waitForFunction(()=>officeQA().models===13&&officeQA().icons.length===2&&officeQA().icons.every(icon=>icon.ready),null,{timeout:40000});
  assert.equal(await desktop.locator('#officeTitle').textContent(),'Кабинет Юрия');
  assert.ok((await officeState(desktop)).occupants.includes('critic'));
  assert.equal(requested.size,2);
  assert.ok([...requested].every(asset=>asset.startsWith(base+'/life/assets/icons/')));
  await desktop.screenshot({path:path.join(out,'cabinet-yuri.png')});
  await desktop.getByRole('button',{name:'Киот',exact:true}).click();
  assert.equal((await officeState(desktop)).zone,'icons');
  assert.equal(await desktop.locator('#officeTitle').textContent(),'Киот Юрия');
  await desktop.screenshot({path:path.join(out,'cabinet-icons.png')});
  await desktop.locator('[data-office-zone=security]').click();
  assert.equal(await desktop.locator('#officeTitle').textContent(),'Пост Славика');
  await desktop.screenshot({path:path.join(out,'cabinet-security.png')});
  await desktop.locator('#upper').click();
  assert.equal((await officeState(desktop)).mode,'upstairs');
  for(const [zone,title] of [['director','Кабинет Никиты'],['therapy','Кабинет Лены'],['studio','Студия Анжелики'],['grandma','Комната бабушки Марины']]){
    await desktop.locator('[data-office-zone="'+zone+'"]').click();
    assert.equal(await desktop.locator('#officeTitle').textContent(),title);
    assert.equal((await officeState(desktop)).zone,zone);
    await desktop.screenshot({path:path.join(out,'cabinet-'+zone+'.png')});
  }
  await desktop.locator('#officeClose').click();
  assert.deepEqual((await officeState(desktop)).groups,[true,true,true,true]);
  await desktop.close();

  const phone=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await configure(phone,errors);
  await phone.addInitScript(()=>localStorage.setItem('gusevmade-mountain-quality','economy'));
  const iconURL='**/life/assets/icons/pantocrator.jpg';
  await phone.route(iconURL,route=>route.abort());
  await phone.goto(url+'?office=icons');
  await phone.waitForFunction(()=>officeQA().icons.some(icon=>icon.ready));
  assert.equal((await officeState(phone)).icons.filter(icon=>icon.ready).length,1);
  assert.equal((await officeState(phone)).zone,'icons');
  await phone.unroute(iconURL);
  await phone.reload();
  await phone.waitForFunction(()=>officeQA().icons.length===2&&officeQA().icons.every(icon=>icon.ready));
  assert.equal((await report(phone)).quality,.65);
  await phone.getByRole('button',{name:'Юрий',exact:true}).tap();
  assert.equal(await phone.locator('#officeTitle').textContent(),'Кабинет Юрия');
  await phone.screenshot({path:path.join(out,'cabinet-yuri-mobile.png')});
  await phone.getByRole('button',{name:'Обзор',exact:true}).tap();
  await phone.waitForFunction(()=>officeQA().zone==='overview');
  await checkOfficeBounds(phone);
  await phone.setViewportSize({width:844,height:390});
  await phone.waitForTimeout(350);
  await checkOfficeBounds(phone);
  await phone.locator('#lifeFocus').tap();
  await phone.locator('#lifePanel').waitFor();
  assert.equal((await officeState(phone)).mode,null);
  await phase(phone,'talking');
  const terrace=await report(phone,true);
  assert.ok(terrace.meeting.actors.every(actor=>Math.abs(actor.sole-.67)<.03));
  await phone.close();
  console.log('Cabinets: local icon textures, fallback, room titles, desktop and rotated mobile views, and terrace passed');
}

async function run(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
  try{
    const errors=[];
    await cabinetTest(browser,base,errors);
    assert.deepEqual(errors,[]);
  }finally{
    await browser.close();
    server.close();
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;server.close()});
