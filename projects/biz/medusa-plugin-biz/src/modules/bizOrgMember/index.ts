import OrgMemberService from "./service";

const moduleDefinition = {
  service: OrgMemberService,
};

// Module Linkable 配置（用于 defineLink）
(moduleDefinition as any).linkable = {
  orgMember: {
    serviceName: "orgMemberService",
    primaryKey: "id",
  },
};

export default moduleDefinition;
