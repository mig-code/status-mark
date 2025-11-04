import * as vscode from 'vscode';

// ============================================================================
// Types
// ============================================================================

type BadgeConfig = {
  name: string;
  color: string;
  emoji: string;
};

type ColorQuickPickItem = vscode.QuickPickItem & {
  value?: string;
  isCustom?: boolean;
};

type EmojiQuickPickItem = vscode.QuickPickItem & {
  value?: string;
  isCustom?: boolean;
};

type ApplyColorOptions = {
  skipConfirmation?: boolean;
  silent?: boolean;
};

// ============================================================================
// Constants
// ============================================================================

const CONFIGURATION_KEYS = {
  NAME: 'statusmark.name',
  COLOR: 'statusmark.color',
  EMOJI: 'statusmark.emoji',
} as const;

const STATUS_BAR_KEYS = {
  BACKGROUND: 'statusBar.background',
  FOREGROUND: 'statusBar.foreground',
} as const;

const BADGE_COLOR_PALETTE: Array<{ value: string; name: string }> = [
  { value: '#FFFFFF', name: 'Pure White' },
  { value: '#000000', name: 'Pure Black' },
  { value: '#F97316', name: 'Sunset Orange' },
  { value: '#EF4444', name: 'Crimson' },
  { value: '#14B8A6', name: 'Tropical Teal' },
  { value: '#0EA5E9', name: 'Sky Blue' },
  { value: '#8B5CF6', name: 'Amethyst' },
  { value: '#F472B6', name: 'Rose Pink' },
  { value: '#22D3EE', name: 'Electric Cyan' },
  { value: '#FACC15', name: 'Golden Glow' },
  { value: '', name: 'Theme Default' },
];

const STATUS_BAR_COLOR_PALETTE: Array<{ value: string; name: string }> = [
  { value: '#1E3A8A', name: 'Cobalt Blue' },
  { value: '#059669', name: 'Emerald Mist' },
  { value: '#0EA5E9', name: 'Azure Pulse' },
  { value: '#F59E0B', name: 'Amber Flame' },
  { value: '#E11D48', name: 'Rose Inferno' },
  { value: '#7C3AED', name: 'Violet Storm' },
  { value: '#0F766E', name: 'Teal Abyss' },
  { value: '#475569', name: 'Slate Titanium' },
  { value: '', name: 'Theme Default' },
];

const EMOJI_PALETTE: Array<{ value: string; name: string }> = [
  { value: '🚀', name: 'Rocket' },
  { value: '❤️', name: 'Heart' },
  { value: '✨', name: 'Sparkles' },
  { value: '🔥', name: 'Fire' },
  { value: '🌟', name: 'Glowing Star' },
  { value: '💎', name: 'Gem' },
  { value: '🎯', name: 'Bullseye' },
  { value: '🧠', name: 'Brain' },
  { value: '🛠️', name: 'Tools' },
  { value: '🧪', name: 'Test Tube' },
  { value: '📦', name: 'Package' },
  { value: '📁', name: 'Folder' },
  { value: '✅', name: 'Check Mark' },
  { value: '☕', name: 'Coffee' },
  { value: '🌈', name: 'Rainbow' },
  { value: '🎉', name: 'Party' },
  { value: '', name: 'Empty' },
];

function getBadgeConfig(): BadgeConfig {
  const configuration = vscode.workspace.getConfiguration();
  return {
    name: configuration.get<string>(CONFIGURATION_KEYS.NAME, ''),
    color: configuration.get<string>(CONFIGURATION_KEYS.COLOR, ''),
    emoji: configuration.get<string>(CONFIGURATION_KEYS.EMOJI, ''),
  };
}

/**
 * Check if a workspace or folder is open
 */
function isWorkspaceOpen(): boolean {
  return vscode.workspace.workspaceFolders !== undefined && 
         vscode.workspace.workspaceFolders.length > 0;
}

// ============================================================================
// Utility Functions
// ============================================================================

function parseHexColor(
  hex: string
): { r: number; g: number; b: number } | undefined {
  const normalized = hex.trim().toLowerCase();
  const hexPattern = /^#?([0-9a-f]{6})$/;
  const match = hexPattern.exec(normalized);

  if (!match) {
    return undefined;
  }

  const hexValue = match[1];
  return {
    r: parseInt(hexValue.slice(0, 2), 16),
    g: parseInt(hexValue.slice(2, 4), 16),
    b: parseInt(hexValue.slice(4, 6), 16),
  };
}

