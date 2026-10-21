import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisitor, guideVisitor, ROACH_GUIDE} from '../src/events/RoachGuide.ts';

const floor = {width: 700, height: 280};
test('the visitor stays put when the broom is released or out of reach', () => {
  const start=createVisitor(0);
  for(const [broom,held] of [[{x:.1,y:.4},false],[{x:.95,y:.4},true]]) {
    let state=start;
    for(let i=0;i<1800;i++)state=guideVisitor(state,broom,held,1/60,floor);
    assert.equal(state.x,start.x);assert.equal(state.y,start.y);
    assert.equal(state.walking,false);assert.equal(state.escaped,false);
  }
});

test('the visitor moves away from either side of the broom without teleporting', () => {
  const start=createVisitor(0);
  assert.ok(guideVisitor(start,{x:.15,y:start.y},true,.05,floor).x>start.x);
  assert.ok(guideVisitor(start,{x:.29,y:start.y},true,.05,floor).x<start.x);
  const paused=guideVisitor(start,{x:.15,y:start.y},true,60,floor);
  assert.ok((paused.x-start.x)*floor.width<=floor.height*ROACH_GUIDE.speed*.05+.0001);
});

test('the broom can guide every starting position through the doorway on different screens', () => {
  for(const floor of [{width:800,height:320},{width:500,height:124},{width:260,height:220}]) {
    for(let seed=0;seed<5;seed++) {
      let state=createVisitor(seed);
      for(let i=0;i<1800&&!state.escaped;i++) {
        const distance=Math.min(floor.width,floor.height)*.2;
        const broom={x:state.x-distance/floor.width,y:state.y};
        state=guideVisitor(state,broom,true,1/60,floor);
      }
      assert.equal(state.escaped,true,`${floor.width}x${floor.height}, seed ${seed}`);
      assert.ok(state.y>=ROACH_GUIDE.exitTop&&state.y<=ROACH_GUIDE.exitBottom);
      assert.ok(state.x>=ROACH_GUIDE.exitX);
    }
  }
});

test('walls contain the visitor, and reaching the right wall away from the door is not a win', () => {
  let state={...createVisitor(0),x:.86,y:.84};
  for(let i=0;i<300;i++) {
    state=guideVisitor(state,{x:state.x-.02,y:state.y-.07},true,1/60,floor);
    assert.ok(state.x>=.07&&state.x<=.98);assert.ok(state.y>=.15&&state.y<=.85);
    assert.equal(state.escaped,false);
  }
});
