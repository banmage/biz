/**
 * 状态机断言工具
 */
import { BizError, BizErrorCode } from './biz-error-codes';

/**
 * 状态机转换表定义
 * 格式：{ 当前状态: { 事件: 目标状态 } }
 */
export type TransitionMap = Record<string, Record<string, string>>;

/**
 * 断言状态转换是否合法
 * @throws BizError(BIZ_INVALID_STATE_TRANSITION) 如果转换非法
 */
export const assertTransition = (
  transitionMap: TransitionMap,
  currentState: string,
  event: string
): string => {
  const stateTransitions = transitionMap[currentState];
  if (!stateTransitions) {
    throw new BizError(
      BizErrorCode.BIZ_INVALID_STATE_TRANSITION,
      `当前状态 '${currentState}' 不允许任何操作`
    );
  }

  const targetState = stateTransitions[event];
  if (!targetState) {
    throw new BizError(
      BizErrorCode.BIZ_INVALID_STATE_TRANSITION,
      `当前状态 '${currentState}' 不允许操作 '${event}'`
    );
  }

  return targetState;
};

/**
 * 检查状态转换是否合法（不抛异常）
 */
export const canTransition = (
  transitionMap: TransitionMap,
  currentState: string,
  event: string
): boolean => {
  return transitionMap[currentState]?.[event] !== undefined;
};
