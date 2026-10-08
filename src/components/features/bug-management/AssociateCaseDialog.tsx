/**
 * 缺陷关联用例弹窗（抽屉式）
 * 对标老前端 MsCaseAssociate：项目、模块树、未关联用例列表、批量关联
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Loader2, Search, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon, FolderOpen } from 'lucide-react';
import { bugManagementService } from '@/services/bug-management';
import { projectService } from '@/services/project';
import { toast } from 'sonner';

const SOURCE_TYPE_FUNCTIONAL = 'FUNCTIONAL';
const PAGE_SIZE = 20;

interface ProjectOption {
    id: string;
    name: string;
}

interface TreeNode {
    id: string;
    name: string;
    count?: number;
    children?: TreeNode[];
}

interface CaseRow {
    id: string;
    num?: string;
    name?: string;
    tags?: string[] | { id: string; name: string }[];
    createUser?: string;
    /** 创建人名称（接口可能返回 createUserName，优先展示） */
    createUserName?: string;
    createdAt?: number;
}

interface AssociateCaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    bugId: string;
    defaultProjectId: string;
    associatedIds: string[];
    onSuccess?: () => void;
}

export function AssociateCaseDialog({
    open,
    onOpenChange,
    bugId,
    defaultProjectId,
    associatedIds,
    onSuccess,
}: AssociateCaseDialogProps) {
    const [projectId, setProjectId] = useState(defaultProjectId);
    const [projectList, setProjectList] = useState<ProjectOption[]>([]);
    const [moduleTree, setModuleTree] = useState<TreeNode[]>([]);
    const [moduleCounts, setModuleCounts] = useState<Record<string, number>>({});
    const [activeModuleId, setActiveModuleId] = useState<string>('all');
    const [moduleKeyword, setModuleKeyword] = useState('');
    const [treeLoading, setTreeLoading] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['all']));
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [projectSearchKeyword, setProjectSearchKeyword] = useState('');

    const [caseList, setCaseList] = useState<CaseRow[]>([]);
    const [caseTotal, setCaseTotal] = useState(0);
    const [casePage, setCasePage] = useState(1);
    const [caseKeyword, setCaseKeyword] = useState('');
    const [caseLoading, setCaseLoading] = useState(false);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [confirmLoading, setConfirmLoading] = useState(false);

    // 项目列表与老前端一致：使用系统项目接口 /project/list/options/{orgId}（与需求质量、门禁等一致）
    const loadProjectList = useCallback(async () => {
        try {
            const orgId = typeof localStorage !== 'undefined' ? localStorage.getItem('currentOrgId') : null;
            if (!orgId) {
                setProjectList(defaultProjectId ? [{ id: defaultProjectId, name: defaultProjectId }] : []);
                return;
            }
            const res: any = await projectService.getProjectListByOrg(orgId);
            const rawList = Array.isArray(res) ? res : res?.data ?? [];
            let list: ProjectOption[] = rawList.map((p: { id?: string; name?: string }) => ({
                id: p.id ?? '',
                name: p.name ?? p.id ?? '',
            })).filter((p) => p.id);
            const hasCurrent = list.some((p) => p.id === defaultProjectId);
            if (!hasCurrent && defaultProjectId) {
                list = [{ id: defaultProjectId, name: `当前项目 (${defaultProjectId})` }, ...list];
            }
            setProjectList(list.length > 0 ? list : (defaultProjectId ? [{ id: defaultProjectId, name: defaultProjectId }] : []));
        } catch (e) {
            console.error('获取项目列表失败:', e);
            setProjectList(defaultProjectId ? [{ id: defaultProjectId, name: defaultProjectId }] : []);
        }
    }, [defaultProjectId]);

    const loadModuleTree = useCallback(async () => {
        if (!projectId || !bugId) return;
        setTreeLoading(true);
        try {
            const moduleParams = {
                projectId,
                sourceId: bugId,
                sourceType: SOURCE_TYPE_FUNCTIONAL,
                protocol: 'HTTP',
            };
            const [treeRes, countRes] = await Promise.all([
                bugManagementService.getModuleTree(moduleParams),
                bugManagementService.getModuleTreeCounts(moduleParams),
            ]);
            const tree = Array.isArray(treeRes) ? treeRes : (treeRes as any)?.data ?? [];
            const counts = typeof countRes === 'object' && countRes !== null ? (countRes as Record<string, number>) : {};
            setModuleTree(Array.isArray(tree) ? tree : []);
            setModuleCounts(counts as Record<string, number>);
            if (activeModuleId === 'all' && tree.length) {
                setActiveModuleId('all');
            }
        } catch (e) {
            toast.error('加载模块树失败');
            setModuleTree([]);
            setModuleCounts({});
        } finally {
            setTreeLoading(false);
        }
    }, [projectId, bugId, activeModuleId]);

    const loadCaseList = useCallback(async () => {
        if (!projectId || !bugId) return;
        setCaseLoading(true);
        try {
            const params: Record<string, unknown> = {
                current: Math.max(1, Number(casePage) || 1),
                pageSize: Math.min(500, Math.max(5, Number(PAGE_SIZE) || 10)),
                projectId: String(projectId),
                sourceId: String(bugId),
                sourceType: SOURCE_TYPE_FUNCTIONAL,
                protocols: [],
            };
            if (caseKeyword != null && String(caseKeyword).trim() !== '') {
                params.keyword = String(caseKeyword).trim();
            }
            if (activeModuleId && activeModuleId !== 'all') {
                params.moduleIds = [activeModuleId];
            }
            const res: any = await bugManagementService.getUnAssociatedList(params);
            const list = res?.list ?? res?.data ?? (Array.isArray(res) ? res : []);
            const total = res?.total ?? res?.data?.total ?? (Array.isArray(list) ? list.length : 0);
            setCaseList(Array.isArray(list) ? list : []);
            setCaseTotal(typeof total === 'number' ? total : 0);
        } catch (e) {
            toast.error('加载用例列表失败');
            setCaseList([]);
            setCaseTotal(0);
        } finally {
            setCaseLoading(false);
        }
    }, [projectId, bugId, casePage, caseKeyword, activeModuleId, associatedIds]);

    // 打开弹窗时加载项目与模块树，但不重置当前选择的 projectId，避免切换项目后又被强制切回默认项目
    useEffect(() => {
        if (open && projectId) {
            loadProjectList();
            loadModuleTree();
        }
    }, [open, defaultProjectId, loadProjectList, loadModuleTree]);

    useEffect(() => {
        if (open && projectId && bugId) {
            loadCaseList();
        }
    }, [open, projectId, bugId, casePage, loadCaseList]);

    useEffect(() => {
        setProjectId(defaultProjectId);
        if (open) {
            loadProjectList();
        }
    }, [defaultProjectId, open, loadProjectList]);

    const handleSearchCase = () => {
        setCasePage(1);
        loadCaseList();
    };

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === caseList.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(caseList.map((r) => r.id)));
        }
    };

    const handleConfirm = async () => {
        if (selectedIds.size === 0) {
            toast.error('请至少选择一个用例');
            return;
        }
        setConfirmLoading(true);
        try {
            await bugManagementService.batchAssociation({
                sourceId: bugId,
                projectId,
                sourceType: SOURCE_TYPE_FUNCTIONAL,
                selectIds: Array.from(selectedIds),
                excludeIds: [],
                selectAll: false,
                condition: {},
            });
            toast.success('关联成功');
            setSelectedIds(new Set());
            onSuccess?.();
            onOpenChange(false);
        } catch (e) {
            toast.error('关联失败');
        } finally {
            setConfirmLoading(false);
        }
    };

    // 全部用例数量：后端模块 count 可能不返回 all，用列表接口的 total 作为兜底（选中「全部用例」时 caseTotal 即为总数）
    const allCount = (moduleCounts?.all as number) ?? caseTotal;
    const filteredTree = moduleKeyword.trim()
        ? moduleTree.filter((n) => n.name?.toLowerCase().includes(moduleKeyword.trim().toLowerCase()))
        : moduleTree;
    
    const filteredProjectList = projectSearchKeyword.trim()
        ? projectList.filter((p) => p.name?.toLowerCase().includes(projectSearchKeyword.trim().toLowerCase()))
        : projectList;

    const toggleNode = (nodeId: string) => {
        setExpandedNodes((prev) => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    };

    const renderTreeNodes = (nodes: TreeNode[], level = 0) => {
        return nodes.map((node) => {
            const hasChildren = node.children && node.children.length > 0;
            const isExpanded = expandedNodes.has(node.id);
            const isActive = activeModuleId === node.id;
            
            return (
                <div key={node.id}>
                    <div
                        className={`flex items-center gap-1 px-2 py-1.5 rounded text-sm cursor-pointer ${
                            isActive ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
                        }`}
                        style={{ paddingLeft: `${8 + level * 16}px` }}
                    >
                        {hasChildren ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleNode(node.id);
                                }}
                                className="shrink-0 w-4 h-4 flex items-center justify-center"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                                ) : (
                                    <ChevronRightIcon className="w-3.5 h-3.5 text-gray-500" />
                                )}
                            </button>
                        ) : (
                            <span className="w-4 shrink-0" />
                        )}
                        <div
                            className="flex-1 flex items-center justify-between gap-2 min-w-0"
                            onClick={() => setActiveModuleId(node.id)}
                        >
                            <span className="truncate">{node.name ?? node.id}</span>
                            {typeof (moduleCounts as any)?.[node.id] === 'number' && (
                                <span className="text-gray-400 text-xs shrink-0">
                                    {(moduleCounts as any)[node.id]}
                                </span>
                            )}
                        </div>
                    </div>
                    {hasChildren && isExpanded && (
                        <div>{renderTreeNodes(node.children!, level + 1)}</div>
                    )}
                </div>
            );
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent 
                side="right" 
                className="w-[95vw] max-w-none p-0 flex flex-col gap-0 sm:max-w-none"
                onClick={() => {
                    if (showProjectDropdown) {
                        setShowProjectDropdown(false);
                        setProjectSearchKeyword('');
                    }
                }}
            >
                <SheetHeader className="px-6 py-4 border-b shrink-0">
                    <div className="flex items-center justify-between pr-8">
                        <div className="flex items-center gap-3">
                            <SheetTitle className="text-lg">关联用例</SheetTitle>
                            <span className="text-sm text-gray-500">功能用例</span>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex flex-1 min-h-0">
                    {/* 左侧：模块树（高度与右侧一致，模块列表可滚动到底部分页位置） */}
                    <div className="w-[320px] border-r flex flex-col shrink-0 min-h-0 bg-gray-50">
                        <div className="p-4 space-y-3 shrink-0">
                            {/* 项目选择：输入框与搜索合一，展开时输入即搜索，收起时显示已选项目 */}
                            <div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="w-full h-9 px-3 pr-8 text-sm border border-gray-300 rounded bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={showProjectDropdown ? projectSearchKeyword : (projectList.find(p => p.id === projectId)?.name || projectId)}
                                        onClick={() => {
                                            if (!showProjectDropdown) {
                                                setShowProjectDropdown(true);
                                                setProjectSearchKeyword('');
                                            }
                                        }}
                                        onChange={(e) => {
                                            if (showProjectDropdown) {
                                                setProjectSearchKeyword(e.target.value);
                                            }
                                        }}
                                        placeholder={showProjectDropdown ? '搜索' : '请选择'}
                                        readOnly={!showProjectDropdown}
                                    />
                                    <ChevronDown
                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                                    />
                                    {showProjectDropdown && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-auto">
                                            <div className="py-1">
                                                {filteredProjectList.length === 0 ? (
                                                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                        暂无数据
                                                    </div>
                                                ) : (
                                                    filteredProjectList.map((project) => (
                                                        <div
                                                            key={project.id}
                                                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                                                                project.id === projectId ? 'bg-blue-50 text-blue-600' : ''
                                                            }`}
                                                            onClick={() => {
                                                                setProjectId(project.id);
                                                                setActiveModuleId('all');
                                                                setCasePage(1);
                                                                setShowProjectDropdown(false);
                                                                setProjectSearchKeyword('');
                                                            }}
                                                        >
                                                            {project.name}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 搜索框 */}
                            <div className="relative">
                                <Input
                                    placeholder="请输入模块名称"
                                    value={moduleKeyword}
                                    onChange={(e) => setModuleKeyword(e.target.value)}
                                    className="h-9 pr-8"
                                />
                                <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* 模块树：占满剩余高度，多时内部滚动 */}
                        {treeLoading ? (
                            <div className="flex items-center justify-center py-8 shrink-0">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <ScrollArea className="flex-1 min-h-0 px-2">
                                <div className="space-y-0.5 py-2">
                                    {/* 全部用例 */}
                                    <div
                                        className={`flex items-center gap-1 px-3 py-2 rounded text-sm cursor-pointer ${
                                            activeModuleId === 'all' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
                                        }`}
                                        onClick={() => setActiveModuleId('all')}
                                    >
                                        <FolderOpen className="w-4 h-4 shrink-0" />
                                        <span className="flex-1">全部用例</span>
                                        <span className={`text-xs ${activeModuleId === 'all' ? 'text-blue-600' : 'text-gray-400'}`}>
                                            ({allCount})
                                        </span>
                                    </div>
                                    
                                    {/* 树节点 */}
                                    {renderTreeNodes(filteredTree)}
                                </div>
                            </ScrollArea>
                        )}
                    </div>

                    {/* 右侧：用例表格 */}
                    <div className="flex-1 flex flex-col min-w-0 p-6">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <span className="text-base font-medium text-gray-700">
                                全部用例 ({caseTotal})
                            </span>
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="通过 ID/名称/标签搜索"
                                    value={caseKeyword}
                                    onChange={(e) => setCaseKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearchCase()}
                                    className="w-64 h-9"
                                />
                                <Button variant="outline" size="sm" onClick={handleSearchCase}>
                                    <Search className="w-4 h-4 mr-1" />
                                    搜索
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => loadCaseList()}>
                                    <RefreshCw className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="border rounded-lg overflow-hidden flex-1 min-h-0 flex flex-col bg-white">
                            <div className="overflow-auto flex-1">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-gray-50 z-10">
                                        <TableRow>
                                            <TableHead className="w-12">
                                                <Checkbox
                                                    checked={caseList.length > 0 && selectedIds.size === caseList.length}
                                                    onCheckedChange={toggleSelectAll}
                                                />
                                            </TableHead>
                                            <TableHead className="w-[120px]">ID</TableHead>
                                            <TableHead className="min-w-[400px]">用例名称</TableHead>
                                            <TableHead className="w-[250px]">标签</TableHead>
                                            <TableHead className="w-[150px]">创建人</TableHead>
                                            <TableHead className="w-[200px]">创建时间</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {caseLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-12">
                                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                                                </TableCell>
                                            </TableRow>
                                        ) : caseList.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                                                    暂无数据
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            caseList.map((row) => (
                                                <TableRow
                                                    key={row.id}
                                                    className="cursor-pointer hover:bg-gray-50"
                                                    onClick={() => toggleSelect(row.id)}
                                                >
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        <Checkbox
                                                            checked={selectedIds.has(row.id)}
                                                            onCheckedChange={() => toggleSelect(row.id)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">{row.num ?? row.id}</TableCell>
                                                    <TableCell>
                                                        <div className="truncate" title={row.name}>
                                                            {row.name ?? '-'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="truncate" title={Array.isArray(row.tags) ? row.tags.map((t: any) => (typeof t === 'object' && t?.name ? t.name : t)).join(', ') : ''}>
                                                            {Array.isArray(row.tags)
                                                                ? row.tags.map((t: any) => (typeof t === 'object' && t?.name ? t.name : t)).join(', ') || '-'
                                                                : '-'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{row.createUserName ?? row.createUser ?? '-'}</TableCell>
                                                    <TableCell className="text-sm text-gray-600">
                                                        {row.createdAt
                                                            ? new Date(row.createdAt).toLocaleString('zh-CN', {
                                                                  year: 'numeric',
                                                                  month: '2-digit',
                                                                  day: '2-digit',
                                                                  hour: '2-digit',
                                                                  minute: '2-digit',
                                                              })
                                                            : '-'}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            {/* 分页 */}
                            {caseTotal > 0 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                                    <div className="text-sm text-gray-600">
                                        共 {caseTotal} 条，已选 {selectedIds.size} 条
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCasePage(Math.max(1, casePage - 1))}
                                            disabled={casePage <= 1}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <span className="text-sm text-gray-600">
                                            {casePage} / {Math.ceil(caseTotal / PAGE_SIZE)}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCasePage(Math.min(Math.ceil(caseTotal / PAGE_SIZE), casePage + 1))}
                                            disabled={casePage >= Math.ceil(caseTotal / PAGE_SIZE)}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <SheetFooter className="px-6 py-4 border-t shrink-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button onClick={handleConfirm} disabled={selectedIds.size === 0 || confirmLoading}>
                        {confirmLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        关联
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
