// Run, directional double jump, aerial travel and attack; appended after the original character atlases.
Object.assign(CONFIG.characters.noble.anims,{
  "run": {
    "frames": 8,
    "path": "assets/chars/mobility-v1/noble/run",
    "referenceHeight": 240,
    "canvasHeight": 320,
    "originX": 0.41015625,
    "originY": 0.93125,
    "fps": 18,
    "loop": true
  },
  "doubleJump": {
    "frames": 4,
    "path": "assets/chars/mobility-v1/noble/doubleJump",
    "referenceHeight": 240,
    "canvasHeight": 320,
    "originX": 0.41015625,
    "originY": 0.93125,
    "fps": 24,
    "loop": false
  },
  "airMove": {
    "frames": 4,
    "path": "assets/chars/mobility-v1/noble/airMove",
    "referenceHeight": 240,
    "canvasHeight": 320,
    "originX": 0.41015625,
    "originY": 0.93125,
    "fps": 12,
    "loop": false,
    "airTravel": true
  },
  "airAttack": {
    "frames": 6,
    "path": "assets/chars/mobility-v1/noble/airAttack",
    "referenceHeight": 240,
    "canvasHeight": 320,
    "originX": 0.41015625,
    "originY": 0.93125,
    "fps": 18,
    "loop": false,
    "phases": [
      2,
      4
    ]
  }
});
Object.assign(CONFIG.characters.jianke.anims,{
  "run": {
    "frames": 8,
    "path": "assets/chars/mobility-v1/jianke/run",
    "referenceHeight": 240,
    "canvasHeight": 320,
    "originX": 0.41015625,
    "originY": 0.93125,
    "fps": 18,
    "loop": true
  },
  "doubleJump": {
    "frames": 4,
    "path": "assets/chars/mobility-v1/jianke/doubleJump",
    "referenceHeight": 240,
    "canvasHeight": 320,
    "originX": 0.41015625,
    "originY": 0.93125,
    "fps": 24,
    "loop": false
  },
  "airMove": {
    "frames": 4,
    "path": "assets/chars/mobility-v1/jianke/airMove",
    "referenceHeight": 240,
    "canvasHeight": 320,
    "originX": 0.41015625,
    "originY": 0.93125,
    "fps": 12,
    "loop": false,
    "airTravel": true
  },
  "airAttack": {
    "frames": 6,
    "path": "assets/chars/mobility-v1/jianke/airAttack",
    "referenceHeight": 240,
    "canvasHeight": 320,
    "originX": 0.41015625,
    "originY": 0.93125,
    "fps": 18,
    "loop": false,
    "phases": [
      2,
      4
    ]
  }
});
Object.assign(CONFIG.characters.shouwang.anims,{
  "run": {
    "frames": 8,
    "path": "assets/chars/mobility-v1/{form}/run",
    "referenceHeight": 240,
    "canvasHeight": 320,
    "originX": 0.41015625,
    "originY": 0.93125,
    "fps": 18,
    "loop": true
  },
  "doubleJump": {
    "frames": 4,
    "path": "assets/chars/mobility-v1/{form}/doubleJump",
    "referenceHeight": 240,
    "canvasHeight": 320,
    "originX": 0.41015625,
    "originY": 0.93125,
    "fps": 24,
    "loop": false
  },
  "airMove": {
    "frames": 4,
    "path": "assets/chars/mobility-v1/{form}/airMove",
    "referenceHeight": 240,
    "canvasHeight": 320,
    "originX": 0.41015625,
    "originY": 0.93125,
    "fps": 12,
    "loop": false,
    "airTravel": true
  },
  "airAttack": {
    "frames": 6,
    "path": "assets/chars/mobility-v1/{form}/airAttack",
    "referenceHeight": 240,
    "canvasHeight": 320,
    "originX": 0.41015625,
    "originY": 0.93125,
    "fps": 18,
    "loop": false,
    "phases": [
      2,
      4
    ]
  }
});

for(const id of CONFIG.roster)Object.assign(CONFIG.characters[id].airAttack,{name:"空中追击",below:false,hitY:Math.round(CONFIG.characters[id].height*.72)});
