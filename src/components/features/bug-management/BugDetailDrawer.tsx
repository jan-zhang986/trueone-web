/**
 * 缺陷详情抽屉
 * 对标老前端 bug-detail-drawer.vue：基本信息 | 详情 | 用例 | 评论 | 变更历史
 */

import { useState, useEffect, useCallback, useRef, useMemo, Fragment, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Edit, Copy, Trash2, Loader2, Clock, User, Tag, AlertCircle, Download, ChevronDown, MessageSquare, Search, Star, MoreHorizontal, Maximize2, Minimize2 } from 'lucide-react';
import { bugManagementService, projectManagementService } from '@/services';
import { BUG_STATUS_OPTIONS } from '@/services/bug-management/constants/bug-status';
import { BUG_PRIORITY_OPTIONS, getPriorityLabel, getPriorityColor } from '@/services/bug-management/constants/bug-priority';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { cn } from '@/utils/cn';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { AppSelect } from './AppSelect';
import { AssociateCaseDialog } from './AssociateCaseDialog';

interface BugDetailDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    bugId: string;
    onEdit?: (bugId: string) => void;
    onCopy?: (bugId: string) => void;
    onDelete?: (bugId: string) => void;
    onRefresh?: () => void;
}

interface BugDetail {
    id: string;
    num: string;
    title: string;
    description?: string;
    feishuDescriptionHtml?: string;
    feishuDescriptionDoc?: string;
    status?: string;
    statusName?: string;
    severity?: string;
    handleUser?: string;
    handleUserName?: string;
    platform?: string;
    platformBugId?: string;
    projectId?: string;
    templateId?: string;
    createUser?: string;
    createUserName?: string;
    createdAt?: number;
    updateUser?: string;
    updatedAt?: number;
    tags?: string[];
    followFlag?: boolean;
    customFields?: { id: string; name?: string; type?: string; value: string; text?: string }[];
    attachments?: { fileId?: string; fileName?: string; name?: string; local?: boolean; refId?: string }[];
}

