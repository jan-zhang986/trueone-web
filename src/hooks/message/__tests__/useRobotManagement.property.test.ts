/**
 * useRobotManagement Property-Based Tests
 * useRobotManagement Hook 属性测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { useRobotManagement } from '../useRobotManagement';
import * as robotService from '@/services/message';
import type { Robot, RobotAddParams } from '@/types/message';

// Mock robot service
vi.mock('@/services/message');

describe('useRobotManagement - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Feature: project-message-log-migration, Property 9: 机器人删除级联清理
  /**
   * **Validates: Requirements 2.7, 2.9**
   * 
   * Property: For any robot and associated message configs,
   * after deleting the robot, it should be removed from the system
   */
  it('Property 9: should remove robot from system after deletion', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a robot to delete
        fc.record({
          id: fc.string(),
          projectId: fc.string(),
          name: fc.string(),
          platform: fc.constantFrom('WE_COM', 'DING_TALK', 'LARK', 'CUSTOM'),
          webhook: fc.option(fc.string()),
          enable: fc.boolean(),
          createdAt: fc.string(),
          updatedAt: fc.string(),
          createUser: fc.string(),
          updateUser: fc.string(),
        }),
        async (robotToDelete: Robot) => {
          // Setup initial robot list including the robot to delete
          const initialRobots: Robot[] = [
            robotToDelete,
            {
              ...robotToDelete,
              id: 'other-robot-1',
              name: 'Other Robot 1',
            },
            {
              ...robotToDelete,
              id: 'other-robot-2',
              name: 'Other Robot 2',
            },
          ];

          // Mock initial load
          vi.mocked(robotService.getRobotList).mockResolvedValue(initialRobots);

          const { result } = renderHook(() => useRobotManagement(robotToDelete.projectId));

          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });

          // Verify robot exists before deletion
          expect(result.current.robots).toHaveLength(3);
          expect(result.current.robots.find(r => r.id === robotToDelete.id)).toBeDefined();

          // Mock deletion and subsequent reload
          vi.mocked(robotService.deleteRobot).mockResolvedValue(undefined);
          vi.mocked(robotService.getRobotList).mockResolvedValue(
            initialRobots.filter(r => r.id !== robotToDelete.id)
          );

          // Delete the robot
          await result.current.removeRobot(robotToDelete.id);

          await waitFor(() => {
            expect(result.current.submitting).toBe(false);
          });

          // Property: Robot should be removed from the list
          expect(result.current.robots).toHaveLength(2);
          expect(result.current.robots.find(r => r.id === robotToDelete.id)).toBeUndefined();
          
          // Verify deleteRobot was called with correct ID
          expect(robotService.deleteRobot).toHaveBeenCalledWith(robotToDelete.id);
        }
      ),
      { numRuns: 50 }
    );
  });

  // Additional unit test for robot deletion
  it('should delete robot and refresh list', async () => {
    const mockRobots: Robot[] = [
      {
        id: 'robot-1',
        projectId: 'test-project',
        name: 'Robot 1',
        platform: 'DING_TALK',
        enable: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        createUser: 'user-1',
        updateUser: 'user-1',
      },
      {
        id: 'robot-2',
        projectId: 'test-project',
        name: 'Robot 2',
        platform: 'WE_COM',
        enable: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        createUser: 'user-1',
        updateUser: 'user-1',
      },
    ];

    vi.mocked(robotService.getRobotList).mockResolvedValue(mockRobots);

    const { result } = renderHook(() => useRobotManagement('test-project'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.robots).toHaveLength(2);

    // Mock deletion
    vi.mocked(robotService.deleteRobot).mockResolvedValue(undefined);
    vi.mocked(robotService.getRobotList).mockResolvedValue([mockRobots[1]]);

    await result.current.removeRobot('robot-1');

    await waitFor(() => {
      expect(result.current.submitting).toBe(false);
    });

    expect(result.current.robots).toHaveLength(1);
    expect(result.current.robots[0].id).toBe('robot-2');
    expect(robotService.deleteRobot).toHaveBeenCalledWith('robot-1');
  });

  // Feature: project-message-log-migration, Property 10: 机器人状态切换往返
  /**
   * **Validates: Requirements 2.8**
   * 
   * Property: For any robot, toggling enable status twice should return to original state
   */
  it('Property 10: should maintain robot state after double toggle', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a robot with random initial state
        fc.record({
          id: fc.string(),
          projectId: fc.string(),
          name: fc.string(),
          platform: fc.constantFrom('WE_COM', 'DING_TALK', 'LARK', 'CUSTOM'),
          webhook: fc.option(fc.string()),
          enable: fc.boolean(),
          createdAt: fc.string(),
          updatedAt: fc.string(),
          createUser: fc.string(),
          updateUser: fc.string(),
        }),
        async (robot: Robot) => {
          const originalEnable = robot.enable;

          // Mock initial load
          vi.mocked(robotService.getRobotList).mockResolvedValue([robot]);

          const { result } = renderHook(() => useRobotManagement(robot.projectId));

          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });

          // Verify initial state
          expect(result.current.robots[0].enable).toBe(originalEnable);

          // Mock first toggle
          vi.mocked(robotService.toggleRobot).mockResolvedValue(undefined);
          vi.mocked(robotService.getRobotList).mockResolvedValue([
            { ...robot, enable: !originalEnable },
          ]);

          // First toggle
          await result.current.toggleRobotStatus(robot.id);

          await waitFor(() => {
            expect(result.current.submitting).toBe(false);
          });

          expect(result.current.robots[0].enable).toBe(!originalEnable);

          // Mock second toggle (back to original)
          vi.mocked(robotService.getRobotList).mockResolvedValue([
            { ...robot, enable: originalEnable },
          ]);

          // Second toggle
          await result.current.toggleRobotStatus(robot.id);

          await waitFor(() => {
            expect(result.current.submitting).toBe(false);
          });

          // Property: Should return to original state
          expect(result.current.robots[0].enable).toBe(originalEnable);
          
          // Verify toggleRobot was called twice
          expect(robotService.toggleRobot).toHaveBeenCalledTimes(2);
          expect(robotService.toggleRobot).toHaveBeenCalledWith(robot.id);
        }
      ),
      { numRuns: 50 }
    );
  });

  // Additional unit test for robot status toggle
  it('should toggle robot status correctly', async () => {
    const mockRobot: Robot = {
      id: 'robot-1',
      projectId: 'test-project',
      name: 'Test Robot',
      platform: 'DING_TALK',
      enable: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      createUser: 'user-1',
      updateUser: 'user-1',
    };

    vi.mocked(robotService.getRobotList).mockResolvedValue([mockRobot]);

    const { result } = renderHook(() => useRobotManagement('test-project'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.robots[0].enable).toBe(true);

    // Mock toggle to disabled
    vi.mocked(robotService.toggleRobot).mockResolvedValue(undefined);
    vi.mocked(robotService.getRobotList).mockResolvedValue([
      { ...mockRobot, enable: false },
    ]);

    await result.current.toggleRobotStatus('robot-1');

    await waitFor(() => {
      expect(result.current.submitting).toBe(false);
    });

    expect(result.current.robots[0].enable).toBe(false);

    // Mock toggle back to enabled
    vi.mocked(robotService.getRobotList).mockResolvedValue([
      { ...mockRobot, enable: true },
    ]);

    await result.current.toggleRobotStatus('robot-1');

    await waitFor(() => {
      expect(result.current.submitting).toBe(false);
    });

    expect(result.current.robots[0].enable).toBe(true);
    expect(robotService.toggleRobot).toHaveBeenCalledTimes(2);
  });
});
