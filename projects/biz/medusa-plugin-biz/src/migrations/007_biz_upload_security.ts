import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export default class Migration007 extends Migration {
  async up(): Promise<void> {
    // 上传安全：为文件关联表添加 virus_scan_status 字段
    // MVP 不实现扫描逻辑，仅预留字段供 Phase 2 实现
    // 注意：此迁移不创建新表，而是在已有的 Medusa File 相关表中添加字段
    // 由于 Medusa 核心 File 表结构不确定，此迁移为占位
    // 实际部署时需根据核心表结构调整
  }

  async down() {
    // 生产环境不支持回滚，仅用于本地开发快速重置
  }
}
