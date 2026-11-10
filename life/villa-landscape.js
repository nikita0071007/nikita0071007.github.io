import * as T from 'three';

export function buildVillaLandscape(materials){
  const root=new T.Group();
  root.name='Ridges and trees';
  let seed=251;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const mountains=new T.MeshStandardMaterial({vertexColors:true,roughness:1,envMapIntensity:.28});
  const rock=new T.Color('#566875'),snow=new T.Color('#dbe6e8');
  const shade=new T.Color(),p=new T.Vector3();

  for(let i=0;i<30;i++){
    const angle=.12+i/29*Math.PI*1.42,radius=61+random()*31;
    const x=Math.cos(angle)*radius-12,z=-Math.sin(angle)*radius-20;
    const width=9+random()*11,height=20+random()*28;
    const geometry=new T.PlaneGeometry(width*2,width*2,13,13).rotateX(-Math.PI/2);
    const positions=geometry.getAttribute('position'),colors=[];
    const ridge=(random()-.5)*.8;
    for(let j=0;j<positions.count;j++){
      p.fromBufferAttribute(positions,j);
      const u=p.x/width,v=p.z/width;
      const primary=Math.max(0,1-Math.hypot(u-ridge*v,v*.91));
      const secondary=Math.max(0,.68-Math.hypot(u+.33,v-.19));
      const grain=Math.sin(u*13+v*11+i)*.10+Math.sin(u*23-v*17+i*.9)*.055;
      const level=Math.max(0,Math.pow(primary,1.22)+secondary*.19+grain*primary);
      positions.setY(j,-1.1+height*level);
      const snowLine=.57+Math.sin(u*12+v*8+i)*.066;
      shade.copy(rock).multiplyScalar(.83+.24*level+.11*Math.sin(v*11-u*5+i));
      shade.lerp(snow,T.MathUtils.smoothstep(level,snowLine,snowLine+.17));
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
