/**
 * 列显示设置（含列顺序拖拽）
 */

import { useState, useEffect } from 'react';
import { GripVertical, RotateCcw } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const COLUMNS_CONFIG = [
  { key: 'caseType', label: '用例类型' },
  { key: 'reviewStatus', label: '评审结果' },
  { key: 'lastExecuteResult', label: '执行结果' },
  { key: 'moduleId', label: '所属模块' },
  { key: 'tags', label: '标签' },
  { key: 'updateUserName', label: '更新人' },
  { key: 'updateTime', label: '更新时间' },
  { key: 'createUserName', label: '创建人' },
  { key: 'createTime', label: '创建时间' },
];

const COLUMNS_SETTINGS_KEY = 'case-table-visible-columns';
const COLUMN_ORDER_KEY = 'case-table-column-order';
const COLUMN_WIDTHS_KEY = 'case-table-column-widths';

/** 可拖拽调整宽度的列及其默认宽度（px） */
export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  num: 96,
  name: 180,
  caseLevel: 80,
  caseType: 96,
  reviewStatus: 96,
  lastExecuteResult: 96,
  moduleId: 144,
  tags: 96,
  updateUserName: 96,
  updateTime: 144,
  createUserName: 96,
  createTime: 144,
};

export function loadColumnWidths(): Record<string, number> {
  try {
    const s = localStorage.getItem(COLUMN_WIDTHS_KEY);
    if (!s) return { ...DEFAULT_COLUMN_WIDTHS };
    const parsed = JSON.parse(s) as Record<string, number>;
    const out = { ...DEFAULT_COLUMN_WIDTHS };
    Object.keys(DEFAULT_COLUMN_WIDTHS).forEach((k) => {
      if (typeof parsed[k] === 'number' && parsed[k] >= 60 && parsed[k] <= 800) out[k] = parsed[k];
    });
    return out;
  } catch {
    return { ...DEFAULT_COLUMN_WIDTHS };
  }
}

export function saveColumnWidths(v: Record<string, number>) {
  try {
    localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

const DEFAULT_COLUMN_ORDER = ['reviewStatus', 'lastExecuteResult', 'moduleId', 'tags', 'updateUserName', 'updateTime', 'createUserName', 'createTime'];

export function getDefaultColumnOrder(): string[] {
  return [...DEFAULT_COLUMN_ORDER];
}

export function loadColumnOrder(): string[] {
  try {
    const s = localStorage.getItem(COLUMN_ORDER_KEY);
    if (!s) return getDefaultColumnOrder();
    const parsed: string[] = JSON.parse(s);
    const valid = parsed.filter((k) => DEFAULT_COLUMN_ORDER.includes(k));
    const missing = DEFAULT_COLUMN_ORDER.filter((k) => !valid.includes(k));
    return [...valid, ...missing];
  } catch {
    return getDefaultColumnOrder();
  }
}

function saveColumnOrder(order: string[]) {
  try {
    localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(order));
  } catch { /* ignore */ }
}

export function getDefaultVisibleColumns(): Record<string, boolean> {
  const defaults: Record<string, boolean> = {};
  COLUMNS_CONFIG.forEach((c) => { defaults[c.key] = true; });
  return defaults;
}

export function loadVisibleColumns(): Record<string, boolean> {
  try {
    const s = localStorage.getItem(COLUMNS_SETTINGS_KEY);
    if (!s) return getDefaultVisibleColumns();
    const parsed = JSON.parse(s);
    const merged = getDefaultVisibleColumns();
    COLUMNS_CONFIG.forEach((c) => {
      if (parsed[c.key] !== undefined) merged[c.key] = !!parsed[c.key];
    });
    return merged;
  } catch {
    return getDefaultVisibleColumns();
  }
}

function saveVisibleColumns(v: Record<string, boolean>) {
  try {
    localStorage.setItem(COLUMNS_SETTINGS_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

interface ColumnSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibleColumns: Record<string, boolean>;
  onVisibleColumnsChange: (v: Record<string, boolean>) => void;
  columnOrder?: string[];
  onColumnOrderChange?: (order: string[]) => void;
}

function SortableColumnItem({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 py-2.5 px-3 rounded-lg border border-transparent bg-white hover:bg-gray-50 hover:border-gray-100 transition-colors ${
        isDragging ? 'shadow-md border-gray-200 bg-gray-50 z-10' : ''
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        aria-label="拖拽排序"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="text-sm text-gray-700 flex-1">{label}</span>
    </div>
  );
}

const LABEL_MAP: Record<string, string> = Object.fromEntries(COLUMNS_CONFIG.map((c) => [c.key, c.label]));

export function ColumnSettingsSheet({
  open,
  onOpenChange,
  visibleColumns,
  onVisibleColumnsChange,
  columnOrder = getDefaultColumnOrder(),
  onColumnOrderChange,
}: ColumnSettingsSheetProps) {
  const [local, setLocal] = useState<Record<string, boolean>>(visibleColumns);
  const [order, setOrder] = useState<string[]>(columnOrder);

  useEffect(() => {
    if (open) {
      setLocal({ ...visibleColumns });
      setOrder([...columnOrder]);
    }
  }, [open, visibleColumns, columnOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id || !onColumnOrderChange) return;
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    const next = [...order];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    setOrder(next);
    onColumnOrderChange(next);
    saveColumnOrder(next);
  };

  const handleToggle = (key: string, checked: boolean) => {
    const next = { ...local, [key]: checked };
    setLocal(next);
    onVisibleColumnsChange(next);
    saveVisibleColumns(next);
  };

  const handleReset = () => {
    const defaults = getDefaultVisibleColumns();
    setLocal(defaults);
    onVisibleColumnsChange(defaults);
    saveVisibleColumns(defaults);
    const defaultOrder = getDefaultColumnOrder();
    setOrder(defaultOrder);
    onColumnOrderChange?.(defaultOrder);
    saveColumnOrder(defaultOrder);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[360px] sm:max-w-[360px] flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b border-gray-100">
          <SheetTitle className="text-base font-semibold">列设置</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <section>
            <h3 className="text-sm font-medium text-gray-800 mb-1">显示列</h3>
            <p className="text-xs text-gray-500 mb-3">勾选需要在表格中展示的列</p>
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-2 space-y-0.5">
              {COLUMNS_CONFIG.map((c) => (
                <label
                  key={c.key}
                  htmlFor={`col-${c.key}`}
                  className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-md hover:bg-white/80 cursor-pointer transition-colors"
                >
                  <span className="text-sm text-gray-700">{c.label}</span>
                  <Switch
                    id={`col-${c.key}`}
                    checked={!!local[c.key]}
                    onCheckedChange={(v) => handleToggle(c.key, !!v)}
                  />
                </label>
              ))}
            </div>
          </section>

          {onColumnOrderChange && (
            <section>
              <h3 className="text-sm font-medium text-gray-800 mb-1">列顺序</h3>
              <p className="text-xs text-gray-500 mb-3">拖拽手柄调整列在表格中的先后顺序</p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={order} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5">
                    {order.map((key) => (
                      <SortableColumnItem key={key} id={key} label={LABEL_MAP[key] ?? key} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </section>
          )}
        </div>

        <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <Button variant="outline" size="sm" onClick={handleReset} className="w-full gap-2">
            <RotateCcw className="w-3.5 h-3.5" />
            恢复默认
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
