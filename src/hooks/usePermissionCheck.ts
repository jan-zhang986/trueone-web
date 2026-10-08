/**
 * Permission Check Hook
 * 管理权限检查逻辑
 */

import { useState, useEffect, useMemo } from 'react';
import { authService } from '@/services/auth';
import { projectManagementService } from '@/services/project-management';
import { useUser } from '@/contexts/UserContext';

interface UsePermissionCheckReturn {
  hasPermission: boolean | null; // null 表示正在检查
  isCheckingPermission: boolean;
}

/**
 * 权限检查 Hook
 * @param projectId 可选，当前要检查的项目 ID。传入时优先用此项目查管理员；未传则用 localStorage 的 currentProjectId（用于与页面实际所在项目一致，避免误判无权限）
 */
export function usePermissionCheck(projectId?: string): UsePermissionCheckReturn {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null); // null 表示正在检查
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        setIsCheckingPermission(true);

        // 获取当前用户信息（兼容接口返回 { user }、{ data } 或直接用户对象）
        const rawUser = await authService.getCurrentUser();
        const currentUser = (rawUser as any)?.user ?? (rawUser as any)?.data ?? rawUser;
        if (!currentUser || !(currentUser.id ?? (currentUser as any).userId)) {
          setHasPermission(false);
          setIsCheckingPermission(false);
          return;
        }

        const u = currentUser as Record<string, unknown>;
        if (checkIsSystemAdmin(u)) {
          setHasPermission(true);
          setIsCheckingPermission(false);
          return;
        }

        // 优先使用传入的 projectId（与当前页面所在项目一致），否则用 localStorage
        const targetProjectId = projectId ?? localStorage.getItem('currentProjectId');
        if (!targetProjectId) {
          setHasPermission(false);
          setIsCheckingPermission(false);
          return;
        }

        // 获取项目信息
        const projectInfo = await projectManagementService.getProjectInfo(targetProjectId);
        if (projectInfo && Array.isArray(projectInfo.adminList) && projectInfo.adminList.length > 0) {
          const uid = String(currentUser.id ?? (currentUser as any).userId ?? '');
          const isProjectAdmin = projectInfo.adminList.some(
            (admin: any) => String(admin?.id ?? admin ?? '') === uid
          );
          setHasPermission(isProjectAdmin);
        } else {
          // 项目信息缺失、无 adminList 或后端未返回管理员列表时：以实际接口为准，不拦截（日志等接口会返回 403）
          setHasPermission(true);
        }
      } catch (error) {
        console.error('检查权限失败:', error);
        setHasPermission(false);
      } finally {
        setIsCheckingPermission(false);
      }
    };

    checkPermission();
  }, [projectId]);

  return {
    hasPermission,
    isCheckingPermission,
  };
}

/** 判断当前用户是否为系统管理员的内部逻辑（与 usePermissionCheck 一致） */
function checkIsSystemAdmin(u: Record<string, unknown>): boolean {
  const roleStr = (v: unknown) => (typeof v === 'string' ? v.toUpperCase() : '');
  const typeVal = u.type;
  // 兼容 type 为数字的接口（如 1 表示管理员）
  const typeIsAdmin =
    typeVal === 'ADMIN' ||
    typeVal === 'admin' ||
    typeVal === 1 ||
    (typeof typeVal === 'string' && roleStr(typeVal) === 'ADMIN');
  // AegisOne：userRoles 为角色对象数组，仅当存在 id===admin 的角色的用户为系统管理员（不按 type===SYSTEM 判断，避免系统成员等其它系统级角色被误判）
  const hasSystemAdminRole =
    Array.isArray(u.userRoles) &&
    (u.userRoles as Record<string, unknown>[]).some((r) => r?.id === 'admin');
  // AegisOne：userRoleRelations 中存在 roleId===admin 即为系统管理员
  const hasAdminRelation =
    Array.isArray(u.userRoleRelations) &&
    (u.userRoleRelations as Record<string, unknown>[]).some((r) => r?.roleId === 'admin');
  return (
    u.adminFlag === true ||
    u.isAdmin === true ||
    u.isSystemAdmin === true ||
    roleStr(u.userRole) === 'ADMIN' ||
    roleStr(u.role) === 'ADMIN' ||
    typeIsAdmin ||
    hasSystemAdminRole ||
    hasAdminRelation ||
    (Array.isArray(u.roles) && u.roles.some((r: unknown) => roleStr(r) === 'ADMIN')) ||
    (Array.isArray(u.roleList) && u.roleList.some((r: unknown) => roleStr(r) === 'ADMIN')) ||
    (Array.isArray(u.roleIds) && (u.roleIds as unknown[]).some((r: unknown) => String(r).toUpperCase().includes('ADMIN')))
  );
}

