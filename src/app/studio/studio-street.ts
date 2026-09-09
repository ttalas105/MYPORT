import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from './studio-geometry';
import type { StudioMaterials } from './studio-furniture';

/** The studio sits at the edge of a quiet city street, with a real roof and pavement. */
export function buildStudioStreet(m: StudioMaterials): { group: THREE.Group; resources: THREE.Texture[] } {
  const group = new THREE.Group();
  group.name = 'Studio street and masonry shell';
  const resources: THREE.Texture[] = [];
  const asphalt = new THREE.MeshPhysicalMaterial({color:'#1c222a', roughness:.55, metalness:.06, clearcoat:.22, clearcoatRoughness:.42});
  const concrete = new THREE.MeshStandardMaterial({color:'#66676a', roughness:.93});
  const coping = new THREE.MeshStandardMaterial({color:'#8c8b86', roughness:.86});
  const joints = new THREE.MeshStandardMaterial({color:'#30373f', roughness:1});
  const brick = new THREE.MeshStandardMaterial({color:'#44414a', roughness:.93});
  const brickDark = new THREE.MeshStandardMaterial({color:'#383842', roughness:.92});
  const roof = new THREE.MeshStandardMaterial({color:'#242b31', roughness:.88});
  const markings = new THREE.MeshStandardMaterial({color:'#a59a78', roughness:1});
  const chrome = new THREE.MeshStandardMaterial({color:'#8b9395', roughness:.4, metalness:.72});
  const saddle = new THREE.MeshStandardMaterial({color:'#765345', roughness:.78});
  const framePaint = new THREE.MeshStandardMaterial({color:'#707960', roughness:.5, metalness:.28});
  const box = (parent: THREE.Object3D, size: number[], position: number[], material: THREE.Material, radius = 0) => {
    const geometry = radius ? new RoundedBoxGeometry(size[0],size[1],size[2],1,radius) : new THREE.BoxGeometry(size[0],size[1],size[2]);
    const object = new THREE.Mesh(geometry, material);
    object.position.set(position[0],position[1],position[2]);
    object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const cylinder = (parent: THREE.Object3D, radius: number, height: number, position: number[], material: THREE.Material, segments = 16) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,segments),material);
    mesh.position.set(position[0],position[1],position[2]);
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const rod = (parent: THREE.Object3D, from: number[], to: number[], radius: number, material: THREE.Material) => {
    const a=new THREE.Vector3(...from as [number,number,number]),b=new THREE.Vector3(...to as [number,number,number]);
    const mesh=cylinder(parent,radius,a.distanceTo(b),a.clone().add(b).multiplyScalar(.5).toArray(),material,10);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());
    return mesh;
  };

  box(group,[180,.18,170],[0,-.245,-25],roof);
  box(group,[90,.055,9.4],[0,-.1675,13],asphalt);
  box(group,[90,.145,4.0],[0,-.0825,6.29],concrete);
  box(group,[90,.145,18],[0,-.0825,26.79],concrete);
  // Slightly separated paving slabs and raised curb stones carry the human scale.
  for(let x=-20;x<=20;x++) {
    box(group,[.009,.002,3.76],[x*1.2,-.009,6.23],joints);
    for(const z of [8.26,17.74]) box(group,[1.18,.14,.22],[x*1.2,-.07,z],coping,.008);
  }
  for(const z of [5.02,6.23,7.44,18.8,20.0,21.2,22.4,23.6]) box(group,[48,.002,.009],[0,-.009,z],joints);
  for(let x=-10;x<=10;x++) box(group,[1.65,.002,.085],[x*3.8,-.139,13],markings);
  for(const z of [8.46,17.54]) box(group,[70,.012,.14],[0,-.138,z],roof);
  // A recessed storm drain lies along the curb, clear of the central approach.
  box(group,[.70,.018,.35],[3.8,-.123,8.52],m.metal,.005);
  for(let i=0;i<10;i++) box(group,[.022,.005,.28],[3.53+i*.06,-.111,8.52],m.rubber);
  for(const x of [3.485,4.115]) for(const z of [8.38,8.66]) cylinder(group,.006,.004,[x,-.110,z],chrome,8);

  // Existing plaster, door, neon and memorabilia occupy the recessed centre bay.
  for(const side of [-1,1]) {
    box(group,[1.53,3.34,.035],[side*3.665,1.675,4.305],joints);
    for(let row=0;row<30;row++) for(let column=0;column<6;column++) {
      const x=side*3.665-.64+column*.256;
      const stagger=(row%2)*.122;
      if(x+stagger > side*3.665+.69) continue;
      box(group,[.242,.099,.028],[x+stagger,.062+row*.111,4.335],(row*3+column)%7<2?brickDark:brick,.001);
    }
    box(group,[1.54,.10,.12],[side*3.665,.06,4.36],coping,.004);
    box(group,[.16,3.40,.14],[side*4.44,1.70,4.28],brickDark,.005);
  }
  box(group,[9.28,.11,.28],[0,3.48,4.28],coping,.007);
  box(group,[9.16,.36,.18],[0,3.705,4.25],brickDark);
  box(group,[9.34,.07,.32],[0,3.92,4.25],coping,.009);
  for(const x of [-4.53,4.53]) {
    box(group,[.18,.36,8.48],[x,3.705,.02],brickDark);
    box(group,[.32,.07,8.66],[x,3.92,.02],coping,.009);
  }
  box(group,[9.16,.36,.18],[0,3.705,-4.20],brickDark);
  box(group,[9.34,.07,.32],[0,3.92,-4.20],coping,.009);
  box(group,[8.98,.025,8.48],[0,3.5225,.02],roof);
  // A shallow metal canopy belongs to the doorway, not the neon's wall bay.
  box(group,[1.98,.045,.63],[0,2.91,4.48],m.metal,.005);
  for(const x of [-.82,.82]) rod(group,[x,3.12,4.31],[x,2.93,4.76],.010,m.metal);
  const vent = new THREE.Group();
  vent.name = 'Studio rooftop ventilation';
  vent.position.set(-2.3,3.54,-.6);
  group.add(vent);
  box(vent,[1.18,.11,.81],[0,.055,0],m.metal,.006);
  box(vent,[.98,.60,.68],[0,.408,0],roof,.012);
  box(vent,[1.05,.05,.75],[0,.733,0],chrome,.008);
  for(let row=0;row<7;row++) box(vent,[.83,.022,.022],[0,.17+row*.07,.35],chrome,.002);
  cylinder(group,.095,.70,[1.86,3.885,-.3],m.metal,20);
  cylinder(group,.16,.04,[1.86,4.255,-.3],chrome,24);

  // A parked bicycle makes the frontage feel occupied without crowding the door.
  const bike = new THREE.Group();
  bike.name = 'Bicycle parked against studio masonry';
  bike.position.set(-3.77,.02,4.91);
  bike.rotation.set(0,.04,-.08);
  group.add(bike);
  for(const x of [-.56,.56]) {
    const tire=new THREE.Mesh(new THREE.TorusGeometry(.32,.021,7,48),m.rubber);
    tire.position.set(x,.329,0); bike.add(tire);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.289,.005,5,40),chrome);
    rim.position.set(x,.329,0); bike.add(rim);
    for(let spoke=0;spoke<16;spoke++) {
      const angle=spoke*Math.PI/8;
      rod(bike,[x,.329,.005],[x+Math.cos(angle)*.285,.329+Math.sin(angle)*.285,.005],.0012,chrome);
    }
    const hub=cylinder(bike,.018,.09,[x,.329,0],chrome); hub.rotation.x=Math.PI/2;
  }
  const a=[-.56,.329,0],b=[-.11,.29,0],c=[-.22,.79,0],d=[.35,.80,0],e=[.56,.329,0];
  for(const [from,to] of [[a,b],[a,c],[b,c],[c,d],[b,d],[d,e]]) rod(bike,from,to,.016,framePaint);
  rod(bike,[-.22,.79,0],[-.24,.9,0],.011,chrome);
  box(bike,[.24,.055,.12],[-.26,.93,0],saddle,.019);
  rod(bike,[.35,.8,0],[.31,.99,0],.012,chrome);
  rod(bike,[.31,.99,-.20],[.31,.99,.20],.010,chrome);
  for(const z of [-.20,.20]) rod(bike,[.31,.99,z],[.40,.97,z],.014,m.rubber);
  const crank=cylinder(bike,.06,.06,b,m.metal,24); crank.rotation.x=Math.PI/2;
  for(const side of [-1,1]) {
    rod(bike,[-.11,.29,side*.034],[-.11+side*.11,.20,side*.05],.008,chrome);
    box(bike,[.085,.018,.07],[-.11+side*.11,.20,side*.075],m.rubber,.003);
  }
  rod(bike,[-.08,.28,-.03],[.0,.025,-.19],.007,m.metal);

  // Background detail does not cast extra shadow maps; the room keeps its existing lighting budget.
  group.updateWorldMatrix(true,true);
  const batches=new Map<THREE.Material,{parts:THREE.BufferGeometry[]; originals:THREE.Mesh[]}>();
  group.traverse(object=>{
    if(!(object instanceof THREE.Mesh)||Array.isArray(object.material))return;
    const batch=batches.get(object.material)??{parts:[],originals:[]};
    const geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld); geometry.clearGroups();
    batch.parts.push(geometry);batch.originals.push(object);batches.set(object.material,batch);
  });
  for(const [material,batch] of batches){
    const geometry=mergeGeometries(batch.parts,false);batch.parts.forEach(part=>part.dispose());
    if(!geometry)continue;
    const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;group.add(mesh);
    const originals=new Set(batch.originals.map(object=>object.geometry));
    batch.originals.forEach(object=>object.removeFromParent());originals.forEach(original=>original.dispose());
  }
  return {group,resources};
}
