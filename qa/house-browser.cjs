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
const server = http.createServer(async(req,res)=>{
  try {
    const pathname = new URL(req.url,'http://localhost').pathname;
    if (!pathname.startsWith('/life/')) {res.writeHead(404);res.end();return}
    const file = path.join(root,pathname);
    let data = await fs.readFile(file);
    if(pathname==='/life/mountain.html')data=Buffer.from(data.toString().replace('</script></body></html>',debug+'\n</script></body></html>'));
    res.setHeader('content-type',{'.html':'text/html; charset=utf-8','.js':'text/javascript','.glb':'model/gltf-binary'}[path.extname(file)]||'application/octet-stream');
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
  await page.route(url=>['/life/human-character.js','/life/liza-face.js','/life/house-life.js'].includes(url.pathname)&&!url.search,
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
async function run(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
  try{
    const errors=[];
    await mobileTest(browser,base,errors);
    await desktopTest(browser,base,errors);
    assert.deepEqual(errors,[]);
  }finally{
    await browser.close();
    server.close();
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;server.close()});
