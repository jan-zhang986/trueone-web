/**
 * API 预览详情页组件
 * 用于展示接口的详细信息（只读模式）
 * 支持 HTTP、SQL、DUBBO、RocketMQ、FILE 五种协议
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { TestPage } from './TestPage';
import { DubboTestPage } from './DubboTestPage';
import type { MetadataDefinition, MetadataModuleNode } from '@/services/metadata';
import { copyToClipboard } from '@/utils/clipboard';
import {
  useApiDefinitionData,
  useApiDataRenderer,
  useFileManagement,
  useSyncData,
  useUserNameMap,
} from '@/components/features/api-preview/hooks';
import { getDirectoryLabel, formatTime } from '@/components/features/api-preview/utils';
import {
  ApiHeaderSection,
  ApiDocInfoSection,
  ApiBodySection,
  ApiResponseSection,
  EditFileIdDialog,
} from '@/components/features/api-preview/components';

interface ApiPreviewPageProps {
  definition: MetadataDefinition;
  onStartDebug: () => void;
  onBack?: () => void;
  moduleName?: string;
  moduleTree?: MetadataModuleNode[];
  definitions?: MetadataDefinition[];
  onRefresh?: () => void;
}

export function ApiPreviewPage({
  definition,
  onStartDebug,
  onBack,
  moduleName,
  moduleTree = [],
  definitions = [],
  onRefresh,
}: ApiPreviewPageProps) {
  const [viewMode, setViewMode] = useState<'doc' | 'request'>('doc');
  const [selectedResponseIndex, setSelectedResponseIndex] = useState(0);

  const { requestConfig, responseConfig, protocol, httpMethod, url, headerParams, queryParams, bodyParams, inputExample } =
    useApiDefinitionData(definition);
  const userNameMap = useUserNameMap(definition.createUser);

  const {
    renderBodyTree,
    renderResponseTree,
    getTypeBadgeColor,
    responseData,
  } = useApiDataRenderer(requestConfig, responseConfig, protocol, selectedResponseIndex);

  const fileMgmt = useFileManagement(definition, onBack);
  const { isSyncData, isSavingSyncData, handleSaveSyncData } = useSyncData(
    definition,
    requestConfig,
    protocol,
    onRefresh
  );

  const directoryLabel = getDirectoryLabel(isSyncData, moduleTree, definition.moduleId, moduleName);

  useEffect(() => {
    if (responseData?.isMultiple) setSelectedResponseIndex(0);
  }, [responseData?.isMultiple]);

  const handleCopyUrl = async () => {
    const ok = await copyToClipboard(url);
    if (ok) toast.success('已复制到剪贴板');
    else toast.error('复制失败，请手动复制');
  };

  const showDoc = !(viewMode === 'request' && (protocol === 'HTTP' || protocol === 'DUBBO'));
  const showInfo = ['HTTP', 'DUBBO', 'SQL', 'ROCKETMQ', 'FILE'].includes(protocol);

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <ApiHeaderSection
        onBack={onBack}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        protocol={protocol}
        definitionName={definition.name}
        fileId={definition.scriptContent}
        onStartDebug={onStartDebug}
        onDownloadFile={protocol === 'FILE' ? fileMgmt.handleDownloadFile : undefined}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`flex-1 flex flex-col overflow-y-auto ${!showDoc ? 'hidden' : ''}`}>
          {showInfo && (
            <ApiDocInfoSection
              definitionName={definition.name}
              definitionDescription={definition.description}
              protocol={protocol}
              httpMethod={httpMethod}
              url={url}
              getTypeBadgeColor={getTypeBadgeColor}
              formatTime={formatTime}
              createdAt={definition.createdAt}
              updatedAt={definition.updatedAt}
              createUser={definition.createUser}
              userNameMap={userNameMap}
              directoryLabel={directoryLabel}
              tags={definition.tags}
              onCopyUrl={handleCopyUrl}
              isSyncData={isSyncData}
              isSavingSyncData={isSavingSyncData}
              onSaveSyncData={handleSaveSyncData}
            />
          )}

          <div className="flex-1 flex gap-4 p-4 overflow-y-auto">
            <div className="flex-1 space-y-4">
              <ApiBodySection
                protocol={protocol}
                requestConfig={requestConfig}
                definition={definition}
                headerParams={headerParams}
                queryParams={queryParams}
                bodyParams={bodyParams}
                renderBodyTree={renderBodyTree}
                onCopySql={protocol === 'SQL' ? (c) => copyToClipboard(c) : undefined}
                onCopyFileId={protocol === 'FILE' ? fileMgmt.handleCopyFileId : undefined}
                onOpenEditFileId={protocol === 'FILE' ? fileMgmt.handleOpenEditFileId : undefined}
                onDownloadFile={protocol === 'FILE' ? fileMgmt.handleDownloadFile : undefined}
              />
              <ApiResponseSection
                protocol={protocol}
                responseData={responseData}
                responseConfig={responseConfig}
                selectedResponseIndex={selectedResponseIndex}
                onSelectedResponseIndexChange={setSelectedResponseIndex}
                renderResponseTree={renderResponseTree}
              />
            </div>
            {!['HTTP', 'SQL', 'DUBBO', 'FILE'].includes(protocol) && (
              <div className="w-80 border-l border-gray-200 pl-4">
                <div className="sticky top-6">
                  <h2 className="text-sm font-semibold text-gray-900 mb-2">示例</h2>
                  <div className="p-3 bg-white rounded border border-gray-200 overflow-auto max-h-[600px]">
                    <pre className="text-xs text-orange-600 font-mono whitespace-pre-wrap">
                      {inputExample}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {(protocol === 'HTTP' || protocol === 'DUBBO') && (
          <div className={`flex-1 overflow-hidden ${viewMode === 'request' ? '' : 'hidden'}`}>
            {protocol === 'HTTP' ? (
              <TestPage
                key={definition.id}
                apiType="http"
                apiName={definition.name}
                onClose={() => setViewMode('doc')}
                definitionId={definition.id}
                definitions={definitions}
                onRefresh={onRefresh}
              />
            ) : (
              <DubboTestPage
                key={definition.id}
                apiName={definition.name}
                onClose={() => setViewMode('doc')}
                definitionId={definition.id}
                definitions={definitions}
                onRefresh={onRefresh}
              />
            )}
          </div>
        )}
      </div>

      <EditFileIdDialog
        open={fileMgmt.isEditFileIdDialogOpen}
        onOpenChange={fileMgmt.setIsEditFileIdDialogOpen}
        currentFileId={definition.scriptContent}
        selectedFile={fileMgmt.selectedFile}
        fileInputRef={fileMgmt.fileInputRef}
        onFileSelect={fileMgmt.handleFileSelect}
        onUpload={fileMgmt.handleUploadFile}
        isUploading={fileMgmt.isUploading}
        isUpdating={fileMgmt.isUpdating}
        onClose={() => {
          fileMgmt.setIsEditFileIdDialogOpen(false);
          fileMgmt.setNewFileId('');
          fileMgmt.setSelectedFile(null);
        }}
      />
    </div>
  );
}
