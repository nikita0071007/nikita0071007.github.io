const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const http=require('node:http');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const out=path.join(root,'life-qa');
const debug=`
globalThis.architectureQA=()=>{
  const spot=new T.Vector3(), bounds=[];
  for(const x of [-14.65,19.26])for(const y of [.52,12.18])for(const z of [-9.29,11.13]){
    spot.set(x,y,z).project(camera);
    bounds.push([(spot.x+1)*innerWidth/2,(1-spot.y)*innerHeight/2]);
  }
  return {
    webgl:renderer.getContext().getParameter(renderer.getContext().VERSION),
    draws:renderer.info.render.calls,hero:document.body.classList.contains('architecture-view'),
    mode:roomMode,zone:roomZone,evening,leds:glow.visible,pathLights:approach.lights.visible,
    camera:camera.position.toArray(),target:controls.target.toArray(),bounds,
    ratio:renderer.getPixelRatio(),models:models.size,people:people.length,
    textureMaps:[...new Set([...scene.children.flatMap(root=>{
      const urls=[];root.traverse(node=>{const url=node.material?.map?.image?.src;
        if(url?.includes('/assets/materials/'))urls.push(url)});return urls;
    })])],
    shell:[facade.visible,upperLevel.visible,stairs.visible],
    interior:[officeInterior.visible,upperInterior.visible],
    yuri:officeInterior.children.filter(n=>n.name.startsWith('Yuri icon ')&&n.visible&&n.material.map?.image?.naturalWidth).length,
    officeDesks:Object.values(OFFICE_DESKS),
    terrace:UPPER_ZONES.terrace.center,
    active:activePerson?.userData.id,
    phase:human?.phase,
  };
};`;
const server=http.createServer(async(req,res)=>{
  try{
    const pathname=new URL(req.url,'http://localhost').pathname;
    assert.ok(pathname.startsWith('/life/'));
    const file=path.join(root,pathname);
    let data=await fs.readFile(file);
    if(pathname==='/life/mountain.html')data=Buffer.from(data.toString()
      .replace('renderer.render(scene,camera);samplePerformance(t);',
        'if(!globalThis.__holdFrame){renderer.render(scene,camera);samplePerformance(t)}')
      .replace('</script></body></html>',debug+'\n</script></body></html>'));
    res.setHeader('content-type',{'.html':'text/html; charset=utf-8','.js':'text/javascript',
      '.glb':'model/gltf-binary','.jpg':'image/jpeg','.png':'image/png'}[path.extname(file)]||'application/octet-stream');
    res.end(data);
  }catch{res.writeHead(404);res.end()}
});
async function configure(page,errors,quality){
  await page.addInitScript(value=>localStorage.setItem('gusevmade-mountain-quality',value),quality);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error|GL_INVALID_/i.test(m.text()))errors.push(m.text())});
  page.on('request',req=>{if(!['GET','HEAD'].includes(req.method()))errors.push('Unexpected '+req.method())});
  await page.route('https://cdn.jsdelivr.net/npm/three@0.160.1/**',route=>{
    const rel=new URL(route.request().url()).pathname.replace('/npm/three@0.160.1/','');
    return route.fulfill({path:path.join(root,'node_modules/three',rel),contentType:'text/javascript'});
  });
  await page.route('https://raw.githubusercontent.com/nikita0071007/office/main/status.json*',route=>
    route.fulfill({path:path.join(out,'status.json'),contentType:'application/json'}));
}
const report=page=>page.evaluate(()=>architectureQA());
const frames=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function capture(page,name){
  await frames(page);
  await page.evaluate(()=>{globalThis.__holdFrame=true});
  const cdp=await page.context().newCDPSession(page);
  let timer;
  try{
    const {data}=await Promise.race([
      cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true}),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Screenshot timed out: '+name)),45000)})
    ]);
    await fs.writeFile(path.join(out,'villa-reference-'+name+'.png'),Buffer.from(data,'base64'));
  }finally{
    clearTimeout(timer);
    await cdp.detach().catch(()=>{});
    await page.evaluate(()=>{globalThis.__holdFrame=false});
  }
}
async function frameContainsHouse(page){
  const {width,height}=page.viewportSize();
  const header=await page.locator('header').boundingBox();
  const reportNow=await report(page);
  for(const [x,y] of reportNow.bounds)assert.ok(x>=0&&x<=width&&y>=header.height-3&&y<=height,
    JSON.stringify({point:[x,y],viewport:[width,height],header}));
  assert.ok(reportNow.draws>100&&reportNow.draws<860,JSON.stringify(reportNow));
}
async function zone(page,id,mode){
  await page.locator('[data-office-zone="'+id+'"]').click();
  const current=await report(page);
  assert.equal(current.zone,id);
  assert.equal(current.mode,mode);
  assert.deepEqual(current.shell,[false,false,false]);
  assert.equal(current.leds,false);
}
async function run(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox',
    '--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
  const url='http://127.0.0.1:'+server.address().port+'/life/mountain.html';
  const errors=[];
  try{
    const desktop=await browser.newPage({viewport:{width:1240,height:792},deviceScaleFactor:1});
    await configure(desktop,errors,'normal');
    await desktop.goto(url,{waitUntil:'domcontentloaded'});
    await desktop.waitForFunction(()=>typeof architectureQA==='function'&&architectureQA().textureMaps.length===5,
      {},{timeout:35000});
    await desktop.waitForFunction(()=>architectureQA().models===13,null,{timeout:45000});
    const state=await report(desktop);
    assert.match(state.webgl,/WebGL/);
    assert.ok(state.hero&&state.evening&&state.leds&&state.pathLights&&state.people===13);
    assert.deepEqual(state.shell,[true,true,true]);
    assert.equal(state.officeDesks.filter(([x])=>x>2).length,8);
    await frameContainsHouse(desktop);
    console.log('Exterior evening: '+state.draws+' draw calls');
    await capture(desktop,'evening');
    await desktop.locator('#night').click();
    assert.equal((await report(desktop)).leds,false);
    assert.equal((await report(desktop)).pathLights,false);
    await capture(desktop,'day');
    await desktop.locator('#ground').click();
    await zone(desktop,'work','office');
    await zone(desktop,'kitchen','office');
    await zone(desktop,'editorial','office');
    assert.equal((await report(desktop)).yuri,2);
    await desktop.locator('#upper').click();
    await zone(desktop,'director','upstairs');
    await zone(desktop,'gym','upstairs');
    await zone(desktop,'lounge','upstairs');
    await capture(desktop,'lounge');
    await zone(desktop,'terrace','upstairs');
    await capture(desktop,'terrace');
    await desktop.close();
    const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,
      isMobile:true,hasTouch:true});
    await configure(mobile,errors,'economy');
    await mobile.goto(url,{waitUntil:'domcontentloaded'});
    await mobile.waitForFunction(()=>typeof architectureQA==='function'&&architectureQA().draws>100,null,{timeout:35000});
    await frameContainsHouse(mobile);
    assert.equal((await report(mobile)).ratio,.65);
    await capture(mobile,'mobile');
    await mobile.setViewportSize({width:844,height:390});
    await frames(mobile);
    await frameContainsHouse(mobile);
    await mobile.goto(url+'?liza=1',{waitUntil:'domcontentloaded'});
    await mobile.getByText('На террасе. Выбери действие.',{exact:true}).waitFor({timeout:30000});
    assert.equal((await report(mobile)).active,'community');
    await mobile.locator('[data-human-state="Walk"]').click();
    assert.equal(await mobile.locator('[data-human-state="Walk"]').getAttribute('aria-pressed'),'true');
    await mobile.locator('#front').click();
    await frameContainsHouse(mobile);
    assert.deepEqual(errors,[]);
    console.log('PASS: day and dusk, cutaways, kitchen, Yuri icons, upper lounge and terrace, two mobile orientations and Liza.');
  }finally{await browser.close();server.close()}
}
run().catch(error=>{console.error(error);server.close();process.exitCode=1});
