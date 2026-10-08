/**
 * 系统设置-系统参数（迁移自 AegisOne 系统参数/基础配置）
 * Tab：基础配置 | 邮件配置 | 内存清理
 */
import { useState, useEffect, useCallback } from 'react';
import { Pencil, Send, Plus, Search, Trash2, ShieldCheck, Info } from 'lucide-react';
import '@/assets/icon-font/iconfont-lark.css';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { systemParameterService } from '@/services/setting/parameter';
import type { BaseConfig, EmailConfig, CleanupConfig, PageConfig, AuthItem, QrCodeItem, ModelConfigItem } from '@/types/setting/parameter';

export function SystemParameterView() {
  const [tab, setTab] = useState<'base' | 'email' | 'page' | 'auth' | 'qrCode' | 'model' | 'cleanup'>('base');

  const [baseInfo, setBaseInfo] = useState<BaseConfig>({});
  const [baseLoading, setBaseLoading] = useState(false);
  const [baseModalOpen, setBaseModalOpen] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [baseSubmitting, setBaseSubmitting] = useState(false);

  const [fileSizeLimit, setFileSizeLimit] = useState<number>(50);
  const [fileSizeLoading, setFileSizeLoading] = useState(false);

  const [emailInfo, setEmailInfo] = useState<EmailConfig>({});
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    host: '',
    port: '',
    account: '',
    password: '',
    from: '',
    recipient: '',
    ssl: false,
    tsl: false,
  });
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailTestLoading, setEmailTestLoading] = useState(false);

  const [cleanupConfig, setCleanupConfig] = useState<CleanupConfig>({});
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupForm, setCleanupForm] = useState({ operationLog: '', operationHistory: '' });
  const [cleanupSubmitting, setCleanupSubmitting] = useState(false);

  // 页面配置
  const [pageConfig, setPageConfig] = useState<PageConfig>({});
  const [pageLoading, setPageLoading] = useState(false);
  const [pageForm, setPageForm] = useState({
    theme: 'default',
    customTheme: '#1890ff',
    style: 'default',
    customStyle: '#1890ff',
    title: '',
    slogan: '',
    platformName: '',
    helpDoc: '',
  });
  const [pageSubmitting, setPageSubmitting] = useState(false);

  // 认证配置
  const [authList, setAuthList] = useState<AuthItem[]>([]);
  const [authLoading, setAuthLoading] = useState(false);
  const [authPage, setAuthPage] = useState(1);
  const [authTotal, setAuthTotal] = useState(0);
  const [authKeyword, setAuthKeyword] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authEditItem, setAuthEditItem] = useState<AuthItem | null>(null);
  const [authForm, setAuthForm] = useState({
    name: '',
    type: 'LDAP',
    description: '',
    enable: true,
    configuration: {} as Record<string, any>,
  });
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // 二维码配置（与 aegis-next-server 一致）
  const [qrCodeList, setQrCodeList] = useState<QrCodeItem[]>([]);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [qrCodeModalOpen, setQrCodeModalOpen] = useState(false);
  const [selectedQrPlatform, setSelectedQrPlatform] = useState<QrCodeItem | null>(null);
  const [qrCodeForm, setQrCodeForm] = useState<{ agentId: string; appSecret: string; callBack?: string; enable: boolean }>({
    agentId: '',
    appSecret: '',
    callBack: '',
    enable: false,
  });
  const [qrCodeSubmitting, setQrCodeSubmitting] = useState(false);
  const [qrCodeValidateLoading, setQrCodeValidateLoading] = useState(false);

  // AI模型配置
  const [modelList, setModelList] = useState<ModelConfigItem[]>([]);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelPage, setModelPage] = useState(1);
  const [modelTotal, setModelTotal] = useState(0);
  const [modelKeyword, setModelKeyword] = useState('');
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [modelEditItem, setModelEditItem] = useState<ModelConfigItem | null>(null);
  const [modelForm, setModelForm] = useState({
    name: '',
    model: '',
    baseUrl: '',
    apiKey: '',
    enable: true,
    description: '',
  });
  const [modelSubmitting, setModelSubmitting] = useState(false);
  const [authDeleteConfirm, setAuthDeleteConfirm] = useState<AuthItem | null>(null);
  const [modelDeleteConfirm, setModelDeleteConfirm] = useState<ModelConfigItem | null>(null);

  const loadBaseInfo = useCallback(async () => {
    setBaseLoading(true);
    try {
      const res = await systemParameterService.getBaseInfo();
      setBaseInfo(res);
      setBaseUrl(res?.url ?? '');
      const size = res?.fileMaxSize ? parseInt(res.fileMaxSize, 10) : 50;
      if (!Number.isNaN(size)) setFileSizeLimit(size);
    } catch (e) {
      toast.error('加载基础信息失败');
    } finally {
      setBaseLoading(false);
    }
  }, []);

  const loadEmailInfo = useCallback(async () => {
    setEmailLoading(true);
    try {
      const res = await systemParameterService.getEmailInfo();
      setEmailInfo(res);
      setEmailForm({
        host: res?.host ?? '',
        port: res?.port ?? '',
        account: res?.account ?? '',
        password: res?.password ?? '',
        from: res?.from ?? '',
        recipient: res?.recipient ?? '',
        ssl: res?.ssl === 'true',
        tsl: res?.tsl === 'true',
      });
    } catch (e) {
      toast.error('加载邮件配置失败');
    } finally {
      setEmailLoading(false);
    }
  }, []);

  const loadCleanupConfig = useCallback(async () => {
    setCleanupLoading(true);
    try {
      const res = await systemParameterService.getCleanupConfig();
      setCleanupConfig(res);
      setCleanupForm({
        operationLog: res?.operationLog ?? '',
        operationHistory: res?.operationHistory ?? '',
      });
    } catch (e) {
      toast.error('加载内存清理配置失败');
    } finally {
      setCleanupLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBaseInfo();
  }, [loadBaseInfo]);
  useEffect(() => {
    if (tab === 'email') loadEmailInfo();
  }, [tab, loadEmailInfo]);
  useEffect(() => {
    if (tab === 'cleanup') loadCleanupConfig();
  }, [tab, loadCleanupConfig]);

  const loadPageConfig = useCallback(async () => {
    setPageLoading(true);
    try {
      const res = await systemParameterService.getPageConfig();
      setPageConfig(res);
      setPageForm({
        theme: res?.theme ?? 'default',
        customTheme: res?.customTheme ?? '#1890ff',
        style: res?.style ?? 'default',
        customStyle: res?.customStyle ?? '#1890ff',
        title: res?.title ?? '',
        slogan: res?.slogan ?? '',
        platformName: res?.platformName ?? '',
        helpDoc: res?.helpDoc ?? '',
      });
    } catch (e) {
      toast.error('加载页面配置失败');
    } finally {
      setPageLoading(false);
    }
  }, []);

  const loadAuthList = useCallback(async () => {
    setAuthLoading(true);
    try {
      const res = await systemParameterService.getAuthList({
        current: authPage,
        pageSize: 10,
        keyword: authKeyword || undefined,
      });
      setAuthList(res.list ?? []);
      setAuthTotal(res.total ?? 0);
    } catch (e) {
      toast.error('加载认证配置列表失败');
      setAuthList([]);
      setAuthTotal(0);
    } finally {
      setAuthLoading(false);
    }
  }, [authPage, authKeyword]);

  const loadQrCodeList = useCallback(async () => {
    setQrCodeLoading(true);
    try {
      const res = await systemParameterService.getQrCodeList();
      setQrCodeList(res);
    } catch (e) {
      toast.error('加载二维码配置失败');
      setQrCodeList([]);
    } finally {
      setQrCodeLoading(false);
    }
  }, []);

  /** 打开飞书配置弹窗时加载当前配置 */
  const loadLarkInfoForModal = useCallback(async () => {
    try {
      const config = await systemParameterService.getLarkInfo();
      setQrCodeForm({
        agentId: config.agentId ?? '',
        appSecret: config.appSecret ?? '',
        callBack: config.callBack ?? '',
        enable: config.enable ?? false,
      });
    } catch {
      setQrCodeForm({ agentId: '', appSecret: '', callBack: '', enable: false });
    }
  }, []);

  /** 列表上切换启用状态 */
  const handleQrCodeEnableChange = useCallback(async (key: string, enable: boolean) => {
    if (key !== 'LARK') return;
    setQrCodeLoading(true);
    try {
      await systemParameterService.enableLark({ enable });
      toast.success(enable ? '已开启' : '已关闭');
      loadQrCodeList();
    } catch (e) {
      toast.error('操作失败');
    } finally {
      setQrCodeLoading(false);
    }
  }, [loadQrCodeList]);

  /** 列表上「测试链接」 */
  const handleQrCodeTestLink = useCallback(async (key: string) => {
    if (key !== 'LARK') return;
    setQrCodeLoading(true);
    try {
      const config = await systemParameterService.getLarkInfo();
      await systemParameterService.validateLarkConfig(config);
      toast.success('测试链接成功');
      loadQrCodeList();
    } catch (e) {
      try {
        await systemParameterService.closeValidateLark();
      } catch { /* ignore */ }
      toast.error('测试链接失败');
      loadQrCodeList();
    } finally {
      setQrCodeLoading(false);
    }
  }, [loadQrCodeList]);

  const loadModelList = useCallback(async () => {
    setModelLoading(true);
    try {
      const res = await systemParameterService.getModelConfigList({
        current: modelPage,
        pageSize: 10,
        keyword: modelKeyword || undefined,
      });
      setModelList(res.list ?? []);
      setModelTotal(res.total ?? 0);
    } catch (e) {
      toast.error('加载模型配置列表失败');
      setModelList([]);
      setModelTotal(0);
    } finally {
      setModelLoading(false);
    }
  }, [modelPage, modelKeyword]);

  useEffect(() => {
    if (tab === 'page') loadPageConfig();
  }, [tab, loadPageConfig]);
  useEffect(() => {
    if (tab === 'auth') loadAuthList();
  }, [tab, loadAuthList]);
  useEffect(() => {
    if (tab === 'qrCode') loadQrCodeList();
  }, [tab, loadQrCodeList]);
  useEffect(() => {
    if (qrCodeModalOpen && selectedQrPlatform?.key === 'LARK') loadLarkInfoForModal();
  }, [qrCodeModalOpen, selectedQrPlatform?.key, loadLarkInfoForModal]);
  useEffect(() => {
    if (tab === 'model') loadModelList();
  }, [tab, loadModelList]);

  const handleSaveBaseUrl = async () => {
    const url = baseUrl.trim();
    if (!url) {
      toast.error('请输入页面地址');
      return;
    }
    setBaseSubmitting(true);
    try {
      await systemParameterService.saveBaseInfo([
        { paramKey: 'base.url', paramValue: url, type: 'text' },
      ]);
      toast.success('保存成功');
      setBaseModalOpen(false);
      loadBaseInfo();
    } catch (e) {
      toast.error('保存失败');
    } finally {
      setBaseSubmitting(false);
    }
  };

  const handleSaveFileSize = async () => {
    const value = Math.min(1024, Math.max(0, fileSizeLimit));
    setFileSizeLimit(value);
    setFileSizeLoading(true);
    try {
      await systemParameterService.saveUploadConfig([
        { paramKey: 'upload.file.size', paramValue: String(value), type: 'text' },
      ]);
      toast.success('保存成功');
      loadBaseInfo();
    } catch (e) {
      toast.error('保存失败');
    } finally {
      setFileSizeLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    const { host, port, account, password, from, recipient, ssl, tsl } = emailForm;
    if (!host?.trim() || !port?.trim() || !account?.trim()) {
      toast.error('请填写主机、端口、账户');
      return;
    }
    setEmailSubmitting(true);
    try {
      await systemParameterService.saveEmailInfo([
        { paramKey: 'smtp.host', paramValue: host, type: 'text' },
        { paramKey: 'smtp.port', paramValue: port, type: 'text' },
        { paramKey: 'smtp.account', paramValue: account, type: 'text' },
        { paramKey: 'smtp.password', paramValue: password ?? '', type: 'password' },
        { paramKey: 'smtp.from', paramValue: from ?? '', type: 'text' },
        { paramKey: 'smtp.recipient', paramValue: recipient ?? '', type: 'text' },
        { paramKey: 'smtp.ssl', paramValue: String(ssl), type: 'text' },
        { paramKey: 'smtp.tsl', paramValue: String(tsl), type: 'text' },
      ]);
      toast.success('保存成功');
      setEmailModalOpen(false);
      loadEmailInfo();
    } catch (e) {
      toast.error('保存失败');
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleTestEmail = async () => {
    const { host, port, account, password, from, recipient, ssl, tsl } = emailForm;
    if (!host?.trim() || !port?.trim() || !account?.trim()) {
      toast.error('请先填写主机、端口、账户后再测试');
      return;
    }
    setEmailTestLoading(true);
    try {
      await systemParameterService.testEmail({
        'smtp.host': host,
        'smtp.port': port,
        'smtp.account': account,
        'smtp.password': password ?? '',
        'smtp.from': from ?? '',
        'smtp.recipient': recipient ?? '',
        'smtp.ssl': String(ssl),
        'smtp.tsl': String(tsl),
      });
      toast.success('邮件连接测试成功');
    } catch (e) {
      toast.error('邮件连接测试失败');
    } finally {
      setEmailTestLoading(false);
    }
  };

  const handleSaveCleanup = async () => {
    setCleanupSubmitting(true);
    try {
      await systemParameterService.saveCleanupConfig([
        { paramKey: 'cleanConfig.operation.log', paramValue: cleanupForm.operationLog, type: 'string' },
        { paramKey: 'cleanConfig.operation.history', paramValue: cleanupForm.operationHistory, type: 'string' },
      ]);
      toast.success('保存成功');
      loadCleanupConfig();
    } catch (e) {
      toast.error('保存失败');
    } finally {
      setCleanupSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'base' | 'email' | 'page' | 'auth' | 'qrCode' | 'model' | 'cleanup')} className="space-y-6">
        <TabsList className="bg-gray-100/60 border border-gray-200/50 rounded-xl p-1 gap-1 h-auto flex-wrap justify-start">
          <TabsTrigger value="base" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 transition-all">基础配置</TabsTrigger>
          <TabsTrigger value="email" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 transition-all">邮件配置</TabsTrigger>
          <TabsTrigger value="auth" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 transition-all">认证配置</TabsTrigger>
          <TabsTrigger value="qrCode" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 transition-all">二维码配置</TabsTrigger>
          <TabsTrigger value="cleanup" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 transition-all">内存清理</TabsTrigger>
        </TabsList>

        <TabsContent value="base" className="mt-6 space-y-6">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-gray-100/80 bg-gray-50/30">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold text-gray-900">基本信息</CardTitle>
                  <CardDescription className="text-xs mt-0.5">配置系统基础访问地址</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 h-8 shadow-sm border-gray-200 bg-white" onClick={() => { setBaseUrl(baseInfo?.url ?? ''); setBaseModalOpen(true); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" /> 修改
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              {baseLoading ? (
                <p className="text-sm text-muted-foreground">加载中...</p>
              ) : (
                <dl className="grid grid-cols-1 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">页面地址</dt>
                    <dd className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm text-gray-900 font-medium break-all">{baseInfo?.url ?? '-'}</dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-gray-100/80 bg-gray-50/30">
              <CardTitle className="text-base font-semibold text-gray-900">文件上传大小限制</CardTitle>
              <CardDescription className="text-xs mt-0.5">单文件上传最大体积，范围 0-1024 MB</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={1024}
                  value={fileSizeLimit}
                  onChange={(e) => setFileSizeLimit(parseInt(e.target.value, 10) || 0)}
                  onBlur={handleSaveFileSize}
                  disabled={fileSizeLoading}
                  className="w-28 h-9 rounded-lg border-gray-200"
                />
                <span className="text-sm text-muted-foreground">MB</span>
                {fileSizeLoading && <span className="text-sm text-muted-foreground">保存中...</span>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-gray-100/80 bg-gray-50/30">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold text-gray-900">邮件配置</CardTitle>
                  <CardDescription className="text-xs mt-0.5">配置 SMTP 邮件服务器信息</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 h-8 shadow-sm border-gray-200 bg-white" onClick={() => {
                  setEmailForm({
                    host: emailInfo?.host ?? '',
                    port: emailInfo?.port ?? '',
                    account: emailInfo?.account ?? '',
                    password: emailInfo?.password ?? '',
                    from: emailInfo?.from ?? '',
                    recipient: emailInfo?.recipient ?? '',
                    ssl: emailInfo?.ssl === 'true',
                    tsl: emailInfo?.tsl === 'true',
                  }); setEmailModalOpen(true);
                }}>
                  <Pencil className="h-4 w-4 mr-1" /> 修改
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              {emailLoading ? (
                <p className="text-sm text-muted-foreground">加载中...</p>
              ) : (
                <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">SMTP 主机</dt>
                    <dd className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-gray-900 font-medium">{emailInfo?.host ?? '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">端口</dt>
                    <dd className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-gray-900 font-medium">{emailInfo?.port ?? '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">账户</dt>
                    <dd className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-gray-900 font-medium">{emailInfo?.account ?? '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">密码</dt>
                    <dd className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-gray-900 font-medium">{emailInfo?.password ? '••••••••' : '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">发件人</dt>
                    <dd className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-gray-900 font-medium">{emailInfo?.from ?? '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-1">收件人</dt>
                    <dd className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-gray-900 font-medium">{emailInfo?.recipient ?? '-'}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-sm font-medium text-gray-500 mb-1">SSL / TLS</dt>
                    <dd className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                      <span className={emailInfo?.ssl === 'true' ? 'text-green-600 font-medium' : 'text-gray-500'}>
                        {emailInfo?.ssl === 'true' ? 'SSL 开启' : 'SSL 关闭'}
                      </span>
                      <span className="text-gray-300 mx-2">/</span>
                      <span className={emailInfo?.tsl === 'true' ? 'text-green-600 font-medium' : 'text-gray-500'}>
                        {emailInfo?.tsl === 'true' ? 'TLS 开启' : 'TLS 关闭'}
                      </span>
                    </dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cleanup" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-gray-100/80 bg-gray-50/30">
              <CardTitle className="text-base font-semibold text-gray-900">内存清理配置</CardTitle>
              <CardDescription className="text-xs mt-0.5">配置操作日志和历史记录的保留策略</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              {cleanupLoading ? (
                <p className="text-sm text-muted-foreground">加载中...</p>
              ) : (
                <div className="max-w-md space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">操作日志保留时间</Label>
                    <Input
                      value={cleanupForm.operationLog}
                      onChange={(e) => setCleanupForm((p) => ({ ...p, operationLog: e.target.value }))}
                      placeholder="如 6M（6个月）、30D（30天）"
                      className="rounded-lg border-gray-200 h-9"
                    />
                    <p className="text-xs text-muted-foreground">格式：数字+单位（M=月，D=天，H=小时）</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">操作历史保留条数</Label>
                    <Input
                      type="number"
                      value={cleanupForm.operationHistory}
                      onChange={(e) => setCleanupForm((p) => ({ ...p, operationHistory: e.target.value }))}
                      placeholder="如 10"
                      className="rounded-lg border-gray-200 h-9"
                    />
                    <p className="text-xs text-muted-foreground">保留最近 N 条操作历史记录</p>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleSaveCleanup} disabled={cleanupSubmitting} className="bg-blue-600 hover:bg-blue-700">
                      {cleanupSubmitting ? '保存中...' : '保存'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="page" className="mt-6 space-y-6">
          {/* 主题和风格配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">主题和风格</CardTitle>
              <CardDescription>配置系统主题色和平台风格</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {pageLoading ? (
                <p className="text-sm text-muted-foreground">加载中...</p>
              ) : (
                <>
                  <div className="space-y-3">
                    <Label>主题色</Label>
                    <RadioGroup value={pageForm.theme} onValueChange={(v) => setPageForm((p) => ({ ...p, theme: v }))}>
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="default" id="theme-default" />
                          <label htmlFor="theme-default" className="text-sm cursor-pointer">默认</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="custom" id="theme-custom" />
                          <label htmlFor="theme-custom" className="text-sm cursor-pointer">自定义</label>
                        </div>
                      </div>
                    </RadioGroup>
                    {pageForm.theme === 'custom' && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={pageForm.customTheme}
                          onChange={(e) => setPageForm((p) => ({ ...p, customTheme: e.target.value }))}
                          className="w-20 h-10"
                        />
                        <Input
                          value={pageForm.customTheme}
                          onChange={(e) => setPageForm((p) => ({ ...p, customTheme: e.target.value }))}
                          placeholder="#1890ff"
                          className="w-32"
                        />
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <Label>平台风格</Label>
                    <RadioGroup value={pageForm.style} onValueChange={(v) => setPageForm((p) => ({ ...p, style: v }))}>
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="default" id="style-default" />
                          <label htmlFor="style-default" className="text-sm cursor-pointer">默认</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="follow" id="style-follow" />
                          <label htmlFor="style-follow" className="text-sm cursor-pointer">跟随主题</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="custom" id="style-custom" />
                          <label htmlFor="style-custom" className="text-sm cursor-pointer">自定义</label>
                        </div>
                      </div>
                    </RadioGroup>
                    {pageForm.style === 'custom' && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={pageForm.customStyle}
                          onChange={(e) => setPageForm((p) => ({ ...p, customStyle: e.target.value }))}
                          className="w-20 h-10"
                        />
                        <Input
                          value={pageForm.customStyle}
                          onChange={(e) => setPageForm((p) => ({ ...p, customStyle: e.target.value }))}
                          placeholder="#1890ff"
                          className="w-32"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 登录页配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">登录页配置</CardTitle>
              <CardDescription>配置登录页显示内容</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pageLoading ? (
                <p className="text-sm text-muted-foreground">加载中...</p>
              ) : (
                <>
                  <div>
                    <Label>登录页标语 *</Label>
                    <Input
                      value={pageForm.slogan}
                      onChange={(e) => setPageForm((p) => ({ ...p, slogan: e.target.value }))}
                      placeholder="请输入登录页标语"
                      className="mt-1"
                      maxLength={255}
                    />
                    <p className="text-xs text-muted-foreground mt-1">显示在登录页的标语文字</p>
                  </div>
                  <div>
                    <Label>页面标题</Label>
                    <Input
                      value={pageForm.title}
                      onChange={(e) => setPageForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="请输入页面标题"
                      className="mt-1"
                      maxLength={255}
                    />
                    <p className="text-xs text-muted-foreground mt-1">浏览器标签页显示的标题</p>
                  </div>
                  <div>
                    <Label>图标上传</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // TODO: 处理文件上传
                          toast.info('图标上传功能开发中');
                        }
                      }}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">支持 PNG、SVG 格式，建议尺寸 18x18px，最大 200KB</p>
                  </div>
                  <div>
                    <Label>登录 Logo 上传</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // TODO: 处理文件上传
                          toast.info('Logo 上传功能开发中');
                        }
                      }}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">支持 PNG、SVG 格式，建议尺寸适中，最大 200KB</p>
                  </div>
                  <div>
                    <Label>登录背景图上传</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // TODO: 处理文件上传
                          toast.info('背景图上传功能开发中');
                        }
                      }}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">支持 JPG、PNG 格式，建议尺寸 1920x1080px，最大 1MB</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 平台主页配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">平台主页配置</CardTitle>
              <CardDescription>配置平台主页显示内容</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pageLoading ? (
                <p className="text-sm text-muted-foreground">加载中...</p>
              ) : (
                <>
                  <div>
                    <Label>平台名称 *</Label>
                    <Input
                      value={pageForm.platformName}
                      onChange={(e) => setPageForm((p) => ({ ...p, platformName: e.target.value }))}
                      placeholder="请输入平台名称"
                      className="mt-1"
                      maxLength={255}
                    />
                    <p className="text-xs text-muted-foreground mt-1">显示在平台主页左上角的名称</p>
                  </div>
                  <div>
                    <Label>平台 Logo 上传</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // TODO: 处理文件上传
                          toast.info('平台 Logo 上传功能开发中');
                        }
                      }}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">支持 PNG、SVG 格式，建议尺寸适中，最大 200KB</p>
                  </div>
                  <div>
                    <Label>帮助文档地址</Label>
                    <Input
                      value={pageForm.helpDoc}
                      onChange={(e) => setPageForm((p) => ({ ...p, helpDoc: e.target.value }))}
                      placeholder="请输入帮助文档地址"
                      className="mt-1"
                      maxLength={255}
                    />
                    <p className="text-xs text-muted-foreground mt-1">帮助文档链接地址</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 保存按钮 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setPageForm({
                theme: 'default',
                customTheme: '#1890ff',
                style: 'default',
                customStyle: '#1890ff',
                title: '',
                slogan: '',
                platformName: '',
                helpDoc: '',
              });
              toast.info('已重置为默认值');
            }}>
              重置
            </Button>
            <Button onClick={async () => {
              if (!pageForm.slogan.trim() || !pageForm.platformName.trim()) {
                toast.error('请填写必填项（登录页标语、平台名称）');
                return;
              }
              setPageSubmitting(true);
              try {
                const formData = new FormData();
                formData.append('theme', pageForm.theme);
                formData.append('customTheme', pageForm.customTheme);
                formData.append('style', pageForm.style);
                formData.append('customStyle', pageForm.customStyle);
                formData.append('title', pageForm.title);
                formData.append('slogan', pageForm.slogan);
                formData.append('platformName', pageForm.platformName);
                formData.append('helpDoc', pageForm.helpDoc);
                await systemParameterService.savePageConfig(formData);
                toast.success('保存成功');
                loadPageConfig();
              } catch (e) {
                toast.error('保存失败');
              } finally {
                setPageSubmitting(false);
              }
            }} disabled={pageSubmitting}>
              {pageSubmitting ? '保存中...' : '保存'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="auth" className="mt-6 space-y-4">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">认证配置</CardTitle>
                  <CardDescription className="text-sm mt-0.5">管理 LDAP、OAuth2、CAS 等认证源</CardDescription>
                </div>
                <Button className="shrink-0 bg-blue-600 hover:bg-blue-700" onClick={() => {
                  setAuthEditItem(null);
                  setAuthForm({ name: '', type: 'LDAP', description: '', enable: true, configuration: {} });
                  setAuthModalOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" /> 添加认证源
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-4">
                <Input
                  placeholder="搜索认证源名称"
                  value={authKeyword}
                  onChange={(e) => setAuthKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadAuthList()}
                  className="w-52 rounded-lg border-gray-200 h-9"
                />
                <Button variant="outline" size="icon" onClick={loadAuthList}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                    <TableRow className="hover:bg-transparent border-none h-11">
                      <TableHead className="font-medium text-gray-500">名称</TableHead>
                      <TableHead className="font-medium text-gray-500">类型</TableHead>
                      <TableHead className="w-24 font-medium text-gray-500">状态</TableHead>
                      <TableHead className="font-medium text-gray-500">描述</TableHead>
                      <TableHead className="w-48 text-right font-medium text-gray-500">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody key={`auth-tbody-${authList.length}-${authList[0]?.id ?? ''}`}>
                    {authLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">加载中...</TableCell>
                      </TableRow>
                    ) : authList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">暂无认证源</TableCell>
                      </TableRow>
                    ) : (
                      authList.map((item, index) => (
                        <TableRow key={item.id || `auth-${index}`} className="group transition-colors [&_td]:transition-colors [&_td]:group-hover:bg-[#f2f3f5] border-b border-gray-100 h-11">
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.type}</TableCell>
                          <TableCell>
                            <Switch
                              checked={item.enable ?? false}
                              onCheckedChange={async (v) => {
                                if (!item.id) return;
                                try {
                                  await systemParameterService.updateAuthStatus(item.id, v);
                                  toast.success(v ? '已启用' : '已禁用');
                                  loadAuthList();
                                } catch (e) {
                                  toast.error('操作失败');
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={item.description}>{item.description ?? '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={async () => {
                              setAuthEditItem(item);
                              let config = {};
                              if (item.configuration) {
                                if (typeof item.configuration === 'string') {
                                  try {
                                    config = JSON.parse(item.configuration);
                                  } catch {
                                    config = {};
                                  }
                                } else {
                                  config = item.configuration;
                                }
                              }
                              setAuthForm({
                                name: item.name ?? '',
                                type: item.type ?? 'LDAP',
                                description: item.description ?? '',
                                enable: item.enable ?? true,
                                configuration: config,
                              });
                              setAuthModalOpen(true);
                            }}>
                              <Pencil className="h-3 w-3 mr-1" /> 编辑
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setAuthDeleteConfirm(item)}>
                              <Trash2 className="h-3 w-3 mr-1" /> 删除
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qrCode" className="mt-6 space-y-4">
          <Card className="border-none shadow-none bg-transparent">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">集成配置</h3>
                <p className="text-sm text-gray-500 mt-1">配置第三方平台集成，支持扫码登录与消息通知</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {qrCodeLoading ? (
                <div className="col-span-full flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-sm font-medium text-gray-400">正在加载集成列表...</p>
                  </div>
                </div>
              ) : qrCodeList.length === 0 ? (
                <div className="col-span-full bg-white border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center py-20 grayscale opacity-60">
                  <ShieldCheck className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-sm font-medium text-gray-400">暂无集成的平台</p>
                </div>
              ) : (
                qrCodeList.map((item) => (
                  <div
                    key={item.key}
                    className="group relative bg-white border border-gray-100 rounded-2xl p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-100 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-xl shadow-inner transition-transform duration-500 group-hover:scale-110',
                          item.key?.toUpperCase() === 'LARK' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'
                        )}>
                          {item.key?.toUpperCase() === 'LARK' ? (
                            <span className="iconfont icon-logo_lark text-[24px]" aria-hidden />
                          ) : (
                            <ShieldCheck className="h-6 w-6" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!item.valid ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="opacity-40 grayscale cursor-help">
                                    <Switch checked={!!item.enable} disabled />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-900 text-white border-none rounded-lg text-xs">
                                  请先完成配置并测试链接
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Switch
                              checked={!!item.enable}
                              onCheckedChange={(v) => handleQrCodeEnableChange(item.key, v)}
                              className="data-[state=checked]:bg-blue-600"
                            />
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900">{item.title}</h4>
                          {item.hasConfig ? (
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          ) : (
                            <span className="flex h-1.5 w-1.5 rounded-full bg-gray-300" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                          {item.description ?? '暂无描述信息'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 pt-4 border-t border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedQrPlatform(item);
                            setQrCodeModalOpen(true);
                          }}
                          className="h-8 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-bold text-xs"
                        >
                          {item.hasConfig ? '重新配置' : '去配置'}
                        </Button>
                      </div>
                      {item.hasConfig && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQrCodeTestLink(item.key)}
                          disabled={qrCodeLoading}
                          className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
                          title="测试链接"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 p-6 bg-blue-50/30 border border-blue-50 rounded-2xl flex items-start gap-4">
              <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center bg-blue-100 text-blue-600 rounded-lg">
                <Info className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h5 className="text-sm font-bold text-blue-900">配置指南</h5>
                <p className="text-xs text-blue-700/70 leading-relaxed font-medium">
                  集成第三方平台后，用户可以通过扫码快速登录。
                  配置完成后，请务必在对应平台（如飞书开放平台）后台将回调地址设置为本系统提供的 URL。
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="model" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">AI模型配置</CardTitle>
                  <CardDescription>管理 AI 模型配置，支持多种模型提供商</CardDescription>
                </div>
                <Button onClick={() => {
                  setModelEditItem(null);
                  setModelForm({ name: '', model: '', baseUrl: '', apiKey: '', enable: true, description: '' });
                  setModelModalOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" /> 添加模型
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Input
                  placeholder="搜索模型名称"
                  value={modelKeyword}
                  onChange={(e) => setModelKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadModelList()}
                  className="w-48"
                />
                <Button variant="outline" size="icon" onClick={loadModelList}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                    <TableRow className="hover:bg-transparent border-none h-11">
                      <TableHead className="font-medium text-gray-500">名称</TableHead>
                      <TableHead className="font-medium text-gray-500">模型</TableHead>
                      <TableHead className="font-medium text-gray-500">Base URL</TableHead>
                      <TableHead className="w-24 font-medium text-gray-500">状态</TableHead>
                      <TableHead className="w-48 text-right font-medium text-gray-500">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody key={`model-tbody-${modelList.length}-${modelList[0]?.id ?? ''}`}>
                    {modelLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">加载中...</TableCell>
                      </TableRow>
                    ) : modelList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">暂无模型配置</TableCell>
                      </TableRow>
                    ) : (
                      modelList.map((item, index) => (
                        <TableRow key={item.id || `model-${index}`} className="group transition-colors [&_td]:transition-colors [&_td]:group-hover:bg-[#f2f3f5] border-b border-gray-100 h-11">
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.model}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={item.baseUrl}>{item.baseUrl ?? '-'}</TableCell>
                          <TableCell>{item.enable ? '启用' : '禁用'}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => {
                              setModelEditItem(item);
                              setModelForm({
                                name: item.name ?? '',
                                model: item.model ?? '',
                                baseUrl: item.baseUrl ?? '',
                                apiKey: item.apiKey ?? '',
                                enable: item.enable ?? true,
                                description: item.description ?? '',
                              });
                              setModelModalOpen(true);
                            }}>
                              <Pencil className="h-3 w-3 mr-1" /> 编辑
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setModelDeleteConfirm(item)}>
                              <Trash2 className="h-3 w-3 mr-1" /> 删除
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 基础信息-修改弹窗 */}
      <Dialog open={baseModalOpen} onOpenChange={setBaseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改基本信息</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>页面地址 *</Label>
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="如 https://example.com" maxLength={255} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBaseModalOpen(false)}>取消</Button>
            <Button onClick={handleSaveBaseUrl} disabled={baseSubmitting} className="bg-blue-600 hover:bg-blue-700">{baseSubmitting ? '保存中...' : '保存'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 邮件配置-修改弹窗 */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>修改邮件配置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>SMTP 主机 *</Label>
              <Input value={emailForm.host} onChange={(e) => setEmailForm((p) => ({ ...p, host: e.target.value }))} placeholder="smtp.example.com" />
            </div>
            <div>
              <Label>端口 *</Label>
              <Input value={emailForm.port} onChange={(e) => setEmailForm((p) => ({ ...p, port: e.target.value }))} placeholder="465" />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <Switch checked={emailForm.ssl} onCheckedChange={(v) => setEmailForm((p) => ({ ...p, ssl: v }))} />
                <span className="text-sm">SSL</span>
              </label>
              <label className="flex items-center gap-2">
                <Switch checked={emailForm.tsl} onCheckedChange={(v) => setEmailForm((p) => ({ ...p, tsl: v }))} />
                <span className="text-sm">TLS</span>
              </label>
            </div>
            <div>
              <Label>账户 *</Label>
              <Input value={emailForm.account} onChange={(e) => setEmailForm((p) => ({ ...p, account: e.target.value }))} placeholder="邮箱账号" />
            </div>
            <div>
              <Label>密码</Label>
              <Input type="password" value={emailForm.password} onChange={(e) => setEmailForm((p) => ({ ...p, password: e.target.value }))} placeholder="留空则不修改" />
            </div>
            <div>
              <Label>发件人</Label>
              <Input value={emailForm.from} onChange={(e) => setEmailForm((p) => ({ ...p, from: e.target.value }))} placeholder="显示的发件人" />
            </div>
            <div>
              <Label>收件人（测试用）</Label>
              <Input value={emailForm.recipient} onChange={(e) => setEmailForm((p) => ({ ...p, recipient: e.target.value }))} placeholder="测试收件地址" />
            </div>
            <Button onClick={handleTestEmail} disabled={emailTestLoading} className="w-full">
              <Send className="h-4 w-4 mr-2" /> {emailTestLoading ? '测试中...' : '测试邮件连接'}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailModalOpen(false)}>取消</Button>
            <Button onClick={handleSaveEmail} disabled={emailSubmitting} className="bg-blue-600 hover:bg-blue-700">{emailSubmitting ? '保存中...' : '保存'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 认证配置-添加/编辑弹窗 */}
      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{authEditItem ? '编辑认证源' : '添加认证源'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>名称 *</Label>
              <Input value={authForm.name} onChange={(e) => setAuthForm((p) => ({ ...p, name: e.target.value }))} placeholder="请输入认证源名称" maxLength={255} />
            </div>
            <div>
              <Label>类型 *</Label>
              <Select value={authForm.type} onValueChange={(v) => setAuthForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LDAP">LDAP</SelectItem>
                  <SelectItem value="OAUTH2">OAuth 2.0</SelectItem>
                  <SelectItem value="CAS">CAS</SelectItem>
                  <SelectItem value="OIDC">OIDC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>描述</Label>
              <Input value={authForm.description} onChange={(e) => setAuthForm((p) => ({ ...p, description: e.target.value }))} placeholder="选填" maxLength={1000} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={authForm.enable} onCheckedChange={(v) => setAuthForm((p) => ({ ...p, enable: v }))} />
              <span className="text-sm">启用认证源</span>
            </div>
            <Separator />
            <div>
              <Label className="text-sm font-medium mb-2 block">详细配置</Label>
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                {authForm.type === 'LDAP' && (
                  <>
                    <div>
                      <Label className="text-xs">LDAP 服务器地址</Label>
                      <Input
                        value={authForm.configuration.ldapUrl || ''}
                        onChange={(e) => setAuthForm((p) => ({ ...p, configuration: { ...p.configuration, ldapUrl: e.target.value } }))}
                        placeholder="如 ldap://example.com:389"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">DN（Distinguished Name）</Label>
                      <Input
                        value={authForm.configuration.ldapDn || ''}
                        onChange={(e) => setAuthForm((p) => ({ ...p, configuration: { ...p.configuration, ldapDn: e.target.value } }))}
                        placeholder="如 cn=admin,dc=example,dc=com"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">密码</Label>
                      <Input
                        type="password"
                        value={authForm.configuration.ldapPassword || ''}
                        onChange={(e) => setAuthForm((p) => ({ ...p, configuration: { ...p.configuration, ldapPassword: e.target.value } }))}
                        placeholder="LDAP 管理员密码"
                        className="mt-1"
                      />
                    </div>
                  </>
                )}
                {authForm.type === 'OAUTH2' && (
                  <>
                    <div>
                      <Label className="text-xs">客户端 ID</Label>
                      <Input
                        value={authForm.configuration.clientId || ''}
                        onChange={(e) => setAuthForm((p) => ({ ...p, configuration: { ...p.configuration, clientId: e.target.value } }))}
                        placeholder="OAuth2 客户端 ID"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">客户端密钥</Label>
                      <Input
                        type="password"
                        value={authForm.configuration.clientSecret || ''}
                        onChange={(e) => setAuthForm((p) => ({ ...p, configuration: { ...p.configuration, clientSecret: e.target.value } }))}
                        placeholder="OAuth2 客户端密钥"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">授权地址</Label>
                      <Input
                        value={authForm.configuration.authorizationUrl || ''}
                        onChange={(e) => setAuthForm((p) => ({ ...p, configuration: { ...p.configuration, authorizationUrl: e.target.value } }))}
                        placeholder="如 https://example.com/oauth/authorize"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Token 地址</Label>
                      <Input
                        value={authForm.configuration.tokenUrl || ''}
                        onChange={(e) => setAuthForm((p) => ({ ...p, configuration: { ...p.configuration, tokenUrl: e.target.value } }))}
                        placeholder="如 https://example.com/oauth/token"
                        className="mt-1"
                      />
                    </div>
                  </>
                )}
                {(authForm.type === 'CAS' || authForm.type === 'OIDC') && (
                  <div>
                    <Label className="text-xs">服务器地址</Label>
                    <Input
                      value={authForm.configuration.serverUrl || ''}
                      onChange={(e) => setAuthForm((p) => ({ ...p, configuration: { ...p.configuration, serverUrl: e.target.value } }))}
                      placeholder="认证服务器地址"
                      className="mt-1"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">配置项根据认证类型动态显示，请根据实际需求填写。</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuthModalOpen(false)}>取消</Button>
            <Button onClick={async () => {
              if (!authForm.name.trim()) {
                toast.error('请输入认证源名称');
                return;
              }
              setAuthSubmitting(true);
              try {
                const data = {
                  id: authEditItem?.id,
                  name: authForm.name,
                  type: authForm.type,
                  description: authForm.description,
                  enable: authForm.enable,
                  configuration: JSON.stringify(authForm.configuration),
                };
                if (authEditItem?.id) {
                  await systemParameterService.updateAuth(data);
                  toast.success('更新成功');
                } else {
                  await systemParameterService.addAuth(data);
                  toast.success('创建成功');
                }
                setAuthModalOpen(false);
                loadAuthList();
              } catch (e) {
                toast.error(authEditItem ? '更新失败' : '创建失败');
              } finally {
                setAuthSubmitting(false);
              }
            }} disabled={authSubmitting} className="bg-blue-600 hover:bg-blue-700">
              {authSubmitting ? '提交中...' : (authEditItem ? '保存' : '创建')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI模型配置-添加/编辑弹窗 */}
      <Dialog open={modelModalOpen} onOpenChange={setModelModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{modelEditItem ? '编辑模型配置' : '添加模型配置'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>名称 *</Label>
              <Input value={modelForm.name} onChange={(e) => setModelForm((p) => ({ ...p, name: e.target.value }))} placeholder="请输入模型名称" maxLength={255} />
              <p className="text-xs text-muted-foreground mt-1">用于标识此模型配置的名称</p>
            </div>
            <div>
              <Label>模型 *</Label>
              <Input value={modelForm.model} onChange={(e) => setModelForm((p) => ({ ...p, model: e.target.value }))} placeholder="如 gpt-4, gpt-3.5-turbo, claude-3-opus" />
              <p className="text-xs text-muted-foreground mt-1">模型标识符，根据不同的 API 提供商而异</p>
            </div>
            <div>
              <Label>Base URL *</Label>
              <Input value={modelForm.baseUrl} onChange={(e) => setModelForm((p) => ({ ...p, baseUrl: e.target.value }))} placeholder="如 https://api.openai.com/v1" />
              <p className="text-xs text-muted-foreground mt-1">API 基础地址，通常以 /v1 结尾</p>
            </div>
            <div>
              <Label>API Key</Label>
              <Input type="password" value={modelForm.apiKey} onChange={(e) => setModelForm((p) => ({ ...p, apiKey: e.target.value }))} placeholder={modelEditItem ? '留空则不修改' : '请输入 API Key'} />
              <p className="text-xs text-muted-foreground mt-1">用于身份验证的 API 密钥</p>
            </div>
            <div>
              <Label>描述</Label>
              <Input value={modelForm.description} onChange={(e) => setModelForm((p) => ({ ...p, description: e.target.value }))} placeholder="选填，描述此模型的用途" maxLength={500} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={modelForm.enable} onCheckedChange={(v) => setModelForm((p) => ({ ...p, enable: v }))} />
              <span className="text-sm">启用此模型配置</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModelModalOpen(false)}>取消</Button>
            <Button onClick={async () => {
              if (!modelForm.name.trim() || !modelForm.model.trim() || !modelForm.baseUrl.trim()) {
                toast.error('请填写必填项（名称、模型、Base URL）');
                return;
              }
              setModelSubmitting(true);
              try {
                const data = {
                  id: modelEditItem?.id,
                  ...modelForm,
                };
                await systemParameterService.saveModelConfig(data);
                toast.success(modelEditItem ? '更新成功' : '创建成功');
                setModelModalOpen(false);
                loadModelList();
              } catch (e) {
                toast.error(modelEditItem ? '更新失败' : '创建失败');
              } finally {
                setModelSubmitting(false);
              }
            }} disabled={modelSubmitting} className="bg-blue-600 hover:bg-blue-700">
              {modelSubmitting ? '提交中...' : (modelEditItem ? '保存' : '创建')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 二维码配置-飞书参数弹窗（与 aegis-next-server larkModal 一致） */}
      <Dialog
        open={qrCodeModalOpen && selectedQrPlatform?.key === 'LARK'}
        onOpenChange={(open) => {
          setQrCodeModalOpen(open);
          if (!open) setSelectedQrPlatform(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>飞书</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>应用 ID (agentId) *</Label>
              <Input
                value={qrCodeForm.agentId}
                onChange={(e) => setQrCodeForm((p) => ({ ...p, agentId: e.target.value }))}
                placeholder="请输入"
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label>应用密钥 (appSecret) *</Label>
              <Input
                type="password"
                value={qrCodeForm.appSecret}
                onChange={(e) => setQrCodeForm((p) => ({ ...p, appSecret: e.target.value }))}
                placeholder="请输入"
                maxLength={255}
              />
            </div>
            {qrCodeForm.callBack && (
              <div className="space-y-2">
                <Label>回调域名</Label>
                <Input value={qrCodeForm.callBack} readOnly className="bg-muted/50 text-muted-foreground" />
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-row flex-wrap items-center justify-between gap-4 sm:justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={qrCodeForm.enable}
                onCheckedChange={(v) => setQrCodeForm((p) => ({ ...p, enable: v }))}
                className="data-[state=checked]:bg-blue-600"
              />
              <span className="text-sm text-muted-foreground">状态</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setQrCodeModalOpen(false)}>
                取消
              </Button>
              <Button
                variant="outline"
                disabled={qrCodeValidateLoading}
                onClick={async () => {
                  if (!qrCodeForm.agentId?.trim() || !qrCodeForm.appSecret?.trim()) {
                    toast.error('请填写应用 ID 和应用密钥');
                    return;
                  }
                  setQrCodeValidateLoading(true);
                  try {
                    await systemParameterService.validateLarkConfig({
                      agentId: qrCodeForm.agentId,
                      appSecret: qrCodeForm.appSecret,
                      callBack: qrCodeForm.callBack,
                      enable: qrCodeForm.enable,
                    });
                    toast.success('测试链接成功');
                  } catch (e) {
                    toast.error('测试链接失败');
                  } finally {
                    setQrCodeValidateLoading(false);
                  }
                }}
              >
                {qrCodeValidateLoading ? '校验中...' : '测试链接'}
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                disabled={qrCodeSubmitting}
                onClick={async () => {
                  if (!qrCodeForm.agentId?.trim() || !qrCodeForm.appSecret?.trim()) {
                    toast.error('请填写应用 ID 和应用密钥');
                    return;
                  }
                  setQrCodeSubmitting(true);
                  try {
                    await systemParameterService.saveLarkConfig({
                      agentId: qrCodeForm.agentId,
                      appSecret: qrCodeForm.appSecret,
                      callBack: qrCodeForm.callBack,
                      enable: qrCodeForm.enable,
                    });
                    toast.success('保存成功');
                    setQrCodeModalOpen(false);
                    setSelectedQrPlatform(null);
                    loadQrCodeList();
                  } catch (e) {
                    toast.error('保存失败');
                  } finally {
                    setQrCodeSubmitting(false);
                  }
                }}
              >
                {qrCodeSubmitting ? '保存中...' : '确定'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!authDeleteConfirm} onOpenChange={() => setAuthDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除认证源「{authDeleteConfirm?.name}」吗？删除后该认证源将无法使用。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!authDeleteConfirm?.id) return;
              const id = authDeleteConfirm.id;
              setAuthDeleteConfirm(null);
              try {
                await systemParameterService.deleteAuth(id);
                toast.success('已删除');
                loadAuthList();
              } catch (e) {
                toast.error('删除失败');
              }
            }}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI模型配置-删除确认 */}
      <AlertDialog open={!!modelDeleteConfirm} onOpenChange={() => setModelDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除模型配置「{modelDeleteConfirm?.name}」吗？删除后该模型配置将无法使用。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!modelDeleteConfirm?.id) return;
              const id = modelDeleteConfirm.id;
              setModelDeleteConfirm(null);
              try {
                await systemParameterService.deleteModelConfig(id);
                toast.success('已删除');
                loadModelList();
              } catch (e) {
                toast.error('删除失败');
              }
            }}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
