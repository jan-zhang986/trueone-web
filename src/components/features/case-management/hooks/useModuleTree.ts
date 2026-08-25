/**
 * 模块树与模块数量数据 Hook
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { caseManagementService } from '@/services';
import { metadataModuleService, type MetadataModuleTreeNode } from '@/services/metadata-module';
import type { ModuleTreeNode } from '../types';

interface UseModuleTreeOptions {
  projectId: string;
  spaceId?: string;
  repositoryId?: string;
  searchKeyword?: string;
}

function toModuleTreeNode(node: MetadataModuleTreeNode): ModuleTreeNode {
  return {
    id: node.id,
    name: node.name,
    parentId: node.parentId || 'NONE',
    children: node.children?.map(toModuleTreeNode),
  };
}

function extractList(result: any): any[] {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.list)) return result.list;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.records)) return result.records;
  return [];
}

function addModuleAndChildrenCount(node: ModuleTreeNode, directCount: Map<string, number>, output: Record<string, number>): number {
  const childTotal = (node.children || []).reduce((sum, child) => sum + addModuleAndChildrenCount(child, directCount, output), 0);
  const total = (directCount.get(node.id) || 0) + childTotal;
  output[node.id] = total;
  return total;
}

export function useModuleTree({ projectId, spaceId, repositoryId, searchKeyword }: UseModuleTreeOptions) {
  const [moduleTree, setModuleTree] = useState<ModuleTreeNode[]>([]);
  const [modulesCount, setModulesCount] = useState<Record<string, number>>({});
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [treeLoaded, setTreeLoaded] = useState(false);

  const fetchModuleTree = useCallback(async () => {
    try {
      if (repositoryId && repositoryId !== '示例用例库' && !repositoryId.includes('demo')) {
        // 新建或独立用例库默认开始为空模块树，只有在用户添加模块或导入用例时才展现模块节点
        setModuleTree([]);
        setTreeLoaded(true);
        return;
      }
      if (spaceId) {
        const result = await metadataModuleService.getModuleTree(projectId, spaceId, 'WORKFLOW');
        setModuleTree((result || []).map(toModuleTreeNode));
      } else {
        const result = await caseManagementService.getCaseModuleTree({ projectId, repositoryId });
        setModuleTree(Array.isArray(result) ? result : []);
      }
    } catch (err) {
      console.error('获取模块树失败:', err);
      setModuleTree([]);
    } finally {
      setTreeLoaded(true);
    }
  }, [projectId, spaceId, repositoryId]);

  const fetchModulesCount = useCallback(async () => {
    try {
      if (repositoryId && repositoryId !== '示例用例库' && !repositoryId.includes('demo')) {
        setModulesCount({ all: 0 });
        return;
      }
      if (spaceId) {
        const result = await caseManagementService.getUnifiedCaseList({
          projectId,
          spaceId,
          current: 1,
          pageSize: 500,
          ...(searchKeyword?.trim() ? { keyword: searchKeyword.trim() } : {}),
        });
        const list = extractList(result);
        const directCount = new Map<string, number>();
        list.forEach((item) => {
          const moduleId = item?.moduleId;
          if (moduleId) {
            directCount.set(moduleId, (directCount.get(moduleId) || 0) + 1);
          }
        });
        const nextCount: Record<string, number> = {
          all: typeof result?.total === 'number' ? result.total : list.length,
        };
        moduleTree.forEach((node) => addModuleAndChildrenCount(node, directCount, nextCount));
        setModulesCount(nextCount);
        return;
      }
      const params: Record<string, unknown> = {
        projectId,
        moduleIds: [],
        current: 1,
        pageSize: 10,
      };
      if (searchKeyword?.trim()) params.keyword = searchKeyword.trim();
      const result = await caseManagementService.getCaseModulesCounts(params);
      const safeCount =
        typeof result === 'object' && result !== null && !Array.isArray(result) && !('message' in result)
          ? (result as Record<string, number>)
          : {};
      setModulesCount(safeCount);
    } catch (err) {
      console.error('获取模块数量失败:', err);
      setModulesCount({ all: 0 });
    }
  }, [projectId, spaceId, repositoryId, searchKeyword, moduleTree]);

  useEffect(() => {
    fetchModuleTree();
  }, [fetchModuleTree]);

  useEffect(() => {
    fetchModulesCount();
  }, [fetchModulesCount]);

  const toggleNodeExpand = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  function collectExpandableIds(nodes: ModuleTreeNode[]): string[] {
    const ids: string[] = [];
    nodes.forEach((n) => {
      if (n.children?.length) {
        ids.push(n.id);
        ids.push(...collectExpandableIds(n.children));
      }
    });
    return ids;
  }

  /** 从根到 nodeId 的祖先路径（不含 nodeId 自身），用于展开到该节点 */
  function findPathToNode(nodes: ModuleTreeNode[], targetId: string, path: string[] = []): string[] | null {
    for (const n of nodes) {
      if (n.id === targetId) return path;
      if (n.children?.length) {
        const found = findPathToNode(n.children, targetId, [...path, n.id]);
        if (found) return found;
      }
    }
    return null;
  }

  const expandPathToNode = useCallback((nodeId: string) => {
    if (!nodeId || nodeId === 'all') return;
    const path = findPathToNode(moduleTree, nodeId);
    if (path?.length) {
      setExpandedNodes((prev) => new Set([...prev, ...path]));
    }
  }, [moduleTree]);

  const expandableIds = useMemo(() => collectExpandableIds(moduleTree), [moduleTree]);
  const expandAll = useCallback(() => {
    setExpandedNodes((prev) => new Set([...prev, ...expandableIds]));
  }, [expandableIds]);
  const collapseAll = useCallback(() => setExpandedNodes(new Set()), []);
  const isExpandAll = expandableIds.length > 0 && expandableIds.every((id) => expandedNodes.has(id));

  return {
    moduleTree,
    modulesCount,
    expandedNodes,
    toggleNodeExpand,
    expandAll,
    collapseAll,
    isExpandAll,
    expandPathToNode,
    fetchModuleTree,
    fetchModulesCount,
    treeLoaded,
  };
}
