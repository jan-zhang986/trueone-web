/**
 * 项目管理-用户组与权限
 * 用户组以卡片展示，下方为「权限配置」与「成员列表」
 */
import { useState, useEffect, useCallback } from 'react';
import { Shield, Search, UserPlus, Trash2, X, Plus, Pencil, MoreVertical, ShieldCheck, Users, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/utils/cn';
import { projectUserGroupService } from '@/services/setting/usergroup';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {
    UserGroupItem,
    UserGroupAuthSetting,
    UserGroupPermissionItem,
    UserGroupMemberItem,
    UserGroupOptionItem
} from '@/types/setting/usergroup';

interface AuthTableGroupedRow {
    moduleName: string;
    operationName: string;
    permissions: Array<{
        id: string;
        name: string;
        enable: boolean;
    }>;
    moduleRowSpan?: number;
    isFirstModuleRow?: boolean;
}

interface ProjectPermissionViewProps {
    projectId: string;
}

/** 根据名字生成头像背景色 */
function getAvatarColor(name: string) {
    const colors = [
        'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
        'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

export function ProjectPermissionView({ projectId }: ProjectPermissionViewProps) {
    const [keyword, setKeyword] = useState('');
    const [groups, setGroups] = useState<UserGroupItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<UserGroupItem | null>(null);
    const [activeTab, setActiveTab] = useState<'auth' | 'members'>('members');

    // 权限矩阵状态（下方 Tab 展示）
    const [authRows, setAuthRows] = useState<AuthTableGroupedRow[]>([]);
    const [authLoading, setAuthLoading] = useState(false);
    const [authDirty, setAuthDirty] = useState(false);

    // 成员列表状态
    const [members, setMembers] = useState<UserGroupMemberItem[]>([]);
    const [memberLoading, setMemberLoading] = useState(false);
    const [memberTotal, setMemberTotal] = useState(0);
    const [memberPage, setMemberPage] = useState(1);
    const [memberKeyword, setMemberKeyword] = useState('');

    // 添加成员弹窗状态
    const [showAddMember, setShowAddMember] = useState(false);
    const [searchUserKeyword, setSearchUserKeyword] = useState('');
    const [userOptions, setUserOptions] = useState<UserGroupOptionItem[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    // 用户组 CRUD 状态
    const [showGroupDialog, setShowGroupDialog] = useState(false);
    const [groupDialogMode, setGroupDialogMode] = useState<'add' | 'edit'>('add');
    const [editingGroupData, setEditingGroupData] = useState<UserGroupItem | null>(null);
    const [groupName, setGroupName] = useState('');

    // 加载用户组列表
    const loadGroups = useCallback(async () => {
        setLoading(true);
        try {
            const res = await projectUserGroupService.getList(projectId);
            setGroups(res);
        } catch (e) {
            toast.error('加载用户组失败');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadGroups();
    }, [loadGroups]);

    // 展平权限配置
    const flattenAuthSettings = useCallback((data: UserGroupAuthSetting[]): AuthTableGroupedRow[] => {
        const groupedRows: AuthTableGroupedRow[] = [];
        data.forEach((top) => {
            top.children?.forEach((child) => {
                if (child.permissions && child.permissions.length > 0) {
                    groupedRows.push({
                        moduleName: top.name,
                        operationName: child.name,
                        permissions: child.permissions.map((p: UserGroupPermissionItem) => ({
                            id: p.id,
                            name: p.name,
                            enable: !!p.enable,
                        })),
                    });
                }
            });
        });

        let moduleStartIdx = 0;
        let currentModule = '';
        groupedRows.forEach((row, idx) => {
            if (row.moduleName !== currentModule) {
                currentModule = row.moduleName;
                moduleStartIdx = idx;
            }
            const moduleEndIdx = groupedRows.findIndex((r, i) => i > idx && r.moduleName !== currentModule);
            const moduleRowSpan = moduleEndIdx === -1 ? groupedRows.length - moduleStartIdx : moduleEndIdx - moduleStartIdx;
            row.moduleRowSpan = idx === moduleStartIdx ? moduleRowSpan : 0;
            row.isFirstModuleRow = idx === moduleStartIdx;
        });

        return groupedRows;
    }, []);

    // 加载权限配置（选中用户组且 Tab 为权限时）
    const loadAuthSettings = useCallback(async () => {
        if (!selectedGroup?.id) return;
        setAuthLoading(true);
        try {
            const data = await projectUserGroupService.getPermissionSetting(selectedGroup.id);
            setAuthRows(flattenAuthSettings(data));
            setAuthDirty(false);
        } catch (e) {
            toast.error('加载权限失败');
        } finally {
            setAuthLoading(false);
        }
    }, [selectedGroup?.id, flattenAuthSettings]);

    useEffect(() => {
        if (activeTab === 'auth' && selectedGroup?.id) {
            loadAuthSettings();
        }
    }, [activeTab, selectedGroup?.id, loadAuthSettings]);

    // 加载成员列表（选中用户组且 Tab 为成员时）
    const loadMembers = useCallback(async () => {
        if (!selectedGroup?.id) return;
        setMemberLoading(true);
        try {
            const res = await projectUserGroupService.getMemberList({
                userRoleId: selectedGroup.id,
                projectId,
                current: memberPage,
                pageSize: 10,
                keyword: memberKeyword || undefined,
            });
            setMembers(res.list);
            setMemberTotal(res.total);
        } catch (e) {
            toast.error('加载成员失败');
        } finally {
            setMemberLoading(false);
        }
    }, [selectedGroup?.id, projectId, memberPage, memberKeyword]);

    useEffect(() => {
        if (activeTab === 'members' && selectedGroup?.id) {
            loadMembers();
        }
    }, [activeTab, selectedGroup?.id, loadMembers]);

    // 搜索用户选项
    useEffect(() => {
        if (!showAddMember || !selectedGroup) return;
        const timer = setTimeout(async () => {
            try {
                const res = await projectUserGroupService.getMemberOption(projectId, selectedGroup.id, searchUserKeyword);
                setUserOptions(res);
            } catch (e) {
                console.error(e);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [showAddMember, searchUserKeyword, projectId, selectedGroup]);

    const handleTogglePermission = (id: string, checked: boolean) => {
        setAuthRows(prev => prev.map(row => ({
            ...row,
            permissions: row.permissions.map(p => p.id === id ? { ...p, enable: checked } : p)
        })));
        setAuthDirty(true);
    };

    const handleSaveAuth = async () => {
        if (!selectedGroup?.id) return;
        try {
            const permissions = authRows.flatMap(row => row.permissions.map(p => ({ id: p.id, enable: p.enable })));
            await projectUserGroupService.savePermissionSetting({
                userRoleId: selectedGroup.id,
                permissions
            });
            toast.success('保存成功');
            setAuthDirty(false);
        } catch (e) {
            toast.error('保存失败');
        }
    };

    const handleAddMembers = async () => {
        if (!selectedGroup || selectedUserIds.length === 0) return;
        try {
            await projectUserGroupService.addMember({
                userRoleId: selectedGroup.id,
                userIds: selectedUserIds,
                projectId
            });
            toast.success('添加成功');
            setShowAddMember(false);
            setSelectedUserIds([]);
            setSearchUserKeyword('');
            loadMembers();
        } catch (e) {
            toast.error('添加失败');
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!selectedGroup) return;
        try {
            await projectUserGroupService.removeMember({
                userRoleId: selectedGroup.id,
                userIds: [userId],
                projectId
            });
            toast.success('已移除');
            loadMembers();
        } catch (e) {
            toast.error('移除失败');
        }
    };

    const handleOpenAddGroup = () => {
        setGroupDialogMode('add');
        setGroupName('');
        setEditingGroupData(null);
        setShowGroupDialog(true);
    };

    const handleOpenEditGroup = (group: UserGroupItem) => {
        setGroupDialogMode('edit');
        setGroupName(group.name);
        setEditingGroupData(group);
        setShowGroupDialog(true);
    };

    const handleSaveGroup = async () => {
        if (!groupName.trim()) return;
        try {
            if (groupDialogMode === 'add') {
                await projectUserGroupService.add({
                    name: groupName,
                    scopeId: projectId,
                    type: 'PROJECT'
                });
                toast.success('创建成功');
            } else if (editingGroupData) {
                await projectUserGroupService.update({
                    id: editingGroupData.id,
                    name: groupName,
                    scopeId: projectId
                });
                toast.success('重命名成功');
            }
            setShowGroupDialog(false);
            loadGroups();
        } catch (e) {
            toast.error(groupDialogMode === 'add' ? '创建失败' : '更新失败');
        }
    };

    const handleDeleteGroup = async (groupId: string) => {
        try {
            await projectUserGroupService.delete(groupId);
            toast.success('删除成功');
            if (selectedGroup?.id === groupId) {
                setSelectedGroup(null);
            }
            loadGroups();
        } catch (e) {
            toast.error('删除失败');
        }
    };

    const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(keyword.toLowerCase()));

    return (
        <div className="space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-700 pb-12">
            {/* 与模板管理一致的顶部标题区 */}
            <div className="flex flex-col gap-1 px-1">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-100 ring-4 ring-blue-50">
                        <Shield className="w-5 h-5" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-gray-900">用户组</h2>
                </div>
                <p className="text-sm font-medium text-gray-400 mt-2 pl-14">管理项目内的用户组，配置权限并维护成员列表。</p>
            </div>

            {/* 与模板管理一致的卡片容器：左侧用户组列表 + 右侧详情 */}
            <div className="border border-gray-100 rounded-[2.5rem] bg-white shadow-[0_30px_60px_rgba(0,0,0,0.03)] ring-1 ring-gray-50 overflow-hidden flex h-[calc(100vh-14rem)] min-h-[560px]">
                {/* 左侧用户组列表 */}
                <aside className="w-[320px] shrink-0 flex flex-col border-r border-gray-100 bg-[#fbfcfd]">
                    <div className="p-6 border-b border-gray-50 bg-white sticky top-0 z-10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2.5 uppercase tracking-widest">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                                项目用户组
                            </h3>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={handleOpenAddGroup}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="relative group/search">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 transition-colors group-focus-within/search:text-blue-500" />
                            <Input
                                placeholder="搜索用户组名称..."
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                className="h-11 pl-10 border-gray-100 bg-gray-50/50 hover:bg-gray-50 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all rounded-xl text-xs font-bold"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
                        {loading ? (
                            <div className="py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                                <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                                <span>加载中...</span>
                            </div>
                        ) : filteredGroups.length === 0 ? (
                            <div className="py-8 text-center text-sm text-gray-400 italic">暂无用户组</div>
                        ) : (
                            filteredGroups.map((group) => {
                                const isSelected = selectedGroup?.id === group.id;
                                return (
                                    <div
                                        key={group.id}
                                        className={cn(
                                            'group flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-all duration-300 border mb-1 mx-2',
                                            isSelected
                                                ? 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-200 translate-x-1'
                                                : 'hover:bg-white hover:border-gray-200 hover:shadow-sm text-gray-600 border-transparent'
                                        )}
                                        onClick={() => {
                                            if (!isSelected) {
                                                setSelectedGroup(group);
                                                setActiveTab('members');
                                                setMemberPage(1);
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={cn(
                                                "p-1.5 rounded-lg transition-colors",
                                                isSelected ? "bg-white/20" : "bg-gray-100 group-hover:bg-blue-50"
                                            )}>
                                                <Shield className={cn("w-3.5 h-3.5", isSelected ? "text-white" : "text-gray-400 group-hover:text-blue-500")} />
                                            </div>
                                            <span className={cn('truncate text-sm font-semibold tracking-tight', isSelected ? 'text-white' : 'text-gray-700')}>{group.name}</span>
                                            {group.internal && (
                                                <Badge variant="secondary" className={cn("text-[10px] rounded-md px-1.5 py-0", isSelected ? "bg-blue-500/30 text-white" : "text-gray-500")}>内置</Badge>
                                            )}
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <Button type="button" size="icon" variant="ghost" className={cn('h-7 w-7 rounded-lg opacity-0 transition-opacity', (isSelected || 'group-hover:opacity-100') && (isSelected ? 'text-white hover:bg-white/20' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'))}>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40 rounded-2xl border-gray-100 shadow-2xl p-1.5 backdrop-blur-md bg-white">
                                                <DropdownMenuItem onClick={() => handleOpenEditGroup(group)} className="rounded-xl gap-2.5 py-2.5 font-bold focus:bg-blue-50 focus:text-blue-600 cursor-pointer">
                                                    <Pencil className="h-4 w-4" /> <span className="text-sm">重命名</span>
                                                </DropdownMenuItem>
                                                {!group.internal && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteGroup(group.id)}
                                                        className="rounded-xl text-red-500 gap-2.5 py-2.5 font-bold focus:bg-red-50 focus:text-red-600 cursor-pointer"
                                                    >
                                                        <Trash2 className="h-4 w-4" /> <span className="text-sm">删除</span>
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </aside>

                {/* 右侧详情区 */}
                <main className="flex-1 flex flex-col min-w-0 bg-white">
                    {!selectedGroup ? (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground bg-muted/20">
                            <div className="text-center">
                                <Shield className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                                <p className="text-sm">请选择左侧用户组以配置权限或成员</p>
                            </div>
                        </div>
                    ) : (
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'auth' | 'members')} className="flex flex-col flex-1 min-h-0 bg-white">
                            <div className="flex items-center justify-between px-8 border-b border-gray-50 flex-shrink-0 sticky top-0 z-20 bg-white/80 backdrop-blur-md">
                                <TabsList className="bg-transparent border-b-0 h-16 p-0 gap-8 rounded-none">
                                    <TabsTrigger value="auth" className="h-16 px-1 rounded-none border-0 border-b-2 border-transparent bg-transparent text-gray-500 shadow-none text-sm font-black transition-all data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none">
                                        <ShieldCheck className="w-4 h-4 mr-2" /> 权限配置
                                    </TabsTrigger>
                                    <TabsTrigger value="members" className="h-16 px-1 rounded-none border-0 border-b-2 border-transparent bg-transparent text-gray-500 shadow-none text-sm font-black transition-all data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none">
                                        <Users className="w-4 h-4 mr-2" /> 成员列表
                                    </TabsTrigger>
                                </TabsList>

                                {/* 右侧交互按键区域 */}
                                {activeTab === 'auth' ? (
                                    <div className="flex items-center gap-3">
                                        {authDirty && (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">未保存更改</Badge>
                                        )}
                                        <Button variant="outline" size="sm" onClick={() => loadAuthSettings()} disabled={authLoading || !authDirty} className="rounded-xl h-9 hover:bg-gray-50 border-gray-200 text-gray-600 font-bold">
                                            重置
                                        </Button>
                                        <Button size="sm" onClick={handleSaveAuth} disabled={authLoading || !authDirty} className="h-9 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-white shadow-sm shadow-blue-200">
                                            保存配置
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <div className="relative group">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                            <Input
                                                placeholder="搜索组内成员..."
                                                value={memberKeyword}
                                                onChange={e => setMemberKeyword(e.target.value)}
                                                className="h-9 pl-9 w-56 text-sm rounded-xl border-gray-200 focus:ring-4 focus:ring-blue-500/5 bg-gray-50 hover:bg-white focus:bg-white transition-all"
                                                onKeyDown={e => e.key === 'Enter' && loadMembers()}
                                            />
                                        </div>
                                        <Button size="sm" onClick={() => setShowAddMember(true)} className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm shadow-blue-200">
                                            <UserPlus className="w-3.5 h-3.5 mr-1.5" /> 添加成员
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-auto custom-scrollbar p-6">
                                <TabsContent value="auth" className="m-0 h-full data-[state=inactive]:hidden">
                                    {authLoading ? (
                                        <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                                            <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                                            <span className="text-sm font-medium">全力加载权限配置中...</span>
                                        </div>
                                    ) : (
                                        <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="border-b border-gray-100 hover:bg-transparent">
                                                        <TableHead className="w-32 h-12 pl-6 bg-gray-50/80 text-xs font-black text-gray-400 uppercase tracking-widest text-left">功能模块</TableHead>
                                                        <TableHead className="w-40 h-12 bg-gray-50/80 text-xs font-black text-gray-400 uppercase tracking-widest text-left">操作对象</TableHead>
                                                        <TableHead className="h-12 bg-gray-50/80 text-xs font-black text-gray-400 uppercase tracking-widest text-left">具体权限项</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {authRows.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={3} className="text-center py-16 text-gray-400 bg-gray-50/20">
                                                                <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                                                <p className="text-sm font-medium">暂无可用权限项</p>
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        authRows.map((row, idx) => (
                                                            <TableRow key={`${selectedGroup.id}-${idx}`} className="border-b-gray-50 hover:bg-blue-50/30 transition-colors group/row">
                                                                {row.isFirstModuleRow && (
                                                                    <TableCell rowSpan={row.moduleRowSpan} className="font-bold align-top border-r border-gray-50 bg-gray-50/20 pl-6 py-4 text-gray-800 text-left">
                                                                        {row.moduleName}
                                                                    </TableCell>
                                                                )}
                                                                <TableCell className="whitespace-nowrap font-medium text-sm text-gray-600 py-4 text-left">{row.operationName}</TableCell>
                                                                <TableCell className="py-3">
                                                                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                                                                        {row.permissions.map(p => (
                                                                            <label key={p.id} className="flex items-center gap-2.5 cursor-pointer rounded-lg px-2.5 py-1.5 -ml-2.5 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all select-none group/checkbox">
                                                                                <Checkbox
                                                                                    checked={p.enable}
                                                                                    onCheckedChange={c => handleTogglePermission(p.id, !!c)}
                                                                                    className="rounded flex-shrink-0 w-4 h-4 border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-colors shadow-sm"
                                                                                />
                                                                                <span className={cn("text-sm font-medium transition-colors", p.enable ? "text-blue-900" : "text-gray-600 group-hover/checkbox:text-gray-900")}>{p.name}</span>
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="members" className="m-0 h-full data-[state=inactive]:hidden flex flex-col">
                                    {memberLoading ? (
                                        <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                                            <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                                            <span className="text-sm font-medium">全力加载成员列表中...</span>
                                        </div>
                                    ) : (
                                        <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white flex flex-col flex-1">
                                            <div className="overflow-auto flex-1 custom-scrollbar">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="border-b border-gray-100 hover:bg-transparent">
                                                            <TableHead className="h-12 pl-8 w-64 bg-gray-50/80 text-xs font-black text-gray-400 uppercase tracking-widest sticky top-0 z-10 text-left">成员</TableHead>
                                                            <TableHead className="h-12 w-40 text-center bg-gray-50/80 text-xs font-black text-gray-400 uppercase tracking-widest sticky top-0 z-10">加入日期</TableHead>
                                                            <TableHead className="h-12 w-32 text-right pr-8 bg-gray-50/80 text-xs font-black text-gray-400 uppercase tracking-widest sticky top-0 z-10">关键操作</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {members.length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="text-center py-20 text-gray-400 bg-gray-50/20">
                                                                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                                                    <p className="text-sm font-medium">该用户组下暂无成员</p>
                                                                    <Button variant="outline" onClick={() => setShowAddMember(true)} className="mt-4 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 font-bold">立即添加成员</Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ) : (
                                                            members.map(m => (
                                                                <TableRow key={m.id} className="border-b-gray-50 hover:bg-blue-50/30 transition-colors group/row h-14">
                                                                    <TableCell className="pl-6 text-left">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${getAvatarColor(m.name ?? 'U')}`}>
                                                                                {(m.name ?? 'U').charAt(0).toUpperCase()}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <div className="text-sm font-semibold text-gray-900 truncate">{m.name}</div>
                                                                                <div className="text-xs text-gray-400 truncate">{m.email || '—'}</div>
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-center text-sm text-gray-500 tabular-nums">
                                                                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString('zh-CN') : '—'}
                                                                    </TableCell>
                                                                    <TableCell className="text-right pr-8">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover/row:opacity-100 transition-opacity rounded-lg font-bold text-[11px]"
                                                                            onClick={() => handleRemoveMember(m.id)}
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> 移除
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                            {memberTotal > 10 && (
                                                <div className="flex items-center justify-between px-8 py-3.5 border-t border-gray-100 bg-gray-50/50 shrink-0">
                                                    <span className="text-xs font-medium text-gray-400 tracking-wider">共统计 {memberTotal} 名成员</span>
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" size="sm" disabled={memberPage <= 1} onClick={() => setMemberPage(p => p - 1)} className="rounded-lg h-8 text-xs font-bold hover:bg-gray-100 text-gray-600 border-gray-200">上一页</Button>
                                                        <Button variant="outline" size="sm" disabled={memberPage * 10 >= memberTotal} onClick={() => setMemberPage(p => p + 1)} className="rounded-lg h-8 text-xs font-bold hover:bg-gray-100 text-gray-600 border-gray-200">下一页</Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </TabsContent>
                            </div>
                        </Tabs>
                    )}
                </main>

            </div>
            {/* 卡片容器结束 */}

            {/* 添加成员对话框 */}
            <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>添加成员</DialogTitle>
                        <DialogDescription>
                            将成员添加到「{selectedGroup?.name}」用户组
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="搜索姓名或邮箱"
                                value={searchUserKeyword}
                                onChange={e => setSearchUserKeyword(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm text-gray-600">搜索结果</Label>
                            <div className="border rounded-md max-h-80 overflow-y-auto">
                                {userOptions.length === 0 ? (
                                    <div className="py-8 text-center text-sm text-gray-400">输入关键词搜索</div>
                                ) : (
                                    userOptions.map(opt => (
                                        <div
                                            key={opt.id}
                                            onClick={() => {
                                                setSelectedUserIds(prev =>
                                                    prev.includes(opt.id) ? prev.filter(id => id !== opt.id) : [...prev, opt.id]
                                                );
                                            }}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 cursor-pointer border-b last:border-b-0",
                                                selectedUserIds.includes(opt.id) ? "bg-blue-50" : "hover:bg-gray-50"
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedUserIds.includes(opt.id)}
                                                onChange={() => { }}
                                                className="rounded border-gray-300"
                                            />
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${getAvatarColor(opt.name ?? 'U')}`}>
                                                    {(opt.name ?? 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium truncate">{opt.name}</div>
                                                    <div className="text-xs text-gray-500 truncate">{opt.email}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        {selectedUserIds.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2 border-t">
                                {selectedUserIds.map(id => {
                                    const user = userOptions.find(o => o.id === id);
                                    if (!user) return null;
                                    return (
                                        <Badge key={id} variant="secondary" className="gap-1 pr-1">
                                            {user.name}
                                            <X
                                                className="w-3 h-3 cursor-pointer hover:opacity-70"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedUserIds(prev => prev.filter(i => i !== id));
                                                }}
                                            />
                                        </Badge>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowAddMember(false); setSelectedUserIds([]); }}>
                            取消
                        </Button>
                        <Button onClick={handleAddMembers} disabled={selectedUserIds.length === 0}>
                            确认添加 ({selectedUserIds.length})
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 用户组编辑/创建对话框 - 已美化 */}
            <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
                <DialogContent className="max-sm p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                    <DialogHeader className="p-6 bg-white border-b border-gray-50">
                        <DialogTitle className="text-lg font-extrabold text-gray-900 tracking-tight">
                            {groupDialogMode === 'add' ? '创建新用户组' : '重命名用户组'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-400 text-xs font-medium">
                            {groupDialogMode === 'add' ? '定义项目角色并灵活分配权限。' : '更新用户组显示名称。'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-6 py-8 space-y-6 bg-white">
                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">组名称</Label>
                            <Input
                                value={groupName}
                                onChange={e => setGroupName(e.target.value)}
                                placeholder="输入具有辨识度的名称..."
                                className="h-12 text-sm font-bold bg-gray-50/50 border-gray-100 focus:bg-white focus:ring-4 focus:ring-blue-500/5 rounded-xl transition-all"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleSaveGroup()}
                            />
                            <p className="text-[10px] text-gray-400 pl-1 leading-relaxed">
                                {groupDialogMode === 'add' ? '建议使用包含职责的名称，如“质量保障专家”或“核心开发者”。' : '重命名将即时同步至所有关联成员。'}
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="p-6 pt-0 flex gap-3">
                        <Button variant="ghost" onClick={() => setShowGroupDialog(false)} className="h-11 rounded-xl font-bold text-gray-500 flex-1">
                            取消
                        </Button>
                        <Button
                            onClick={handleSaveGroup}
                            disabled={!groupName.trim()}
                            className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 flex-1 transition-all active:scale-95 disabled:shadow-none"
                        >
                            {groupDialogMode === 'add' ? '立即创建' : '保存更改'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
