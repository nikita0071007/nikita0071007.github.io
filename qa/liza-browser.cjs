const { chromium } = require('playwright');
const fs=require('node:fs/promises');
const http=require('node:http');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const vendor=path.join(root,'node_modules/three');
const out=path.join(root,'life-qa');
const statusSnapshot=path.join(out,'status.json');
const debug=`
globalThis.lifeQA=()=>{
 const gl=renderer.getContext();
 const current=activePerson||liza;
 const floor=current.userData.detailedHuman ? .67 : null;
 const bounds=human?new T.Box3().setFromObject(human.object,true):null;
 return {webgl:gl.getParameter(gl.VERSION),draws:renderer.info.render.calls, people:people.length,
  detailed:!!current.userData.detailedHuman, children:current.children.length,
  position:current.position.toArray(), heading:current.rotation.y, floor,
  active:activePerson?.userData.id, loaded:models.size,
  terrace:people.filter(person=>person.position.z>13).map(person=>person.userData.id),
  sole:bounds?.min.y, camera:camera.position.toArray(), target:controls.target.toArray(),
  bone:human?.object.getObjectByName('LowerLegL')?.quaternion.toArray(),
  hips:human?.object.getObjectByName('Hips')?.getWorldPosition(new T.Vector3()).y,
  smile:human?.object.getObjectByName('LizaSmile')?.morphTargetInfluences[0],
  hand:human?.object.getObjectByName('FistR')?.getWorldPosition(new T.Vector3()).y,
  phase:human?.phase,
  visible:!document.hidden, status:document.getElementById('status').textContent};
};`;
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://test.local').pathname;
  const file=path.join(pathname.startsWith('/vendor/')?vendor:root,pathname.replace(/^\/vendor\//,''));
  let data=await fs.readFile(file);
  const type=path.extname(file);
  if(pathname==='/life/mountain.html')data=Buffer.from(data.toString().replace('</script></body></html>',debug+'\n</script></body></html>'));
  res.setHeader('content-type',{'.html':'text/html; charset=utf-8','.js':'text/javascript','.glb':'model/gltf-binary','.json':'application/json'}[type]||'application/octet-stream');
  res.end(data);
 }catch(err){res.writeHead(404);res.end('Not found')}
});
async function metrics(page){return await page.evaluate(()=>globalThis.lifeQA())}
async function config(page,violations){
 await page.route('https://cdn.jsdelivr.net/npm/three@0.160.1/**',async route=>{
  const rel=new URL(route.request().url()).pathname.replace('/npm/three@0.160.1/','');
  await route.fulfill({path:path.join(vendor,rel),contentType:'text/javascript'});
 });
 await page.route('https://raw.githubusercontent.com/nikita0071007/office/main/status.json*',async route=>{
  if(route.request().method()!=='GET')violations.push(route.request().method());
  await route.fulfill({path:statusSnapshot,contentType:'application/json'});
 });
 page.on('request',req=>{if(!['GET','HEAD'].includes(req.method()))violations.push('Unexpected write request '+req.method())});
 page.on('pageerror',e=>violations.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&!/404|503|Failed to load resource/.test(m.text()))violations.push(m.text())});
}
async function run(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
 try{
  const errors=[];
  const desktop=await browser.newPage({viewport:{width:960,height:660},deviceScaleFactor:1});
  await config(desktop,errors);
  await desktop.addInitScript(()=>localStorage.setItem('gusevmade-mountain-quality','normal'));
  await desktop.goto(base+'/life/mountain.html?liza=1',{waitUntil:'domcontentloaded'});
  await desktop.getByText('На террасе. Выбери действие.',{exact:true}).waitFor({timeout:25000});
  const idle=await metrics(desktop);
  assert.match(idle.webgl,/WebGL/);
  assert.ok(idle.draws>100&&idle.detailed&&idle.people===13);
  assert.ok(Math.abs(idle.sole-idle.floor)<.02,JSON.stringify(idle));
  console.log('Desktop WebGL:',idle.webgl,'roster:',idle.people,'idle sole:',idle.sole.toFixed(4));
  await desktop.getByRole('button',{name:'Ходить'}).click();
  await desktop.waitForFunction(start=>Math.hypot(lifeQA().position[0]-start[0],lifeQA().position[2]-start[2])>.5,idle.position);
  const walking=await metrics(desktop);
  assert.notDeepEqual(walking.bone,idle.bone);
  assert.ok(walking.sole>=walking.floor-.018,JSON.stringify(walking));
  await desktop.screenshot({path:path.join(out,'liza-walk.png')});
  await desktop.getByRole('button',{name:'Бежать'}).click();
  await desktop.waitForFunction(start=>Math.hypot(lifeQA().position[0]-start[0],lifeQA().position[2]-start[2])>.85,walking.position);
  const running=await metrics(desktop);
  assert.notDeepEqual(running.bone,walking.bone);
  assert.ok(running.sole>=running.floor-.018,JSON.stringify(running));
  await desktop.screenshot({path:path.join(out,'liza-run.png')});
  const startAngle=running.heading;
  await desktop.waitForFunction(heading=>Math.abs(Math.sin((lifeQA().heading-heading)/2))>.4,startAngle);
  await desktop.getByRole('button',{name:'Стоять'}).click();
  await desktop.waitForTimeout(630);
  const stopped=await metrics(desktop);
  await desktop.waitForTimeout(450);
  const after=await metrics(desktop);
  assert.ok(Math.hypot(stopped.position[0]-after.position[0],stopped.position[2]-after.position[2])<.02);
  console.log('Walk, run, heading changes, stop, leg bones and floor samples pass');

  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await config(mobile,errors);
  await mobile.addInitScript(()=>localStorage.setItem('gusevmade-mountain-quality','economy'));
  const phoneAssets=[];
  mobile.on('request',request=>{
    const pathname=new URL(request.url()).pathname;
    if(pathname.endsWith('.glb'))phoneAssets.push(pathname);
  });
  let attempts=0;
  await mobile.route(url=>url.pathname.endsWith('/life/assets/liza.glb'),async route=>{
    attempts++;
    if(attempts===1)await route.fulfill({status:503,body:'test asset failure'});
    else await route.continue();
  });
  await mobile.goto(base+'/life/mountain.html?liza=1',{waitUntil:'domcontentloaded'});
  await mobile.getByRole('button',{name:'Повторить загрузку'}).waitFor();
  const fallback=await metrics(mobile);
  assert.equal(fallback.detailed,false);
  assert.ok(fallback.children>0);
  assert.ok(await mobile.getByRole('button',{name:'Ходить'}).isDisabled());
  await mobile.getByRole('button',{name:'Повторить загрузку'}).click();
  await mobile.getByText('На террасе. Выбери действие.',{exact:true}).waitFor();
  const panel=await mobile.locator('#humanPanel').boundingBox();
  const view=mobile.viewportSize();
  assert.ok(panel.x>=0&&panel.x+panel.width<=view.width&&panel.y>=view.height/2&&panel.y+panel.height<=view.height);
  await mobile.getByRole('button',{name:'Ходить'}).tap();
  await mobile.waitForFunction(()=>lifeQA().position[2]>16.45);
  await mobile.screenshot({path:path.join(out,'liza-mobile.png')});
  // Dispatch the visibility signal in headless Chromium, independent of the window manager.
  const hiddenStart=await mobile.evaluate(()=>{
   Object.defineProperty(document,'hidden',{configurable:true,value:true});
   document.dispatchEvent(new Event('visibilitychange'));
   return lifeQA().position;
  });
  await mobile.waitForTimeout(750);
  assert.deepEqual((await metrics(mobile)).position,hiddenStart);
  const resumed=await mobile.evaluate(()=>{
   delete document.hidden;
   document.dispatchEvent(new Event('visibilitychange'));
   return lifeQA().position;
  });
  assert.deepEqual(resumed,hiddenStart);
  await mobile.waitForFunction(start=>Math.hypot(lifeQA().position[0]-start[0],lifeQA().position[2]-start[2])>.14,resumed);
  await mobile.getByRole('button',{name:'Закрыть панель персонажа'}).tap();
  await mobile.locator('#roster').click();
  const list=mobile.locator('#rosterContent button');
  assert.equal(await list.count(),13);
  assert.equal(await list.filter({hasText:'Игорь'}).count(),0);
  assert.match(await mobile.locator('#status').textContent(),/10 из 10/);
  await list.filter({hasText:'Лиза'}).click();
  assert.equal(await mobile.locator('#humanFocus').getAttribute('aria-expanded'),'true');
  await mobile.getByRole('button',{name:'Улыбка'}).tap();
  await mobile.waitForFunction(()=>lifeQA().smile>.97);
  assert.equal(await mobile.getByRole('button',{name:'Улыбка'}).getAttribute('aria-pressed'),'true');
  assert.ok(await mobile.locator('body').evaluate(el=>el.classList.contains('human-portrait')));
  await mobile.screenshot({path:path.join(out,'liza-mobile-smile.png')});
  await mobile.getByRole('button',{name:'Улыбка'}).tap();
  await mobile.waitForFunction(()=>lifeQA().smile<.03);
  await mobile.getByRole('button',{name:'Закрыть панель персонажа'}).tap();
  await mobile.locator('#roster').click();
  await mobile.locator('#rosterContent button').filter({hasText:'Вера'}).click();
  assert.match(await mobile.locator('#who').textContent(),/Вера/);
  await mobile.getByText('На террасе. Выбери действие.',{exact:true}).waitFor();
  assert.equal(await mobile.locator('#humanName').textContent(),'Вера · Аналитика');
  const vera=await metrics(mobile);
  assert.equal(vera.active,'analyst');
  assert.deepEqual(vera.terrace,['analyst']);
  assert.equal(vera.loaded,2);
  assert.deepEqual([...new Set(phoneAssets)],['/life/assets/liza.glb','/life/assets/crew/analyst.glb']);
  await mobile.getByRole('button',{name:'Сесть'}).tap();
  await mobile.getByText('Вера сидит на террасе.',{exact:true}).waitFor({timeout:30000});
  assert.ok(vera.hips-(await metrics(mobile)).hips>.15);
  await mobile.getByRole('button',{name:'Улыбка'}).tap();
  await mobile.waitForFunction(()=>lifeQA().smile>.97);
  await mobile.screenshot({path:path.join(out,'vera-mobile.png')});
  console.log('Mobile viewport:',view,'panel:',panel,'retry, visibility, roster, second actor and economy requests pass');

  const mobile2d=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await config(mobile2d,errors);
  await mobile2d.goto(base+'/life/mobile.html');
  await mobile2d.getByText(/10 из 10 рабочих статусов/).waitFor();
  assert.equal(await mobile2d.locator('#agents button').count(),13);
  assert.equal(await mobile2d.locator('#agents button').filter({hasText:'Игорь'}).count(),0);
  await mobile2d.close();
  assert.deepEqual(errors,[]);
  console.log('2D roster and GET-only status checks pass; no uncaught page errors');

  await mobile.close();
  await desktop.waitForFunction(()=>lifeQA().loaded===13,null,{timeout:60000});
  await desktop.setViewportSize({width:1040,height:760});
  const gallery=path.join(out,'crew');
  await fs.mkdir(gallery,{recursive:true});
  const ids=['analyst','poster','guard','editor','video','critic','community','archivist','producer','orders','resident-nikita','resident-lena','resident-grandma'];
  for(const id of ids){
    await desktop.locator('#roster').click();
    assert.match(await desktop.locator('#crewStatus').textContent(),/13 из 13/);
    await desktop.locator('#rosterContent button[data-resident-id="'+id+'"]').click();
    await desktop.getByText('На террасе. Выбери действие.',{exact:true}).waitFor();
    const actor=await metrics(desktop);
    assert.equal(actor.active,id);
    assert.ok(actor.detailed&&actor.draws>100);
    assert.deepEqual(actor.terrace,[id]);
    await desktop.screenshot({
      path:path.join(gallery,id+'.png'),
      clip:{x:380,y:169,width:280,height:415}
    });
  }
  const grandma=await metrics(desktop);
  await desktop.getByRole('button',{name:'Сесть'}).click();
  await desktop.getByText('Бабушка Марина сидит на террасе.',{exact:true}).waitFor({timeout:30000});
  const seated=await metrics(desktop);
  assert.ok(grandma.hips-seated.hips>.14);
  assert.ok(Math.abs(seated.sole-seated.floor)<.025);
  await desktop.getByRole('button',{name:'Встать'}).click();
  await desktop.getByText('Бабушка Марина стоит рядом со стулом.',{exact:true}).waitFor({timeout:15000});
  await desktop.getByRole('button',{name:'Радость'}).click();
  await desktop.waitForFunction(y=>lifeQA().hand>y+.25,grandma.hand);
  await desktop.getByText('Бабушка Марина стоит рядом со стулом.',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('13 detailed residents loaded and selected in WebGL; seat/stand/gesture verified on grandmother and Vera');

 }finally{
  await browser.close();
  server.close();
 }
}
run().catch(error=>{console.error(error);server.close();process.exitCode=1});