export function BugDetailDrawer({
    open,
    onOpenChange,
    bugId,
    onEdit,
    onCopy,
    onDelete,
    onRefresh,
}: BugDetailDrawerProps) {
    const [loading, setLoading] = useState(false);
    const [detail, setDetail] = useState<BugDetail | null>(null);
    const [activeTab, setActiveTab] = useState('basicInfo');
    const [caseList, setCaseList] = useState<any[]>([]);
    const [caseLoading, setCaseLoading] = useState(false);
    const [historyList, setHistoryList] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [commentList, setCommentList] = useState<any[]>([]);
    const [feishuCommentList, setFeishuCommentList] = useState<any[]>([]);
    const [commentLoading, setCommentLoading] = useState(false);
    const [commentContent, setCommentContent] = useState('');
    const [commentImageIds, setCommentImageIds] = useState<string[]>([]);
    const [commentImageUploading, setCommentImageUploading] = useState(false);
    const [commentSubmitting, setCommentSubmitting] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [assigneeUpdating, setAssigneeUpdating] = useState(false);
    const [memberOptions, setMemberOptions] = useState<{ id: string; name: string }[]>([]);
    const [severityUpdating, setSeverityUpdating] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [associateCaseOpen, setAssociateCaseOpen] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [previewImageScale, setPreviewImageScale] = useState(1);
    const [previewImageTranslate, setPreviewImageTranslate] = useState({ x: 0, y: 0 });
    const [previewDragging, setPreviewDragging] = useState(false);
    const previewDragRef = useRef({ isDragging: false, startX: 0, startY: 0, startTx: 0, startTy: 0 });
    const [editingDescription, setEditingDescription] = useState('');
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const saveDescriptionTimer = useRef<number | null>(null);
    const [drawerStatusOptions, setDrawerStatusOptions] = useState<Array<{ value: string; text: string }>>([]);
    const [validStatusOptions, setValidStatusOptions] = useState<Array<{ value: string; label: string }> | null>(null);
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

    const commentImageBase = (import.meta.env.VITE_API_BASE_URL ?? '').toString().trim().replace(/\/$/, '');
    const commentContentWithImageBase = useCallback((html: string | undefined) => {
        if (!html || !/<img/i.test(html)) return html ?? '';
        const prefix = commentImageBase ? `${commentImageBase}/bug` : '/api/bug';
        return html.replace(/src="\/bug\//g, `src="${prefix}/`);
    }, [commentImageBase]);

    // 关闭抽屉时退出编辑态
    useEffect(() => {
        if (!open) {
            setIsEditingDescription(false);
        }
    }, [open]);

    // 飞书项目时从表头接口拉取流程状态选项，与项目配置一致
    useEffect(() => {
        if (!open || !detail?.projectId) {
            setDrawerStatusOptions([]);
            return;
        }
        bugManagementService.getCustomOptionHeader(detail.projectId).then((res: any) => {
            const raw = res?.statusOption || [];
            setDrawerStatusOptions(raw.map((o: { value?: string; text?: string }) => ({ value: o.value ?? o.text ?? '', text: o.text ?? o.value ?? '' })).filter((o: { value: string }) => o.value));
        }).catch(() => setDrawerStatusOptions([]));
    }, [open, detail?.projectId]);

    const statusOptionsForDrawer = useMemo(() => {
        if (validStatusOptions) {
            return validStatusOptions;
        }
        if (drawerStatusOptions.length) {
            return drawerStatusOptions.map((o) => ({ value: o.value, label: o.text || o.value }));
        }
        return BUG_STATUS_OPTIONS;
    }, [validStatusOptions, drawerStatusOptions]);

    const fetchValidStatuses = async () => {
        if (!detail?.id || !detail.projectId || !detail.templateId) return;
        try {
            const res: any = await bugManagementService.getTemplateDetailInfo({
                id: detail.templateId,
                projectId: detail.projectId,
                fromStatusId: getFieldValue('status') || detail.status || '',
                platformBugKey: detail.platformBugId || detail.id,
            });
            const data = res?.data ?? res;
            if (data?.customFields) {
                const statusField = data.customFields.find((f: any) => f.fieldId === 'status' || f.id === 'status' || f.fieldKey === 'status');
                if (statusField?.options) {
                    setValidStatusOptions(statusField.options.map((o: any) => ({ value: o.value, label: o.text || o.label || o.value })));
                    return;
                }
            }
        } catch (e) {
            console.error('Failed to fetch dynamic status options', e);
        }
        setValidStatusOptions(null);
    };

    const uploadDescriptionImage = useCallback(
        async (file: File): Promise<string> => {
            if (!detail?.projectId) {
                toast.error('缺少项目ID，无法上传图片');
                return '';
            }
            try {
                const fileId = await bugManagementService.uploadCommentImage(file);
                if (!fileId) {
                    toast.error('图片上传失败');
                    return '';
                }
                const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '').toString().trim().replace(/\/$/, '');
                const prefix = apiBase || '/api';
                return `${prefix}/bug/attachment/preview/md/${detail.projectId}/${fileId}/false`;
            } catch (err: any) {
                toast.error(err?.message || '图片上传失败');
                return '';
            }
        },
        [detail?.projectId],
    );
    useEffect(() => {
        if (!detail) {
            setEditingDescription('');
            return;
        }
        if (detail.platform === 'FEISHU' && detail.feishuDescriptionHtml) {
            setEditingDescription(detail.feishuDescriptionHtml);
        } else {
            setEditingDescription(detail.description ?? '');
        }
    }, [detail]);

    const handleDescriptionChange = useCallback(
        (html: string) => {
            setEditingDescription(html);
            if (!detail?.id || !detail.projectId || !detail.templateId) return;
            if (saveDescriptionTimer.current) {
                window.clearTimeout(saveDescriptionTimer.current);
            }
            saveDescriptionTimer.current = window.setTimeout(async () => {
                try {
                    await bugManagementService.updateBug({
                        request: {
                            id: detail.id,
                            projectId: detail.projectId!,
                            templateId: detail.templateId!,
                            description: html,
                            customFields: detail.customFields ?? [],
                            // 避免后端通知解析 content 为空导致 NPE，这里传空数组 JSON
                            content: '[]',
                        } as any,
                        fileList: [],
                    });
                    setDetail((prev) =>
                        prev
                            ? {
                                ...prev,
                                description: html,
                                feishuDescriptionHtml: prev.platform === 'FEISHU' ? html : prev.feishuDescriptionHtml,
                            }
                            : prev,
                    );
                    onRefresh?.();
                } catch (err: any) {
                    toast.error(err?.message || '更新缺陷内容失败');
                }
            }, 800);
        },
        [detail?.id, detail?.projectId, detail?.templateId, onRefresh],
    );

    // 抽屉关闭时重置弹窗全屏状态
    useEffect(() => {
        if (!open) setIsFullScreen(false);
    }, [open]);

    // 打开预览时重置缩放与平移
    useEffect(() => {
        if (previewImageUrl) {
            setPreviewImageScale(1);
            setPreviewImageTranslate({ x: 0, y: 0 });
        }
    }, [previewImageUrl]);

    // 滚轮缩放：仅当鼠标在图片上时缩放，在空白区域时滚动条滚动
    useEffect(() => {
        if (!previewImageUrl) return;
        const onWheel = (e: WheelEvent) => {
            const imageArea = document.querySelector('[data-preview-image="true"]');
            if (!imageArea || !imageArea.contains(e.target as Node)) return;
            e.preventDefault();
            e.stopPropagation();
            setPreviewImageScale((s) => Math.min(4, Math.max(0.5, s - e.deltaY * 0.004)));
        };
        const t = setTimeout(() => {
            document.addEventListener('wheel', onWheel, { passive: false });
        }, 0);
        return () => {
            clearTimeout(t);
            document.removeEventListener('wheel', onWheel);
        };
    }, [previewImageUrl]);

    // 图片拖拽：在 document 上监听 move/up，避免拖出后丢失
    useEffect(() => {
        if (!previewImageUrl) return;
        const onMove = (e: MouseEvent) => {
            const r = previewDragRef.current;
            if (!r.isDragging) return;
            setPreviewImageTranslate({ x: r.startTx + e.clientX - r.startX, y: r.startTy + e.clientY - r.startY });
        };
        const onUp = () => {
            previewDragRef.current.isDragging = false;
            setPreviewDragging(false);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        return () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
    }, [previewImageUrl]);

    useEffect(() => {
        if (open && bugId) {
            setLoading(true);
            setDetail(null);
            setActiveTab('basicInfo');
            bugManagementService.getBugDetail(bugId)
                .then((res: any) => {
                    const data = res?.data !== undefined ? res.data : res;
                    setDetail(data);
                })
                .catch(() => toast.error('加载缺陷详情失败'))
                .finally(() => setLoading(false));
        }
        if (!open) {
            setDetail(null);
            setIsFullScreen(false);
        }
    }, [open, bugId]);

    const loadCaseList = useCallback(() => {
        if (!detail?.id) return;
        setCaseLoading(true);
        bugManagementService.getAssociatedList({ bugId: detail.id, current: 1, pageSize: 100 })
            .then((res: any) => {
                const list = res?.list ?? res?.data?.list ?? (Array.isArray(res?.data) ? res.data : []);
                setCaseList(Array.isArray(list) ? list : []);
            })
            .catch(() => setCaseList([]))
            .finally(() => setCaseLoading(false));
    }, [detail?.id]);

    useEffect(() => {
        if (!detail?.id || activeTab !== 'case') return;
        loadCaseList();
    }, [detail?.id, activeTab, loadCaseList]);

    useEffect(() => {
        if (!detail?.id || activeTab !== 'history') return;
        setHistoryLoading(true);
        const req = detail.platform === 'FEISHU'
            ? bugManagementService.getFeishuHistory(detail.id)
            : bugManagementService.getChangeHistoryList({ projectId: detail.projectId, sourceId: detail.id, current: 1, pageSize: 50 });
        req
            .then((res: any) => {
                const list = res?.list ?? res?.data?.list ?? (Array.isArray(res?.data) ? res.data : []);
                setHistoryList(Array.isArray(list) ? list : []);
            })
            .catch(() => setHistoryList([]))
            .finally(() => setHistoryLoading(false));
    }, [detail?.id, detail?.projectId, detail?.platform, activeTab]);

    useEffect(() => {
        if (!detail?.id || activeTab !== 'comment') return;
        setCommentLoading(true);
        Promise.all([
            bugManagementService.getCommentList(detail.id),
            detail.platform === 'FEISHU' ? bugManagementService.getFeishuComments(detail.id) : Promise.resolve([]),
        ])
            .then(([localRes, feishuRes]: any[]) => {
                const list = localRes?.list ?? localRes?.data ?? (Array.isArray(localRes) ? localRes : []);
                setCommentList(Array.isArray(list) ? list : []);
                const feishuList = feishuRes?.list ?? feishuRes?.data ?? (Array.isArray(feishuRes) ? feishuRes : []);
                setFeishuCommentList(Array.isArray(feishuList) ? feishuList : []);
            })
            .catch(() => {
                setCommentList([]);
                setFeishuCommentList([]);
            })
            .finally(() => setCommentLoading(false));
    }, [detail?.id, activeTab]);

    const formatTime = (ts?: number) => {
        if (!ts) return '-';
        return new Date(ts).toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const getFieldValue = (fieldId: string): string => {
        if (!detail?.customFields) return '';
        const f = detail.customFields.find((c) => c.id === fieldId);
        return f?.value || '';
    };

    const getFieldDisplay = (fieldId: string): string => {
        if (!detail?.customFields) return '';
        const f = detail.customFields.find((c) => c.id === fieldId);
        if (f?.text) return f.text;
        return f?.value || '';
    };

    const getStatusColor = (status?: string) => {
        const m: Record<string, string> = {
            'new': 'bg-blue-100 text-blue-700',
            新建: 'bg-blue-100 text-blue-700',
            'in_progress': 'bg-purple-100 text-purple-700',
            'resolved': 'bg-green-100 text-green-700',
            'rejected': 'bg-red-100 text-red-700',
            'closed': 'bg-gray-100 text-gray-600',
            待处理: 'bg-blue-100 text-blue-700',
            处理中: 'bg-purple-100 text-purple-700',
            已解决: 'bg-green-100 text-green-700',
            已关闭: 'bg-gray-100 text-gray-600',
            拒绝: 'bg-red-100 text-red-700',
            '拒绝(驳回)': 'bg-red-100 text-red-700',
            待确认: 'bg-amber-100 text-amber-700',
            再次打开: 'bg-orange-100 text-orange-700',
            暂不修复: 'bg-slate-100 text-slate-600',
            已验证: 'bg-emerald-100 text-emerald-700',
            已终止: 'bg-gray-100 text-gray-600',
        };
        return m[status || ''] || 'bg-gray-100 text-gray-600';
    };

    const currentStatusValue = getFieldValue('status') || detail?.status || '';
    const currentStatusDisplay = detail?.statusName || getFieldDisplay('status') || currentStatusValue || '-';

    const handleStatusChange = async (newValue: string, newLabel: string) => {
        if (!detail?.id || !detail.projectId || !detail.templateId) {
            toast.error('缺少项目或模板信息，无法修改状态');
            return;
        }
        if (newValue === currentStatusValue) {
            return;
        }
        setStatusUpdating(true);
        try {
            const baseFields = detail.customFields ?? [];
            const hasStatus = baseFields.some((f) => f.id === 'status');
            const newCustomFields = hasStatus
                ? baseFields.map((f) =>
                    f.id === 'status'
                        ? { ...f, value: newValue, text: JSON.stringify([newLabel]) }
                        : f
                )
                : [...baseFields, { id: 'status', value: newValue, text: JSON.stringify([newLabel]) }];
            await bugManagementService.updateBug({
                request: {
                    id: detail.id,
                    projectId: detail.projectId,
                    templateId: detail.templateId,
                    customFields: newCustomFields,
                },
                fileList: [],
            });
            setDetail((prev) =>
                prev
                    ? {
                        ...prev,
                        status: newValue,
                        statusName: newLabel,
                        customFields: newCustomFields,
                    }
                    : null
            );
            toast.success('状态已更新');
            onRefresh?.();
        } catch (err: any) {
            toast.error(err?.message || '状态更新失败');
        } finally {
            setStatusUpdating(false);
        }
    };

    const uploadCommentImageFile = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        if (!detail?.projectId) return;
        setCommentImageUploading(true);
        bugManagementService.uploadCommentImage(file)
            .then((fileId) => {
                if (fileId) setCommentImageIds((prev) => [...prev, fileId]);
                else toast.error('图片上传失败');
            })
            .catch(() => toast.error('图片上传失败'))
            .finally(() => setCommentImageUploading(false));
    };

    const handleCommentPaste = (e: React.ClipboardEvent) => {
        const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
        if (!item) return;
        const file = item.getAsFile();
        if (!file) return;
        e.preventDefault();
        uploadCommentImageFile(file);
    };

    const handleCommentSubmit = async () => {
        const text = commentContent.trim();
        if (!text && commentImageIds.length === 0) return;
        if (!detail?.id || !detail?.projectId) return;
        setCommentSubmitting(true);
        try {
            const imageHtml = commentImageIds
                .map((id) => `<img src="/bug/attachment/preview/md/${detail.projectId}/${id}/false" alt="" />`)
                .join('');
            const content = text ? (imageHtml ? `${text}\n${imageHtml}` : text) : imageHtml;
            await bugManagementService.createOrUpdateComment({
                bugId: detail.id,
                content,
                fetchType: 'ADD',
                event: 'COMMENT',
                richTextTmpFileIds: commentImageIds.length > 0 ? commentImageIds : undefined,
            } as any);
            setCommentContent('');
            setCommentImageIds([]);
            const listRes: any = await bugManagementService.getCommentList(detail.id);
            const list = listRes?.list ?? listRes?.data ?? (Array.isArray(listRes) ? listRes : []);
            setCommentList(Array.isArray(list) ? list : []);
            toast.success('评论已发布');
        } catch (err: any) {
            toast.error(err?.message || '评论发布失败');
        } finally {
            setCommentSubmitting(false);
        }
    };

    useEffect(() => {
        if (!open || !detail?.projectId) return;
        projectManagementService.getProjectMemberOptions(detail.projectId)
            .then((res: any) => {
                const list = Array.isArray(res) ? res : res?.list ?? res?.data ?? [];
                setMemberOptions(list.map((m: any) => ({ id: m.id, name: m.name || m.userName || m.email || '-' })));
            })
            .catch(() => setMemberOptions([]));
    }, [open, detail?.projectId]);

    const currentAssigneeValue = getFieldValue('handleUser') || detail?.handleUser || '';
    const currentAssigneeDisplay = detail?.handleUserName || getFieldDisplay('handleUser') || currentAssigneeValue || '-';
    const currentSeverityValue = getFieldValue('severity') || detail?.severity || '';
    const currentSeverityDisplay = getPriorityLabel(currentSeverityValue) || '-';

    const handleAssigneeChange = async (userId: string, userName: string) => {
        if (!detail?.id || !detail.projectId || !detail.templateId) {
            toast.error('缺少项目或模板信息，无法修改处理人');
            return;
        }
        if (userId === currentAssigneeValue) return;
        setAssigneeUpdating(true);
        try {
            const baseFields = detail.customFields ?? [];
            const hasHandleUser = baseFields.some((f) => f.id === 'handleUser');
            const newCustomFields = hasHandleUser
                ? baseFields.map((f) =>
                    f.id === 'handleUser'
                        ? { ...f, value: userId, text: JSON.stringify([userName]) }
                        : f
                )
                : [...baseFields, { id: 'handleUser', value: userId, text: JSON.stringify([userName]) }];
            await bugManagementService.updateBug({
                request: {
                    id: detail.id,
                    projectId: detail.projectId,
                    templateId: detail.templateId,
                    customFields: newCustomFields,
                },
                fileList: [],
            });
            setDetail((prev) =>
                prev
                    ? {
                        ...prev,
                        handleUser: userId,
                        handleUserName: userName,
                        customFields: newCustomFields,
                    }
                    : null
            );
            toast.success('处理人已更新');
            onRefresh?.();
        } catch (err: any) {
            toast.error(err?.message || '处理人更新失败');
        } finally {
            setAssigneeUpdating(false);
        }
    };

    const handleSeverityChange = async (newValue: string, newLabel: string) => {
        if (!detail?.id || !detail.projectId || !detail.templateId) {
            toast.error('缺少项目或模板信息，无法修改严重程度');
            return;
        }
        if (newValue === currentSeverityValue) return;
        setSeverityUpdating(true);
        try {
            const baseFields = detail.customFields ?? [];
            const hasSeverity = baseFields.some((f) => f.id === 'severity');
            const newCustomFields = hasSeverity
                ? baseFields.map((f) =>
                    f.id === 'severity'
                        ? { ...f, value: newValue, text: JSON.stringify([newLabel]) }
                        : f
                )
                : [...baseFields, { id: 'severity', value: newValue, text: JSON.stringify([newLabel]) }];
            await bugManagementService.updateBug({
                request: {
                    id: detail.id,
                    projectId: detail.projectId,
                    templateId: detail.templateId,
                    customFields: newCustomFields,
                },
                fileList: [],
            });
            setDetail((prev) =>
                prev
                    ? {
                        ...prev,
                        severity: newValue,
                        customFields: newCustomFields,
                    }
                    : null
            );
            toast.success('严重程度已更新');
            onRefresh?.();
        } catch (err: any) {
            toast.error(err?.message || '严重程度更新失败');
        } finally {
            setSeverityUpdating(false);
        }
    };

    const handleFollow = async () => {
        if (!detail?.id) return;
        setFollowLoading(true);
        try {
            // 与老前端保持一致：followBug 接收当前是否已关注，true 调用取消关注接口，false 调用关注接口
            const currentFlag = Boolean(detail.followFlag);
            await bugManagementService.followBug(detail.id, currentFlag);
            const nextFlag = !currentFlag;
            setDetail((prev) => (prev ? { ...prev, followFlag: nextFlag } : null));
            toast.success(nextFlag ? '关注成功' : '已取消关注');
            onRefresh?.();
        } catch (err: any) {
            toast.error(err?.message || '操作失败');
        } finally {
            setFollowLoading(false);
        }
    };

    const handleDownloadAttachment = async (att: { fileId?: string; fileName?: string; name?: string; local?: boolean }) => {
        if (!detail?.projectId || !detail?.id || !att?.fileId) {
            toast.error('无法下载：缺少附件信息');
            return;
        }
        try {
            const res = await bugManagementService.downloadBugAttachment({
                projectId: detail.projectId,
                bugId: detail.id,
                fileId: att.fileId,
                associated: Boolean(att.local === false),
            });
            const blob = res instanceof Blob ? res : (res as any)?.data;
            if (!blob) {
                toast.error('下载失败');
                return;
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = att.fileName || att.name || 'attachment';
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('下载失败');
        }
    };

    return (
        <Fragment>
            <Sheet open={open} onOpenChange={onOpenChange} modal>
                <SheetContent
                    side="right"
                    className={cn(
                        'p-0 flex flex-col gap-0',
                        isFullScreen ? 'border-l-0' : 'w-[min(960px,90vw)] sm:max-w-[min(960px,90vw)]'
                    )}
                    style={
                        isFullScreen
                            ? {
                                inset: 0,
                                width: '100vw',
                                maxWidth: '100vw',
                                height: '100vh',
                            }
                            : undefined
                    }
                    aria-describedby={undefined}
                >
                    <div className="flex flex-col flex-1 min-h-0 w-full h-full">
                        {loading ? (
                            <>
                                <SheetTitle className="sr-only">缺陷详情</SheetTitle>
                                <SheetDescription className="sr-only">加载中</SheetDescription>
                                <div className="flex-1 flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                </div>
                            </>
                        ) : detail ? (
                            <>
                                {/* 头部操作与老前端 bug-detail-drawer.vue 一致：编辑、分享、关注、更多(复制/删除)、全屏；关闭由 Sheet 内置提供 */}
                                <SheetHeader className="h-14 min-h-14 pl-6 pr-12 py-0 flex flex-row items-center justify-between gap-2 border-b border-gray-200 shrink-0">
                                    <div className="flex flex-1 items-center overflow-hidden min-w-0">
                                        <span className="text-base font-medium text-gray-900 truncate">
                                            【{detail.num}】{detail.title}
                                        </span>
                                        {detail.platform && (
                                            <span className="ml-4 shrink-0 rounded px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                                {detail.platform}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-0 shrink-0">
                                        <Button variant="ghost" size="sm" className="h-8 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100 mr-1" onClick={() => { onOpenChange(false); onEdit?.(detail.id); }}>
                                            <Edit className="w-4 h-4 mr-1" /> 编辑
                                        </Button>
                                        <Button variant="ghost" size="sm" className={`h-8 rounded-md mr-1 ${detail.followFlag ? 'text-amber-600 hover:bg-amber-50' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'}`} disabled={followLoading} onClick={handleFollow}>
                                            <Star className={`w-4 h-4 mr-1 ${detail.followFlag ? 'fill-current' : ''}`} /> 关注
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100 mr-1">
                                                    <MoreHorizontal className="w-4 h-4 mr-1" /> 更多
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {onCopy && (
                                                    <DropdownMenuItem onClick={() => { onOpenChange(false); onCopy(detail.id); }}>
                                                        <Copy className="w-4 h-4 mr-2" /> 复制
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem variant="destructive" onClick={() => onDelete?.(detail.id)}>
                                                    <Trash2 className="w-4 h-4 mr-2" /> 删除
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Button variant="ghost" size="sm" className="h-8 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100" onClick={() => setIsFullScreen((v) => !v)}>
                                            {isFullScreen ? <Minimize2 className="w-4 h-4 mr-1" /> : <Maximize2 className="w-4 h-4 mr-1" />} {isFullScreen ? '退出全屏' : '全屏'}
                                        </Button>
                                    </div>
                                    <SheetTitle className="sr-only">【{detail.num}】{detail.title}</SheetTitle>
                                    <SheetDescription className="sr-only">缺陷详情</SheetDescription>
                                </SheetHeader>

                                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col gap-0 min-h-0 overflow-hidden">
                                    <TabsList className="mx-6 mt-2 justify-start bg-transparent border-b rounded-none h-auto p-0 gap-0 shrink-0">
                                        <TabsTrigger value="basicInfo" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:shadow-none px-4 pb-2">
                                            基本信息
                                        </TabsTrigger>
                                        <TabsTrigger value="detail" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:shadow-none px-4 pb-2">
                                            详情
                                        </TabsTrigger>
                                        <TabsTrigger value="case" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:shadow-none px-4 pb-2">
                                            用例
                                        </TabsTrigger>
                                        <TabsTrigger value="comment" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:shadow-none px-4 pb-2">
                                            评论
                                        </TabsTrigger>
                                        <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:shadow-none px-4 pb-2">
                                            变更历史
                                        </TabsTrigger>
                                    </TabsList>

                                    {/* 基本信息：处理人、状态(可点击)、严重程度、标签等 */}
                                    <TabsContent value="basicInfo" className="flex-1 min-h-0 overflow-y-auto m-0 mt-0">
                                        <div className="p-6 space-y-5">
                                            <div className="grid grid-cols-2 gap-4">
                                                <InfoItem icon={<User className="w-4 h-4" />} label="处理人">
                                                    <div className="w-[160px]">
                                                        <AppSelect
                                                            value={currentAssigneeValue}
                                                            onChange={(value) => {
                                                                const found = memberOptions.find((m) => m.id === value);
                                                                const name = found?.name ?? value;
                                                                handleAssigneeChange(value, name);
                                                            }}
                                                            options={memberOptions.map((m) => ({
                                                                value: m.id,
                                                                label: m.name,
                                                            }))}
                                                            placeholder="请选择"
                                                            disabled={assigneeUpdating}
                                                            allowClear={false}
                                                        />
                                                    </div>
                                                </InfoItem>
                                                <InfoItem icon={<AlertCircle className="w-4 h-4" />} label="状态">
                                                    <Select
                                                        value={currentStatusValue}
                                                        onOpenChange={(open) => {
                                                            setStatusDropdownOpen(open);
                                                            if (open) fetchValidStatuses();
                                                        }}
                                                        onValueChange={(value) => {
                                                            const label = statusOptionsForDrawer.find((o) => o.value === value)?.label ?? value;
                                                            handleStatusChange(value, label);
                                                        }}
                                                        disabled={statusUpdating}
                                                    >
                                                <SelectTrigger className="h-7 w-[120px] px-2 py-1 text-sm">
                                                            <SelectValue placeholder="请选择">
                                                                {currentStatusDisplay}
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {statusOptionsForDrawer.map((opt) => (
                                                                <SelectItem
                                                                    key={opt.value}
                                                                    value={opt.value}
                                                                    className="justify-center"
                                                                >
                                                                    <Badge
                                                                        className={cn(
                                                                            'border-0 font-normal w-full justify-center',
                                                                            getStatusColor(opt.label),
                                                                        )}
                                                                        variant="secondary"
                                                                    >
                                                                        {opt.label}
                                                                    </Badge>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </InfoItem>
                                                <InfoItem icon={<AlertCircle className="w-4 h-4" />} label="严重程度">
                                                    <Select
                                                        value={currentSeverityValue}
                                                        onValueChange={(value) => {
                                                            const label = BUG_PRIORITY_OPTIONS.find((o) => o.value === value)?.label ?? value;
                                                            handleSeverityChange(value, label);
                                                        }}
                                                        disabled={severityUpdating}
                                                    >
                                                        <SelectTrigger className="h-7 w-[100px] px-2 py-1 text-sm">
                                                            <SelectValue placeholder="请选择">
                                                                <Badge className={getPriorityColor(currentSeverityValue)}>{currentSeverityDisplay}</Badge>
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {BUG_PRIORITY_OPTIONS.map((opt) => (
                                                                <SelectItem key={opt.value} value={opt.value}>
                                                                    {opt.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </InfoItem>
                                                <InfoItem icon={<Tag className="w-4 h-4" />} label="标签">
                                                    {detail.tags && detail.tags.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {detail.tags.map((t) => (
                                                                <Badge key={t} variant="secondary" className="text-xs font-normal">{t}</Badge>
                                                            ))}
                                                        </div>
                                                    ) : '-'}
                                                </InfoItem>
                                                <InfoItem icon={<User className="w-4 h-4" />} label="创建人">
                                                    {detail.createUserName || detail.createUser || '-'}
                                                </InfoItem>
                                                <InfoItem icon={<Clock className="w-4 h-4" />} label="创建时间">
                                                    {formatTime(detail.createdAt)}
                                                </InfoItem>
                                                <InfoItem icon={<Clock className="w-4 h-4" />} label="更新时间">
                                                    {formatTime(detail.updatedAt)}
                                                </InfoItem>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* 详情：缺陷内容 + 内容编辑入口 + 附件 */}
                                    <TabsContent value="detail" className="flex-1 min-h-0 overflow-y-auto m-0 mt-0">
                                        <div className="p-6 space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-medium text-gray-900">缺陷内容</h3>
                                            </div>
                                            {isEditingDescription ? (
                                                <div className="rounded-lg border border-primary/60 bg-white shadow-sm">
                                                    <RichTextEditor
                                                        value={editingDescription}
                                                        onChange={handleDescriptionChange}
                                                        placeholder="待填"
                                                        minHeight="200px"
                                                        className="bg-transparent"
                                                        uploadImage={uploadDescriptionImage}
                                                    />
                                                </div>
                                            ) : (
                                                <div
                                                    className={cn(
                                                        'text-sm bg-gray-50 rounded-lg p-4 prose prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed cursor-text transition-colors',
                                                        'prose-img:cursor-zoom-in',
                                                        editingDescription ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400',
                                                    )}
                                                    style={{ minHeight: '200px' }}
                                                    onClick={(e) => {
                                                        const target = e.target as HTMLElement | null;
                                                        if (target && target.tagName === 'IMG') {
                                                            const img = target as HTMLImageElement;
                                                            if (img.src) {
                                                                setPreviewImageUrl(img.src);
                                                                return;
                                                            }
                                                        }
                                                        setIsEditingDescription(true);
                                                    }}
                                                    dangerouslySetInnerHTML={{
                                                        __html: editingDescription
                                                            ? commentContentWithImageBase(editingDescription)
                                                            : '<p>点击编辑缺陷内容，支持富文本与图片</p>',
                                                    }}
                                                />
                                            )}
                                            <Separator />
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-900 mb-2">添加附件</h3>
                                                <p className="text-xs text-gray-500 mb-3">支持任意类型文件，文件大小不超过 50MB</p>
                                                {detail.attachments && detail.attachments.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {detail.attachments.map((att: any, i: number) => (
                                                            <button
                                                                key={i}
                                                                type="button"
                                                                onClick={() => handleDownloadAttachment(att)}
                                                                className="flex items-center gap-2 w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded text-sm text-left transition-colors"
                                                            >
                                                                <Download className="w-4 h-4 text-gray-500 shrink-0" />
                                                                <span className="truncate text-gray-700">{att.fileName || att.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-400">暂无附件</p>
                                                )}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="case" className="flex-1 min-h-0 overflow-y-auto m-0 mt-0">
                                        <div className="p-6">
                                            <div className="flex items-center justify-between gap-4 mb-4">
                                                <Button
                                                    onClick={() => setAssociateCaseOpen(true)}
                                                    disabled={!detail?.id || !detail?.projectId}
                                                >
                                                    关联用例
                                                </Button>
                                                <Input
                                                    placeholder="通过 ID/名称搜索"
                                                    className="max-w-[240px]"
                                                    disabled
                                                />
                                            </div>
                                            {caseLoading ? (
                                                <div className="flex items-center justify-center py-12">
                                                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                                                </div>
                                            ) : caseList.length === 0 ? (
                                                <div className="text-center text-gray-400 py-12">
                                                    <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                                                    <p>
                                                        暂无数据，请
                                                        <button
                                                            type="button"
                                                            className="text-primary hover:underline ml-1"
                                                            onClick={() => setAssociateCaseOpen(true)}
                                                        >
                                                            关联用例
                                                        </button>
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {caseList.map((item: any) => (
                                                        <div key={item.relateId || item.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded text-sm">
                                                            <div className="min-w-0 flex-1">
                                                                <span className="font-medium text-gray-900">{item.relateCaseNum ?? item.relateCaseId}</span>
                                                                <span className="text-gray-600 ml-2 truncate block">{item.relateCaseName}</span>
                                                                {item.relateCaseTypeName && (
                                                                    <Badge variant="secondary" className="text-xs mt-1">{item.relateCaseTypeName}</Badge>
                                                                )}
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-gray-500 hover:text-red-600 shrink-0"
                                                                onClick={() => {
                                                                    bugManagementService.cancelAssociation(item.relateId).then(() => {
                                                                        setCaseList((prev) => prev.filter((c: any) => (c.relateId || c.id) !== (item.relateId || item.id)));
                                                                        toast.success('已取消关联');
                                                                    }).catch(() => toast.error('取消失败'));
                                                                }}
                                                            >
                                                                取消关联
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>

                                    {/* 评论：列表 + 底部输入 */}
                                    <TabsContent value="comment" className="flex-1 min-h-0 flex flex-col overflow-hidden m-0 mt-0">
                                        <div className="flex-1 overflow-auto p-6">
                                            {commentLoading ? (
                                                <div className="flex items-center justify-center py-12">
                                                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                                                </div>
                                            ) : commentList.length === 0 && feishuCommentList.length === 0 ? (
                                                <div className="text-center text-gray-400 py-12">
                                                    <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                                                    <p>暂无数据</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {feishuCommentList.length > 0 && (
                                                        <div className="space-y-3">
                                                            <div className="text-xs font-medium text-gray-500">飞书评论</div>
                                                            <ul className="space-y-4">
                                                                {feishuCommentList.map((c: any, i: number) => {
                                                                    const authorName = c.operatorName || c.operator || '飞书';
                                                                    return (
                                                                        <li key={c.id ?? `feishu-${i}`} className="flex gap-3">
                                                                            <div className="w-8 h-8 rounded-full bg-sky-100 shrink-0 flex items-center justify-center text-sky-600 text-xs">
                                                                                {(authorName || '飞').slice(0, 1)}
                                                                            </div>
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="text-sm text-gray-500 mb-0.5">
                                                                                    {authorName} · {formatTime(c.createdAt)}
                                                                                </div>
                                                                                <div
                                                                                    className="text-sm text-gray-800 whitespace-pre-wrap break-words [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded [&_img]:cursor-pointer"
                                                                                    dangerouslySetInnerHTML={{
                                                                                        __html: commentContentWithImageBase(c.contentHtml || '-'),
                                                                                    }}
                                                                                    onClick={(e) => {
                                                                                        const el = e.target as HTMLElement;
                                                                                        if (el.tagName === 'IMG') setPreviewImageUrl((el as HTMLImageElement).src);
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {commentList.length > 0 && (
                                                        <div className="space-y-3">
                                                            <div className="text-xs font-medium text-gray-500">本系统评论</div>
                                                            <ul className="space-y-4">
                                                                {commentList.map((c: any, i: number) => {
                                                                    const authorName = c.createUserName ?? c.commentUserInfos?.[0]?.name ?? c.createUser ?? '-';
                                                                    return (
                                                                        <li key={c.id ?? i} className="flex gap-3">
                                                                            <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0 flex items-center justify-center text-gray-500 text-xs">
                                                                                {(authorName === '-' || !authorName ? '?' : authorName).slice(0, 1)}
                                                                            </div>
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="text-sm text-gray-500 mb-0.5">
                                                                                    {authorName} · {formatTime(c.createdAt)}
                                                                                </div>
                                                                                <div
                                                                                    className="text-sm text-gray-800 whitespace-pre-wrap break-words [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded [&_img]:cursor-pointer"
                                                                                    dangerouslySetInnerHTML={
                                                                                        c.content && /<img/i.test(c.content)
                                                                                            ? { __html: commentContentWithImageBase(c.content) }
                                                                                            : undefined
                                                                                    }
                                                                                    onClick={(e) => {
                                                                                        const el = e.target as HTMLElement;
                                                                                        if (el.tagName === 'IMG') setPreviewImageUrl((el as HTMLImageElement).src);
                                                                                    }}
                                                                                >
                                                                                    {c.content && !/<img/i.test(c.content) ? c.content : !c.content ? '-' : null}
                                                                                </div>
                                                                            </div>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="border-t p-4 bg-gray-50/50">
                                            {commentImageIds.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {commentImageIds.map((id) => (
                                                        <span key={id} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                            已粘贴图片
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex gap-2">
                                                <Textarea
                                                    placeholder="请输入评论，支持直接粘贴截图（Ctrl+V / ⌘+V），⌘ + Enter 发送"
                                                    value={commentContent}
                                                    onChange={(e) => setCommentContent(e.target.value)}
                                                    onPaste={handleCommentPaste}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                            e.preventDefault();
                                                            handleCommentSubmit();
                                                        }
                                                    }}
                                                    className="min-h-[80px] resize-none flex-1"
                                                    disabled={commentSubmitting}
                                                />
                                                <Button
                                                    onClick={handleCommentSubmit}
                                                    disabled={commentSubmitting || (!commentContent.trim() && commentImageIds.length === 0)}
                                                    className="shrink-0"
                                                >
                                                    {commentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '发送'}
                                                </Button>
                                            </div>
                                            {commentImageUploading && (
                                                <p className="text-xs text-gray-500 mt-1.5">正在上传图片…</p>
                                            )}
                                        </div>
                                    </TabsContent>

                                    {/* 变更历史 */}
                                    <TabsContent value="history" className="flex-1 min-h-0 overflow-y-auto m-0 mt-0">
                                        <div className="p-6">
                                            {historyLoading ? (
                                                <div className="flex items-center justify-center py-12">
                                                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                                                </div>
                                            ) : historyList.length === 0 ? (
                                                <div className="text-center text-gray-400 py-12">
                                                    <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                                                    <p>暂无变更历史</p>
                                                </div>
                                            ) : (
                                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                    <table className="w-full">
                                                        <thead className="bg-gray-50 border-b border-gray-200">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 w-[25%]">变更序号</th>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 w-[15%]">操作</th>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 w-[25%]">操作人</th>
                                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">更新时间</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {historyList.map((item: any, index: number) => (
                                                                <tr
                                                                    key={item.id ?? index}
                                                                    className={cn(
                                                                        "bg-white hover:bg-gray-50 transition-colors",
                                                                        index !== historyList.length - 1 && "border-b border-gray-200"
                                                                    )}
                                                                >
                                                                    <td className="px-4 py-3 text-sm">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-gray-900">{item.id ?? '-'}</span>
                                                                            {item.latest && (
                                                                                <Badge variant="secondary" className="text-xs">当前</Badge>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-700">
                                                                        {item.type ?? '-'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-700">
                                                                        {item.createUserName ?? item.createUser ?? '-'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                                        {formatTime(item.createdAt)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </>
                        ) : (
                            <>
                                <SheetTitle className="sr-only">缺陷详情</SheetTitle>
                                <SheetDescription className="sr-only">加载失败</SheetDescription>
                                <div className="flex-1 flex items-center justify-center text-gray-400">
                                    无法加载缺陷详情
                                </div>
                            </>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
            {detail && (
                <AssociateCaseDialog
                    open={associateCaseOpen}
                    onOpenChange={setAssociateCaseOpen}
                    bugId={detail.id}
                    defaultProjectId={detail.projectId ?? ''}
                    associatedIds={caseList.map((c: any) => c.relateCaseId ?? c.caseId ?? c.id).filter(Boolean)}
                    onSuccess={loadCaseList}
                />
            )}
            <Dialog open={!!previewImageUrl} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
                <DialogContent
                    className="!w-[94vw] !h-[94vh] !max-w-[94vw] !max-h-[94vh] sm:!max-w-[94vw] p-2 overflow-hidden flex flex-col"
                    onPointerDownOutside={() => setPreviewImageUrl(null)}
                >
                    {previewImageUrl && (
                        <div className="flex-1 min-h-0 flex items-center justify-center overflow-auto">
                            <div
                                className="flex items-center justify-center min-w-full min-h-full select-none"
                                style={{
                                    transform: `translate(${previewImageTranslate.x}px, ${previewImageTranslate.y}px) scale(${previewImageScale})`,
                                    transformOrigin: 'center center',
                                    cursor: previewDragging ? 'grabbing' : 'grab',
                                }}
                                onMouseDown={(e) => {
                                    if (e.button !== 0) return;
                                    e.preventDefault();
                                    previewDragRef.current = {
                                        isDragging: true,
                                        startX: e.clientX,
                                        startY: e.clientY,
                                        startTx: previewImageTranslate.x,
                                        startTy: previewImageTranslate.y,
                                    };
                                    setPreviewDragging(true);
                                }}
                            >
                                <img
                                    data-preview-image="true"
                                    src={previewImageUrl}
                                    alt="评论图片预览"
                                    className="max-w-full max-h-full object-contain"
                                    draggable={false}
                                />
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Fragment>
    );
}

function InfoItem({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
    return (
        <div className="flex items-start gap-2">
            <span className="text-gray-400 mt-0.5">{icon}</span>
            <div>
                <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                <div className="text-sm text-gray-900">{children}</div>
            </div>
        </div>
    );
}
