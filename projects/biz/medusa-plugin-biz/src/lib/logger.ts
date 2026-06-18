/**
 * Logger 封装 — 统一获取 Medusa 容器中的 logger
 */

/**
 * 获取 Medusa 容器解析的 logger
 * 在 Service 中通过 container.resolve('logger') 获取
 */
export const getBizLogger = (container: any) => {
  return container.resolve('logger');
};
