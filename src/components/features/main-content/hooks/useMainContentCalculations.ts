import { useMemo } from 'react';
import type { MetadataDefinition, MetadataModuleNode } from '@/services/metadata';
import type { ApiItem } from '@/types';
import { TYPE_CONFIG } from '@/constants/metadata';
import { flattenNodes } from '@/utils/metadataHelpers';

export function useMainContentCalculations(
  definitions: MetadataDefinition[],
  filteredDefinitions: MetadataDefinition[],
  moduleTree: MetadataModuleNode[],
  hasActiveSearch: boolean
) {
  const calculateModuleCounts = useMemo(() => {
    const moduleCountMap = new Map<string, number>();
    
    definitions.forEach(def => {
      const count = moduleCountMap.get(def.moduleId) || 0;
      moduleCountMap.set(def.moduleId, count + 1);
    });
    
    const calculateNodeCount = (node: MetadataModuleNode): number => {
      const directCount = moduleCountMap.get(node.id) || 0;
      
      let childrenCount = 0;
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          childrenCount += calculateNodeCount(child);
        });
      }
      
      return directCount + childrenCount;
    };
    
    const calculateCountsForTree = (nodes: MetadataModuleNode[]): Map<string, number> => {
      const counts = new Map<string, number>();
      
      const traverse = (node: MetadataModuleNode) => {
        const count = calculateNodeCount(node);
        counts.set(node.id, count);
        
        if (node.children && node.children.length > 0) {
          node.children.forEach(child => traverse(child));
        }
      };
      
      nodes.forEach(node => traverse(node));
      return counts;
    };
    
    return calculateCountsForTree(moduleTree);
  }, [definitions, moduleTree]);

  const countNodeAndChildren = (node: MetadataModuleNode): number => {
    return calculateModuleCounts.get(node.id) || 0;
  };

  const collectAllNodeIds = (node: MetadataModuleNode): string[] => {
    const ids = [node.id];
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        ids.push(...collectAllNodeIds(child));
      });
    }
    return ids;
  };

  const metadataTypes = useMemo(() => {
    const typeMap = new Map<string, { id: string; name: string; count: number; icon: string; moduleIds: string[] }>();
    
    Object.values(TYPE_CONFIG).forEach(config => {
      typeMap.set(config.id, {
        id: config.id,
        name: config.name,
        count: 0,
        icon: config.icon,
        moduleIds: [],
      });
    });

    moduleTree.forEach(node => {
      const config = TYPE_CONFIG[node.type];
      if (config) {
        const typeInfo = typeMap.get(config.id);
        if (typeInfo) {
          typeInfo.count += countNodeAndChildren(node);
          typeInfo.moduleIds.push(...collectAllNodeIds(node));
        }
      }
    });

    return Array.from(typeMap.values());
  }, [moduleTree, calculateModuleCounts]);

  const metadataCategories = useMemo(() => {
    const allNodes = flattenNodes(moduleTree);
    return allNodes.map(node => {
      const config = TYPE_CONFIG[node.type];
      const count = calculateModuleCounts.get(node.id) || 0;
      return {
        id: node.id,
        name: node.name,
        typeId: config?.id || '',
        count: count,
        path: node.path,
        parentId: node.parentId,
      };
    });
  }, [moduleTree, calculateModuleCounts]);

  const metadataItems = useMemo<ApiItem[]>(() => {
    const defsToUse = hasActiveSearch ? filteredDefinitions : definitions;
    return defsToUse.map(def => {
      const protocolKey = def.protocol === 'HTTP' ? 'API' : def.protocol;
      const config = TYPE_CONFIG[protocolKey] || TYPE_CONFIG['API'];
      
      let type: ApiItem['type'] = 'GET';
      if (def.protocol === 'HTTP') {
        let method = 'GET';
        if (def.requestConfig) {
          try {
            const configObj = typeof def.requestConfig === 'string' 
              ? JSON.parse(def.requestConfig) 
              : def.requestConfig;
            method = configObj?.method || 'GET';
          } catch {
            method = 'GET';
          }
        }
        type = method.toUpperCase() as ApiItem['type'];
      } else {
        const protocolTypeMap: Record<string, ApiItem['type']> = {
          'SQL': 'SQL',
          'DUBBO': 'DUBBO',
          'ROCKETMQ': 'RocketMQ',
          'FILE': 'FILE',
        };
        type = protocolTypeMap[def.protocol] || 'GET';
      }

      let path = '/';
      if (def.protocol === 'SQL') {
        path = def.scriptContent || '/';
      } else if (def.protocol === 'FILE') {
        path = def.scriptContent || '/';
      } else if (def.requestConfig) {
        try {
          const configObj = typeof def.requestConfig === 'string' 
            ? JSON.parse(def.requestConfig) 
            : def.requestConfig;
          
          if (def.protocol === 'DUBBO') {
            path = configObj?.interfaceName || '/';
          } else if (def.protocol === 'ROCKETMQ') {
            path = configObj?.topic || '/';
          } else {
            path = configObj?.path || '/';
          }
        } catch {
          path = '/';
        }
      }

      const getNodePath = (nodeId: string): string => {
        const allNodes = flattenNodes(moduleTree);
        const node = allNodes.find(n => n.id === nodeId);
        if (!node) return nodeId;
        
        if (node.parentId === 'NONE') {
          return node.name;
        }
        
        const parent = allNodes.find(n => n.id === node.parentId);
        if (parent) {
          const parentPath = getNodePath(parent.id);
          return parentPath === parent.name 
            ? `${parent.name} / ${node.name}` 
            : `${parentPath} / ${node.name}`;
        }
        return node.name;
      };
      
      const moduleNode = flattenNodes(moduleTree).find(node => node.id === def.moduleId);
      const moduleName = moduleNode?.name || def.moduleId;
      const modulePath = moduleNode ? getNodePath(def.moduleId) : def.moduleId;

      return {
        id: def.id,
        name: def.name,
        type,
        groupId: def.moduleId,
        category: config.category,
        path,
        protocol: def.protocol,
        status: def.isLatest ? '进行中' : '已归档',
        module: modulePath,
        testCount: 0,
        description: def.description,
        creator: def.createUser,
        version: `v${def.version}`,
        createdAt: new Date(def.createdAt).toLocaleString('zh-CN'),
        updatedAt: new Date(def.updatedAt).toLocaleString('zh-CN'),
      };
    });
  }, [definitions, filteredDefinitions, moduleTree, hasActiveSearch]);

  return {
    calculateModuleCounts,
    metadataTypes,
    metadataCategories,
    metadataItems,
    countNodeAndChildren,
    collectAllNodeIds,
  };
}
