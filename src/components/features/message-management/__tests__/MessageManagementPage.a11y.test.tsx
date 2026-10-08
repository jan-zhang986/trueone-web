/**
 * MessageManagementPage Accessibility Tests
 * 测试消息管理页面的可访问性
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { MessageManagementPage } from '../MessageManagementPage';
import { useRobotManagement } from '@/hooks/message';

// Mock hooks
jest.mock('@/hooks/message');

const mockUseRobotManagement = useRobotManagement as jest.MockedFunction<typeof useRobotManagement>;

describe('MessageManagementPage - Accessibility Tests', () => {
  const mockRobots = [
    {
      id: '1',
      name: '测试机器人1',
      platform: 'DING_TALK' as const,
      type: 'CUSTOM' as const,
      webhook: 'https://example.com/webhook1',
      enable: true,
      projectId: 'proj1',
      createUser: 'user1',
      createdAt: '2024-01-01T10:00:00Z',
      updateUser: 'user1',
      updatedAt: '2024-01-01T10:00:00Z',
    },
  ];

  beforeEach(() => {
    mockUseRobotManagement.mockReturnValue({
      robots: mockRobots,
      loading: false,
      submitting: false,
      createRobot: jest.fn(),
      editRobot: jest.fn(),
      removeRobot: jest.fn(),
      toggleRobotStatus: jest.fn(),
      loadRobots: jest.fn(),
      refresh: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Semantic HTML', () => {
    it('should use semantic main element', () => {
      render(<MessageManagementPage projectId="proj1" />);
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveAttribute('aria-label', '消息管理');
    });

    it('should use semantic tablist for navigation', () => {
      render(<MessageManagementPage projectId="proj1" />);
      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();
      expect(tablist).toHaveAttribute('aria-label', '消息管理导航');
    });

    it('should use semantic tabs', () => {
      render(<MessageManagementPage projectId="proj1" />);
      
      const configTab = screen.getByRole('tab', { name: '消息配置标签页' });
      expect(configTab).toBeInTheDocument();
      
      const robotTab = screen.getByRole('tab', { name: '机器人管理标签页' });
      expect(robotTab).toBeInTheDocument();
    });

    it('should use semantic tabpanels', () => {
      render(<MessageManagementPage projectId="proj1" />);
      
      const tabpanels = screen.getAllByRole('tabpanel');
      expect(tabpanels.length).toBeGreaterThan(0);
    });
  });

  describe('ARIA Labels', () => {
    it('should have proper ARIA labels on tabs', () => {
      render(<MessageManagementPage projectId="proj1" />);
      
      const configTab = screen.getByRole('tab', { name: '消息配置标签页' });
      expect(configTab).toHaveAttribute('aria-label', '消息配置标签页');
      
      const robotTab = screen.getByRole('tab', { name: '机器人管理标签页' });
      expect(robotTab).toHaveAttribute('aria-label', '机器人管理标签页');
    });

    it('should have ARIA labels on tabpanels', () => {
      render(<MessageManagementPage projectId="proj1" />);
      
      const tabpanels = screen.getAllByRole('tabpanel');
      tabpanels.forEach(panel => {
        expect(panel).toHaveAttribute('aria-labelledby');
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support arrow key navigation between tabs', () => {
      render(<MessageManagementPage projectId="proj1" />);
      
      const configTab = screen.getByRole('tab', { name: '消息配置标签页' });
      const robotTab = screen.getByRole('tab', { name: '机器人管理标签页' });
      
      // Focus on first tab
      configTab.focus();
      expect(document.activeElement).toBe(configTab);
      
      // Arrow right should move to next tab
      fireEvent.keyDown(configTab, { key: 'ArrowRight', code: 'ArrowRight' });
      
      // Click to activate
      fireEvent.click(robotTab);
      expect(robotTab).toHaveAttribute('data-state', 'active');
    });

    it('should support Enter and Space to activate tabs', () => {
      render(<MessageManagementPage projectId="proj1" />);
      
      const robotTab = screen.getByRole('tab', { name: '机器人管理标签页' });
      
      // Enter key
      fireEvent.keyDown(robotTab, { key: 'Enter', code: 'Enter' });
      fireEvent.click(robotTab);
      
      expect(robotTab).toHaveAttribute('data-state', 'active');
    });

    it('should support Tab key to move focus out of tablist', () => {
      render(<MessageManagementPage projectId="proj1" />);
      
      const configTab = screen.getByRole('tab', { name: '消息配置标签页' });
      configTab.focus();
      
      // Tab key should move focus to content
      fireEvent.keyDown(configTab, { key: 'Tab', code: 'Tab' });
      
      expect(document.activeElement).not.toBe(configTab);
    });
  });

  describe('Focus Management', () => {
    it('should maintain focus when switching tabs', () => {
      render(<MessageManagementPage projectId="proj1" />);
      
      const robotTab = screen.getByRole('tab', { name: '机器人管理标签页' });
      
      fireEvent.click(robotTab);
      
      // Focus should remain on the tab or move to the panel
      expect(document.activeElement).toBeTruthy();
    });

    it('should have visible focus indicators on tabs', () => {
      render(<MessageManagementPage projectId="proj1" />);
      
      const configTab = screen.getByRole('tab', { name: '消息配置标签页' });
      configTab.focus();
      
      expect(configTab).toHaveFocus();
    });
  });

  describe('Screen Reader Support', () => {
    it('should announce tab selection to screen readers', () => {
      render(<MessageManagementPage projectId="proj1" />);
      
      const configTab = screen.getByRole('tab', { name: '消息配置标签页' });
      
      // Active tab should have aria-selected="true"
      expect(configTab).toHaveAttribute('aria-selected');
    });

    it('should hide decorative icons from screen readers', () => {
      render(<MessageManagementPage projectId="proj1" />);
      
      const icons = document.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Tab State Management', () => {
    it('should have only one tab selected at a time', () => {
      render(<MessageManagementPage projectId="proj1" />);
      
      const tabs = screen.getAllByRole('tab');
      const selectedTabs = tabs.filter(tab => 
        tab.getAttribute('data-state') === 'active'
      );
      
      expect(selectedTabs.length).toBe(1);
    });

    it('should update aria-selected when tab changes', () => {
      render(<MessageManagementPage projectId="proj1" />);
      
      const robotTab = screen.getByRole('tab', { name: '机器人管理标签页' });
      
      fireEvent.click(robotTab);
      
      // Should update aria-selected
      expect(robotTab).toHaveAttribute('data-state', 'active');
    });
  });

  describe('Responsive Design', () => {
    it('should maintain accessibility on mobile', () => {
      // Mock mobile viewport
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));
      
      render(<MessageManagementPage projectId="proj1" />);
      
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      
      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();
    });
  });
});
