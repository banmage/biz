import ProductExtensionService from "./service";

const moduleDefinition = {
  service: ProductExtensionService,
};

// Module Linkable 配置（用于 defineLink）
(moduleDefinition as any).linkable = {
  productExtension: {
    serviceName: "productExtensionService",
    primaryKey: "id",
  },
};

export default moduleDefinition;
