import React from 'react';
import {
  Globe,
  FolderKanban,
  ClipboardList,
  Layers,
  Target,
  Bug,
  Settings,
  LayoutDashboard,
  Link,
  Compass,
  Cpu,
  Sparkles,
  Terminal,
  Sliders,
  BarChart,
  Activity,
  FileText,
  Database,
  Workflow,
  Shield,
  ExternalLink,
  Folder,
  AppWindow,
  FileCode,
  Menu,
  Users,
  Boxes,
  Radio,
  Gauge,
  BookOpen,
  Bookmark,
  Bell,
  Calendar,
  Code2,
  GitBranch,
  Key,
  Lock,
  LucideIcon,
  HelpCircle,
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  Globe,
  FolderKanban,
  ClipboardList,
  Layers,
  Target,
  Bug,
  Settings,
  LayoutDashboard,
  Link,
  Compass,
  Cpu,
  Sparkles,
  Terminal,
  Sliders,
  BarChart,
  Activity,
  FileText,
  Database,
  Workflow,
  Shield,
  ExternalLink,
  Folder,
  AppWindow,
  FileCode,
  Menu,
  Users,
  Boxes,
  Radio,
  Gauge,
  BookOpen,
  Bookmark,
  Bell,
  Calendar,
  Code2,
  GitBranch,
  Key,
  Lock,
};

export const AVAILABLE_ICON_NAMES = Object.keys(ICON_MAP);

export function getDynamicIcon(iconName?: string, className?: string): React.ReactElement {
  if (!iconName) {
    return <Folder className={className || 'w-4 h-4'} />;
  }

  // Exact match or case-insensitive match
  let IconComponent = ICON_MAP[iconName];
  if (!IconComponent) {
    const key = Object.keys(ICON_MAP).find(
      (k) => k.toLowerCase() === iconName.toLowerCase()
    );
    if (key) {
      IconComponent = ICON_MAP[key];
    }
  }

  if (!IconComponent) {
    IconComponent = HelpCircle;
  }

  return <IconComponent className={className || 'w-4 h-4'} />;
}
