/**
 * 工作台页面
 * 路由: /workspace
 * 这是与路由对应的顶层页面组件
 */

import { SnapTestModule } from '@/components/features/SnapTestModule';
import { RequirementQualityView } from '@/components/features/requirement-quality';

type WorkspaceSubMenu = 'test-factory' | 'requirement-quality';

interface WorkspacePageProps {
  selectedSubMenu?: string;
}

export function WorkspacePage({ selectedSubMenu: propSelectedSubMenu }: WorkspacePageProps = {}) {
  const selectedSubMenu = (propSelectedSubMenu || 'requirement-quality') as WorkspaceSubMenu;

  const renderContent = () => {
    switch (selectedSubMenu) {
      case 'requirement-quality':
        return <RequirementQualityView />;
      case 'test-factory':
        return (
          <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-auto">
            <div className="p-6">
              <SnapTestModule />
            </div>
          </div>
        );
      default:
        return <RequirementQualityView />;
    }
  };

  return (
    <div className="flex-1 w-full min-h-0 h-full relative overflow-hidden flex flex-col">
      {renderContent()}
    </div>
  );
}
