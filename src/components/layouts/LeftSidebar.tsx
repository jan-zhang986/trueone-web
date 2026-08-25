import { useState, useMemo } from 'react';
import {
  FolderKanban,
  ClipboardList,
  Layers,
  Globe,
  Bug,
  Target,
  Settings,
  Sparkles,
  Cpu,
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useSystemAdminCheck } from '@/hooks/usePermissionCheck';

interface LeftSidebarProps {
  selectedItem: string;
  onSelectItem: (item: string) => void;
}

const ALL_MENU_ITEMS = [
    { id: 'workspace', label: '工作台', icon: Globe, color: 'text-gray-600' },
    { id: 'project-management', label: '项目管理', icon: FolderKanban, color: 'text-gray-600' },
    { id: 'quality-workspace', label: '需求质量', icon: ClipboardList, color: 'text-gray-600' },
    { id: 'test-case', label: '测试资产', icon: Layers, color: 'text-gray-600' },
    {
      id: 'test-factory',
      label: '测试工厂',
      icon: Sparkles,
      color: 'text-gray-600',
    },
    { id: 'precision-test', label: '精准测试', icon: Target, color: 'text-gray-600' },
    { id: 'bug-management', label: '缺陷管理', icon: Bug, color: 'text-gray-600' },
    { id: 'aegis-agent', label: 'AI Agent', icon: Cpu, color: 'text-gray-600' },
    { id: 'setting', label: '系统设置', icon: Settings, color: 'text-gray-600' },
  ];

export function LeftSidebar({ selectedItem, onSelectItem }: LeftSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isSystemAdmin, isChecking } = useSystemAdminCheck();
  // 仅系统管理员可见：工作台、系统设置。加载中或已确认为管理员时显示，仅当明确非管理员时隐藏
  const menuItems = useMemo(
    () =>
      isChecking || isSystemAdmin === true
        ? ALL_MENU_ITEMS
        : ALL_MENU_ITEMS.filter((item) => item.id !== 'workspace' && item.id !== 'setting'),
    [isSystemAdmin, isChecking]
  );

  return (
    <aside
      className={cn(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-52"
      )}
    >
      <nav className="flex-1 px-2 pt-4 pb-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedItem === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectItem(item.id)}
              className={cn(
                "w-full flex items-center rounded-md text-sm transition-colors relative",
                isCollapsed ? "justify-center px-2 py-2.5" : "gap-2 px-3 py-2.5",
                isSelected
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={cn(
                "w-4 h-4 flex-shrink-0",
                isSelected ? 'text-blue-600' : item.color
              )} />
              {!isCollapsed && (
                <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
              )}
            </button>
          );
        })}

      </nav>
      {/* 底部菜单栏右侧的收起/展开按钮，仅图标样式 */}
      <div className="px-2 py-2 flex justify-end">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "inline-flex items-center justify-center rounded-md text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors",
            "h-8 w-8"
          )}
          title={isCollapsed ? "展开菜单" : "收起菜单"}
          aria-label={isCollapsed ? "展开菜单" : "收起菜单"}
        >
          {isCollapsed ? (
            <PanelLeft className="w-6 h-6" />
          ) : (
            <PanelLeftClose className="w-6 h-6" />
          )}
        </button>
      </div>
    </aside>
  );
}
