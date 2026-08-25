/**
 * MessageManagementPage Component
 * 消息管理主页面 - 交互与原项目（aegis-next-server）一致，复用 ProjectMessageView
 */

import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { ProjectMessageView } from '@/components/features/project-management/ProjectMessageView';
import { Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface MessageManagementPageProps {
  projectId: string;
}

export type { MessageManagementPageProps };

export function MessageManagementPage({ projectId }: MessageManagementPageProps) {
  const { hasPermission, isCheckingPermission } = usePermissionCheck(projectId);

  if (isCheckingPermission) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <span className="text-4xl">🔍</span>
          </div>
          <p className="text-gray-500">正在检查权限...</p>
        </div>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 p-6">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertTitle>权限不足</AlertTitle>
          <AlertDescription>
            您没有访问消息管理的权限。只有系统管理员和项目管理员可以管理消息配置和机器人。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <main
      className="h-full flex flex-col bg-gray-50 overflow-auto"
      role="main"
      aria-label="消息管理"
    >
      <div className="flex-1 p-8">
        <ProjectMessageView projectId={projectId} />
      </div>
    </main>
  );
}