function getContrastingTextColor(hex: string): string {
  const color = parseHexColor(hex);
  if (!color) {
    return '#ffffff';
  }

  // Using WCAG luminance formula
  const luminance =
    0.2126 * (color.r / 255) +
    0.7152 * (color.g / 255) +
    0.0722 * (color.b / 255);

  return luminance > 0.5 ? '#000000' : '#ffffff';
}

function normalizeHexColor(color: string): string {
  const trimmed = color.trim();
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

// ============================================================================
// Status Bar Functions
// ============================================================================

function updateStatusBarItem(item: vscode.StatusBarItem): void {
  const config = getBadgeConfig();
  const text = `${config.emoji} ${config.name}`.trim();

  if (!text) {
    item.hide();
    return;
  }

  item.text = text;
  item.color = config.color || undefined;
  item.show();
}

function renderBadgePreview(
  item: vscode.StatusBarItem,
  emoji: string,
  name: string,
  color: string
): void {
  item.text = `${emoji} ${name}`.trim();
  item.color = color || undefined;
  item.show();
}

// ============================================================================
// Color Management Functions
// ============================================================================

async function applyStatusBarColor(
  color: string,
  options?: ApplyColorOptions
): Promise<boolean> {
  const workbenchConfiguration = vscode.workspace.getConfiguration('workbench');
  const currentCustomizations =
    workbenchConfiguration.get<Record<string, string>>('colorCustomizations') ??
    {};

  const customizations = { ...currentCustomizations };
  const trimmed = color.trim();

  if (!trimmed) {
    delete customizations[STATUS_BAR_KEYS.BACKGROUND];
    delete customizations[STATUS_BAR_KEYS.FOREGROUND];

    const hasEntries = Object.keys(customizations).length > 0;

    await workbenchConfiguration.update(
      'colorCustomizations',
      hasEntries ? customizations : undefined,
      vscode.ConfigurationTarget.Workspace
    );

    if (!options?.silent) {
      vscode.window.showInformationMessage(
        'Status bar color reset to the theme default.'
      );
    }

    return true;
  }

  const normalized = normalizeHexColor(trimmed);
  const parsed = parseHexColor(normalized);

  if (!parsed) {
    if (!options?.silent) {
      vscode.window.showErrorMessage(
        'The provided color is not a valid hexadecimal value (#RRGGBB).'
      );
    }
    return false;
  }

  if (!options?.skipConfirmation) {
    const confirmation = await vscode.window.showInformationMessage(
      'This will update the status bar color for this workspace.',
      { modal: true },
      'Apply'
    );

    if (confirmation !== 'Apply') {
      return false;
    }
  }

  const foreground = getContrastingTextColor(normalized);

  customizations[STATUS_BAR_KEYS.BACKGROUND] = normalized;
  customizations[STATUS_BAR_KEYS.FOREGROUND] = foreground;

  await workbenchConfiguration.update(
    'colorCustomizations',
    customizations,
    vscode.ConfigurationTarget.Workspace
  );

  return true;
}

async function promptForCustomColor(
  title: string,
  prompt: string,
  initialValue: string
): Promise<string | undefined> {
  const result = await vscode.window.showInputBox({
    title,
    prompt,
    value: initialValue,
    placeHolder: '#0A3F80',
    ignoreFocusOut: true,
  });

  if (result === undefined) {
    return undefined;
  }

  const trimmed = result.trim();

  if (trimmed === '') {
    await vscode.window.showErrorMessage(
      'Color cannot be empty. Please enter a value.'
    );
    return promptForCustomColor(title, prompt, initialValue);
  }

  if (!parseHexColor(trimmed)) {
    await vscode.window.showErrorMessage(
      'The provided color is not a valid hexadecimal value (#RRGGBB).'
    );
    return promptForCustomColor(title, prompt, initialValue);
  }

  return trimmed;
}

function createColorQuickPickItems(
  palette: Array<{ value: string; name: string }>,
  initialColor: string
): ColorQuickPickItem[] {
  const trimmedInitial = initialColor.trim();

  const paletteItems = palette.map<ColorQuickPickItem>((option) => ({
    label: `$(symbol-color) ${option.name}`,
    description: option.value,
    value: option.value,
    picked: option.value.toLowerCase() === trimmedInitial.toLowerCase(),
  }));

  const customItem: ColorQuickPickItem = {
    label: 'Custom…',
    description: 'Enter a custom hexadecimal color',
    value:
      trimmedInitial && !paletteItems.some((item) => item.picked)
        ? trimmedInitial
        : undefined,
    isCustom: true,
  };

  return [...paletteItems, customItem];
}

// ============================================================================
// Prompt Functions
// ============================================================================

async function promptForStatusBarColor(
  initialColor: string
): Promise<string | undefined> {
  const workbenchConfiguration = vscode.workspace.getConfiguration('workbench');
  const originalCustomizations = workbenchConfiguration.get<
    Record<string, string>
  >('colorCustomizations');
  const originalClone = originalCustomizations
    ? { ...originalCustomizations }
    : undefined;

  const restoreOriginal = async (): Promise<void> => {
    await workbenchConfiguration.update(
      'colorCustomizations',
      originalClone,
      vscode.ConfigurationTarget.Workspace
    );
  };

  return new Promise<string | undefined>((resolve) => {
    const quickPick = vscode.window.createQuickPick<ColorQuickPickItem>();
    let settled = false;

    quickPick.title = 'Status Bar Color';
    quickPick.placeholder =
      'Select a status bar color or choose Custom… to enter your own.';
    quickPick.ignoreFocusOut = true;

    const items = createColorQuickPickItems(
      STATUS_BAR_COLOR_PALETTE,
      initialColor
    );
    quickPick.items = items;

    const trimmedInitial = initialColor.trim();
    const preselected = items.find(
      (item) =>
        !item.isCustom &&
        item.value?.toLowerCase() === trimmedInitial.toLowerCase()
    );

    if (preselected?.value) {
      quickPick.activeItems = [preselected];
      applyStatusBarColor(preselected.value, {
        skipConfirmation: true,
        silent: true,
      });
    } else if (trimmedInitial) {
      const customItem = items.find((item) => item.isCustom);
      if (customItem) {
        quickPick.activeItems = [customItem];
        applyStatusBarColor(trimmedInitial, {
          skipConfirmation: true,
          silent: true,
        });
      }
    }

    const applyPreview = async (item?: ColorQuickPickItem): Promise<void> => {
      if (item?.value && !item.isCustom) {
        await applyStatusBarColor(item.value, {
          skipConfirmation: true,
          silent: true,
        });
      }
    };

    quickPick.onDidChangeActive(async (activeItems) => {
      await applyPreview(activeItems[0] as ColorQuickPickItem | undefined);
    });

    quickPick.onDidChangeSelection(async (selection) => {
      await applyPreview(selection[0] as ColorQuickPickItem | undefined);
    });

    quickPick.onDidAccept(async () => {
      const selected =
        (quickPick.selectedItems[0] as ColorQuickPickItem | undefined) ??
        (quickPick.activeItems[0] as ColorQuickPickItem | undefined);

      quickPick.hide();

      if (!selected) {
        settled = true;
        await restoreOriginal();
        resolve(undefined);
        return;
      }

      if (selected.isCustom) {
        settled = true;
        const customColor = await promptForCustomColor(
          'Status Bar Color',
          'Enter the background color for the status bar in hexadecimal format (#RRGGBB).',
          selected.value ?? initialColor.trim()
        );

        if (customColor === undefined) {
          await restoreOriginal();
          resolve(undefined);
          return;
        }

        await applyStatusBarColor(customColor, {
          skipConfirmation: true,
          silent: true,
        });
        resolve(customColor);
        return;
      }

      settled = true;
      resolve(selected.value);
    });

    quickPick.onDidHide(async () => {
      quickPick.dispose();
      if (!settled) {
        await restoreOriginal();
        resolve(undefined);
      }
    });

    quickPick.show();
  });
}

async function promptForBadgeColor(
  statusBarItem: vscode.StatusBarItem,
  initialColor: string,
  emoji: string,
  name: string
): Promise<string | undefined> {
  const originalColor = (statusBarItem.color ?? initialColor) as string;

  const restoreOriginal = (): void => {
    renderBadgePreview(statusBarItem, emoji, name, originalColor);
  };

  return new Promise<string | undefined>((resolve) => {
    const quickPick = vscode.window.createQuickPick<ColorQuickPickItem>();
    let settled = false;

    quickPick.title = 'Badge Text Color';
    quickPick.placeholder =
      'Select a text color for the badge or choose Custom… to enter your own.';
    quickPick.ignoreFocusOut = true;

    const items = createColorQuickPickItems(BADGE_COLOR_PALETTE, initialColor);
    quickPick.items = items;

    const trimmedInitial = initialColor.trim();
    const preselected = items.find(
      (item) =>
        !item.isCustom &&
        item.value?.toLowerCase() === trimmedInitial.toLowerCase()
    );

    if (preselected?.value) {
      quickPick.activeItems = [preselected];
      renderBadgePreview(statusBarItem, emoji, name, preselected.value);
    } else if (trimmedInitial) {
      const customItem = items.find((item) => item.isCustom);
      if (customItem) {
        quickPick.activeItems = [customItem];
        renderBadgePreview(statusBarItem, emoji, name, trimmedInitial);
      }
    }

    const applyPreview = (item?: ColorQuickPickItem): void => {
      if (item?.value && !item.isCustom) {
        renderBadgePreview(statusBarItem, emoji, name, item.value);
      }
    };

    quickPick.onDidChangeActive((activeItems) => {
      applyPreview(activeItems[0] as ColorQuickPickItem | undefined);
    });

    quickPick.onDidChangeSelection((selection) => {
      applyPreview(selection[0] as ColorQuickPickItem | undefined);
    });

    quickPick.onDidAccept(async () => {
      const selected =
        (quickPick.selectedItems[0] as ColorQuickPickItem | undefined) ??
        (quickPick.activeItems[0] as ColorQuickPickItem | undefined);

      quickPick.hide();

      if (!selected) {
        settled = true;
        restoreOriginal();
        resolve(undefined);
        return;
      }

      if (selected.isCustom) {
        settled = true;
        const customColor = await promptForCustomColor(
          'Badge Text Color',
          'Enter the color in hexadecimal format (#RRGGBB).',
          selected.value ?? trimmedInitial
        );

        if (customColor === undefined) {
          restoreOriginal();
          resolve(undefined);
          return;
        }

        renderBadgePreview(statusBarItem, emoji, name, customColor);
        resolve(customColor);
        return;
      }

      settled = true;
      const finalColor = selected.value ?? initialColor;
      renderBadgePreview(statusBarItem, emoji, name, finalColor);
      resolve(finalColor);
    });

    quickPick.onDidHide(() => {
      quickPick.dispose();
      if (!settled) {
        restoreOriginal();
        resolve(undefined);
      }
    });

    quickPick.show();
  });
}

async function promptForEmoji(
  statusBarItem: vscode.StatusBarItem,
  initialEmoji: string,
  name: string,
  color: string
): Promise<string | undefined> {
  const originalColor = (statusBarItem.color ?? color) as string;

  const restoreOriginal = (): void => {
    renderBadgePreview(statusBarItem, initialEmoji, name, originalColor);
  };

  return new Promise<string | undefined>((resolve) => {
    const quickPick = vscode.window.createQuickPick<EmojiQuickPickItem>();
    let settled = false;

    quickPick.title = 'Project Emoji';
    quickPick.placeholder =
      'Pick an emoji or choose Custom… to enter your own.';
    quickPick.ignoreFocusOut = true;

    const paletteItems = EMOJI_PALETTE.map<EmojiQuickPickItem>((option) => ({
      label: `${option.value} ${option.name}`,
      value: option.value,
      picked: option.value === initialEmoji,
    }));

    const customItem: EmojiQuickPickItem = {
      label: 'Custom…',
      description: 'Enter a custom emoji',
      value:
        initialEmoji && !paletteItems.some((item) => item.picked)
          ? initialEmoji
          : undefined,
      isCustom: true,
    };

    quickPick.items = [...paletteItems, customItem];

    const preselected = quickPick.items.find(
      (item) => !item.isCustom && item.value === initialEmoji
    ) as EmojiQuickPickItem | undefined;

    if (preselected?.value) {
      quickPick.activeItems = [preselected];
      renderBadgePreview(statusBarItem, preselected.value, name, color);
    } else if (initialEmoji) {
      quickPick.activeItems = [customItem];
      renderBadgePreview(statusBarItem, initialEmoji, name, color);
    }

    const applyPreview = (item?: EmojiQuickPickItem): void => {
      if (item?.value && !item.isCustom) {
        renderBadgePreview(statusBarItem, item.value, name, color);
      }
    };

    quickPick.onDidChangeActive((activeItems) => {
      applyPreview(activeItems[0] as EmojiQuickPickItem | undefined);
    });

    quickPick.onDidChangeSelection((selection) => {
      applyPreview(selection[0] as EmojiQuickPickItem | undefined);
    });

    quickPick.onDidAccept(async () => {
      const selected =
        (quickPick.selectedItems[0] as EmojiQuickPickItem | undefined) ??
        (quickPick.activeItems[0] as EmojiQuickPickItem | undefined);

      quickPick.hide();

      if (!selected) {
        settled = true;
        restoreOriginal();
        resolve(undefined);
        return;
      }

      if (selected.isCustom) {
        settled = true;

        const customEmoji = await vscode.window.showInputBox({
          title: 'Project Emoji',
          prompt: 'Enter the emoji that accompanies the project name.',
          value: selected.value ?? initialEmoji,
          ignoreFocusOut: true,
        });

        if (customEmoji === undefined) {
          restoreOriginal();
          resolve(undefined);
          return;
        }

        renderBadgePreview(statusBarItem, customEmoji, name, color);
        resolve(customEmoji);
        return;
      }

      settled = true;
      const finalEmoji = selected.value ?? initialEmoji;
      renderBadgePreview(statusBarItem, finalEmoji, name, color);
      resolve(finalEmoji);
    });

    quickPick.onDidHide(() => {
      quickPick.dispose();
      if (!settled) {
        restoreOriginal();
        resolve(undefined);
      }
    });

    quickPick.show();
  });
}

async function promptForProjectName(
  statusBarItem: vscode.StatusBarItem,
  initialName: string,
  emoji: string,
  color: string
): Promise<string | undefined> {
  const restoreOriginal = (): void => {
    renderBadgePreview(statusBarItem, emoji, initialName, color);
  };

  return new Promise<string | undefined>((resolve) => {
    const input = vscode.window.createInputBox();
    let settled = false;

    input.title = 'Project Name';
    input.prompt = 'Enter the name you want to display in the status bar.';
    input.value = initialName;
    input.ignoreFocusOut = true;

    renderBadgePreview(statusBarItem, emoji, initialName, color);

    input.onDidChangeValue((value) => {
      renderBadgePreview(statusBarItem, emoji, value, color);
    });

    input.onDidAccept(() => {
      const value = input.value.trim();
      input.hide();
      settled = true;

      if (!value) {
        vscode.window.showErrorMessage('Project name cannot be empty.');
        restoreOriginal();
        resolve(undefined);
        return;
      }

      resolve(value);
    });

    input.onDidHide(() => {
      input.dispose();
      if (!settled) {
        restoreOriginal();
        resolve(undefined);
      }
    });

    input.show();
  });
}

// ============================================================================
// Configuration Commands
// ============================================================================

async function updateBadgeConfiguration(
  name: string,
  emoji: string,
  color: string
): Promise<void> {
  const configuration = vscode.workspace.getConfiguration();

  await Promise.all([
    configuration.update(
      CONFIGURATION_KEYS.NAME,
      name,
      vscode.ConfigurationTarget.Workspace
    ),
    configuration.update(
      CONFIGURATION_KEYS.EMOJI,
      emoji,
      vscode.ConfigurationTarget.Workspace
    ),
    configuration.update(
      CONFIGURATION_KEYS.COLOR,
      color || undefined,
      vscode.ConfigurationTarget.Workspace
    ),
  ]);
}

async function resetAllSettings(): Promise<void> {
  const configuration = vscode.workspace.getConfiguration();

  await Promise.all([
    configuration.update(
      CONFIGURATION_KEYS.NAME,
      undefined,
      vscode.ConfigurationTarget.Workspace
    ),
    configuration.update(
      CONFIGURATION_KEYS.COLOR,
      undefined,
      vscode.ConfigurationTarget.Workspace
    ),
    configuration.update(
      CONFIGURATION_KEYS.EMOJI,
      undefined,
      vscode.ConfigurationTarget.Workspace
    ),
  ]);

  const workbenchConfiguration = vscode.workspace.getConfiguration('workbench');
  const currentCustomizations =
    workbenchConfiguration.get<Record<string, string>>('colorCustomizations') ??
    {};
  const customizations = { ...currentCustomizations };

  delete customizations[STATUS_BAR_KEYS.BACKGROUND];
  delete customizations[STATUS_BAR_KEYS.FOREGROUND];

  const hasEntries = Object.keys(customizations).length > 0;

  await workbenchConfiguration.update(
    'colorCustomizations',
    hasEntries ? customizations : undefined,
    vscode.ConfigurationTarget.Workspace
  );
}

// ============================================================================
// Extension Activation
// ============================================================================

export function activate(context: vscode.ExtensionContext): void {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  updateStatusBarItem(statusBarItem);

  context.subscriptions.push(statusBarItem);

  const configurationDisposable = vscode.workspace.onDidChangeConfiguration(
    (event) => {
      const affectsConfig =
        event.affectsConfiguration(CONFIGURATION_KEYS.NAME) ||
        event.affectsConfiguration(CONFIGURATION_KEYS.COLOR) ||
        event.affectsConfiguration(CONFIGURATION_KEYS.EMOJI);

      if (affectsConfig) {
        updateStatusBarItem(statusBarItem);
      }
    }
  );

  context.subscriptions.push(configurationDisposable);

  // Main configuration command
  const configureCommand = vscode.commands.registerCommand(
    'statusmark.configure',
    async () => {
      if (!isWorkspaceOpen()) {
        vscode.window.showWarningMessage(
          'StatusMark requires an open workspace or folder. Please open a folder or workspace first.'
        );
        return;
      }

      const current = getBadgeConfig();
      const originalState = { ...current };

      // Step 1: Prompt for project name
      const name = await promptForProjectName(
        statusBarItem,
        current.name,
        current.emoji,
        current.color
      );

      if (name === undefined) {
        renderBadgePreview(
          statusBarItem,
          originalState.emoji,
          originalState.name,
          originalState.color
        );
        return;
      }

      // Step 2: Prompt for emoji
      const emoji = await promptForEmoji(
        statusBarItem,
        current.emoji,
        name,
        current.color
      );

      if (emoji === undefined) {
        renderBadgePreview(
          statusBarItem,
          originalState.emoji,
          originalState.name,
          originalState.color
        );
        return;
      }

      // Step 3: Prompt for badge color
      const color = await promptForBadgeColor(
        statusBarItem,
        current.color,
        emoji,
        name
      );

      if (color === undefined) {
        renderBadgePreview(
          statusBarItem,
          originalState.emoji,
          originalState.name,
          originalState.color
        );
        return;
      }

      // Save badge configuration
      renderBadgePreview(statusBarItem, emoji, name, color);
      await updateBadgeConfiguration(name, emoji, color);
      updateStatusBarItem(statusBarItem);

      // Step 4: Prompt for status bar color
      const workbenchConfiguration =
        vscode.workspace.getConfiguration('workbench');
      const currentCustomizations =
        workbenchConfiguration.get<Record<string, string>>(
          'colorCustomizations'
        ) ?? {};
      const currentStatusBarColor =
        currentCustomizations[STATUS_BAR_KEYS.BACKGROUND] ?? '';

      const statusBarColor = await promptForStatusBarColor(
        currentStatusBarColor
      );

      if (statusBarColor !== undefined) {
        await applyStatusBarColor(statusBarColor, {
          skipConfirmation: true,
          silent: true,
        });
      }
    }
  );

  context.subscriptions.push(configureCommand);

  // Status bar color configuration command
  const configureStatusBarCommand = vscode.commands.registerCommand(
    'statusmark.configureStatusBarColor',
    async () => {
      if (!isWorkspaceOpen()) {
        vscode.window.showWarningMessage(
          'StatusMark requires an open workspace or folder. Please open a folder or workspace first.'
        );
        return;
      }

      const workbenchConfiguration =
        vscode.workspace.getConfiguration('workbench');
      const currentCustomizations =
        workbenchConfiguration.get<Record<string, string>>(
          'colorCustomizations'
        ) ?? {};
      const currentStatusBarColor =
        currentCustomizations[STATUS_BAR_KEYS.BACKGROUND] ?? '';

      const statusBarColor = await promptForStatusBarColor(
        currentStatusBarColor
      );

      if (statusBarColor !== undefined) {
        await applyStatusBarColor(statusBarColor, {
          skipConfirmation: true,
        });
      }
    }
  );

  context.subscriptions.push(configureStatusBarCommand);

  // Reset command
  const resetBadgeCommand = vscode.commands.registerCommand(
    'statusmark.reset',
    async () => {
      if (!isWorkspaceOpen()) {
        vscode.window.showWarningMessage(
          'StatusMark requires an open workspace or folder. Please open a folder or workspace first.'
        );
        return;
      }

      const confirmation = await vscode.window.showWarningMessage(
        'This will reset the StatusMark label and status bar colors in this workspace.',
        { modal: true },
        'Reset'
      );

      if (confirmation !== 'Reset') {
        return;
      }

      await resetAllSettings();
      updateStatusBarItem(statusBarItem);

      vscode.window.showInformationMessage(
        'StatusMark settings reset for this workspace.'
      );
    }
  );

  context.subscriptions.push(resetBadgeCommand);
}

export function deactivate(): void {}
