/**
 * PermissionGate 组件
 * 权限检查和无权限提示组件
 */

import React from 'react';
import { ShieldAlert } from 'lucide-react';

/**
 * PermissionGate 组件 Props
 */
export interface PermissionGateProps {
  isCheckingPermission: boolean;
  hasPermission: boolean | null;
  children: React.ReactNode;
  /** 无权限时展示的功能名称，用于文案「抱歉，您没有权限访问 XXX」 */
  noPermissionFeatureName?: string;
}

/**
 * PermissionGate 组件
 */
const DEFAULT_NO_PERMISSION_FEATURE_NAME = '该功能';

export const PermissionGate = React.memo<PermissionGateProps>(function PermissionGate({
  isCheckingPermission,
  hasPermission,
  children,
  noPermissionFeatureName = DEFAULT_NO_PERMISSION_FEATURE_NAME,
}: PermissionGateProps) {
  // 权限检查中
  if (isCheckingPermission) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">正在检查权限...</p>
        </div>
      </div>
    );
  }

  // 无权限提示
  if (!hasPermission) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md px-8">
          <ShieldAlert className="w-24 h-24 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">访问受限</h2>
          <p className="text-gray-300 text-lg mb-2">
            抱歉，您没有权限访问{noPermissionFeatureName}。
          </p>
          <p className="text-gray-400 text-sm">
            此功能仅限项目管理员和系统管理员使用。
          </p>
        </div>
      </div>
    );
  }

  // 有权限，显示子组件
  return <>{children}</>;
});
