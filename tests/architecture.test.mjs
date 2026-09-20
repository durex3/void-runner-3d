import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGameState,resetRunState} from '../src/game-state.js';
import {createUpgradeChoices} from '../src/upgrades.js';

test('run reset preserves the selected loadout and restores transient state',()=>{
  const state=createGameState();
  Object.assign(state,{loadout:2,hp:3,wave:7,damage:2,mode:'lost'});
  resetRunState(state);
  assert.equal(state.loadout,2);
  assert.deepEqual({hp:state.hp,wave:state.wave,damage:state.damage,mode:state.mode},{hp:100,wave:1,damage:1,mode:'playing'});
});

test('upgrade strategy keeps engineer-only combo out of other hero pools',()=>{
  const state=createGameState(),garden={combos:new Set()};
  const choices=createUpgradeChoices({state,garden,heroName:'Knight',random:()=>0});
  assert.equal(choices.length,3);
  assert.ok(choices.every(choice=>choice.id!=='watering'));
  assert.ok(choices.some(choice=>choice.id));
});

test('upgrade strategy returns ordinary upgrades after all available combos are owned',()=>{
  const state=createGameState(),garden={combos:new Set(['voltage','snare','compost','watering','pollen','friendship'])};
  const choices=createUpgradeChoices({state,garden,heroName:'Engineer',random:()=>0});
  assert.equal(choices.length,3);
  assert.ok(choices.every(choice=>!choice.id));
  choices[0].apply();
  assert.notDeepEqual(state,createGameState());
});

test('upgrade recommendations match each hero without removing core choices',()=>{
  const expected={Knight:'pollen',Ranger:'snare',Druid:'snare',Engineer:'watering'};
  for(const [hero,id] of Object.entries(expected)){
    const choices=createUpgradeChoices({state:createGameState(),garden:{combos:new Set()},heroName:hero,random:()=>.5});
    assert.equal(choices[0].id,id);
    assert.equal(choices[0].recommended,true);
    assert.ok(choices.some(choice=>choice.kind==='core'));
    if(hero!=='Engineer')assert.ok(choices.every(choice=>choice.id!=='watering'));
  }
});
