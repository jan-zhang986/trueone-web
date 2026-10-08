/**
 * useMessageTemplate Property-Based Tests
 * useMessageTemplate Hook 属性测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import * as fc from 'fast-check';
import { useMessageTemplate } from '../useMessageTemplate';
import * as messageService from '@/services/message';
import type { TemplateVariable } from '@/types/message';

// Mock message service
vi.mock('@/services/message');

describe('useMessageTemplate - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Feature: project-message-log-migration, Property 11: 模板变量插入正确性
  /**
   * **Validates: Requirements 3.2, 3.4**
   * 
   * Property: For any template content and cursor position,
   * after inserting a variable, the variable placeholder should appear at the specified cursor position
   */
  it('Property 11: should insert variable at correct cursor position', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate template content
        fc.string({ minLength: 0, maxLength: 100 }),
        // Generate cursor position (will be clamped to string length)
        fc.nat(),
        // Generate variable
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string(),
          fieldSource: fc.string(),
          type: fc.constantFrom('string', 'number', 'date', 'user', 'object'),
        }),
        // Target field
        fc.constantFrom('subject', 'template'),
        async (
          initialContent: string,
          rawCursorPos: number,
          variable: TemplateVariable,
          targetField: 'subject' | 'template'
        ) => {
          // Clamp cursor position to valid range
          const cursorPos = Math.min(rawCursorPos, initialContent.length);

          const { result } = renderHook(() => useMessageTemplate());

          // Set initial state
          act(() => {
            if (targetField === 'subject') {
              result.current.setEditedSubject(initialContent);
            } else {
              result.current.setEditedTemplate(initialContent);
            }
            result.current.setCursorPosition(cursorPos);
          });

          // Insert variable
          act(() => {
            result.current.insertVariable(variable, targetField);
          });

          // Get the updated content
          const updatedContent = targetField === 'subject'
            ? result.current.editedSubject
            : result.current.editedTemplate;

          // Property: Variable placeholder should be at cursor position
          const expectedPlaceholder = `\${${variable.id}}`;
          const expectedContent =
            initialContent.slice(0, cursorPos) +
            expectedPlaceholder +
            initialContent.slice(cursorPos);

          expect(updatedContent).toBe(expectedContent);

          // Property: Cursor should move past the inserted variable
          expect(result.current.cursorPosition).toBe(cursorPos + expectedPlaceholder.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional unit tests for variable insertion
  it('should insert variable at beginning of template', () => {
    const { result } = renderHook(() => useMessageTemplate());

    act(() => {
      result.current.setEditedTemplate('Hello World');
      result.current.setCursorPosition(0);
    });

    const variable: TemplateVariable = {
      id: 'userName',
      name: '用户名',
      fieldSource: 'user',
      type: 'string',
    };

    act(() => {
      result.current.insertVariable(variable, 'template');
    });

    expect(result.current.editedTemplate).toBe('${userName}Hello World');
    expect(result.current.cursorPosition).toBe(11); // Length of ${userName}
  });

  it('should insert variable at end of template', () => {
    const { result } = renderHook(() => useMessageTemplate());

    const initialTemplate = 'Hello World';
    act(() => {
      result.current.setEditedTemplate(initialTemplate);
      result.current.setCursorPosition(initialTemplate.length);
    });

    const variable: TemplateVariable = {
      id: 'userName',
      name: '用户名',
      fieldSource: 'user',
      type: 'string',
    };

    act(() => {
      result.current.insertVariable(variable, 'template');
    });

    expect(result.current.editedTemplate).toBe('Hello World${userName}');
    expect(result.current.cursorPosition).toBe(22); // 11 + 11
  });

  it('should insert variable in middle of template', () => {
    const { result } = renderHook(() => useMessageTemplate());

    act(() => {
      result.current.setEditedTemplate('Hello World');
      result.current.setCursorPosition(6); // After "Hello "
    });

    const variable: TemplateVariable = {
      id: 'userName',
      name: '用户名',
      fieldSource: 'user',
      type: 'string',
    };

    act(() => {
      result.current.insertVariable(variable, 'template');
    });

    expect(result.current.editedTemplate).toBe('Hello ${userName}World');
    expect(result.current.cursorPosition).toBe(17); // 6 + 11
  });

  it('should insert variable into subject field', () => {
    const { result } = renderHook(() => useMessageTemplate());

    act(() => {
      result.current.setEditedSubject('Test Subject');
      result.current.setCursorPosition(5); // After "Test "
    });

    const variable: TemplateVariable = {
      id: 'eventName',
      name: '事件名称',
      fieldSource: 'event',
      type: 'string',
    };

    act(() => {
      result.current.insertVariable(variable, 'subject');
    });

    expect(result.current.editedSubject).toBe('Test ${eventName}Subject');
    expect(result.current.cursorPosition).toBe(18); // 5 + 13
  });

  it('should insert multiple variables sequentially', () => {
    const { result } = renderHook(() => useMessageTemplate());

    act(() => {
      result.current.setEditedTemplate('');
      result.current.setCursorPosition(0);
    });

    const variable1: TemplateVariable = {
      id: 'userName',
      name: '用户名',
      fieldSource: 'user',
      type: 'string',
    };

    const variable2: TemplateVariable = {
      id: 'eventName',
      name: '事件名称',
      fieldSource: 'event',
      type: 'string',
    };

    // Insert first variable
    act(() => {
      result.current.insertVariable(variable1, 'template');
    });

    expect(result.current.editedTemplate).toBe('${userName}');

    // Insert second variable
    act(() => {
      result.current.insertVariable(variable2, 'template');
    });

    expect(result.current.editedTemplate).toBe('${userName}${eventName}');
    expect(result.current.cursorPosition).toBe(24); // 11 + 13
  });

  // Feature: project-message-log-migration, Property 13: 模板保存往返
  /**
   * **Validates: Requirements 3.6, 6.3**
   * 
   * Property: For any template, after saving and reloading,
   * the template content should match what was saved
   */
  it('Property 13: should persist template changes after save and reload', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate template save parameters
        fc.record({
          projectId: fc.string(),
          taskType: fc.string(),
          event: fc.string(),
          robotId: fc.string(),
          receiverIds: fc.array(fc.string()),
          subject: fc.string(),
          template: fc.string(),
        }),
        async (saveParams) => {
          // Mock initial template load
          const initialTemplate = {
            id: 'template-1',
            eventType: saveParams.event,
            subject: 'Old Subject',
            template: 'Old Template',
            defaultSubject: 'Default Subject',
            defaultTemplate: 'Default Template',
            previewSubject: 'Preview Subject',
            previewTemplate: 'Preview Template',
            useDefaultSubject: false,
            useDefaultTemplate: false,
            variables: [],
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
            robotId: saveParams.robotId,
            robotName: 'Test Robot',
            taskType: saveParams.taskType,
            taskTypeName: 'Test Task',
            event: saveParams.event,
            eventName: 'Test Event',
            receiverIds: saveParams.receiverIds,
          };

          vi.mocked(messageService.getMessageDetail).mockResolvedValue(initialTemplate);
          vi.mocked(messageService.getMessageFields).mockResolvedValue({
            fieldList: [],
            fieldSourceList: [],
          });

          const { result } = renderHook(() => useMessageTemplate());

          // Load initial template
          await act(async () => {
            await result.current.loadTemplate({
              projectId: saveParams.projectId,
              taskType: saveParams.taskType,
              event: saveParams.event,
              robotId: saveParams.robotId,
            });
          });

          await waitFor(() => {
            expect(result.current.loading).toBe(false);
          });

          // Edit template
          act(() => {
            result.current.setEditedSubject(saveParams.subject);
            result.current.setEditedTemplate(saveParams.template);
          });

          // Mock save and reload with updated values
          vi.mocked(messageService.updateMessageTemplate).mockResolvedValue(undefined);
          vi.mocked(messageService.getMessageDetail).mockResolvedValue({
            ...initialTemplate,
            subject: saveParams.subject,
            template: saveParams.template,
          });

          // Save template
          await act(async () => {
            await result.current.saveTemplate(saveParams);
          });

          await waitFor(() => {
            expect(result.current.saving).toBe(false);
          });

          // Property: Reloaded template should match saved values
          expect(result.current.template?.subject).toBe(saveParams.subject);
          expect(result.current.template?.template).toBe(saveParams.template);
          expect(result.current.editedSubject).toBe(saveParams.subject);
          expect(result.current.editedTemplate).toBe(saveParams.template);

          // Verify updateMessageTemplate was called with correct params
          expect(messageService.updateMessageTemplate).toHaveBeenCalledWith(saveParams);
        }
      ),
      { numRuns: 50 }
    );
  });

  // Additional unit test for template save and reload
  it('should save template and reload with updated values', async () => {
    const mockTemplate = {
      id: 'template-1',
      eventType: 'CREATE',
      subject: 'Original Subject',
      template: 'Original Template',
      defaultSubject: 'Default Subject',
      defaultTemplate: 'Default Template',
      previewSubject: 'Preview Subject',
      previewTemplate: 'Preview Template',
      useDefaultSubject: false,
      useDefaultTemplate: false,
      variables: [],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      robotId: 'robot-1',
      robotName: 'Test Robot',
      taskType: 'API_CASE',
      taskTypeName: 'API用例',
      event: 'CREATE',
      eventName: '创建',
      receiverIds: ['user-1'],
    };

    vi.mocked(messageService.getMessageDetail).mockResolvedValue(mockTemplate);
    vi.mocked(messageService.getMessageFields).mockResolvedValue({
      fieldList: [],
      fieldSourceList: [],
    });

    const { result } = renderHook(() => useMessageTemplate());

    // Load template
    await act(async () => {
      await result.current.loadTemplate({
        projectId: 'test-project',
        taskType: 'API_CASE',
        event: 'CREATE',
        robotId: 'robot-1',
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.editedSubject).toBe('Original Subject');
    expect(result.current.editedTemplate).toBe('Original Template');

    // Edit template
    act(() => {
      result.current.setEditedSubject('Updated Subject');
      result.current.setEditedTemplate('Updated Template');
    });

    // Mock save and reload
    vi.mocked(messageService.updateMessageTemplate).mockResolvedValue(undefined);
    vi.mocked(messageService.getMessageDetail).mockResolvedValue({
      ...mockTemplate,
      subject: 'Updated Subject',
      template: 'Updated Template',
    });

    // Save
    await act(async () => {
      await result.current.saveTemplate({
        projectId: 'test-project',
        taskType: 'API_CASE',
        event: 'CREATE',
        robotId: 'robot-1',
        receiverIds: ['user-1'],
        subject: 'Updated Subject',
        template: 'Updated Template',
      });
    });

    await waitFor(() => {
      expect(result.current.saving).toBe(false);
    });

    // Verify updated values
    expect(result.current.template?.subject).toBe('Updated Subject');
    expect(result.current.template?.template).toBe('Updated Template');
    expect(result.current.editedSubject).toBe('Updated Subject');
    expect(result.current.editedTemplate).toBe('Updated Template');
  });

  // Test hasChanges detection
  it('should detect unsaved changes', async () => {
    const mockTemplate = {
      id: 'template-1',
      eventType: 'CREATE',
      subject: 'Original Subject',
      template: 'Original Template',
      defaultSubject: 'Default Subject',
      defaultTemplate: 'Default Template',
      previewSubject: 'Preview Subject',
      previewTemplate: 'Preview Template',
      useDefaultSubject: false,
      useDefaultTemplate: false,
      variables: [],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      robotId: 'robot-1',
      robotName: 'Test Robot',
      taskType: 'API_CASE',
      taskTypeName: 'API用例',
      event: 'CREATE',
      eventName: '创建',
      receiverIds: ['user-1'],
    };

    vi.mocked(messageService.getMessageDetail).mockResolvedValue(mockTemplate);

    const { result } = renderHook(() => useMessageTemplate());

    await act(async () => {
      await result.current.loadTemplate({
        projectId: 'test-project',
        taskType: 'API_CASE',
        event: 'CREATE',
        robotId: 'robot-1',
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // No changes initially
    expect(result.current.hasChanges()).toBe(false);

    // Make changes
    act(() => {
      result.current.setEditedSubject('Modified Subject');
    });

    // Should detect changes
    expect(result.current.hasChanges()).toBe(true);

    // Revert changes
    act(() => {
      result.current.setEditedSubject('Original Subject');
    });

    // Should not detect changes
    expect(result.current.hasChanges()).toBe(false);
  });
});
