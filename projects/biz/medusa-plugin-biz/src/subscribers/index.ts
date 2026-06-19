/**
 * 订阅者注册入口
 *
 * 所有事件订阅者在此统一注册，Medusa 通过此文件发现并绑定事件监听
 */

import productExtensionHook from "./product-extension-hook";

/**
 * 订阅者映射表
 * key: 事件名称（与 Workflow 发出的事件名一致）
 * value: 处理函数
 *
 * productsCreated: 任何 Product 创建完成后触发（包括通过 Core API 直接创建的场景）
 * 职责：确保"任何 Product 必有 ProductExtension"（兜底机制）
 */
const subscribers: Record<string, any> = {
  "product.created": productExtensionHook,
};

export default subscribers;
