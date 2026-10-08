import type { Environment } from '@/services/environment';

/** 将 Environment 扁平化到 variables 中，用于详情展示与复制 */
export function getFlattenedDetailConfig(env: Environment): Record<string, unknown> {
  const flat: Record<string, unknown> = {
    id: env.id,
    projectId: env.projectId,
    name: env.name,
    engineType: env.engineType,
    envCode: env.envCode,
    robots: env.robots || {},
    variables: { ...(env.variables || {}) },
    createUser: env.createUser,
    updateUser: env.updateUser,
    createdAt: env.createdAt,
    updatedAt: env.updatedAt,
  };
  const v = flat.variables as Record<string, unknown>;
  if (env.domain) v.url = env.domain;
  if (env.dataEndpoint) {
    if (env.dataEndpoint.data_host) v.data_host = env.dataEndpoint.data_host;
    if (env.dataEndpoint.data_port != null) v.data_port = env.dataEndpoint.data_port;
    if (env.dataEndpoint.data_user) v.data_user = env.dataEndpoint.data_user;
    if (env.dataEndpoint.data_password) v.data_password = env.dataEndpoint.data_password;
  }
  if (env.mqInfo?.mq_url) v.mq_url = env.mqInfo.mq_url;
  if (env.dubboInfo?.dubbo_url) v.dubbo_url = env.dubboInfo.dubbo_url;
  if (env.xxljobInfo) {
    if (env.xxljobInfo.xxjob_url) v.xxjob_url = env.xxljobInfo.xxjob_url;
    if (env.xxljobInfo.xxljobuser) v.xxljobuser = env.xxljobInfo.xxljobuser;
    if (env.xxljobInfo.xxljobpassword) v.xxljobpassword = env.xxljobInfo.xxljobpassword;
  }
  return flat;
}
