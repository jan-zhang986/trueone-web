/**
 * 用例所属模块选择
 * 基于 Popover 的树形模块选择（支持搜索 & 高亮）
 * 所有层级节点均可选中（包括一级/父节点）
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import type { ModuleTreeNode } from '../types';
import { Input } from '@/components/ui/input';
import {
  Search, ChevronRight, ChevronDown,
  Folder, FolderOpen, FileText, ChevronsUpDown, Check,
} from 'lucide-react';

const SEARCH_DEBOUNCE_MS = 180;

interface CaseModuleSelectProps {
  moduleTree: ModuleTreeNode[];
  value?: string;
  onChange?: (moduleId: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** 不渲染 Label，适用于自定义布局 */
  noLabel?: boolean;
  /** 下拉框打开/关闭时回调 */
  onOpenChange?: (open: boolean) => void;
  /** 受控：是否打开下拉框 */
  open?: boolean;
  /** 触发器样式变体 */
  variant?: 'default' | 'ghost';
  /** 自定义触发器样式 */
  triggerClassName?: string;
}

/** 递归查找节点名称 */
function findNodeName(nodes: ModuleTreeNode[], id: string): string | undefined {
  for (const n of nodes) {
    if (n.id === id) return n.name;
    if (n.children?.length) {
      const found = findNodeName(n.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

export function CaseModuleSelect({
  moduleTree,
  value,
  onChange,
  label = '所属模块',
  required = false,
  placeholder = '请选择所属模块',
  disabled = false,
  noLabel = false,
  onOpenChange,
  open: controlledOpen,
  variant = 'default',
  triggerClassName,
  className,
}: CaseModuleSelectProps & { className?: string }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchKeyword.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchKeyword]);

  const handleOpenChange = (open: boolean) => {
    if (!open) setSearchKeyword('');
    if (!isControlled) setInternalOpen(open);
    onOpenChange?.(open);
  };

  // 选中后自动关闭
  const handleSelect = (moduleId: string) => {
    onChange?.(moduleId);
    handleOpenChange(false);
  };

  // 聚焦搜索框
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const normalizedSearch = debouncedSearch.toLowerCase();

  const nodeMatchesSearch = (node: ModuleTreeNode, keyword: string): boolean => {
    if (!keyword) return true;
    return (node.name ?? '').toLowerCase().includes(keyword);
  };

  const nodeOrChildrenMatchSearch = (node: ModuleTreeNode, keyword: string): boolean => {
    if (!keyword) return true;
    if (nodeMatchesSearch(node, keyword)) return true;
    if (node.children && node.children.length > 0) {
      return node.children.some((child) => nodeOrChildrenMatchSearch(child, keyword));
    }
    return false;
  };

  /** 收集需展开的节点 ID，使包含关键词的节点在搜索时可见（用户仍可收起/展开） */
  const collectIdsToExpandForSearch = (nodes: ModuleTreeNode[], kw: string): Set<string> => {
    const ids = new Set<string>();
    if (!kw) return ids;
    const lower = kw.toLowerCase();
    const walk = (n: ModuleTreeNode): boolean => {
      const selfMatch = (n.name ?? '').toLowerCase().includes(lower);
      let childMatch = false;
      if (n.children?.length) {
        for (const c of n.children) {
          if (walk(c)) childMatch = true;
        }
      }
      if (selfMatch || childMatch) ids.add(n.id);
      return selfMatch || childMatch;
    };
    nodes.forEach((n) => walk(n));
    return ids;
  };

  useEffect(() => {
    if (!normalizedSearch || !moduleTree.length) return;
    const toExpand = collectIdsToExpandForSearch(moduleTree, debouncedSearch);
    if (toExpand.size === 0) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      toExpand.forEach((id) => next.add(id));
      return next;
    });
  }, [debouncedSearch, moduleTree]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const highlightName = (name?: string) => {
    if (!name) return null;
    if (!normalizedSearch) return name;
    const lowerName = name.toLowerCase();
    const index = lowerName.indexOf(normalizedSearch);
    if (index === -1) return name;
    const before = name.slice(0, index);
    const match = name.slice(index, index + normalizedSearch.length);
    const after = name.slice(index + normalizedSearch.length);
    return (
      <>
        {before}
        <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded px-0.5 font-medium">{match}</span>
        {after}
      </>
    );
  };

  const buildTreeItems = (nodes: ModuleTreeNode[], level = 0): { node: ModuleTreeNode; level: number }[] => {
    const items: { node: ModuleTreeNode; level: number }[] = [];
    for (const n of nodes) {
      if (normalizedSearch && !nodeOrChildrenMatchSearch(n, normalizedSearch)) {
        continue;
      }
      items.push({ node: n, level });
      const hasChildren = !!n.children?.length;
      const isExpanded = expandedIds.has(n.id);
      if (hasChildren && isExpanded) {
        items.push(...buildTreeItems(n.children!, level + 1));
      }
    }
    return items;
  };

  const viewItems = useMemo(
    () => buildTreeItems(moduleTree),
    [moduleTree, normalizedSearch, expandedIds],
  );

  const selectedName = value ? findNodeName(moduleTree, value) : undefined;

  return (
    <div className={noLabel ? className : `space-y-2 ${className || ''}`}>
      {!noLabel && (
        <Label>
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </Label>
      )}

      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            type="button"
            className={triggerClassName || (variant === 'ghost' ? `
              flex items-center justify-between gap-1.5 h-7 px-2 text-xs rounded-md border-0
              bg-transparent hover:bg-slate-100/80 transition-colors font-semibold
              focus:outline-none focus:ring-0
              ${selectedName ? 'text-slate-800' : 'text-slate-400'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ` : `
              flex items-center justify-between w-full h-8 px-3 text-xs rounded-md border
              bg-muted/30 border-border/60 hover:bg-muted/40 transition-colors
              focus:outline-none focus:ring-1 focus:ring-ring
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `)}
          >
            <span className={`truncate ${selectedName ? (variant === 'ghost' ? 'text-slate-800' : 'text-foreground') : 'text-muted-foreground'}`}>
              {selectedName || placeholder}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0 ml-1" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[min(520px,90vw)] p-0 max-h-[70vh] overflow-hidden"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* 搜索栏 */}
          <div className="border-b border-border/60 bg-popover px-3 py-2.5 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchInputRef}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索模块..."
                className="h-8 pl-8 pr-2 text-xs bg-muted/40 border-border focus-visible:ring-1 focus-visible:ring-offset-0 rounded-md"
                autoComplete="off"
              />
            </div>
          </div>

          {/* 模块树列表 */}
          <div className="min-h-[180px] max-h-[calc(70vh-52px)] overflow-y-auto overflow-x-hidden py-1">
            {viewItems.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground/70">
                <Search className="w-7 h-7 mx-auto mb-2 opacity-30" />
                未找到匹配的模块
              </div>
            ) : (
              viewItems.map(({ node, level }) => {
                const hasChildren = !!node.children?.length;
                const isExpanded = hasChildren && expandedIds.has(node.id);
                const isSelected = value === node.id;
                const indentPx = level * 20;

                return (
                  <div
                    key={node.id}
                    className={`
                      relative flex items-center mx-1 my-px px-2 py-[7px] text-[13px] rounded-md cursor-pointer transition-colors
                      ${isSelected
                        ? 'bg-primary/10 dark:bg-primary/15 text-primary font-medium'
                        : 'hover:bg-muted/60 dark:hover:bg-muted/40 text-foreground'
                      }
                    `}
                    onClick={() => handleSelect(node.id)}
                  >
                    {/* 层级缩进引导线 */}
                    {Array.from({ length: level }, (_, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-l border-border/25 dark:border-border/15"
                        style={{ left: `${i * 20 + 18}px` }}
                      />
                    ))}

                    <div className="flex items-center w-full min-w-0" style={{ paddingLeft: indentPx }}>
                      {/* 展开/收起箭头 */}
                      {hasChildren ? (
                        <button
                          type="button"
                          className="mr-1 flex h-5 w-5 items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 transition-colors shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(node.id);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      ) : (
                        <span className="mr-1 w-5 shrink-0" />
                      )}

                      {/* 图标 */}
                      {hasChildren ? (
                        isExpanded ? (
                          <FolderOpen className="h-4 w-4 mr-1.5 text-blue-500 dark:text-blue-400 shrink-0" />
                        ) : (
                          <Folder className="h-4 w-4 mr-1.5 text-blue-500/80 dark:text-blue-400/70 shrink-0" />
                        )
                      ) : (
                        <FileText className="h-4 w-4 mr-1.5 text-blue-400/60 dark:text-blue-400/50 shrink-0" />
                      )}

                      {/* 名称 */}
                      <span className="truncate leading-tight">
                        {highlightName(node.name)}
                      </span>

                      {/* 子节点数 */}
                      {hasChildren && (
                        <span className="ml-auto pl-2 text-[10px] text-muted-foreground/40 tabular-nums shrink-0">
                          {node.children!.length}
                        </span>
                      )}

                      {/* 选中标记 */}
                      {isSelected && (
                        <Check className="ml-1.5 h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
