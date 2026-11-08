# First animated human — work in progress

Liza uses Michelle.glb from the three.js r160 examples, a Mixamo model. It is not a Sims asset or a likeness of a real person.

Model: https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/models/gltf/Michelle.glb (3,276,888 bytes).
Animation source: https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/models/gltf/Soldier.glb (Idle, Walk, Run).
Usage: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html — characters and animations may be used in personal, commercial and nonprofit projects including video games. Do not confuse the three.js MIT library licence with the third-party model terms.

human-animations.json contains quaternion tracks retargeted at 20 Hz from Soldier onto Michelle. Bone lengths are preserved; source and destination forward axes differ by 180 degrees. Translation stays in the scene controller. retarget-human.mjs is the offline generator; it expects the two GLBs and local three.mjs / GLTFLoader.mjs dependencies.

Status: work in progress. Actual GLB parsing, skeleton motion, idle stop and patrol bounds tested in Node; no successful WebGL browser test. The cloud browser has WebGL disabled. A software-rendered still is a model preview, not a screenshot of the running site. Walking/running appearance and floor contact still require visual validation.

The model loads from raw.githubusercontent.com with a 25-second timeout and retry. One resident is replaced after loading succeeds; the old mesh survives failure. Sitting, facial expressions, custom clothing, remaining residents and server-side simulation are not implemented.