export interface UseSystemAdminCheckReturn {
  isSystemAdmin: boolean | null; // null 表示正在检查
  isChecking: boolean;
}

/**
 * 仅检查当前用户是否为系统管理员（不包含项目管理员）
 * 用于仅限系统管理员查看的功能（如数据监控大盘中的部分列表）
 */
export function useSystemAdminCheck(): UseSystemAdminCheckReturn {
  const [isSystemAdmin, setIsSystemAdmin] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setIsChecking(true);
        const rawUser = await authService.getCurrentUser();
        // 兼容多种后端结构：{ user }, { data }, 或直接用户对象
        const currentUser =
          (rawUser as any)?.user ?? (rawUser as any)?.data ?? rawUser;
        if (!currentUser || !(currentUser.id ?? (currentUser as any).userId)) {
          if (!cancelled) setIsSystemAdmin(false);
          return;
        }
        const u = currentUser as Record<string, unknown>;
        if (!cancelled) setIsSystemAdmin(checkIsSystemAdmin(u));
      } catch {
        if (!cancelled) setIsSystemAdmin(false);
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  return { isSystemAdmin, isChecking };
}

/**
 * 细粒度功能权限检查 Hook
 * @param permissionCode 权限码（如 WORKSPACE:READ, CASE:READ, BUG:READ, SYSTEM:READ）
 */
export function useHasPermission(permissionCode?: string): boolean {
  const { user } = useUser();

  return useMemo(() => {
    if (!permissionCode) return true;
    if (!user) return false;

    // 超级管理员默认拥有所有权限
    if (
      user.id === 'admin' ||
      user.name === 'admin' ||
      user.name === 'Administrator' ||
      (Array.isArray(user.userRoles) && user.userRoles.some((r: any) => r?.id === 'admin')) ||
      (Array.isArray(user.userRoleRelations) && user.userRoleRelations.some((r: any) => r?.roleId === 'admin'))
    ) {
      return true;
    }

    const perms = user.permissions || [];
    if (perms.includes('*') || perms.includes('ADMIN')) {
      return true;
    }

    // 精确匹配
    if (perms.includes(permissionCode)) {
      return true;
    }

    // 前缀与同义词映射兼容
    const aliasMap: Record<string, string[]> = {
      'WORKSPACE:READ': ['WORKSPACE:READ', 'QUALITY_WORKSPACE:READ'],
      'PROJECT_MANAGEMENT:READ': ['PROJECT_MANAGEMENT:READ', 'ORGANIZATION_PROJECT:READ', 'PROJECT_USER:READ'],
      'QUALITY:READ': ['QUALITY:READ', 'QUALITY_WORKSPACE:READ'],
      'CASE:READ': ['CASE:READ', 'FUNCTIONAL_CASE:READ', 'PROJECT_CASE:READ'],
      'BUG:READ': ['BUG:READ', 'PROJECT_BUG:READ'],
      'COV:READ': ['COV:READ', 'PRECISION_TEST:READ'],
      'SYSTEM:READ': ['SYSTEM:READ', 'SYSTEM_SETTING:READ'],
    };

    const aliases = aliasMap[permissionCode] || [permissionCode];
    return aliases.some((a) => perms.includes(a));
  }, [user, permissionCode]);
}
