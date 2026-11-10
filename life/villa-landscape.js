import * as T from 'three';

export function buildVillaApproach(materials){
  const root=new T.Group(), lights=new T.Group();
  root.name='Stone approach and planted banks';
  root.add(lights);
  const slate=materials.matte('#958574','stone');
  const boulder=materials.matte('#575a54','stone');
  const stem=materials.matte('#66503a','wood');
  const leaf=materials.matte('#ffffff',null,{roughness:.92});
  const amber=new T.MeshBasicMaterial({color:'#ffc070',toneMapped:false});
  const rock=new T.IcosahedronGeometry(1,1);
  const points=rock.getAttribute('position');
  for(let i=0;i<points.count;i++){
    const x=points.getX(i),y=points.getY(i),z=points.getZ(i);
    const irregular=1+.14*Math.sin(x*15+y*7+z*11)+.06*Math.sin(x*24-z*13);
    points.setXYZ(i,x*irregular,y*irregular,z*irregular);
  }
  rock.computeVertexNormals();
  const transform=new T.Object3D();
  const steps=[
    [-8.75,.62,10.68,2.56,1.00],[-8.81,.43,11.60,2.53,.94],[-8.91,.23,12.53,2.57,.93],
    [-9.06,.04,13.44,2.51,.94],[-9.25,-.15,14.35,2.45,.91],[-9.47,-.34,15.27,2.38,.90],
    [-9.79,-.49,16.19,2.35,.82],[-10.16,-.49,17.04,2.24,.85],[-10.66,-.49,17.89,2.28,.84],
    [-11.24,-.49,18.72,2.19,.89],[-11.90,-.49,19.59,2.25,.93],[-12.49,-.49,20.53,2.21,1.01]
  ];
  const slab=new T.BoxGeometry(1,1,1);
  const blocks=new T.InstancedMesh(slab,slate,steps.length);
  steps.forEach(([x,y,z,w,d],i)=>{
    const h=Math.max(.10,y+.55);
    transform.position.set(x,y-h/2,z);
    transform.rotation.set(0,-.052*i,0);
    transform.scale.set(w,h,d);
    transform.updateMatrix();
    blocks.setMatrixAt(i,transform.matrix);
  });
  const fixtures=[[-10.28,11.68],[-7.47,13.70],[-11.08,15.86],[-8.80,18.09],[-13.66,20.26],
    [13.43,10.97],[15.29,13.49],[-14.55,11.40],[12.16,16.67]];
  const stands=new T.InstancedMesh(slab,stem,fixtures.length);
  const bulbs=new T.InstancedMesh(slab,amber,fixtures.length);
  fixtures.forEach(([x,z],i)=>{
    transform.rotation.set(0,0,0);
    transform.position.set(x,-.22,z);
    transform.scale.set(.102,.66,.104);
    transform.updateMatrix();
    stands.setMatrixAt(i,transform.matrix);
    transform.position.y=.096;
    transform.scale.set(.127,.37,.129);
    transform.updateMatrix();
    bulbs.setMatrixAt(i,transform.matrix);
  });
  lights.add(bulbs);

  let seed=2711;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const rocks=[
    [-14.6,11.0,1.6],[-13.9,13.84,.92],[-10.9,15.18,.62],[-14.94,19.4,1.63],
    [-8.08,19.96,.87],[-17.72,9.3,2.1],[13.41,9.95,1.06],[13.15,17.34,1.47],
    [18.44,10.27,1.87],[20.70,7.02,1.54],[15.89,18.98,2.18],[-17.6,17.1,2.2]
  ];
  const stoneMesh=new T.InstancedMesh(rock,boulder,rocks.length);
  rocks.forEach(([x,z,r],i)=>{
    transform.rotation.set(.14+random()*.40,random()*Math.PI,.18*random());
    transform.position.set(x,-.48+r*.24,z);
    transform.scale.set(r,r*.66,r*.82);
    transform.updateMatrix();
    stoneMesh.setMatrixAt(i,transform.matrix);
  });

  const patches=[[-12.31,11.84,2.0],[-14.4,15.46,2.1],[-11.82,17.96,1.48],[-15.93,20.58,2.8],
    [-7.03,16.78,1.2],[-8.86,21.38,1.7],[13.41,10.96,2.24],[14.78,18.92,2.1],
    [19.81,7.45,2.6],[-16.29,8.96,1.9],[12.27,14.95,1.04],[-10.96,12.73,1.06]];
  const foliage=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),leaf,patches.length*42);
  const tones=['#52623b','#424e36','#687b42','#817e4a','#344f35'].map(color=>new T.Color(color));
  patches.forEach(([x,z,r],i)=>{
    for(let j=0;j<42;j++){
      const a=random()*2*Math.PI,d=Math.sqrt(random())*r, h=(.16+random()*.43)*(1-d/r*.55);
      transform.position.set(x+Math.sin(a)*d,-.51+h*.48,z+Math.cos(a)*d);
      transform.scale.set(.105+random()*.14,h,.045+random()*.076);
      transform.rotation.set(.34,a,random()*.48);
      transform.updateMatrix();
      foliage.setMatrixAt(i*42+j,transform.matrix);
      foliage.setColorAt(i*42+j,tones[(i+j)%tones.length]);
    }
  });
  foliage.instanceColor.needsUpdate=true;
  for(const mesh of [blocks,stands,bulbs,stoneMesh,foliage]){
    mesh.computeBoundingSphere();
    mesh.receiveShadow=mesh!==bulbs;
    mesh.castShadow=mesh===blocks||mesh===stoneMesh;
  }
  root.add(blocks,stands,stoneMesh,foliage);
  return {root,lights};
}

