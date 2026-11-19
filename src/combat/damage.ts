// 受击硬直与位移计算
export function processHit(entity: any, hit: any) {
  let stats = entity.get('CombatStats');
  stats.currentPoise -= hit.poiseDamage;
  
  if (stats.currentPoise <= 0 || hit.hitLevel === 'LAUNCH') {
      stats.currentState = 'HIT_STUN';
      stats.currentPoise = stats.maxPoise;
      
      let actualStunFrames = hit.hitStunFrames * 1.5;
      let knockbackVelocity = hit.knockbackForce / stats.weight;
      
      entity.addComponent('KnockbackComponent', { velocity: knockbackVelocity });
      entity.playAnimation('Hit', actualStunFrames);
  } else {
      entity.playAnimation('Hit_Flinch');
  }
}
