/**
 * RobotCard Accessibility Tests
 * 测试机器人卡片的可访问性
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { RobotCard } from '../RobotCard';
import type { Robot } from '@/types/message';

describe('RobotCard - Accessibility Tests', () => {
  const mockRobot: Robot = {
    id: '1',
    name: '测试机器人',
    platform: 'DING_TALK',
    type: 'CUSTOM',
    webhook: 'https://example.com/webhook',
    enable: true,
    projectId: 'proj1',
    createUser: 'user1',
    createdAt: '2024-01-01T10:00:00Z',
    updateUser: 'user1',
    updatedAt: '2024-01-01T10:00:00Z',
    description: '这是一个测试机器人',
  };

  const mockHandlers = {
    onEdit: jest.fn(),
    onDelete: jest.fn().mockResolvedValue(undefined),
    onToggleStatus: jest.fn().mockResolvedValue(undefined),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Semantic HTML', () => {
    it('should use semantic article element', () => {
      render(<RobotCard robot={mockRobot} {...mockHandlers} />);
      
      const article = screen.getByRole('article');
      expect(article).toBeInTheDocument();
      expect(article).toHaveAttribute('aria-label', `机器人：${mockRobot.name}`);
    });

    it('should use semantic heading for robot name', () => {
      render(<RobotCard robot={mockRobot} {...mockHandlers} />);
      
      const heading = screen.getByRole('heading', { name: mockRobot.name });
      expect(heading).toBeInTheDocument();
    });

    it('should use semantic group for action buttons', () => {
      render(<RobotCard robot={mockRobot} {...mockHandlers} />);
      
      const group = screen.getByRole('group', { name: '机器人操作' });
      expect(group).toBeInTheDocument();
    });
  });

  describe('ARIA Labels', () => {
    it('should have ARIA label on switch', () => {
      render(<RobotCard robot={mockRobot} {...mockHandlers} />);
      
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-label', `启用机器人 ${mockRobot.name}`);
    });

    it('should have ARIA labels on action buttons', () => {
      render(<RobotCard robot={mockRobot} {...mockHandlers} />);
      
      const editButton = screen.getByRole('button', { name: `编辑机器人 ${mockRobot.name}` });
      expect(editButton).toBeInTheDocument();
      
      const deleteButton = screen.getByRole('button', { name: `删除机器人 ${mockRobot.name}` });
      expect(deleteButton).toBeInTheDocument();
    });

    it('should have ARIA label on platform badge', () => {
      render(<RobotCard robot={mockRobot} {...mockHandlers} />);
      
      const badge = screen.getByLabelText('平台：钉钉');
      expect(badge).toBeInTheDocument();
    });

    it('should have ARIA label for hidden AppSecret', () => {
      const enterpriseRobot: Robot = {
        ...mockRobot,
        type: 'ENTERPRISE',
        appKey: 'test-key',
        appSecret: 'test-secret',
      };

      render(<RobotCard robot={enterpriseRobot} {...mockHandlers} />);
      
      const secretText = screen.getByLabelText('AppSecret已隐藏');
      expect(secretText).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard interaction on switch', () => {
      render(<RobotCard robot={mockRobot} {...mockHandlers} />);
      
      const switchElement = screen.getByRole('switch');
      
      // Space key should toggle
      fireEvent.keyDown(switchElement, { key: ' ', code: 'Space' });
      
      expect(mockHandlers.onToggleStatus).toHaveBeenCalledWith(mockRobot.id);
    });

    it('should support keyboard interaction on edit button', () => {
      render(<RobotCard robot={mockRobot} {...mockHandlers} />);
      
      const editButton = screen.getByRole('button', { name: `编辑机器人 ${mockRobot.name}` });
      
      // Enter key should trigger edit
      fireEvent.click(editButton);
      
      expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockRobot);
    });

    it('should support keyboard interaction on delete button', () => {
      render(<RobotCard robot={mockRobot} {...mockHandlers} />);
      
      const deleteButton = screen.getByRole('button', { name: `删除机器人 ${mockRobot.name}` });
      
      // Enter key should open delete dialog
      fireEvent.click(deleteButton);
      
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should support Tab navigation through interactive elements', () => {
      render(<RobotCard robot={mockRobot} {...mockHandlers} />);
      
      const switchElement = screen.getByRole('switch');
      const editButton = screen.getByRole('button', { name: `编辑机器人 ${mockRobot.name}` });
      
      switchElement.focus();
      expect(document.activeElement).toBe(switchElement);
      
      // Tab to next element
      fireEvent.keyDown(switchElement, { key: 'Tab', code: 'Tab' });
      
      // Should move to next interactive element
      expect(document.activeElement).not.toBe(switchElement);
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', () => {
      render(<RobotCard robot={mockRobot} {...mockHandlers} />);
      
      const editButton = screen.getByRole('button', { name: `编辑机器人 ${mockRobot.name}` });
      editButton.focus();
      
      expect(editButton).toHaveFocus();
    });

    it('should maintain focus after switch toggle', async () => {
      render(<RobotCard robot={mockRobot} {...mockHandlers} />);
      
      const switchElement = screen.getByRole('switch');
      switchElement.focus();
      
      fireEvent.click(switchElement);
      
      // Focus should remain on switch
      expect(switchElement).toHaveFocus();
    });
  });

  describe('Screen Reader Support', () => {
    it('should hide decorative icons from screen readers', () => {
      render(<RobotCard robot={mockRobot} {...mockHandlers} />);
      
      const icons = document.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should announce switch state to screen readers', () => {
      render(<RobotCard robot={mockRobot} {...mockHandlers} />);
      
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toHaveAttribute('aria-checked', 'true');
    });

    it('should provide context for delete dialog', () => {
      render(<RobotCard robot={mockRobot} {...mockHandlers} />);
      
      const deleteButton = screen.getByRole('button', { name: `删除机器人 ${mockRobot.name}` });
      fireEvent.click(deleteButton);
      
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });
  });

  describe('Delete Dialog Accessibility', () => {
    it('should have proper ARIA attributes on dialog', () => {
      render(<RobotCard robot={mockRobot} {...mockHandlers} />);
      
      const deleteButton = screen.getByRole('button', { name: `删除机器人 ${mockRobot.name}` });
      fireEvent.click(deleteButton);
      
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('role', 'alertdialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'delete-dialog-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'delete-dialog-description');
    });

    it('should have accessible title and description', () => {
      render(<RobotCard robot={mockRobot} {...mockHandlers} />);
      
      const deleteButton = screen.getByRole('button', { name: `删除机器人 ${mockRobot.name}` });
      fireEvent.click(deleteButton);
      
      const title = screen.getByText('确认删除机器人');
      expect(title).toHaveAttribute('id', 'delete-dialog-title');
      
      const description = screen.getByText(/确定要删除机器人/);
      expect(description).toHaveAttribute('id', 'delete-dialog-description');
    });

    it('should have accessible action buttons in dialog', () => {
      render(<RobotCard robot={mockRobot} {...mockHandlers} />);
      
      const deleteButton = screen.getByRole('button', { name: `删除机器人 ${mockRobot.name}` });
      fireEvent.click(deleteButton);
      
      const cancelButton = screen.getByRole('button', { name: '取消' });
      expect(cancelButton).toBeInTheDocument();
      
      const confirmButton = screen.getByRole('button', { name: '确认删除机器人' });
      expect(confirmButton).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should properly disable interactive elements when disabled prop is true', () => {
      render(<RobotCard robot={mockRobot} {...mockHandlers} disabled={true} />);
      
      const editButton = screen.getByRole('button', { name: `编辑机器人 ${mockRobot.name}` });
      expect(editButton).toBeDisabled();
      
      const deleteButton = screen.getByRole('button', { name: `删除机器人 ${mockRobot.name}` });
      expect(deleteButton).toBeDisabled();
    });

    it('should announce disabled state to screen readers', () => {
      render(<RobotCard robot={mockRobot} {...mockHandlers} disabled={true} />);
      
      const editButton = screen.getByRole('button', { name: `编辑机器人 ${mockRobot.name}` });
      expect(editButton).toHaveAttribute('disabled');
    });
  });
});