export function buildVillaLandscape(materials){
  const root=new T.Group();
  root.name='Ridges and trees';
  let seed=251;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const mountains=new T.MeshStandardMaterial({vertexColors:true,roughness:1,envMapIntensity:.28});
  const rock=new T.Color('#425b67'),snow=new T.Color('#a7b6ba');
  const shade=new T.Color(),p=new T.Vector3();

  for(let i=0;i<30;i++){
    // Put the three ridge lines behind the villa and clear of the approach camera.
    const layer=Math.floor(i/10),column=i%10;
    const x=(column-4.5)*23+layer*8+(random()-.5)*12,z=-48-layer*23+random()*8;
    const width=13+random()*8,height=13+layer*6+random()*14;
    const geometry=new T.PlaneGeometry(width*2,width*2,17,17).rotateX(-Math.PI/2);
    const positions=geometry.getAttribute('position'),colors=[];
    const ridge=(random()-.5)*.8;
    for(let j=0;j<positions.count;j++){
      p.fromBufferAttribute(positions,j);
      const u=p.x/width,v=p.z/width;
      const primary=Math.max(0,1-Math.hypot(u-ridge*v,v*.91));
      const secondary=Math.max(0,.68-Math.hypot(u+.33,v-.19));
      const grain=Math.sin(u*15+v*11+i)*.15+Math.sin(u*29-v*19+i*.9)*.085;
      const spine=Math.exp(-Math.abs(u-ridge*v)*9)*primary*.12;
      const level=Math.max(0,Math.pow(primary,1.20)+secondary*.26+spine+grain*primary);
      positions.setY(j,-1.1+height*level);
      const snowLine=.72+Math.sin(u*12+v*8+i)*.086;
      shade.copy(rock).multiplyScalar(.73+.28*level+.11*Math.sin(v*11-u*5+i));
      shade.lerp(snow,T.MathUtils.smoothstep(level,snowLine,snowLine+.22)*(layer?.79:.26));
      colors.push(shade.r,shade.g,shade.b);
    }
    geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    geometry.computeVertexNormals();
    const mountain=new T.Mesh(geometry,mountains);
    mountain.position.set(x,0,z);
    mountain.rotation.y=random()*Math.PI;
    root.add(mountain);
  }

  const trees=[];
  function plant(x,z){
    const inside=Math.abs(x)<13.5&&Math.abs(z)<9.2;
    const landscaped=x>-16&&x<21&&z>8.6&&z<22;
    if(!inside&&!landscaped)trees.push({x,z,scale:.63+random()*.62,turn:random()*Math.PI*2});
  }
  for(let i=0;i<21;i++)plant((random()-.5)*34,(random()-.5)*29);
  for(let i=0;i<104;i++){
    const a=random()*Math.PI*2,r=23+random()*51;
    const z=Math.sin(a)*r;
    if(z<24)plant(Math.cos(a)*r,z);
  }
  const bark=materials.matte('#685347','wood');
  const canopy=materials.matte('#ffffff',null,{roughness:.94,envMapIntensity:.27});
  const crownGeometry=new T.IcosahedronGeometry(1,2);
  const crownPositions=crownGeometry.getAttribute('position');
  for(let i=0;i<crownPositions.count;i++){
    p.fromBufferAttribute(crownPositions,i);
    const wobble=1+.06*Math.sin(17*p.x+11*p.y+8*p.z)+.044*Math.cos(13*p.z-7*p.y);
    p.multiplyScalar(wobble);
    crownPositions.setXYZ(i,p.x,p.y,p.z);
  }
  const trunks=new T.InstancedMesh(new T.CylinderGeometry(.095,.19,1,8),bark,trees.length);
  const crowns=new T.InstancedMesh(crownGeometry,canopy,trees.length*3);
  const transform=new T.Object3D(),darkLeaf=new T.Color('#405d42'),lightLeaf=new T.Color('#77905c');
  trees.forEach(({x,z,scale,turn},i)=>{
    transform.rotation.set(0,turn,0);
    transform.position.set(x,-.55+scale*.81,z);
    transform.scale.set(scale,scale*1.62,scale);
    transform.updateMatrix();
    trunks.setMatrixAt(i,transform.matrix);
    for(let j=0;j<3;j++){
      const offset=turn+j*2.40;
      const height=j===0?2.48:1.93;
      const size=scale*(j===0?.94:.75);
      transform.position.set(x+Math.sin(offset)*.41*scale,-.55+height*scale,z+Math.cos(offset)*.43*scale);
      transform.scale.set(size,size*(j===0?1.15:.86),size*.91);
      transform.rotation.y=offset;
      transform.updateMatrix();
      crowns.setMatrixAt(i*3+j,transform.matrix);
      crowns.setColorAt(i*3+j,shade.copy(darkLeaf).lerp(lightLeaf,.25+random()*.64));
    }
  });
  for(const mesh of [trunks,crowns]){
    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    mesh.computeBoundingSphere();
    root.add(mesh);
  }
  return root;
}
