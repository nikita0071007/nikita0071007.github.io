const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const file=fs.existsSync(path.join(__dirname,'../life/mountain.html'))?path.join(__dirname,'../life/mountain.html'):path.join(__dirname,'mountain.html');
const html=fs.readFileSync(file,'utf8');
const source=html.slice(html.indexOf('// Keep the user'),html.lastIndexOf('</script>'));
function setup(saved=null,blocked=false){
  let now=0,ratio=1;
  const elements={},events={},savedValues=new Map(saved?[['gusevmade-mountain-quality',saved]]:[]);
  const renderer={domElement:{width:361,height:647},info:{memory:{geometries:640,textures:0},render:{calls:530}},getPixelRatio:()=>ratio,setPixelRatio:r=>ratio=r,setSize:(w,h)=>{renderer.domElement.width=Math.floor(w*ratio);renderer.domElement.height=Math.floor(h*ratio)},render:()=>{}};
  const document={hidden:false,getElementById:id=>elements[id]??={hidden:true,textContent:''},addEventListener:(n,f)=>events[n]=f};
  const context=vm.createContext({human:null,humanClock:null,followHuman:false,activePerson:null,models:new Map(),queueModels(){},liza:{},document,renderer,performance:{now:()=>now},localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return savedValues.get(k)},setItem:(k,v)=>{if(blocked)throw Error('blocked');savedValues.set(k,v)}},devicePixelRatio:2,innerWidth:361,innerHeight:647,people:[],controls:{update(){}},scene:{},camera:{updateProjectionMatrix(){},updateMatrixWorld(){}},requestAnimationFrame(){},addEventListener:(n,f)=>events[n]=f,
    T:{Vector3:class{}},lifePanel:{hidden:true},roomMode:null,launchView(){},
    lighting:{setQuality(){}},
    houseMeetings:{update(){},has(){return false}},updateLifeBubble(){}});
  vm.runInContext(source,context);
  return {context,elements,savedValues,ratio:()=>ratio,click:()=>elements.quality.onclick(),event:n=>events[n](),hidden:v=>{document.hidden=v;events.visibilitychange()},frames:(count,step)=>{for(let i=0;i<count;i++){now+=step;vm.runInContext('tick('+now+')',context)}},sample:(fps)=>{vm.runInContext('framesInWindow='+ (fps*5-1),context);now+=5000;vm.runInContext('tick('+now+')',context)},advance:ms=>now+=ms};
}
const samples=(h,fps,n)=>{for(let i=0;i<n;i++)h.sample(fps)};
test('manual quality never changes with FPS and is persisted',()=>{
  const h=setup();h.click();assert.equal(h.ratio(),.65);samples(h,10,20);samples(h,60,20);assert.equal(h.ratio(),.65);assert.equal(h.savedValues.get('gusevmade-mountain-quality'),'economy');
  h.click();samples(h,10,20);assert.equal(h.ratio(),1.4);assert.equal(setup('normal').ratio(),1.4);assert.equal(setup('economy').ratio(),.65);
});
test('visibility resets consecutive samples and hidden frames cannot change quality',()=>{
  const h=setup();samples(h,20,2);h.hidden(true);samples(h,10,10);h.hidden(false);h.sample(20);assert.equal(h.ratio(),1);samples(h,20,2);assert.equal(h.ratio(),.7);
});
test('mode changes discard partial measurement windows',()=>{
  const h=setup();vm.runInContext('framesInWindow=2;autoSlowWindows=2;autoFastWindows=5',h.context);h.advance(1000);h.click();h.click();h.click();
  assert.equal(vm.runInContext('framesInWindow+autoSlowWindows+autoFastWindows',h.context),0);assert.equal(vm.runInContext('fps',h.context),null);
});
test('automatic recovery uses visible cooldown and backs off after repeated drops',()=>{
  const h=setup();samples(h,20,3);assert.equal(h.ratio(),.7);assert.match(h.elements.metricsText.textContent,/FPS: замер/);assert.match(h.elements.metricsText.textContent,/Буфер рендера: 252×452/);
  h.hidden(true);h.advance(600000);h.hidden(false);samples(h,60,5);assert.equal(h.ratio(),.7);h.sample(60);assert.equal(h.ratio(),1);
  samples(h,20,3);assert.equal(h.ratio(),.7);samples(h,60,6);assert.equal(h.ratio(),.7);samples(h,60,6);assert.equal(h.ratio(),1);
  assert.equal(h.savedValues.has('gusevmade-mountain-quality'),false);
});
test('thresholds are strict and resize preserves reduced or manual quality',()=>{
  const h=setup();samples(h,24,5);assert.equal(h.ratio(),1);samples(h,23,3);assert.equal(h.ratio(),.7);samples(h,48,10);assert.equal(h.ratio(),.7);h.event('resize');assert.equal(h.ratio(),.7);h.click();h.event('resize');assert.equal(h.ratio(),.65);
});
test('invalid or unavailable storage is safe; 2D and old 3D links remain',()=>{
  assert.equal(setup('invalid').ratio(),1);const h=setup(null,true);h.click();assert.equal(h.ratio(),.65);assert.match(html,/href="\.\/mobile.html"/);assert.match(html,/href="\.\/index.html\?3d=1"/);
});

test('real frame sequence drops quality after three complete slow windows',()=>{
  const h=setup();h.frames(71,50);assert.equal(h.ratio(),1);h.frames(1,50);assert.equal(h.ratio(),.7);
});
