import { http } from '@/utils/request';

export interface SysMenuItem {
  id: number;
  parentId: number;
  menuKey: string;
  title: string;
  path: string;
  icon: string;
  permission?: string;
  menuType: 'DIRECTORY' | 'MENU' | 'IFRAME' | 'LINK';
  sort: number;
  isHidden: number; // 0: 否, 1: 是
  status: 'ENABLE' | 'DISABLE';
  createTime?: number;
  updateTime?: number;
  children?: SysMenuItem[];
}

let cachedUserMenus: SysMenuItem[] = [];

export function setCachedUserMenus(menus: SysMenuItem[]) {
  cachedUserMenus = Array.isArray(menus) ? menus : [];
}

export function getCachedUserMenuByKey(key: string): SysMenuItem | undefined {
  const search = (items: SysMenuItem[]): SysMenuItem | undefined => {
    for (const item of items) {
      if (item.menuKey === key) return item;
      if (item.children && item.children.length > 0) {
        const found = search(item.children);
        if (found) return found;
      }
    }
    return undefined;
  };
  return search(cachedUserMenus);
}

export const menuService = {
  /** 获取系统菜单全量树（供菜单管理配置使用） */
  getMenuTree: async (): Promise<SysMenuItem[]> => {
    return http.get('/system/menu/tree');
  },

  /** 获取当前登录用户有权限的菜单树（供全局左侧侧边栏渲染） */
  getUserMenuTree: async (): Promise<SysMenuItem[]> => {
    const res = await http.get('/system/menu/user-tree');
    if (Array.isArray(res)) {
      setCachedUserMenus(res);
    }
    return res;
  },

  /** 新增菜单 */
  addMenu: async (data: Partial<SysMenuItem>): Promise<SysMenuItem> => {
    return http.post('/system/menu/add', data);
  },

  /** 更新菜单 */
  updateMenu: async (data: Partial<SysMenuItem>): Promise<SysMenuItem> => {
    return http.post('/system/menu/update', data);
  },

  /** 删除菜单 */
  deleteMenu: async (id: number): Promise<any> => {
    return http.post(`/system/menu/delete/${id}`);
  },
};
