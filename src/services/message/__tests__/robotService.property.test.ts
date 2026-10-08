/**
 * Robot Service Property-Based Tests
 * 机器人服务属性测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  getRobotList,
  addRobot,
  updateRobot,
} from '../robotService';
import { http } from '@/utils/request';
import type { Robot, RobotAddParams, RobotEditParams, RobotPlatform, DingtalkType } from '@/types/message';

// Mock http client
vi.mock('@/utils/request', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('robotService - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Feature: project-message-log-migration, Property 28: 机器人配置持久化往返
  /**
   * **Validates: Requirements 6.2**
   * 
   * Property: For any robot config, after saving and reloading,
   * the robot data should be identical to what was saved
   */
  it('Property 28: should persist and retrieve robot config correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary robot config
        fc.record({
          projectId: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          platform: fc.constantFrom<RobotPlatform>('WE_COM', 'DING_TALK', 'LARK', 'CUSTOM', 'IN_SITE', 'MAIL'),
          type: fc.option(fc.constantFrom<DingtalkType>('CUSTOM', 'ENTERPRISE'), { nil: undefined }),
          webhook: fc.option(fc.webUrl(), { nil: undefined }),
          appKey: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          appSecret: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          enable: fc.boolean(),
        }),
        async (robotData: RobotAddParams) => {
          // Generate a unique ID for the robot
          const robotId = `robot-${Math.random().toString(36).substring(7)}`;
          const timestamp = new Date().toISOString();

          // Mock the robot that will be returned after creation
          const createdRobot: Robot = {
            id: robotId,
            projectId: robotData.projectId,
            name: robotData.name,
            platform: robotData.platform,
            type: robotData.type,
            webhook: robotData.webhook,
            appKey: robotData.appKey,
            appSecret: robotData.appSecret,
            enable: robotData.enable,
            createdAt: timestamp,
            updatedAt: timestamp,
            createUser: 'test-user',
            updateUser: 'test-user',
          };

          // Mock add operation
          vi.mocked(http.post).mockResolvedValue(createdRobot);

          // Create the robot
          const addedRobot = await addRobot(robotData);

          // Verify add was called with correct data
          expect(http.post).toHaveBeenCalledWith(
            expect.any(String),
            robotData
          );

          // Property: Returned robot should match input data
          expect(addedRobot.name).toBe(robotData.name);
          expect(addedRobot.platform).toBe(robotData.platform);
          expect(addedRobot.enable).toBe(robotData.enable);
          expect(addedRobot.projectId).toBe(robotData.projectId);

          if (robotData.type !== undefined) {
            expect(addedRobot.type).toBe(robotData.type);
          }
          if (robotData.webhook !== undefined) {
            expect(addedRobot.webhook).toBe(robotData.webhook);
          }
          if (robotData.appKey !== undefined) {
            expect(addedRobot.appKey).toBe(robotData.appKey);
          }
          if (robotData.appSecret !== undefined) {
            expect(addedRobot.appSecret).toBe(robotData.appSecret);
          }

          // Mock retrieval to return the created robot
          vi.mocked(http.get).mockResolvedValue([createdRobot]);

          // Retrieve the robot list
          const retrievedRobots = await getRobotList(robotData.projectId);

          // Property: Retrieved robot should match created robot
          expect(retrievedRobots).toBeDefined();
          expect(retrievedRobots.length).toBeGreaterThan(0);

          const retrievedRobot = retrievedRobots.find(r => r.id === robotId);
          expect(retrievedRobot).toBeDefined();
          expect(retrievedRobot?.name).toBe(robotData.name);
          expect(retrievedRobot?.platform).toBe(robotData.platform);
          expect(retrievedRobot?.enable).toBe(robotData.enable);
          expect(retrievedRobot?.projectId).toBe(robotData.projectId);

          if (robotData.type !== undefined) {
            expect(retrievedRobot?.type).toBe(robotData.type);
          }
          if (robotData.webhook !== undefined) {
            expect(retrievedRobot?.webhook).toBe(robotData.webhook);
          }
          if (robotData.appKey !== undefined) {
            expect(retrievedRobot?.appKey).toBe(robotData.appKey);
          }
          if (robotData.appSecret !== undefined) {
            expect(retrievedRobot?.appSecret).toBe(robotData.appSecret);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional property test for update operation
  it('Property 28 (Update): should persist and retrieve updated robot config correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial robot
        fc.record({
          id: fc.string({ minLength: 1 }),
          projectId: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          platform: fc.constantFrom<RobotPlatform>('WE_COM', 'DING_TALK', 'LARK', 'CUSTOM'),
          type: fc.option(fc.constantFrom<DingtalkType>('CUSTOM', 'ENTERPRISE'), { nil: undefined }),
          webhook: fc.option(fc.webUrl(), { nil: undefined }),
          appKey: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          appSecret: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          enable: fc.boolean(),
        }),
        // Generate updated data
        fc.record({
          name: fc.string({ minLength: 1 }),
          webhook: fc.option(fc.webUrl(), { nil: undefined }),
          appKey: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
          appSecret: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        }),
        async (initialRobot, updates) => {
          const timestamp = new Date().toISOString();

          // Create update params
          const updateParams: RobotEditParams = {
            id: initialRobot.id,
            projectId: initialRobot.projectId,
            name: updates.name,
            platform: initialRobot.platform,
            type: initialRobot.type,
            webhook: updates.webhook,
            appKey: updates.appKey,
            appSecret: updates.appSecret,
            enable: initialRobot.enable,
          };

          // Mock the updated robot
          const updatedRobot: Robot = {
            id: initialRobot.id,
            projectId: initialRobot.projectId,
            name: updates.name,
            platform: initialRobot.platform,
            type: initialRobot.type,
            webhook: updates.webhook,
            appKey: updates.appKey,
            appSecret: updates.appSecret,
            enable: initialRobot.enable,
            createdAt: timestamp,
            updatedAt: timestamp,
            createUser: 'test-user',
            updateUser: 'test-user',
          };

          // Mock update operation
          vi.mocked(http.post).mockResolvedValue(updatedRobot);

          // Update the robot
          const result = await updateRobot(updateParams);

          // Verify update was called with correct data
          expect(http.post).toHaveBeenCalledWith(
            expect.any(String),
            updateParams
          );

          // Property: Returned robot should match updated data
          expect(result.id).toBe(initialRobot.id);
          expect(result.name).toBe(updates.name);
          expect(result.platform).toBe(initialRobot.platform);

          if (updates.webhook !== undefined) {
            expect(result.webhook).toBe(updates.webhook);
          }
          if (updates.appKey !== undefined) {
            expect(result.appKey).toBe(updates.appKey);
          }
          if (updates.appSecret !== undefined) {
            expect(result.appSecret).toBe(updates.appSecret);
          }

          // Mock retrieval
          vi.mocked(http.get).mockResolvedValue([updatedRobot]);

          // Retrieve the robot list
          const retrievedRobots = await getRobotList(initialRobot.projectId);

          // Property: Retrieved robot should match updated robot
          const retrievedRobot = retrievedRobots.find(r => r.id === initialRobot.id);
          expect(retrievedRobot).toBeDefined();
          expect(retrievedRobot?.name).toBe(updates.name);

          if (updates.webhook !== undefined) {
            expect(retrievedRobot?.webhook).toBe(updates.webhook);
          }
          if (updates.appKey !== undefined) {
            expect(retrievedRobot?.appKey).toBe(updates.appKey);
          }
          if (updates.appSecret !== undefined) {
            expect(retrievedRobot?.appSecret).toBe(updates.appSecret);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional unit test with specific example
  it('should create and retrieve robot with all fields', async () => {
    const robotData: RobotAddParams = {
      projectId: 'project-123',
      name: 'Test Robot',
      platform: 'DING_TALK',
      type: 'ENTERPRISE',
      webhook: 'https://example.com/webhook',
      appKey: 'test-app-key',
      appSecret: 'test-app-secret',
      enable: true,
    };

    const createdRobot: Robot = {
      id: 'robot-123',
      projectId: 'project-123',
      name: 'Test Robot',
      platform: 'DING_TALK',
      type: 'ENTERPRISE',
      webhook: 'https://example.com/webhook',
      appKey: 'test-app-key',
      appSecret: 'test-app-secret',
      enable: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      createUser: 'user-1',
      updateUser: 'user-1',
    };

    // Mock create
    vi.mocked(http.post).mockResolvedValue(createdRobot);
    const addedRobot = await addRobot(robotData);

    expect(addedRobot).toEqual(createdRobot);
    expect(http.post).toHaveBeenCalledWith(
      expect.any(String),
      robotData
    );

    // Mock retrieve
    vi.mocked(http.get).mockResolvedValue([createdRobot]);
    const retrievedRobots = await getRobotList('project-123');

    expect(retrievedRobots).toHaveLength(1);
    expect(retrievedRobots[0]).toEqual(createdRobot);
  });

  it('should update and retrieve robot with modified fields', async () => {
    const updateData: RobotEditParams = {
      id: 'robot-456',
      projectId: 'project-456',
      name: 'Updated Robot Name',
      platform: 'WE_COM',
      webhook: 'https://updated.com/webhook',
      enable: false,
    };

    const updatedRobot: Robot = {
      id: 'robot-456',
      projectId: 'project-456',
      name: 'Updated Robot Name',
      platform: 'WE_COM',
      webhook: 'https://updated.com/webhook',
      enable: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      createUser: 'user-1',
      updateUser: 'user-2',
    };

    // Mock update
    vi.mocked(http.post).mockResolvedValue(updatedRobot);
    const result = await updateRobot(updateData);

    expect(result).toEqual(updatedRobot);
    expect(http.post).toHaveBeenCalledWith(
      expect.any(String),
      updateData
    );

    // Mock retrieve
    vi.mocked(http.get).mockResolvedValue([updatedRobot]);
    const retrievedRobots = await getRobotList('project-456');

    expect(retrievedRobots).toHaveLength(1);
    expect(retrievedRobots[0].name).toBe('Updated Robot Name');
    expect(retrievedRobots[0].webhook).toBe('https://updated.com/webhook');
    expect(retrievedRobots[0].enable).toBe(false);
  });

  it('should handle minimal robot data', async () => {
    const minimalRobot: RobotAddParams = {
      projectId: 'project-min',
      name: 'Minimal Robot',
      platform: 'CUSTOM',
      enable: true,
    };

    const createdRobot: Robot = {
      id: 'robot-min',
      projectId: 'project-min',
      name: 'Minimal Robot',
      platform: 'CUSTOM',
      enable: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      createUser: 'user-1',
      updateUser: 'user-1',
    };

    vi.mocked(http.post).mockResolvedValue(createdRobot);
    const addedRobot = await addRobot(minimalRobot);

    expect(addedRobot.name).toBe(minimalRobot.name);
    expect(addedRobot.platform).toBe(minimalRobot.platform);
    expect(addedRobot.enable).toBe(minimalRobot.enable);

    vi.mocked(http.get).mockResolvedValue([createdRobot]);
    const retrievedRobots = await getRobotList('project-min');

    expect(retrievedRobots[0].name).toBe(minimalRobot.name);
    expect(retrievedRobots[0].platform).toBe(minimalRobot.platform);
  });
});
