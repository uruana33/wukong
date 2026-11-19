// 极限完美闪避判定
export function checkHitDuringDodge(entity: any, attacker: any) {
  let dodge = entity.get('DodgeState');
  if (dodge.isDodging) {
    let f = dodge.dodgeTimer;
    if (f >= dodge.iFrameWindow[0] && f <= dodge.iFrameWindow[1]) {
      if (f >= dodge.perfectWindow[0] && f <= dodge.perfectWindow[1]) {
         triggerGlobalTimeScale(0.2, 1.5);
         entity.addResource('Energy', 20); 
         return { hitResult: 'PERFECT_DODGE', damage: 0 };
      }
      return { hitResult: 'DODGED', damage: 0 };
    }
  }
  // return processHit(entity, attacker.getHitData());
}
function triggerGlobalTimeScale(scale: number, time: number) {}
