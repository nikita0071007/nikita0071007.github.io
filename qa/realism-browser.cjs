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
    background:scene.background.uuid,fog:!!scene.fog,groups:[upperLevel,facade,grounds,stairs].map(group=>group.visible),
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
globalThis.renderQA=()=>{
  const maps=new Set();
  let bumps=0,casters=0,footprints=0;
  scene.traverse(mesh=>{
    const m=mesh.material;
    if(m?.map?.image?.src?.includes('/assets/materials/'))maps.add(m.map.image.src);
    if(m?.bumpMap&&m.bumpMap===m.map)bumps++;
    if(mesh.isMesh&&mesh.castShadow)casters++;
    if(mesh.userData.groundContact&&m?.map?.isDataTexture)footprints++;
  });
  const sun=scene.children.find(o=>o.isDirectionalLight);
  return {maps:[...maps],bumps,casters,footprints,shadow:!!sun?.castShadow,
    shadowTexture:!!sun?.shadow.map,shadowAuto:renderer.shadowMap.autoUpdate,
    tone:renderer.toneMapping,expectedTone:T.AgXToneMapping,environment:!!scene.environment,
    lamps:scene.children.filter(o=>o.isPointLight&&o.intensity>0).length,
    backgrounds:scene.background.uuid,draws:renderer.info.render.calls,
    residents:people.length,mode:roomMode,zone:roomZone};
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
  page.on('console',message=>{if(message.type()==='error'&&/WebGLProgram|Shader Error|GL_INVALID_/i.test(message.text()))errors.push(message.text())});
  page.on('request',req=>{
    if(!['GET','HEAD'].includes(req.method()))errors.push('Unexpected HTTP '+req.method());
  });
  await page.route('https://cdn.jsdelivr.net/npm/three@0.160.1/**',route=>{
    const rel = new URL(route.request().url()).pathname.replace('/npm/three@0.160.1/','');
    return route.fulfill({path:path.join(vendor,rel),contentType:'text/javascript'});
  });
  await page.route('https://raw.githubusercontent.com/nikita0071007/office/main/status.json*',route=>
    route.fulfill({path:path.join(out,'status.json'),contentType:'application/json'}));
  await page.route(url=>['/life/human-character.js','/life/liza-face.js','/life/house-life.js','/life/office-interior.js','/life/villa-decor.js','/life/villa-rooms.js','/life/yuri-cabinet.js','/life/villa-rendering.js','/life/villa-landscape.js'].includes(url.pathname)&&!url.search,
    route=>route.fulfill({status:409,body:'Unversioned module'}));
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

const rendered=(page)=>page.evaluate(()=>renderQA());
const frames=(page)=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function testRealism(browser,base,errors){
  const url=base+'/life/mountain.html';
  const desktop=await browser.newPage({viewport:{width:1360,height:900},deviceScaleFactor:1});
  await configure(desktop,errors);
  await desktop.addInitScript(()=>{
    localStorage.setItem('gusevmade-mountain-quality','normal');
    localStorage.setItem('gusevmade-house-meetings-v1',JSON.stringify({version:1,running:false,pairs:{},journal:[]}));
  });
  await desktop.goto(url+'?office=editorial');
  await desktop.waitForFunction(()=>typeof renderQA==='function'&&renderQA().maps.length===5&&
    renderQA().shadowTexture&&officeQA().models===13&&officeQA().icons.every(icon=>icon.ready),null,{timeout:45000});
  await desktop.screenshot({path:path.join(out,'realism-yuri-evening.png')});
  const dusk=await rendered(desktop);
  assert.equal(dusk.residents,13);
  assert.equal(dusk.footprints,13);
  assert.equal(dusk.tone,dusk.expectedTone);
  assert.ok(dusk.casters>40&&dusk.bumps>25&&dusk.draws>30);
  assert.ok(dusk.maps.every(asset=>asset.startsWith(base+'/life/assets/materials/')));
  assert.equal(dusk.shadow,true);
  assert.equal(dusk.shadowAuto,false);
  assert.equal(dusk.environment,true);
  assert.equal(dusk.lamps,2);
  await desktop.locator('#night').click();
  await frames(desktop);
  const day=await rendered(desktop);
  assert.notEqual(day.backgrounds,dusk.backgrounds);
  assert.equal(day.lamps,0);
  await desktop.screenshot({path:path.join(out,'realism-yuri-day.png')});
  await desktop.locator('#upper').click();
  await desktop.locator('[data-office-zone=director]').click();
  await frames(desktop);
  assert.equal(await desktop.locator('#officeTitle').textContent(),'Кабинет Никиты');
  await desktop.screenshot({path:path.join(out,'realism-director-day.png')});
  await desktop.locator('#night').click();
  await frames(desktop);
  await desktop.screenshot({path:path.join(out,'realism-director-evening.png')});
  await desktop.locator('#night').click();
  await desktop.locator('#garden').click();
  await frames(desktop);
  assert.equal((await rendered(desktop)).mode,'garden');
  await desktop.screenshot({path:path.join(out,'realism-garden.png')});
  await desktop.locator('#front').click();
  await frames(desktop);
  const house=await rendered(desktop);
  console.log('Static draws in the whole house:',house.draws);
  assert.ok(house.draws<780);
  await desktop.screenshot({path:path.join(out,'realism-villa.png')});
  await desktop.locator('#quality').click();
  assert.equal((await rendered(desktop)).shadow,true,'Desktop auto starts with a shadow pass');
  await desktop.locator('#quality').click();
  await frames(desktop);
  assert.equal((await rendered(desktop)).shadow,false);
  assert.equal((await rendered(desktop)).bumps,0);
  await desktop.close();

  const phone=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await configure(phone,errors);
  await phone.addInitScript(()=>localStorage.setItem('gusevmade-mountain-quality','economy'));
  const woodURL='**/life/assets/materials/wood.jpg';
  await phone.route(woodURL,route=>route.abort());
  await phone.goto(url+'?office=editorial');
  await phone.waitForFunction(()=>typeof renderQA==='function'&&renderQA().maps.length===4&&renderQA().draws>0);
  assert.equal((await rendered(phone)).shadow,false);
  assert.equal((await rendered(phone)).footprints,13);
  await phone.unroute(woodURL);
  await phone.reload();
  await phone.waitForFunction(()=>renderQA().maps.length===5&&officeQA().icons.every(icon=>icon.ready));
  await phone.screenshot({path:path.join(out,'realism-mobile.png')});
  assert.equal((await report(phone)).quality,.65);
  assert.equal((await rendered(phone)).bumps,0);
  await phone.getByRole('button',{name:'Обзор',exact:true}).tap();
  await phone.waitForFunction(()=>officeQA().zone==='overview');
  await checkOfficeBounds(phone);
  await phone.setViewportSize({width:844,height:390});
  await checkOfficeBounds(phone);
  await phone.locator('#lifeFocus').tap();
  await phone.locator('#lifePanel').waitFor();
  await phase(phone,'talking');
  const terrace=await report(phone,true);
  assert.ok(terrace.meeting.actors.every(actor=>Math.abs(actor.sole-.67)<.03));
  assert.equal((await rendered(phone)).footprints,13);
  await phone.close();
  console.log('Realism: local materials, day/evening, one-shot shadows, economy, missing texture fallback, mobile rotation and terrace passed');
}
async function run(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
  try{
    const errors=[];
    await testRealism(browser,base,errors);
    assert.deepEqual(errors,[]);
  }finally{
    await browser.close();
    server.close();
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;server.close()});
