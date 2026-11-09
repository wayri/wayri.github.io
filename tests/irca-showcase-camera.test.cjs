const {test} = require('node:test');
const assert = require('node:assert/strict');
const {pose} = require('../assets/js/irca-showcase-camera.js');
const near = (a, b) => assert.ok(Math.abs(a-b)<1e-9, `${a} versus ${b}`);
test('product pose keeps a level screen, fixed distance and gentle backward tilt', () => {
    const frame = {normal:[0,0,1], up:[0,1,0]};
    const base = {position:[20,30,120], target:[20,30,20], up:[1,0,0]};
    const before = JSON.stringify({frame,base});
    for (const yaw of [-6,0,6]) {
        const camera = pose(frame,base,yaw);
        assert.deepEqual(camera.up,[0,1,0]);
        const offset = camera.position.map((v,i)=>v-camera.target[i]);
        near(Math.hypot(...offset),100);
        near(offset[1]/100,Math.sin(18*Math.PI/180));
        assert.ok(offset[2]>94, 'Camera always remains in front of the screen');
    }
    near(pose(frame,base,0).position[0],20);
    near(Math.hypot(...pose(frame,base,0,18,2).position.map((v,i)=>v-base.target[i])),200);
    assert.equal(JSON.stringify({frame,base}),before);
});
test('face-relative orientation works when the design axes differ from the screen axes', () => {
    const camera = pose({normal:[0,-1,0],up:[0,0,1]}, {position:[0,0,10],target:[0,0,0],up:[0,1,0]});
    assert.deepEqual(camera.up,[0,0,1]);
    near(camera.position[0],0);assert.ok(camera.position[1]<0);assert.ok(camera.position[2]>0);
    assert.throws(()=>pose({normal:[0,0,0],up:[0,1,0]},camera));
});
