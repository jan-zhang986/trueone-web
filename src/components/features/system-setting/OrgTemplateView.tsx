/**
 * 系统设置-组织-模板管理（迁移自 AegisOne）
 * 与项目管理内模板管理（ProjectTemplateView）共用一套交互与样式，仅 scope 为组织
 */
import { useState, useCallback } from 'react';
import { Settings, FileText, Workflow, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TemplateFieldSetting, TemplateManagementList, TemplateWorkflowView } from './template';
import type { SceneType } from '@/types/setting/template';
import { cn } from '@/utils/cn';

const TEMPLATE_TYPES: { key: SceneType; title: string; description: string }[] = [
  { key: 'FUNCTIONAL', title: '用例模板', description: '管理用例相关的字段和模板' },
  { key: 'BUG', title: '缺陷模板', description: '管理缺陷相关的字段和模板' },
  { key: 'API', title: 'API 模板', description: '管理 API 相关的字段和模板' },
];

type SubView = 'list' | 'field' | 'templates' | 'workflow';

export function OrgTemplateView() {
  const [showTip, setShowTip] = useState(true);
  const [subView, setSubView] = useState<SubView>('list');
  const [scene, setScene] = useState<SceneType>('FUNCTIONAL');

  const organizationId = typeof localStorage !== 'undefined' ? localStorage.getItem('currentOrgId') ?? '' : '';

  const handleFieldSetting = useCallback((key: string) => {
    setScene(key as SceneType);
    setSubView('field');
  }, []);

  const handleTemplateManagement = useCallback((key: string) => {
    setScene(key as SceneType);
    setSubView('templates');
  }, []);

  const handleWorkflowSetup = useCallback((key: string) => {
    setScene(key as SceneType);
    setSubView('workflow');
  }, []);

  const onBack = useCallback(() => {
    setSubView('list');
  }, []);

  if (!organizationId) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm max-w-2xl mx-auto">
        请先在顶部导航选择组织后再使用模板管理。
      </div>
    );
  }

  if (subView === 'field') {
    return <TemplateFieldSetting organizationId={organizationId} scene={scene} onBack={onBack} />;
  }
  if (subView === 'templates') {
    return <TemplateManagementList organizationId={organizationId} scene={scene} onBack={onBack} />;
  }
  if (subView === 'workflow') {
    return <TemplateWorkflowView organizationId={organizationId} scene={scene} onBack={onBack} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {showTip && (
        <Alert className="mb-6 border-none bg-blue-50/50 rounded-xl p-4 relative overflow-hidden group">
          <div className="absolute left-0 top-0 w-1 h-full bg-blue-500" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                通过模板管理，您可以根据团队习惯定制工作流与表单字段，提升协作效率。
              </span>
            </div>
            <Button variant="ghost" size="sm" className="h-7 px-3 rounded-lg text-xs font-medium text-gray-500 hover:text-blue-600 hover:bg-white transition-all" onClick={() => setShowTip(false)}>
              我知道了
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATE_TYPES.map((type, idx) => (
            <Card key={type.key} className="group overflow-hidden border-none shadow-[0_10px_30px_rgba(0,0,0,0.02)] rounded-[2rem] bg-gray-50/30 hover:bg-white hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1.5 transition-all duration-500 ring-1 ring-gray-100/50">
              <CardHeader className="pb-4 pt-8 px-8">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
                  idx === 0 ? "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white" :
                    idx === 1 ? "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white" :
                      "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
                )}>
                  {idx === 0 ? <FileText className="w-7 h-7" /> : idx === 1 ? <Settings className="w-7 h-7" /> : <Workflow className="w-7 h-7" />}
                </div>
                <CardTitle className="text-xl font-black text-gray-900 tracking-tight">{type.title}</CardTitle>
                <CardDescription className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1.5 leading-relaxed">{type.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 pb-10 px-8">
                <Button
                  variant="outline"
                  className="w-full h-11 justify-between border-transparent bg-white shadow-sm hover:bg-blue-50 hover:text-blue-700 hover:border-blue-100 rounded-xl font-bold text-xs transition-all group/btn"
                  onClick={() => handleFieldSetting(type.key)}
                >
                  <div className="flex items-center">
                    <Settings className="mr-3 h-4 w-4 shrink-0 text-gray-400 group-hover/btn:text-blue-500 transition-colors" />
                    字段设置
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 opacity-0 group-hover/btn:opacity-100 -translate-x-2 group-hover/btn:translate-x-0 transition-all" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-11 justify-between border-transparent bg-white shadow-sm hover:bg-blue-50 hover:text-blue-700 hover:border-blue-100 rounded-xl font-bold text-xs transition-all group/btn"
                  onClick={() => handleTemplateManagement(type.key)}
                >
                  <div className="flex items-center">
                    <FileText className="mr-3 h-4 w-4 shrink-0 text-gray-400 group-hover/btn:text-blue-500 transition-colors" />
                    模板管理
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 opacity-0 group-hover/btn:opacity-100 -translate-x-2 group-hover/btn:translate-x-0 transition-all" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-11 justify-between border-transparent bg-white shadow-sm hover:bg-blue-50 hover:text-blue-700 hover:border-blue-100 rounded-xl font-bold text-xs transition-all group/btn"
                  onClick={() => handleWorkflowSetup(type.key)}
                >
                  <div className="flex items-center">
                    <Workflow className="mr-3 h-4 w-4 shrink-0 text-gray-400 group-hover/btn:text-blue-500 transition-colors" />
                    工作流设置
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 opacity-0 group-hover/btn:opacity-100 -translate-x-2 group-hover/btn:translate-x-0 transition-all" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
    </div>
  );
}
