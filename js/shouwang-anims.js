// AI key poses, registered gait, shared contact timing for both forms.
Object.assign(CONFIG.characters.shouwang,{
  "anims": {
    "idle": {
      "frames": 1,
      "path": "assets/chars/shouwang/v1/{form}/idle",
      "fps": 4,
      "loop": true,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375
    },
    "walk": {
      "frames": 12,
      "path": "assets/chars/shouwang/v1/{form}/walk",
      "fps": 14,
      "loop": true,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375
    },
    "walkBack": {
      "frames": 12,
      "path": "assets/chars/shouwang/v1/{form}/walkBack",
      "fps": 12,
      "loop": true,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375
    },
    "walkStart": {
      "frames": 3,
      "path": "assets/chars/shouwang/v1/{form}/walkStart",
      "fps": 22,
      "loop": false,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375
    },
    "walkStop": {
      "frames": 3,
      "path": "assets/chars/shouwang/v1/{form}/walkStop",
      "fps": 22,
      "loop": false,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375
    },
    "j1": {
      "frames": 6,
      "path": "assets/chars/shouwang/v1/{form}/j1",
      "fps": 14,
      "loop": false,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375,
      "phases": [
        2,
        4
      ]
    },
    "j2": {
      "frames": 6,
      "path": "assets/chars/shouwang/v1/{form}/j2",
      "fps": 14,
      "loop": false,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375,
      "phases": [
        2,
        4
      ]
    },
    "j3": {
      "frames": 7,
      "path": "assets/chars/shouwang/v1/{form}/j3",
      "fps": 14,
      "loop": false,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375,
      "phases": [
        3,
        5
      ]
    },
    "launcher": {
      "frames": 6,
      "path": "assets/chars/shouwang/v1/{form}/launcher",
      "fps": 14,
      "loop": false,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375,
      "phases": [
        2,
        4
      ]
    },
    "low": {
      "frames": 6,
      "path": "assets/chars/shouwang/v1/{form}/low",
      "fps": 14,
      "loop": false,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375,
      "phases": [
        2,
        4
      ]
    },
    "dashAttack": {
      "frames": 6,
      "path": "assets/chars/shouwang/v1/{form}/dashAttack",
      "fps": 14,
      "loop": false,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375,
      "phases": [
        2,
        4
      ]
    },
    "airAttack": {
      "frames": 5,
      "path": "assets/chars/shouwang/v1/{form}/airAttack",
      "fps": 14,
      "loop": false,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375,
      "phases": [
        2,
        4
      ]
    },
    "super_": {
      "frames": 9,
      "path": "assets/chars/shouwang/v1/{form}/super_",
      "fps": 14,
      "loop": false,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375,
      "phases": [
        4,
        6
      ]
    },
    "u": {
      "frames": 7,
      "path": "assets/chars/shouwang/v1/{form}/u",
      "fps": 14,
      "loop": false,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375,
      "fitState": true,
      "contact": 3
    },
    "jump": {
      "frames": 7,
      "path": "assets/chars/shouwang/v1/{form}/jump",
      "fps": 14,
      "loop": false,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375,
      "physics": true
    },
    "land": {
      "frames": 3,
      "path": "assets/chars/shouwang/v1/{form}/land",
      "fps": 24,
      "loop": false,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375
    },
    "dash": {
      "frames": 4,
      "path": "assets/chars/shouwang/v1/{form}/dash",
      "fps": 20,
      "loop": false,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375
    },
    "block": {
      "frames": 1,
      "path": "assets/chars/shouwang/v1/{form}/block",
      "fps": 14,
      "loop": true,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375
    },
    "parry": {
      "frames": 3,
      "path": "assets/chars/shouwang/v1/{form}/parry",
      "fps": 8,
      "loop": true,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375
    },
    "parryCounter": {
      "frames": 6,
      "path": "assets/chars/shouwang/v1/{form}/parryCounter",
      "fps": 14,
      "loop": false,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375,
      "phases": [
        2,
        4
      ]
    },
    "charge": {
      "frames": 1,
      "path": "assets/chars/shouwang/v1/{form}/charge",
      "fps": 6,
      "loop": true,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375
    },
    "hit": {
      "frames": 3,
      "path": "assets/chars/shouwang/v1/{form}/hit",
      "fps": 14,
      "loop": false,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375,
      "fitHurt": true
    },
    "fall": {
      "frames": 1,
      "path": "assets/chars/shouwang/v1/{form}/fall",
      "fps": 14,
      "loop": false,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375
    },
    "knockdown": {
      "frames": 1,
      "path": "assets/chars/shouwang/v1/{form}/knockdown",
      "fps": 14,
      "loop": false,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375
    },
    "ko": {
      "frames": 1,
      "path": "assets/chars/shouwang/v1/{form}/ko",
      "fps": 14,
      "loop": false,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375
    },
    "getup": {
      "frames": 5,
      "path": "assets/chars/shouwang/v1/{form}/getup",
      "fps": 24,
      "loop": false,
      "referenceHeight": 240,
      "canvasHeight": 320,
      "originX": 0.37109375,
      "originY": 0.9375
    }
  },
  "dashAttack": {
    "name": "铁壁突进",
    "damage": 72,
    "range": 102,
    "hitHeight": 50,
    "startup": 8,
    "active": 6,
    "recovery": 22,
    "knockback": 9,
    "hitstun": 25,
    "lunge": 6
  },
  "airAttack": {
    "name": "坠星重斩",
    "damage": 78,
    "range": 75,
    "hitHeight": 76,
    "startup": 9,
    "active": 7,
    "recovery": 22,
    "knockback": 8,
    "hitstun": 26,
    "below": true
  },
  "special": {
    "type": "parry",
    "name": "誓约反击",
    "window": 24,
    "failRecover": 30,
    "meterGain": 12,
    "counter": {
      "name": "破阵反斩",
      "damage": 88,
      "range": 90,
      "hitHeight": 70,
      "startup": 7,
      "active": 6,
      "recovery": 25,
      "knockback": 10,
      "hitstun": 28
    }
  },
  "resource": {
    "name": "誓约",
    "max": 3,
    "damagePerLayer": 0.08,
    "desc": "O / 6 进入24帧誓约招架；成功后自动反斩、叠满3层誓约并回12气。每层增加8%伤害。"
  }
});
