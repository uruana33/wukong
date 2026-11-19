// 动作数据与连招判定系统
export interface ActionData {
  actionId: number;
  totalFrames: number;
  hitboxActive: [number, number];
  cancelWindows: {
    targetActionId: number;
    window: [number, number];
    requireHit: boolean;
  }[];
}

export function updateComboSystem(entity: any, inputBuffer: any) {
  const state = entity.get('StateComponent');
  const action = entity.get('ActionComponent');
  const data: ActionData = getActionData(action.currentId);

  if (state.current === 'ATTACKING') {
      for (const cw of data.cancelWindows) {
          if (action.currentFrame >= cw.window[0] && action.currentFrame <= cw.window[1]) {
              if (inputBuffer.has('LIGHT_ATTACK') && (!cw.requireHit || action.hasHitTarget)) {
                  state.switchTo('ATTACKING');
                  action.play(cw.targetActionId);
                  inputBuffer.consume('LIGHT_ATTACK');
                  break;
              }
          }
      }
  }
}
function getActionData(id: number): ActionData { return {} as ActionData; }
