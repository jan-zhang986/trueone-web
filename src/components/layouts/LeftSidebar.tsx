import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  PanelLeft,
  PanelLeftClose,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useSystemAdminCheck } from '@/hooks/usePermissionCheck';
import { useUser } from '@/contexts/UserContext';
import { menuService, SysMenuItem } from '@/services/setting/menu';
import { getDynamicIcon } from '@/utils/dynamicIcon';
import { MENU_REFRESH_EVENT } from '@/utils/menuEvents';

interface LeftSidebarProps {
  selectedItem: string;
  onSelectItem: (item: string) => void;
}

// 静态兜底菜单（网络延迟或离线时防闪烁）
const DEFAULT_MENU_FALLBACK: SysMenuItem[] = [
  { id: 1, parentId: 0, menuKey: 'workspace', title: '工作台', path: '/workspace', icon: 'Globe', permission: 'WORKSPACE:READ', menuType: 'MENU', sort: 1, isHidden: 0, status: 'ENABLE' },
  { id: 2, parentId: 0, menuKey: 'project-management', title: '项目管理', path: '/project-management', icon: 'FolderKanban', permission: 'PROJECT_MANAGEMENT:READ', menuType: 'MENU', sort: 2, isHidden: 0, status: 'ENABLE' },
  { id: 3, parentId: 0, menuKey: 'quality-workspace', title: '测试计划', path: '/quality-workspace', icon: 'ClipboardList', permission: 'QUALITY:READ', menuType: 'MENU', sort: 3, isHidden: 0, status: 'ENABLE' },
  { id: 4, parentId: 0, menuKey: 'test-case', title: '测试资产', path: '/test-case', icon: 'Layers', permission: 'CASE:READ', menuType: 'MENU', sort: 4, isHidden: 0, status: 'ENABLE' },
  { id: 5, parentId: 0, menuKey: 'precision-test', title: '精准测试', path: '/precision-test', icon: 'Target', permission: 'COV:READ', menuType: 'MENU', sort: 5, isHidden: 0, status: 'ENABLE' },
  { id: 6, parentId: 0, menuKey: 'bug-management', title: '缺陷管理', path: '/bug-management', icon: 'Bug', permission: 'BUG:READ', menuType: 'MENU', sort: 6, isHidden: 0, status: 'ENABLE' },
  { id: 7, parentId: 0, menuKey: 'setting', title: '系统设置', path: '/setting', icon: 'Settings', permission: 'SYSTEM:READ', menuType: 'MENU', sort: 99, isHidden: 0, status: 'ENABLE' },
];

export function LeftSidebar({ selectedItem, onSelectItem }: LeftSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isSystemAdmin } = useSystemAdminCheck();
  const { user } = useUser();

  const [dynamicMenus, setDynamicMenus] = useState<SysMenuItem[]>(DEFAULT_MENU_FALLBACK);
  const [expandedKeys, setExpandedKeys] = useState<Record<number, boolean>>({});

  // 从后端动态加载菜单
  const loadMenus = useCallback(async () => {
    try {
      const data = await menuService.getUserMenuTree();
      if (Array.isArray(data) && data.length > 0) {
        setDynamicMenus(data);
      }
    } catch (e) {
      console.warn('[LeftSidebar] Failed to load dynamic menus, using fallback:', e);
    }
  }, []);

  useEffect(() => {
    loadMenus();

    // 监听菜单更新事件（当系统设置中新增/修改菜单时无缝刷新）
    const handleRefresh = () => {
      loadMenus();
    };

    window.addEventListener(MENU_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(MENU_REFRESH_EVENT, handleRefresh);
    };
  }, [loadMenus, user]);

  const toggleSubmenu = (id: number) => {
    setExpandedKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleMenuClick = (item: SysMenuItem) => {
    if (item.menuType === 'DIRECTORY') {
      toggleSubmenu(item.id);
      return;
    }
    if (item.menuType === 'LINK') {
      if (item.path) {
        window.open(item.path, '_blank', 'noopener,noreferrer');
      }
      return;
    }
    onSelectItem(item.menuKey);
  };

  const renderMenuItem = (item: SysMenuItem, level = 0) => {
    const isSelected = selectedItem === item.menuKey;
    const hasChildren = Boolean(item.children && item.children.length > 0);
    const isExpanded = expandedKeys[item.id] ?? false;

    return (
      <div key={item.id} className="w-full">
        <button
          onClick={() => handleMenuClick(item)}
          className={cn(
            "w-full flex items-center rounded-md text-sm transition-colors relative group",
            isCollapsed ? "justify-center px-2 py-2.5" : "gap-2 px-3 py-2.5",
            level > 0 && !isCollapsed && "pl-6 text-xs",
            isSelected
              ? 'bg-blue-50 text-blue-600 font-medium'
              : 'text-gray-700 hover:bg-gray-50'
          )}
          title={isCollapsed ? item.title : undefined}
        >
          <div className={cn(
            "w-4 h-4 flex-shrink-0 flex items-center justify-center",
            isSelected ? 'text-blue-600' : 'text-gray-500'
          )}>
            {getDynamicIcon(item.icon, "w-4 h-4")}
          </div>

          {!isCollapsed && (
            <>
              <span className="flex-1 text-left whitespace-nowrap truncate">
                {item.menuKey === 'quality-workspace' && (item.title === '需求质量' || item.title === '质量工作台') ? '测试计划' : item.title}
              </span>
              {item.menuType === 'LINK' && (
                <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-gray-600 shrink-0" />
              )}
              {item.menuType === 'IFRAME' && (
                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1 py-0.5 rounded border border-emerald-100 font-normal shrink-0">
                  外嵌
                </span>
              )}
              {hasChildren && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSubmenu(item.id);
                  }}
                  className="p-0.5 rounded hover:bg-gray-200/50"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </span>
              )}
            </>
          )}
        </button>

        {/* 子菜单展开 */}
        {!isCollapsed && hasChildren && isExpanded && (
          <div className="space-y-0.5 mt-0.5 pl-2 border-l border-gray-100 ml-4">
            {item.children!.map((child) => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out select-none",
        isCollapsed ? "w-16" : "w-52"
      )}
    >
      <nav className="flex-1 px-2 pt-4 pb-2 space-y-1 overflow-y-auto custom-scrollbar">
        {dynamicMenus.map((item) => renderMenuItem(item, 0))}
      </nav>

      {/* 底部菜单栏右侧的收起/展开按钮 */}
      <div className="px-2 py-2 flex justify-end border-t border-gray-100">
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
            <PanelLeft className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>
      </div>
    </aside>
  );
}
